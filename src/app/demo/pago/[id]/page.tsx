import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Lock } from "lucide-react";
import { demoPagar } from "@/app/actions";
import { getRepo } from "@/lib/data";
import { money } from "@/lib/format";
import { isMpConfigured } from "@/lib/mercadopago";
import { whenText } from "@/lib/time";

export const metadata = { title: "Pago simulado", robots: { index: false } };

/** Checkout simulado para el modo demo. En producción se usa Mercado Pago Checkout Pro. */
export default async function DemoCheckout({ params }: PageProps<"/demo/pago/[id]">) {
  await connection();
  const { id } = await params;
  const repo = getRepo();
  if (repo.mode !== "demo" || isMpConfigured()) redirect(`/turno/${id}`);
  const [b, settings] = await Promise.all([repo.getBooking(id), repo.getSettings()]);
  if (!b) notFound();
  if (b.status !== "pendiente_pago") redirect(`/turno/${id}`);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#eef3f8] p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="bg-[#009ee3] px-5 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">Checkout simulado · modo demo</p>
          <p className="text-lg font-extrabold">Pagá tu seña</p>
        </div>
        <div className="space-y-3 p-5 text-sm">
          <p className="text-slate-500">{settings.businessName}</p>
          <p><b>{b.serviceName}</b><br /><span className="text-slate-500 first-letter:uppercase">{whenText(b.startsAt)}</span></p>
          <p className="flex items-baseline justify-between border-t border-slate-100 pt-3">
            <span className="text-slate-500">Total a pagar</span>
            <span className="text-2xl font-extrabold">{money(b.deposit)}</span>
          </p>
          <form action={demoPagar}>
            <input type="hidden" name="id" value={b.id} />
            <button className="btn w-full bg-[#009ee3] py-3 text-white hover:brightness-110">
              <Lock className="size-4" /> Pagar (simulado)
            </button>
          </form>
          <Link href={`/turno/${b.id}`} className="block text-center text-xs text-slate-500 hover:underline">
            Volver sin pagar
          </Link>
          <p className="rounded-lg bg-slate-50 p-2 text-[11px] leading-snug text-slate-500">
            En producción acá se abre Mercado Pago. Al aprobarse el pago, Mercado Pago avisa al webhook y el turno se confirma solo.
            Este botón ejecuta exactamente la misma lógica.
          </p>
        </div>
      </div>
    </main>
  );
}
