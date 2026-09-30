import Link from "next/link";
import { CalendarDays, Clock, ExternalLink, LogOut, Scissors } from "lucide-react";
import { requirePanel, panelPasswordConfigured } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { logout } from "../actions";

export const metadata = { title: "Panel", robots: { index: false } };

const NAV = [
  { href: "/panel", label: "Agenda", icon: CalendarDays },
  { href: "/panel/servicios", label: "Servicios", icon: Scissors },
  { href: "/panel/horarios", label: "Horarios", icon: Clock },
];

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  await requirePanel();
  const repo = getRepo();
  const settings = await repo.getSettings();

  return (
    <div className="min-h-dvh">
      {repo.mode === "demo" && (
        <p className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
          Modo demo: datos de ejemplo en memoria. Configurá Supabase para usarlo de verdad.
        </p>
      )}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/panel" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-[var(--brand)] text-sm font-extrabold text-white">T</span>
            <span className="hidden font-extrabold sm:inline">{settings.businessName}</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                <Icon className="size-4" /> <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <Link href="/" target="_blank" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Ver página de reservas">
              <ExternalLink className="size-4" />
            </Link>
            {panelPasswordConfigured() && (
              <form action={logout}>
                <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Salir"><LogOut className="size-4" /></button>
              </form>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
