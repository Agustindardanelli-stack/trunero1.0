import Link from "next/link";
import { MapPin, MessageCircle } from "lucide-react";
import type { Settings } from "@/lib/types";

export function PublicShell({ settings, children, demo }: { settings: Settings; children: React.ReactNode; demo?: boolean }) {
  return (
    <div className="min-h-dvh">
      {demo && (
        <p className="bg-slate-900 px-4 py-2 text-center text-xs text-slate-200">
          Modo demo: los pagos son simulados y los datos se reinician. <Link href="/panel" className="font-semibold underline">Ver el panel del negocio →</Link>
        </p>
      )}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[var(--brand)] text-lg font-extrabold text-white">
              {settings.businessName.charAt(0)}
            </span>
            <span>
              <span className="block font-extrabold leading-tight">{settings.businessName}</span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="size-3" /> {settings.address}
              </span>
            </span>
          </Link>
          {settings.whatsapp && (
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              <MessageCircle className="size-4 text-emerald-600" /> Consultas
            </a>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 pt-4 text-center text-xs text-slate-400">
        Turnos online con <b className="text-slate-500">Turnea</b> · <Link href="/panel" className="hover:underline">Panel del negocio</Link>
      </footer>
    </div>
  );
}

const STEPS = ["Servicio", "Día y hora", "Tus datos", "Seña"];

export function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-5 flex items-center gap-2 text-xs font-semibold">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={`grid size-6 place-items-center rounded-full ${
              i < current ? "bg-[var(--brand)] text-white" : i === current ? "bg-indigo-100 text-[var(--brand)] ring-2 ring-[var(--brand)]" : "bg-slate-100 text-slate-400"
            }`}
          >
            {i + 1}
          </span>
          <span className={`hidden sm:inline ${i === current ? "text-slate-900" : "text-slate-400"}`}>{s}</span>
          {i < STEPS.length - 1 && <span className="h-px w-4 bg-slate-200 sm:w-8" />}
        </li>
      ))}
    </ol>
  );
}

export function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tone}`}>{label}</span>;
}
