import { describe, expect, it } from "vitest";
import { availableSlots, busyIntervals, occupies, upcomingDays } from "./slots";
import { atLocal, localTime } from "./time";
import type { Booking, Settings } from "./types";

const settings: Pick<Settings, "hours" | "slotStepMin" | "minAdvanceMin" | "maxDaysAhead"> = {
  hours: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [{ from: "09:00", to: "12:00" }, { from: "16:00", to: "18:00" }], 6: [] },
  slotStepMin: 30,
  minAdvanceMin: 60,
  maxDaysAhead: 14,
};
const FRIDAY = "2026-10-02";
const now = atLocal("2026-10-01", "10:00"); // jueves

const times = (ds: Date[]) => ds.map(localTime);

function booking(from: string, to: string, extra: Partial<Booking> = {}): Booking {
  return {
    id: from, serviceId: "s", serviceName: "S", customerName: "X", customerPhone: "5493580000000",
    startsAt: atLocal(FRIDAY, from).toISOString(), endsAt: atLocal(FRIDAY, to).toISOString(),
    status: "confirmado", deposit: 0, paymentId: null, paidAt: null, holdUntil: null, remindedAt: null,
    manageTokenHash: "", createdAt: now.toISOString(), ...extra,
  };
}

describe("availableSlots", () => {
  it("arma los horarios dentro de las franjas, sin pasarse del cierre", () => {
    const s = availableSlots({ date: FRIDAY, durationMin: 45, settings, busy: [], blockedDates: [], now });
    expect(times(s)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "16:00", "16:30", "17:00"]);
  });

  it("devuelve vacío si el local no abre ese día o está bloqueado", () => {
    expect(availableSlots({ date: "2026-10-04", durationMin: 30, settings, busy: [], blockedDates: [], now })).toEqual([]);
    expect(availableSlots({ date: FRIDAY, durationMin: 30, settings, busy: [], blockedDates: [FRIDAY], now })).toEqual([]);
  });

  it("no ofrece horarios que se superponen con turnos tomados", () => {
    const busy = busyIntervals([booking("09:30", "10:15")], now);
    const s = availableSlots({ date: FRIDAY, durationMin: 30, settings, busy, blockedDates: [], now });
    // 09:00-09:30 entra justo; 09:30 y 10:00 chocan; 10:30 queda libre
    expect(times(s).slice(0, 3)).toEqual(["09:00", "10:30", "11:00"]);
  });

  it("respeta la anticipación mínima", () => {
    const s = availableSlots({ date: FRIDAY, durationMin: 30, settings, busy: [], blockedDates: [], now: atLocal(FRIDAY, "09:10") });
    expect(times(s)[0]).toBe("10:30"); // 09:10 + 60 min = 10:10 → primer inicio posible 10:30
  });

  it("no deja reservar en el pasado ni más allá del máximo de días", () => {
    expect(availableSlots({ date: "2026-09-25", durationMin: 30, settings, busy: [], blockedDates: [], now })).toEqual([]);
    expect(availableSlots({ date: "2026-10-30", durationMin: 30, settings, busy: [], blockedDates: [], now })).toEqual([]);
  });

  it("las reservas pendientes de seña ocupan el horario solo hasta que vencen", () => {
    const pending = booking("09:00", "09:30", { status: "pendiente_pago", holdUntil: atLocal("2026-10-01", "10:15").toISOString() });
    expect(occupies(pending, now)).toBe(true);
    expect(occupies(pending, atLocal("2026-10-01", "10:16"))).toBe(false);
    expect(occupies(booking("09:00", "09:30", { status: "cancelado" }), now)).toBe(false);
  });

  it("calcula los días con lugar", () => {
    const days = upcomingDays({ durationMin: 30, settings, busy: [], blockedDates: [], now });
    expect(days).toHaveLength(15);
    expect(days.find((d) => d.date === FRIDAY)?.count).toBe(10);
    expect(days.find((d) => d.date === "2026-10-03")?.count).toBe(0);
  });

  it("usa hora argentina aunque el servidor esté en UTC", () => {
    expect(atLocal(FRIDAY, "09:00").toISOString()).toBe("2026-10-02T12:00:00.000Z");
  });
});
