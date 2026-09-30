import { NextResponse, type NextRequest } from "next/server";
import { isPanelAuthed } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { reminderText } from "@/lib/messages";
import { waLink } from "@/lib/phone";
import { siteUrl } from "@/lib/site";

/** Marca el recordatorio como enviado y abre WhatsApp con el mensaje listo. */
export async function GET(req: NextRequest, ctx: RouteContext<"/panel/recordar/[id]">) {
  if (!(await isPanelAuthed())) return NextResponse.redirect(new URL("/panel/ingresar", req.url));
  const { id } = await ctx.params;
  const repo = getRepo();
  const [b, settings] = await Promise.all([repo.getBooking(id), repo.getSettings()]);
  if (!b) return NextResponse.redirect(new URL("/panel", req.url));
  await repo.updateBooking(id, { remindedAt: new Date().toISOString() });
  return NextResponse.redirect(waLink(b.customerPhone, reminderText(b, settings, `${await siteUrl()}/turno/${b.id}`)));
}
