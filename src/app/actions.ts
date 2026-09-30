"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { applyPayment, BookingError, canCancel, createBooking } from "@/lib/booking";
import { bookingTokenFromCookie, rememberBookingToken } from "@/lib/booking-cookie";
import { getRepo } from "@/lib/data";
import { createPreference, isMpConfigured } from "@/lib/mercadopago";
import { normalizePhone } from "@/lib/phone";
import { siteUrl } from "@/lib/site";
import { tokenMatches } from "@/lib/token";
import { SlotTakenError, type Booking } from "@/lib/types";

export type FormState = { error?: string; fields?: Record<string, string> };

const schema = z.object({
  serviceId: z.string().min(1).max(64),
  start: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "Poné tu nombre y apellido").max(80),
  phone: z.string().trim().min(1, "Poné tu celular").max(30),
  website: z.string().max(0).optional(), // honeypot anti-bots
});

/** Lleva al pago de la seña (Mercado Pago real o checkout simulado en modo demo). */
async function paymentUrl(b: Booking): Promise<string> {
  if (!isMpConfigured()) return `/demo/pago/${b.id}`;
  return createPreference({
    bookingId: b.id,
    title: `Seña · ${b.serviceName}`,
    amount: b.deposit,
    expiresAt: b.holdUntil!,
    baseUrl: await siteUrl(),
  });
}

export async function reservar(_: FormState, fd: FormData): Promise<FormState> {
  const raw = Object.fromEntries(fd) as Record<string, string>;
  const fields = { name: raw.name ?? "", phone: raw.phone ?? "" };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: "El celular tiene que tener característica + número, sin 0 ni 15. Ej: 358 412-3456", fields };

  const repo = getRepo();
  let target: string;
  try {
    const { booking, token } = await createBooking(
      repo,
      { serviceId: parsed.data.serviceId, start: new Date(parsed.data.start), customerName: parsed.data.name, customerPhone: phone },
      new Date(),
    );
    await rememberBookingToken(booking.id, token);
    target = booking.status === "pendiente_pago" ? await paymentUrl(booking) : `/turno/${booking.id}?t=${token}&nuevo=1`;
  } catch (e) {
    if (e instanceof SlotTakenError || e instanceof BookingError) return { error: e.message, fields };
    console.error(e);
    return { error: "No pudimos reservar el turno. Probá de nuevo en un momento.", fields };
  }
  redirect(target);
}

async function authorizedBooking(id: string, token: string | null) {
  const repo = getRepo();
  const b = await repo.getBooking(id);
  const t = token || (await bookingTokenFromCookie(id));
  if (!b || !tokenMatches(t, b.manageTokenHash)) return null;
  return { repo, b };
}

/** Reintentar el pago de la seña mientras la reserva siga vigente. */
export async function pagarSena(fd: FormData) {
  const ctx = await authorizedBooking(String(fd.get("id")), String(fd.get("t") ?? "") || null);
  if (!ctx || ctx.b.status !== "pendiente_pago" || Date.parse(ctx.b.holdUntil!) <= Date.now()) redirect(`/turno/${fd.get("id")}`);
  redirect(await paymentUrl(ctx.b));
}

export async function cancelarTurno(fd: FormData) {
  const id = String(fd.get("id"));
  const ctx = await authorizedBooking(id, String(fd.get("t") ?? "") || null);
  if (ctx) {
    const settings = await ctx.repo.getSettings();
    if (canCancel(ctx.b, settings.cancelLimitHours, new Date())) {
      await ctx.repo.updateBooking(id, { status: "cancelado" });
    }
  }
  redirect(`/turno/${id}`);
}

/** Solo modo demo: simula que Mercado Pago aprobó el pago y llama a la misma lógica que el webhook. */
export async function demoPagar(fd: FormData) {
  const repo = getRepo();
  const id = String(fd.get("id"));
  if (repo.mode !== "demo" || isMpConfigured()) redirect(`/turno/${id}`);
  const b = await repo.getBooking(id);
  if (b) {
    await applyPayment(repo, { paymentId: `demo-${Date.now()}`, status: "approved", bookingId: id, amount: b.deposit }, new Date());
  }
  redirect(`/turno/${id}`);
}
