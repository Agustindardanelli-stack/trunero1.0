/**
 * Cálculo de horarios disponibles.
 *
 * Un horario es válido si:
 * 1. el día no está bloqueado y el local abre ese día,
 * 2. el turno entero (inicio + duración) entra dentro de una franja de atención,
 * 3. respeta la anticipación mínima,
 * 4. no se superpone con ningún turno que ocupe el horario.
 *
 * La base de datos tiene además una restricción de exclusión que impide superposiciones
 * aunque dos personas reserven en el mismo instante: esto es la primera línea, aquella la garantía.
 */
import { addDays, atLocal, localDate, minutes, weekday } from "./time";
import { OCCUPYING, type Booking, type Interval, type Settings } from "./types";

/** ¿Este turno ocupa su horario en el instante `now`? */
export function occupies(b: Pick<Booking, "status" | "holdUntil">, now: Date): boolean {
  if (!OCCUPYING.includes(b.status)) return false;
  if (b.status === "pendiente_pago") return !!b.holdUntil && Date.parse(b.holdUntil) > +now;
  return true;
}

export function busyIntervals(bookings: Booking[], now: Date): Interval[] {
  return bookings
    .filter((b) => occupies(b, now))
    .map((b) => ({ start: Date.parse(b.startsAt), end: Date.parse(b.endsAt) }));
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

export type SlotQuery = {
  date: string;
  durationMin: number;
  settings: Pick<Settings, "hours" | "slotStepMin" | "minAdvanceMin" | "maxDaysAhead">;
  busy: Interval[];
  blockedDates: string[];
  now: Date;
};

/** Inicios posibles (Date) para un servicio en un día. */
export function availableSlots({ date, durationMin, settings, busy, blockedDates, now }: SlotQuery): Date[] {
  if (blockedDates.includes(date)) return [];
  const today = localDate(now);
  if (date < today || date > addDays(today, settings.maxDaysAhead)) return [];

  const earliest = +now + settings.minAdvanceMin * 60_000;
  const step = Math.max(5, settings.slotStepMin);
  const out: Date[] = [];

  for (const range of settings.hours[weekday(date)] ?? []) {
    const open = minutes(range.from);
    const close = minutes(range.to);
    for (let m = open; m + durationMin <= close; m += step) {
      const start = atLocal(date, `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
      const slot = { start: +start, end: +start + durationMin * 60_000 };
      if (slot.start < earliest) continue;
      if (busy.some((b) => overlaps(slot, b))) continue;
      out.push(start);
    }
  }
  return out.sort((a, b) => +a - +b);
}

/** ¿`start` es un horario válido para reservar? (se revalida en el servidor al confirmar) */
export function isSlotAvailable(q: Omit<SlotQuery, "date">, start: Date): boolean {
  return availableSlots({ ...q, date: localDate(start) }).some((s) => +s === +start);
}

/** Próximos días con al menos un horario libre (para el selector de fechas). */
export function upcomingDays(q: Omit<SlotQuery, "date">): { date: string; count: number }[] {
  const today = localDate(q.now);
  return Array.from({ length: q.settings.maxDaysAhead + 1 }, (_, i) => {
    const date = addDays(today, i);
    return { date, count: availableSlots({ ...q, date }).length };
  });
}
