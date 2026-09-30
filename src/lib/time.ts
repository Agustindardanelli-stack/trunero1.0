/**
 * Manejo de fechas en hora de Argentina.
 * Argentina usa UTC-3 todo el año (sin horario de verano), así que un offset fijo es exacto
 * y evita depender de la zona horaria del servidor (Vercel corre en UTC).
 */
import type { Weekday } from "./types";

export const TZ = "America/Argentina/Cordoba";
const OFFSET = "-03:00";
const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isDateStr = (s: unknown): s is string => typeof s === "string" && DATE_RE.test(s);
export const isTimeStr = (s: unknown): s is string => typeof s === "string" && TIME_RE.test(s);

/** "2026-10-02" + "09:30" (hora local) → Date */
export function atLocal(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${OFFSET}`);
}

/** Fecha local "YYYY-MM-DD" de un instante. */
export function localDate(d: Date | number): string {
  return new Date(+d - OFFSET_MS).toISOString().slice(0, 10);
}

/** Hora local "HH:MM" de un instante. */
export function localTime(d: Date | number): string {
  return new Date(+d - OFFSET_MS).toISOString().slice(11, 16);
}

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export function weekday(date: string): Weekday {
  return new Date(`${date}T12:00:00Z`).getUTCDay() as Weekday;
}

export const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
const DAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "vie 2 oct" */
export function shortDay(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${DAYS_SHORT[weekday(date)]} ${d} ${MONTHS[m - 1]}`;
}

/** "viernes 2 de octubre" */
export function longDay(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${WEEKDAYS[weekday(date)].toLowerCase()} ${d} de ${MONTHS_LONG[m - 1]}`;
}

/** "viernes 2 de octubre, 10:30 hs" */
export function whenText(iso: string) {
  return `${longDay(localDate(new Date(iso)))}, ${localTime(new Date(iso))} hs`;
}

/** "hoy", "mañana" o null */
export function relativeDay(date: string, now: Date): string | null {
  const today = localDate(now);
  if (date === today) return "hoy";
  if (date === addDays(today, 1)) return "mañana";
  return null;
}
