export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

/** Franja horaria local, "HH:MM". */
export type TimeRange = { from: string; to: string };

export type WeeklyHours = Record<Weekday, TimeRange[]>;

export type Settings = {
  businessName: string;
  tagline: string;
  address: string;
  /** WhatsApp del negocio, solo dígitos con código de país (5493584...). */
  whatsapp: string;
  hours: WeeklyHours;
  /** Cada cuántos minutos arranca un turno posible. */
  slotStepMin: number;
  /** Anticipación mínima para reservar. */
  minAdvanceMin: number;
  /** Hasta cuántos días para adelante se puede reservar. */
  maxDaysAhead: number;
  /** Minutos que se guarda el horario mientras el cliente paga la seña. */
  holdMin: number;
  /** Horas mínimas de anticipación para cancelar desde el link. */
  cancelLimitHours: number;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  /** Seña en pesos. 0 = no pide seña. */
  deposit: number;
  active: boolean;
  sortOrder: number;
};

export type BookingStatus =
  | "pendiente_pago" // horario reservado mientras paga la seña
  | "confirmado"
  | "asistio"
  | "ausente"
  | "cancelado"
  | "expirado" // no pagó la seña a tiempo
  | "reembolsar"; // pagó tarde y el horario ya estaba tomado

/** Estados que ocupan el horario (si es pendiente, solo mientras no venza la reserva). */
export const OCCUPYING: BookingStatus[] = ["pendiente_pago", "confirmado", "asistio", "ausente"];

export type Booking = {
  id: string;
  serviceId: string;
  serviceName: string;
  startsAt: string; // ISO UTC
  endsAt: string;
  customerName: string;
  customerPhone: string;
  status: BookingStatus;
  deposit: number;
  paymentId: string | null;
  paidAt: string | null;
  holdUntil: string | null;
  remindedAt: string | null;
  manageTokenHash: string;
  createdAt: string;
};

export type NewBooking = Omit<Booking, "id" | "createdAt" | "paymentId" | "paidAt" | "remindedAt">;

export type Block = { id: string; date: string; reason: string };

export type Interval = { start: number; end: number }; // epoch ms

export class SlotTakenError extends Error {
  constructor() {
    super("Ese horario se acaba de ocupar. Elegí otro.");
    this.name = "SlotTakenError";
  }
}
