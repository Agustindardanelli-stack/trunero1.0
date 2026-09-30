import type { Booking } from "./types";

export type MonthStats = {
  booked: number;
  attended: number;
  noShows: number;
  /** Ausentismo sobre turnos ya ocurridos (asistió + faltó). */
  noShowRate: number;
  depositsCollected: number;
  /** Señas de los que faltaron: plata que el negocio no perdió gracias a la seña. */
  protectedMoney: number;
  toRefund: number;
};

/** Métricas de los turnos recibidos (ya filtrados por período). */
export function monthStats(bookings: Booking[]): MonthStats {
  const real = bookings.filter((b) => ["confirmado", "asistio", "ausente"].includes(b.status));
  const attended = real.filter((b) => b.status === "asistio").length;
  const noShows = real.filter((b) => b.status === "ausente");
  const done = attended + noShows.length;
  return {
    booked: real.length,
    attended,
    noShows: noShows.length,
    noShowRate: done ? noShows.length / done : 0,
    depositsCollected: bookings.filter((b) => b.paidAt && b.status !== "reembolsar").reduce((s, b) => s + b.deposit, 0),
    protectedMoney: noShows.filter((b) => b.paidAt).reduce((s, b) => s + b.deposit, 0),
    toRefund: bookings.filter((b) => b.status === "reembolsar").length,
  };
}

/** Turnos confirmados que empiezan en las próximas `withinHours` y todavía no tienen recordatorio. */
export function dueReminders(bookings: Booking[], now: Date, withinHours = 24): Booking[] {
  const limit = +now + withinHours * 3_600_000;
  return bookings.filter((b) => {
    const t = Date.parse(b.startsAt);
    return b.status === "confirmado" && !b.remindedAt && t > +now && t <= limit;
  });
}
