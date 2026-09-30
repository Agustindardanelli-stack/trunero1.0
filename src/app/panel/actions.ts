"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logIn, logOut, requirePanel } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { isDateStr, isTimeStr, minutes } from "@/lib/time";
import type { BookingStatus, TimeRange, Weekday, WeeklyHours } from "@/lib/types";

export async function login(_: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  const ok = await logIn(String(fd.get("password") ?? ""));
  if (!ok) return { error: "Contraseña incorrecta" };
  redirect("/panel");
}

export async function logout() {
  await logOut();
  redirect("/panel/ingresar");
}

const TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  confirmado: ["asistio", "ausente", "cancelado"],
  pendiente_pago: ["cancelado"],
  asistio: ["ausente", "confirmado"],
  ausente: ["asistio", "confirmado"],
  reembolsar: ["cancelado"],
};

export async function setStatus(fd: FormData) {
  await requirePanel();
  const repo = getRepo();
  const id = String(fd.get("id"));
  const to = String(fd.get("status")) as BookingStatus;
  const b = await repo.getBooking(id);
  if (b && TRANSITIONS[b.status]?.includes(to)) await repo.updateBooking(id, { status: to });
  revalidatePath("/panel");
}

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).default(""),
  durationMin: z.coerce.number().int().min(5).max(480),
  price: z.coerce.number().int().min(0),
  deposit: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int().default(0),
});

export async function saveService(fd: FormData) {
  await requirePanel();
  const raw = Object.fromEntries(fd);
  const parsed = serviceSchema.safeParse(raw);
  if (!parsed.success) redirect("/panel/servicios?error=datos");
  const s = parsed.data;
  await getRepo().saveService({
    ...s,
    id: s.id || undefined,
    deposit: Math.min(s.deposit, s.price),
    active: fd.get("active") === "on",
  });
  revalidatePath("/panel/servicios");
  redirect("/panel/servicios?ok=1");
}

export async function saveSchedule(fd: FormData) {
  await requirePanel();
  const hours = {} as WeeklyHours;
  for (let d = 0; d < 7; d++) {
    const ranges: TimeRange[] = [];
    for (const k of [1, 2]) {
      const from = String(fd.get(`d${d}_${k}_from`) ?? "");
      const to = String(fd.get(`d${d}_${k}_to`) ?? "");
      if (isTimeStr(from) && isTimeStr(to) && minutes(to) > minutes(from)) ranges.push({ from, to });
    }
    hours[d as Weekday] = ranges.sort((a, b) => minutes(a.from) - minutes(b.from));
  }
  const num = (k: string, min: number, max: number, def: number) => {
    const n = Number(fd.get(k));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
  };
  const text = (k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);
  await getRepo().updateSettings({
    hours,
    businessName: text("businessName", 60) || "Mi negocio",
    tagline: text("tagline", 120),
    address: text("address", 120),
    whatsapp: text("whatsapp", 20).replace(/\D/g, ""),
    slotStepMin: num("slotStepMin", 5, 120, 15),
    minAdvanceMin: num("minAdvanceMin", 0, 10_080, 60),
    maxDaysAhead: num("maxDaysAhead", 1, 90, 14),
    holdMin: num("holdMin", 5, 60, 15),
    cancelLimitHours: num("cancelLimitHours", 0, 168, 12),
  });
  revalidatePath("/", "layout");
  redirect("/panel/horarios?ok=1");
}

export async function addBlock(fd: FormData) {
  await requirePanel();
  const date = String(fd.get("date"));
  if (isDateStr(date)) await getRepo().addBlock(date, String(fd.get("reason") ?? "").slice(0, 80));
  revalidatePath("/panel/horarios");
}

export async function deleteBlock(fd: FormData) {
  await requirePanel();
  await getRepo().deleteBlock(String(fd.get("id")));
  revalidatePath("/panel/horarios");
}
