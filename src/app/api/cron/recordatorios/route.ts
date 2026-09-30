import { NextResponse, type NextRequest } from "next/server";
import { getRepo } from "@/lib/data";
import { dueReminders } from "@/lib/stats";
import { isWhatsAppConfigured, sendReminder } from "@/lib/whatsapp";

/**
 * Tarea programada (Vercel Cron, ver vercel.json):
 * - libera los horarios de reservas cuya seña no se pagó a tiempo,
 * - manda los recordatorios de los turnos de las próximas 24 hs (si WhatsApp Cloud está configurado).
 * Vercel manda "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const repo = getRepo();
  const now = new Date();
  const expired = await repo.expireHolds(now);

  const due = dueReminders(await repo.listBookings(now, new Date(+now + 25 * 3_600_000)), now);
  let sent = 0;
  const failed: string[] = [];
  if (isWhatsAppConfigured()) {
    const settings = await repo.getSettings();
    for (const b of due) {
      try {
        await sendReminder(b, settings);
        await repo.updateBooking(b.id, { remindedAt: new Date().toISOString() });
        sent++;
      } catch (e) {
        console.error("[recordatorio]", b.id, e);
        failed.push(b.id);
      }
    }
  }

  return NextResponse.json({ expired, due: due.length, sent, failed, whatsapp: isWhatsAppConfigured() });
}
