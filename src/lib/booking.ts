/**
 * Reglas de negocio de los turnos, independientes de la base de datos y del framework.
 */
import type { Repo } from "./data/repo";
import { busyIntervals, isSlotAvailable } from "./slots";
import { newToken } from "./token";
import { SlotTakenError, type Booking } from "./types";

export class BookingError extends Error {}

export type CreateInput = {
  serviceId: string;
  start: Date;
  customerName: string;
  customerPhone: string; // ya normalizado
};

/** Crea un turno. Si el servicio pide seña, queda "pendiente_pago" y el horario se reserva `holdMin` minutos. */
export async function createBooking(repo: Repo, input: CreateInput, now: Date) {
  const [settings, service, blocks] = await Promise.all([
    repo.getSettings(),
    repo.getService(input.serviceId),
    repo.listBlocks(),
  ]);
  if (!service || !service.active) throw new BookingError("Ese servicio ya no está disponible.");

  const end = new Date(+input.start + service.durationMin * 60_000);
  const sameDay = await repo.listBookings(new Date(+input.start - 86_400_000), new Date(+end + 86_400_000));
  const ok = isSlotAvailable(
    {
      durationMin: service.durationMin,
      settings,
      busy: busyIntervals(sameDay, now),
      blockedDates: blocks.map((b) => b.date),
      now,
    },
    input.start,
  );
  if (!ok) throw new SlotTakenError();

  const { token, hash } = newToken();
  const needsDeposit = service.deposit > 0;
  const booking = await repo.insertBooking({
    serviceId: service.id,
    serviceName: service.name,
    startsAt: input.start.toISOString(),
    endsAt: end.toISOString(),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone,
    status: needsDeposit ? "pendiente_pago" : "confirmado",
    deposit: service.deposit,
    holdUntil: needsDeposit ? new Date(+now + settings.holdMin * 60_000).toISOString() : null,
    manageTokenHash: hash,
  });
  return { booking, token, service, settings };
}

export type PaymentEvent = { paymentId: string; status: string; bookingId: string | null; amount: number };

export type PaymentResult =
  | "confirmado"
  | "ya_procesado"
  | "reembolsar"
  | "ignorado"
  | "turno_inexistente"
  | "monto_insuficiente";

/**
 * Aplica un pago de Mercado Pago a su turno. Es idempotente: Mercado Pago puede mandar
 * la misma notificación varias veces y el resultado es siempre el mismo.
 *
 * - Pago aprobado y el turno esperando seña → confirmado.
 * - Pago aprobado pero la reserva ya había vencido → se intenta recuperar el horario;
 *   si alguien lo tomó mientras tanto, queda "reembolsar" para que el negocio devuelva la seña.
 */
export async function applyPayment(repo: Repo, ev: PaymentEvent, now: Date): Promise<PaymentResult> {
  if (ev.status !== "approved" || !ev.bookingId) return "ignorado";

  const booking = await repo.getBooking(ev.bookingId);
  if (!booking) return "turno_inexistente";
  if (booking.paymentId === ev.paymentId) return "ya_procesado";
  if (booking.paymentId) return "ya_procesado"; // ya se confirmó con otro pago
  if (ev.amount + 0.01 < booking.deposit) return "monto_insuficiente";

  const paid: Partial<Booking> = { paymentId: ev.paymentId, paidAt: now.toISOString() };

  if (booking.status === "pendiente_pago" || booking.status === "expirado") {
    try {
      await repo.updateBooking(booking.id, { ...paid, status: "confirmado", holdUntil: null });
      return "confirmado";
    } catch (e) {
      if (!(e instanceof SlotTakenError)) throw e;
      await repo.updateBooking(booking.id, { ...paid, status: "reembolsar" });
      return "reembolsar";
    }
  }

  // Pagó un turno cancelado: se registra el pago para devolverlo.
  if (booking.status === "cancelado") {
    await repo.updateBooking(booking.id, { ...paid, status: "reembolsar" });
    return "reembolsar";
  }
  await repo.updateBooking(booking.id, paid);
  return "ya_procesado";
}

/** ¿El cliente todavía puede cancelar desde su link? */
export function canCancel(b: Booking, cancelLimitHours: number, now: Date): boolean {
  if (!["pendiente_pago", "confirmado"].includes(b.status)) return false;
  return Date.parse(b.startsAt) - +now >= cancelLimitHours * 3_600_000;
}
