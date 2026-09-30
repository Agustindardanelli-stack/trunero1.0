import { busyIntervals, occupies } from "../slots";
import { OCCUPYING, SlotTakenError, type Block, type Booking, type NewBooking, type Service, type Settings } from "../types";
import type { Repo, ServiceInput } from "./repo";
import { DEMO_SERVICES, DEMO_SETTINGS, demoBlocks, demoBookings } from "./seed";

type Store = { settings: Settings; services: Service[]; blocks: Block[]; bookings: Booking[] };

/** Estado en memoria compartido entre requests (se reinicia al reiniciar el servidor). */
function store(): Store {
  const g = globalThis as unknown as { __turneaDemo?: Store };
  if (!g.__turneaDemo) {
    const now = new Date();
    const blocks = demoBlocks(now);
    g.__turneaDemo = {
      settings: structuredClone(DEMO_SETTINGS),
      services: structuredClone(DEMO_SERVICES),
      blocks,
      bookings: demoBookings(now, blocks),
    };
  }
  return g.__turneaDemo;
}

let seq = 0;
const newId = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Simula la restricción de exclusión de Postgres. */
function assertFree(all: Booking[], candidate: Booking) {
  if (!occupies(candidate, new Date())) return;
  const [mine] = busyIntervals([candidate], new Date());
  const clash = busyIntervals(
    all.filter((b) => b.id !== candidate.id),
    new Date(),
  ).some((b) => mine.start < b.end && b.start < mine.end);
  if (clash) throw new SlotTakenError();
}

export function createDemoRepo(): Repo {
  const s = store();
  return {
    mode: "demo",

    async getSettings() {
      return structuredClone(s.settings);
    },
    async updateSettings(patch) {
      s.settings = { ...s.settings, ...patch };
    },

    async listServices(opts) {
      return s.services
        .filter((x) => opts?.includeInactive || x.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((x) => ({ ...x }));
    },
    async getService(id) {
      const x = s.services.find((x) => x.id === id);
      return x ? { ...x } : null;
    },
    async saveService(input: ServiceInput) {
      if (input.id) {
        const i = s.services.findIndex((x) => x.id === input.id);
        if (i >= 0) {
          s.services[i] = { ...s.services[i], ...input, id: input.id };
          return { ...s.services[i] };
        }
      }
      const created = { ...input, id: newId() } as Service;
      s.services.push(created);
      return { ...created };
    },

    async listBlocks() {
      return [...s.blocks].sort((a, b) => a.date.localeCompare(b.date));
    },
    async addBlock(date, reason) {
      if (!s.blocks.some((b) => b.date === date)) s.blocks.push({ id: newId(), date, reason });
    },
    async deleteBlock(id) {
      s.blocks = s.blocks.filter((b) => b.id !== id);
    },

    async listBookings(from, to) {
      return s.bookings
        .filter((b) => Date.parse(b.startsAt) >= +from && Date.parse(b.startsAt) < +to)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((b) => ({ ...b }));
    },
    async getBooking(id) {
      const b = s.bookings.find((b) => b.id === id);
      return b ? { ...b } : null;
    },
    async getBookingByPayment(paymentId) {
      const b = s.bookings.find((b) => b.paymentId === paymentId);
      return b ? { ...b } : null;
    },
    async insertBooking(nb: NewBooking) {
      const b: Booking = { ...nb, id: newId(), createdAt: new Date().toISOString(), paymentId: null, paidAt: null, remindedAt: null };
      assertFree(s.bookings, b);
      s.bookings.push(b);
      return { ...b };
    },
    async updateBooking(id, patch) {
      const i = s.bookings.findIndex((b) => b.id === id);
      if (i < 0) throw new Error("Turno inexistente");
      const next = { ...s.bookings[i], ...patch, id };
      if (patch.status && OCCUPYING.includes(patch.status)) assertFree(s.bookings, next);
      s.bookings[i] = next;
      return { ...next };
    },
    async expireHolds(now) {
      let n = 0;
      for (const b of s.bookings) {
        if (b.status === "pendiente_pago" && b.holdUntil && Date.parse(b.holdUntil) <= +now) {
          b.status = "expirado";
          n++;
        }
      }
      return n;
    },
  };
}

/** Para tests: arranca con un store limpio. */
export function resetDemoStore(data?: Partial<Store>) {
  const g = globalThis as unknown as { __turneaDemo?: Store };
  g.__turneaDemo = {
    settings: structuredClone(DEMO_SETTINGS),
    services: structuredClone(DEMO_SERVICES),
    blocks: [],
    bookings: [],
    ...data,
  };
}
