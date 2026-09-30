import Link from "next/link";
import { connection } from "next/server";
import { BellRing, CalendarX2, Check, ChevronLeft, ChevronRight, MessageCircle, ShieldCheck, Undo2, UserX, X } from "lucide-react";
import { getRepo } from "@/lib/data";
import { duration, money, STATUS } from "@/lib/format";
import { refundText } from "@/lib/messages";
import { prettyPhone, waLink } from "@/lib/phone";
import { dueReminders, monthStats } from "@/lib/stats";
import { addDays, atLocal, isDateStr, localDate, localTime, longDay, relativeDay } from "@/lib/time";
import type { Booking, BookingStatus } from "@/lib/types";
import { StatusBadge } from "@/components/Shell";
import { setStatus } from "../actions";

export default async function Agenda({ searchParams }: PageProps<"/panel">) {
  await connection();
  const sp = await searchParams;
  const now = new Date();
  const today = localDate(now);
  const date = typeof sp.fecha === "string" && isDateStr(sp.fecha) ? sp.fecha : today;
  const repo = getRepo();

  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonth = addDays(`${today.slice(0, 7)}-28`, 4).slice(0, 7) + "-01";
  const [dayList, monthList, upcoming, pendingRefunds] = await Promise.all([
    repo.listBookings(atLocal(date, "00:00"), atLocal(addDays(date, 1), "00:00")),
    repo.listBookings(atLocal(monthStart, "00:00"), atLocal(nextMonth, "00:00")),
    repo.listBookings(now, new Date(+now + 25 * 3_600_000)),
    repo.listBookings(new Date(+now - 60 * 86_400_000), new Date(+now + 90 * 86_400_000)),
  ]);
  const stats = monthStats(monthList);
  const refunds = pendingRefunds.filter((b) => b.status === "reembolsar");
  const toRemind = new Set(dueReminders(upcoming, now).map((b) => b.id));
  const visible = dayList.filter((b) => b.status !== "expirado" && !(b.status === "pendiente_pago" && Date.parse(b.holdUntil!) <= +now));
  const active = visible.filter((b) => b.status !== "cancelado");
  const income = active.reduce((s, b) => s + (b.status === "ausente" ? b.deposit : 0), 0);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Este mes">
        <Stat label="Turnos del mes" value={String(stats.booked)} />
        <Stat label="Ausentismo" value={`${Math.round(stats.noShowRate * 100)}%`} hint={`${stats.noShows} faltaron`} />
        <Stat label="Señas cobradas" value={money(stats.depositsCollected)} />
        <Stat
          label="La seña te cubrió"
          value={money(stats.protectedMoney)}
          hint="de clientes que faltaron"
          highlight
        />
      </section>

      {refunds.length > 0 && (
        <section className="card border-violet-200 bg-violet-50/50 p-4">
          <h2 className="flex items-center gap-2 font-bold text-violet-900"><Undo2 className="size-4" /> Señas para devolver ({refunds.length})</h2>
          <p className="mt-0.5 text-xs text-violet-800">Pagaron tarde y el horario ya estaba tomado. Ofreceles otro horario o devolvé la seña desde Mercado Pago.</p>
          <ul className="mt-3 space-y-2">
            {refunds.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm">
                <span><b>{b.customerName}</b> · {b.serviceName} · {money(b.deposit)}</span>
                <span className="flex gap-2">
                  <a href={waLink(b.customerPhone, refundText(b))} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><MessageCircle className="size-3.5 text-emerald-600" /> Avisar</a>
                  <StatusButton id={b.id} status="cancelado" label="Ya la devolví" icon={<Check className="size-3.5" />} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold first-letter:uppercase">
              {relativeDay(date, now) ? `${relativeDay(date, now)} · ` : ""}{longDay(date)}
            </h1>
            <p className="text-sm text-slate-500">
              {active.length} {active.length === 1 ? "turno" : "turnos"}
              {income > 0 && ` · ${money(income)} en señas de ausentes`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/panel?fecha=${addDays(date, -1)}`} className="btn-ghost btn-sm" aria-label="Día anterior"><ChevronLeft className="size-4" /></Link>
            {date !== today && <Link href="/panel" className="btn-ghost btn-sm">Hoy</Link>}
            <Link href={`/panel?fecha=${addDays(date, 1)}`} className="btn-ghost btn-sm" aria-label="Día siguiente"><ChevronRight className="size-4" /></Link>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-500">
            <CalendarX2 className="size-8 text-slate-300" /> No hay turnos este día.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {visible.map((b) => (
              <BookingRow key={b.id} b={b} now={now} remind={toRemind.has(b.id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${highlight ? "bg-[var(--brand)] text-white" : "card"}`}>
      <p className={`flex items-center gap-1 text-xs font-semibold ${highlight ? "text-indigo-100" : "text-slate-500"}`}>
        {highlight && <ShieldCheck className="size-3.5" />} {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className={`text-xs ${highlight ? "text-indigo-100" : "text-slate-400"}`}>{hint}</p>}
    </div>
  );
}

function StatusButton({ id, status, label, icon, tone = "" }: { id: string; status: BookingStatus; label: string; icon: React.ReactNode; tone?: string }) {
  return (
    <form action={setStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`btn-ghost btn-sm ${tone}`}>{icon} {label}</button>
    </form>
  );
}

function BookingRow({ b, now, remind }: { b: Booking; now: Date; remind: boolean }) {
  const start = new Date(b.startsAt);
  const minutesLong = (Date.parse(b.endsAt) - +start) / 60_000;
  const started = +start <= +now;
  return (
    <li className={`flex flex-wrap items-start gap-4 p-4 ${b.status === "cancelado" ? "opacity-50" : ""}`}>
      <div className="w-14 shrink-0 text-center">
        <p className="text-lg font-extrabold leading-none">{localTime(start)}</p>
        <p className="mt-1 text-[11px] text-slate-400">{duration(minutesLong)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {b.customerName} <span className="font-normal text-slate-500">· {b.serviceName}</span>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <a href={waLink(b.customerPhone, "")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-emerald-700">
            <MessageCircle className="size-3.5" /> {prettyPhone(b.customerPhone)}
          </a>
          {b.paidAt && b.deposit > 0 && <span className="rounded-md bg-emerald-50 px-1.5 text-xs font-semibold text-emerald-700">Seña {money(b.deposit)} ✓</span>}
          {b.status === "pendiente_pago" && b.holdUntil && <span className="text-xs text-amber-700">vence {localTime(new Date(b.holdUntil))} hs</span>}
          {b.remindedAt && b.status === "confirmado" && <span className="text-xs text-slate-400">recordatorio enviado</span>}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <StatusBadge {...STATUS[b.status]} />
        {remind && (
          <a href={`/panel/recordar/${b.id}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm text-indigo-700">
            <BellRing className="size-3.5" /> Recordar
          </a>
        )}
        {b.status === "confirmado" && started && (
          <>
            <StatusButton id={b.id} status="asistio" label="Vino" icon={<Check className="size-3.5" />} tone="text-emerald-700" />
            <StatusButton id={b.id} status="ausente" label="Faltó" icon={<UserX className="size-3.5" />} tone="text-rose-700" />
          </>
        )}
        {(b.status === "confirmado" || b.status === "pendiente_pago") && !started && (
          <StatusButton id={b.id} status="cancelado" label="Cancelar" icon={<X className="size-3.5" />} />
        )}
        {(b.status === "asistio" || b.status === "ausente") && (
          <StatusButton id={b.id} status={b.status === "asistio" ? "ausente" : "asistio"} label={b.status === "asistio" ? "Marcar faltó" : "Marcar vino"} icon={<Undo2 className="size-3.5" />} />
        )}
      </div>
    </li>
  );
}
