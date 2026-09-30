import { addDays, atLocal, localDate, weekday } from "../time";
import { availableSlots, busyIntervals } from "../slots";
import { hashToken } from "../token";
import type { Block, Booking, BookingStatus, Service, Settings } from "../types";

export const DEMO_SETTINGS: Settings = {
  businessName: "Nómade Barbería",
  tagline: "Cortes, barba y color en el centro de Río Cuarto",
  address: "Constitución 850, Río Cuarto",
  whatsapp: "5493584000000",
  hours: {
    0: [],
    1: [],
    2: [{ from: "09:00", to: "13:00" }, { from: "16:00", to: "20:30" }],
    3: [{ from: "09:00", to: "13:00" }, { from: "16:00", to: "20:30" }],
    4: [{ from: "09:00", to: "13:00" }, { from: "16:00", to: "20:30" }],
    5: [{ from: "09:00", to: "13:00" }, { from: "16:00", to: "20:30" }],
    6: [{ from: "09:00", to: "14:00" }],
  },
  slotStepMin: 15,
  minAdvanceMin: 60,
  maxDaysAhead: 14,
  holdMin: 15,
  cancelLimitHours: 12,
};

export const DEMO_SERVICES: Service[] = [
  { id: "corte", name: "Corte", description: "Corte a tijera o máquina, lavado y peinado.", durationMin: 30, price: 12000, deposit: 4000, active: true, sortOrder: 1 },
  { id: "corte-barba", name: "Corte + barba", description: "Corte completo y perfilado de barba con toalla caliente.", durationMin: 45, price: 16000, deposit: 5000, active: true, sortOrder: 2 },
  { id: "barba", name: "Barba", description: "Perfilado y arreglo de barba.", durationMin: 20, price: 7000, deposit: 0, active: true, sortOrder: 3 },
  { id: "color", name: "Color / mechas", description: "Decoloración, mechas o color completo. Incluye corte.", durationMin: 90, price: 35000, deposit: 10000, active: true, sortOrder: 4 },
];

const NAMES = [
  "Juan Pérez", "Tomás Giménez", "Lucas Ferreyra", "Mateo Sosa", "Franco Díaz", "Nicolás Ríos",
  "Santiago Luna", "Facundo Romero", "Bruno Acosta", "Ignacio Vera", "Joaquín Ledesma", "Martín Olmos",
  "Valentín Quiroga", "Agustina Paz", "Camila Rojas", "Lautaro Medina",
];

/** PRNG determinístico para que la demo sea siempre parecida. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function demoBlocks(now: Date): Block[] {
  // Un día libre dentro de las próximas dos semanas, para mostrar los bloqueos
  let d = addDays(localDate(now), 6);
  while (weekday(d) === 0 || weekday(d) === 1) d = addDays(d, 1);
  return [{ id: "b1", date: d, reason: "Capacitación" }];
}

export function demoBookings(now: Date, blocks: Block[]): Booking[] {
  const rand = rng(42);
  const out: Booking[] = [];
  const today = localDate(now);
  let n = 0;

  for (let i = -30; i <= 7; i++) {
    const date = addDays(today, i);
    if (blocks.some((b) => b.date === date)) continue;
    const target = i < 0 ? 6 + Math.floor(rand() * 5) : i === 0 ? 5 : Math.max(1, 5 - i);

    for (let k = 0; k < target; k++) {
      const service = DEMO_SERVICES[Math.floor(rand() * rand() * DEMO_SERVICES.length)];
      const slots = availableSlots({
        date,
        durationMin: service.durationMin,
        settings: { ...DEMO_SETTINGS, minAdvanceMin: 0, maxDaysAhead: 60 },
        busy: busyIntervals(out, now),
        blockedDates: [],
        now: atLocal(addDays(today, Math.min(i, 0)), "00:00"),
      });
      if (!slots.length) break;
      const start = slots[Math.floor(rand() * slots.length)];
      const end = new Date(+start + service.durationMin * 60_000);
      const past = +end < +now;

      let status: BookingStatus = past ? (rand() < 0.1 ? "ausente" : "asistio") : "confirmado";
      if (!past && rand() < 0.05) status = "cancelado";
      const paid = service.deposit > 0 && status !== "cancelado";
      const created = new Date(+start - (1 + Math.floor(rand() * 5)) * 86_400_000);

      n++;
      out.push({
        id: `rc${String(n).padStart(3, "0")}`,
        serviceId: service.id,
        serviceName: service.name,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        customerName: NAMES[Math.floor(rand() * NAMES.length)],
        customerPhone: `549358${String(4000000 + Math.floor(rand() * 999999))}`,
        status,
        deposit: service.deposit,
        paymentId: paid ? `demo-${n}` : null,
        paidAt: paid ? created.toISOString() : null,
        holdUntil: null,
        remindedAt: past ? created.toISOString() : null,
        manageTokenHash: hashToken("demo"),
        createdAt: created.toISOString(),
      });
    }
  }
  return out;
}
