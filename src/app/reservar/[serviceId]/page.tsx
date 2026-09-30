import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CalendarOff } from "lucide-react";
import { getRepo } from "@/lib/data";
import { duration, money } from "@/lib/format";
import { availableSlots, busyIntervals, upcomingDays } from "@/lib/slots";
import { isDateStr, localTime, longDay, relativeDay, shortDay } from "@/lib/time";
import { PublicShell, Steps } from "@/components/Shell";

export const metadata = { title: "Elegí día y hora" };

export default async function PickSlot({ params, searchParams }: PageProps<"/reservar/[serviceId]">) {
  await connection();
  const { serviceId } = await params;
  const sp = await searchParams;
  const repo = getRepo();
  const [settings, service, blocks] = await Promise.all([repo.getSettings(), repo.getService(serviceId), repo.listBlocks()]);
  if (!service || !service.active) notFound();

  const now = new Date();
  const bookings = await repo.listBookings(new Date(+now - 86_400_000), new Date(+now + (settings.maxDaysAhead + 2) * 86_400_000));
  const q = {
    durationMin: service.durationMin,
    settings,
    busy: busyIntervals(bookings, now),
    blockedDates: blocks.map((b) => b.date),
    now,
  };
  const days = upcomingDays(q);
  const requested = typeof sp.fecha === "string" && isDateStr(sp.fecha) ? sp.fecha : null;
  const date = requested ?? days.find((d) => d.count > 0)?.date ?? days[0].date;
  const slots = availableSlots({ ...q, date });
  const nextDay = days.find((d) => d.count > 0 && d.date > date);
  const morning = slots.filter((s) => localTime(s) < "13:00");
  const afternoon = slots.filter((s) => localTime(s) >= "13:00");

  return (
    <PublicShell settings={settings} demo={repo.mode === "demo"}>
      <Steps current={1} />
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Cambiar servicio
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">{service.name}</h1>
      <p className="text-sm text-slate-500">
        {duration(service.durationMin)} · {money(service.price)}
        {service.deposit > 0 && ` · seña ${money(service.deposit)}`}
      </p>

      <nav aria-label="Días" className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const active = d.date === date;
          const [dow, num, mon] = shortDay(d.date).split(" ");
          return (
            <Link
              key={d.date}
              href={`/reservar/${service.id}?fecha=${d.date}`}
              scroll={false}
              aria-current={active ? "date" : undefined}
              aria-disabled={d.count === 0}
              className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2 text-center transition ${
                active
                  ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                  : d.count === 0
                    ? "pointer-events-none border-slate-100 bg-slate-50 text-slate-300"
                    : "border-slate-200 bg-white hover:border-indigo-300"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase">{dow}</span>
              <span className="text-xl font-extrabold leading-tight">{num}</span>
              <span className="text-[11px]">{mon}</span>
            </Link>
          );
        })}
      </nav>

      <section className="card mt-4 p-4 sm:p-5">
        <h2 className="font-bold first-letter:uppercase">
          {relativeDay(date, now) ? `${relativeDay(date, now)}, ` : ""}
          {longDay(date)}
        </h2>
        {slots.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500">
            <CalendarOff className="size-8 text-slate-300" />
            {blocks.some((b) => b.date === date) ? "Ese día no atendemos." : "No quedan horarios para este día."}
            {nextDay && (
              <Link href={`/reservar/${service.id}?fecha=${nextDay.date}`} className="font-semibold text-[var(--brand)]">
                Ver el próximo día con lugar →
              </Link>
            )}
          </div>
        ) : (
          [
            ["Por la mañana", morning],
            ["Por la tarde", afternoon],
          ].map(([label, list]) =>
            (list as Date[]).length ? (
              <div key={label as string} className="mt-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{label as string}</h3>
                <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {(list as Date[]).map((s) => (
                    <li key={+s}>
                      <Link
                        href={`/reservar/${service.id}/datos?inicio=${+s}`}
                        className="block rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold transition hover:border-[var(--brand)] hover:bg-indigo-50 hover:text-[var(--brand)]"
                      >
                        {localTime(s)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )
        )}
      </section>
    </PublicShell>
  );
}
