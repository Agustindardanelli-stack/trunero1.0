import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import { getRepo } from "@/lib/data";
import { duration, money } from "@/lib/format";
import { busyIntervals, isSlotAvailable } from "@/lib/slots";
import { localDate, whenText } from "@/lib/time";
import { PublicShell, Steps } from "@/components/Shell";
import { BookingForm } from "./BookingForm";

export const metadata = { title: "Tus datos" };

export default async function Details({ params, searchParams }: PageProps<"/reservar/[serviceId]/datos">) {
  await connection();
  const { serviceId } = await params;
  const sp = await searchParams;
  const start = Number(sp.inicio);
  const repo = getRepo();
  const [settings, service, blocks] = await Promise.all([repo.getSettings(), repo.getService(serviceId), repo.listBlocks()]);
  if (!service || !service.active) notFound();
  if (!Number.isFinite(start) || start <= 0) redirect(`/reservar/${serviceId}`);

  const now = new Date();
  const around = await repo.listBookings(new Date(start - 86_400_000), new Date(start + 86_400_000));
  const free = isSlotAvailable(
    { durationMin: service.durationMin, settings, busy: busyIntervals(around, now), blockedDates: blocks.map((b) => b.date), now },
    new Date(start),
  );
  const back = `/reservar/${service.id}?fecha=${localDate(start)}`;

  return (
    <PublicShell settings={settings} demo={repo.mode === "demo"}>
      <Steps current={2} />
      <Link href={back} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Cambiar horario
      </Link>

      <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
        <aside className="card h-fit p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tu turno</p>
          <p className="mt-1 text-lg font-extrabold">{service.name}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li className="flex gap-2 first-letter:uppercase"><CalendarDays className="size-4 shrink-0 text-slate-400" /> <span className="first-letter:uppercase">{whenText(new Date(start).toISOString())}</span></li>
            <li className="flex gap-2"><Clock className="size-4 shrink-0 text-slate-400" /> {duration(service.durationMin)}</li>
            <li className="flex gap-2"><MapPin className="size-4 shrink-0 text-slate-400" /> {settings.address}</li>
          </ul>
          <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Total</dt><dd className="font-semibold">{money(service.price)}</dd></div>
            {service.deposit > 0 && (
              <>
                <div className="flex justify-between text-indigo-700"><dt>Seña ahora</dt><dd className="font-bold">{money(service.deposit)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Pagás en el local</dt><dd>{money(service.price - service.deposit)}</dd></div>
              </>
            )}
          </dl>
        </aside>

        <section className="card p-5">
          {free ? (
            <>
              <h1 className="mb-4 text-lg font-extrabold">Completá tus datos</h1>
              <BookingForm serviceId={service.id} start={start} deposit={service.deposit} depositLabel={money(service.deposit)} />
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="font-bold">Ese horario ya no está disponible</p>
              <p className="mt-1 text-sm text-slate-500">Alguien lo reservó recién. Elegí otro, hay más lugares.</p>
              <Link href={back} className="btn-primary mt-4">Ver horarios</Link>
            </div>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
