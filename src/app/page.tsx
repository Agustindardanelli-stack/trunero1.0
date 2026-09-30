import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Clock, ShieldCheck } from "lucide-react";
import { getRepo } from "@/lib/data";
import { duration, money } from "@/lib/format";
import { PublicShell, Steps } from "@/components/Shell";

export default async function Home() {
  await connection();
  const repo = getRepo();
  const [settings, services] = await Promise.all([repo.getSettings(), repo.listServices()]);

  return (
    <PublicShell settings={settings} demo={repo.mode === "demo"}>
      <Steps current={0} />
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Reservá tu turno</h1>
      <p className="mt-1 text-slate-600">{settings.tagline}</p>

      <ul className="mt-6 space-y-3">
        {services.map((s) => (
          <li key={s.id}>
            <Link
              href={`/reservar/${s.id}`}
              className="card group flex items-center gap-4 p-4 transition hover:border-indigo-300 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold">{s.name}</p>
                {s.description && <p className="mt-0.5 text-sm text-slate-500">{s.description}</p>}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold">{money(s.price)}</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="size-3.5" /> {duration(s.durationMin)}
                  </span>
                  {s.deposit > 0 && (
                    <span className="flex items-center gap-1 text-indigo-700">
                      <ShieldCheck className="size-3.5" /> Seña {money(s.deposit)}
                    </span>
                  )}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]" />
            </Link>
          </li>
        ))}
      </ul>

      {services.some((s) => s.deposit > 0) && (
        <p className="mt-6 rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900">
          <b>¿Por qué una seña?</b> Así tu horario queda asegurado para vos. Se descuenta del total el día del turno.
          Podés cancelar desde tu link hasta {settings.cancelLimitHours} hs antes.
        </p>
      )}
    </PublicShell>
  );
}
