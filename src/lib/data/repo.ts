import type { Block, Booking, NewBooking, Service, Settings } from "../types";

export type ServiceInput = Omit<Service, "id"> & { id?: string };

/**
 * Acceso a datos. Hay dos implementaciones: en memoria (modo demo) y Supabase.
 * insertBooking/updateBooking lanzan SlotTakenError si el horario choca con otro turno.
 */
export interface Repo {
  readonly mode: "demo" | "supabase";

  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<void>;

  listServices(opts?: { includeInactive?: boolean }): Promise<Service[]>;
  getService(id: string): Promise<Service | null>;
  saveService(input: ServiceInput): Promise<Service>;

  listBlocks(): Promise<Block[]>;
  addBlock(date: string, reason: string): Promise<void>;
  deleteBlock(id: string): Promise<void>;

  /** Turnos cuyo inicio cae entre `from` y `to` (cualquier estado). */
  listBookings(from: Date, to: Date): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  getBookingByPayment(paymentId: string): Promise<Booking | null>;
  insertBooking(b: NewBooking): Promise<Booking>;
  updateBooking(id: string, patch: Partial<Booking>): Promise<Booking>;
  /** Marca como expirados los turnos pendientes cuya reserva venció. Devuelve cuántos. */
  expireHolds(now: Date): Promise<number>;
}
