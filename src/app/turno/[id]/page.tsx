import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CalendarDays, CalendarPlus, Clock, CreditCard, MapPin, MessageCircle, PartyPopper, Timer } from "lucide-react";
import { cancelarTurno, pagarSena } from "@/app/actions";
import { canCancel } from "@/lib/booking";
import { bookingTokenFromCookie } from "@/lib/booking-cookie";
import { getRepo } from "@/lib/data";
import { money, STATUS } from "@/lib/format";
import { customerToBusinessText, googleCalendarUrl } from "@/lib/messages";
import { waLink } from "@/lib/phone";
import { localTime, whenText } from "@/lib/time";
import { tokenMatches } from "@/lib/token";
import { PublicShell, StatusBadge } from "@/components/Shell";

export const metadata = { title: "Tu turno", robots: { index: false } };

export default async function BookingPage({ params, searchParams }: PageProps<"/turno/[id]">) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const repo = getRepo();
  const [booking, settings] = await Promise.all([repo.getBooking(id), repo.getSettings()]);
  if (!booking) notFound();

  const now = new Date();
  const urlToken = typeof sp.t === "string" ? sp.t : null;
  const token = urlToken ?? (await bookingTokenFromCookie(id));
  const owner = tokenMatches(token, booking.manageTokenHash);
  const holdActive = booking.status === "pendiente_pago" && !!booking.holdUntil && Date.parse(booking.holdUntil) > +now;
  const status = STATUS[holdActive || booking.status !== "pendiente_pago" ? booking.status : "expirado"];
  const confirmed = booking.status === "confirmado";

  return (
    <PublicShell settings={settings} demo={repo.mode === "demo"}>
      <section className="card overflow-hidden">
        {confirmed && (
          <div className="flex items-center gap-3 bg-emerald-600 px-5 py-4 text-white">
            <PartyPopper className="size-6 shrink-0" />
            <div>
              <p className="font-extrabold">¡Turno confirmado!</p>
              <p className="text-sm text-emerald-50">
                {booking.paidAt ? `Recibimos tu seña de ${money(booking.deposit)}. ` : ""}Te vamos a mandar un recordatorio por WhatsApp.
              </p>
            </div>
          </div>
        )}
        {holdActive && (
          <div className="flex items-center gap-3 bg-amber-500 px-5 py-4 text-white">
            <Timer className="size-6 shrink-0" />
            <div>
              <p className="font-extrabold">Falta pagar la seña</p>
              <p className="text-sm text-amber-50">Te guardamos el horario hasta las {localTime(new Date(booking.holdUntil!))} hs. Si ya pagaste, puede tardar unos minutos en acreditarse.</p>
            </div>
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-extrabold">{booking.serviceName}</h1>
            <StatusBadge {...status} />
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li className="flex gap-2"><CalendarDays className="size-4 shrink-0 text-slate-400" /> <span className="first-letter:uppercase">{whenText(booking.startsAt)}</span></li>
            <li className="flex gap-2"><Clock className="size-4 shrink-0 text-slate-400" /> hasta las {localTime(new Date(booking.endsAt))} hs</li>
            <li className="flex gap-2"><MapPin className="size-4 shrink-0 text-slate-400" /> {settings.address}</li>
            {owner && <li className="pl-6 text-slate-500">A nombre de {booking.customerName}</li>}
          </ul>

          {booking.status === "expirado" || (booking.status === "pendiente_pago" && !holdActive) ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              La reserva venció porque no se completó el pago de la seña a tiempo.{" "}
              <Link href="/" className="font-semibold text-[var(--brand)]">Sacá un turno nuevo →</Link>
            </p>
          ) : null}
          {booking.status === "reembolsar" && (
            <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">
              Recibimos tu pago, pero el horario se ocupó antes de que se acreditara. El negocio se va a comunicar para devolverte la seña o darte otro horario.
            </p>
          )}

          {owner && (
            <div className="mt-5 flex flex-wrap gap-2">
              {holdActive && (
                <form action={pagarSena}>
                  <input type="hidden" name="id" value={booking.id} />
                  <input type="hidden" name="t" value={urlToken ?? ""} />
                  <button className="btn-primary"><CreditCard className="size-4" /> Pagar seña {money(booking.deposit)}</button>
                </form>
              )}
              {confirmed && (
                <a href={googleCalendarUrl(booking, settings)} target="_blank" rel="noreferrer" className="btn-ghost">
                  <CalendarPlus className="size-4" /> Agregar al calendario
                </a>
              )}
              {settings.whatsapp && ["confirmado", "pendiente_pago", "reembolsar"].includes(booking.status) && (
                <a href={waLink(settings.whatsapp, customerToBusinessText(booking))} target="_blank" rel="noreferrer" className="btn-ghost">
                  <MessageCircle className="size-4 text-emerald-600" /> Escribir al negocio
                </a>
              )}
            </div>
          )}

          {owner && ["confirmado", "pendiente_pago"].includes(booking.status) && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              {canCancel(booking, settings.cancelLimitHours, now) ? (
                <form action={cancelarTurno} className="flex flex-wrap items-center justify-between gap-2">
                  <input type="hidden" name="id" value={booking.id} />
                  <input type="hidden" name="t" value={urlToken ?? ""} />
                  <p className="text-xs text-slate-500">¿No podés ir? Cancelá así el horario le sirve a otra persona.</p>
                  <button className="btn-ghost btn-sm text-rose-700">Cancelar turno</button>
                </form>
              ) : (
                <p className="text-xs text-slate-500">
                  Faltan menos de {settings.cancelLimitHours} hs: para cancelar escribile al negocio por WhatsApp.
                </p>
              )}
              {booking.deposit > 0 && booking.paidAt && (
                <p className="mt-2 text-xs text-slate-400">La seña se descuenta del total. Si cancelás a tiempo, el negocio te la guarda para otro turno.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {owner && (
        <p className="mt-4 text-center text-xs text-slate-400">Guardá esta página: es tu link para ver o cancelar el turno.</p>
      )}
    </PublicShell>
  );
}
