import { connection } from "next/server";
import { Plus, Save } from "lucide-react";
import { getRepo } from "@/lib/data";
import type { Service } from "@/lib/types";
import { saveService } from "../../actions";

export const metadata = { title: "Servicios" };

export default async function Services({ searchParams }: PageProps<"/panel/servicios">) {
  await connection();
  const sp = await searchParams;
  const services = await getRepo().listServices({ includeInactive: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Servicios</h1>
        <p className="text-sm text-slate-500">La duración define cuánto ocupa cada turno. Con seña en $0 el turno se confirma sin pagar.</p>
      </div>
      {sp.ok && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Guardado.</p>}
      {sp.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Revisá los datos: nombre de 2 a 60 letras, duración entre 5 y 480 minutos.</p>}

      <ul className="space-y-3">
        {services.map((s) => (
          <li key={s.id}><ServiceForm s={s} /></li>
        ))}
      </ul>

      <details className="card p-4">
        <summary className="flex cursor-pointer items-center gap-2 font-bold"><Plus className="size-4" /> Agregar servicio</summary>
        <div className="mt-4"><ServiceForm /></div>
      </details>
    </div>
  );
}

function ServiceForm({ s }: { s?: Service }) {
  return (
    <form action={saveService} className={`${s ? "card" : ""} grid gap-3 ${s ? "p-4" : ""} sm:grid-cols-6`}>
      {s && <input type="hidden" name="id" value={s.id} />}
      <label className="sm:col-span-2">
        <span className="label">Nombre</span>
        <input name="name" required defaultValue={s?.name} className="input" />
      </label>
      <label>
        <span className="label">Duración (min)</span>
        <input name="durationMin" type="number" min={5} max={480} step={5} required defaultValue={s?.durationMin ?? 30} className="input" />
      </label>
      <label>
        <span className="label">Precio $</span>
        <input name="price" type="number" min={0} step={100} required defaultValue={s?.price} className="input" />
      </label>
      <label>
        <span className="label">Seña $</span>
        <input name="deposit" type="number" min={0} step={100} defaultValue={s?.deposit ?? 0} className="input" />
      </label>
      <label>
        <span className="label">Orden</span>
        <input name="sortOrder" type="number" defaultValue={s?.sortOrder ?? 0} className="input" />
      </label>
      <label className="sm:col-span-4">
        <span className="label">Descripción</span>
        <input name="description" maxLength={200} defaultValue={s?.description} className="input" />
      </label>
      <div className="flex items-end justify-between gap-3 sm:col-span-2">
        <label className="flex items-center gap-2 pb-2.5 text-sm font-semibold">
          <input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="size-4 accent-[var(--brand)]" /> Visible
        </label>
        <button className="btn-primary"><Save className="size-4" /> Guardar</button>
      </div>
    </form>
  );
}
