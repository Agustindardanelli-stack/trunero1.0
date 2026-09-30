import type { BookingStatus } from "./types";

const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const money = (n: number) => ars.format(n);

export const duration = (min: number) =>
  min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;

export const STATUS: Record<BookingStatus, { label: string; tone: string }> = {
  pendiente_pago: { label: "Esperando seña", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  confirmado: { label: "Confirmado", tone: "bg-sky-50 text-sky-800 ring-sky-200" },
  asistio: { label: "Asistió", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  ausente: { label: "Faltó", tone: "bg-rose-50 text-rose-800 ring-rose-200" },
  cancelado: { label: "Cancelado", tone: "bg-zinc-100 text-zinc-600 ring-zinc-200" },
  expirado: { label: "Seña no pagada", tone: "bg-zinc-100 text-zinc-600 ring-zinc-200" },
  reembolsar: { label: "Devolver seña", tone: "bg-violet-50 text-violet-800 ring-violet-200" },
};
