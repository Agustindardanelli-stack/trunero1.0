import { connection } from "next/server";
import { CalendarOff, Save, Trash2 } from "lucide-react";
import { getRepo } from "@/lib/data";
import { localDate, longDay, WEEKDAYS } from "@/lib/time";
import type { Weekday } from "@/lib/types";
import { addBlock, deleteBlock, saveSchedule } from "../../actions";

export const metadata = { title: "Horarios" };

const ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export default async function Schedule({ searchParams }: PageProps<"/panel/horarios">) {
  await connection();
  const sp = await searchParams;
  const repo = getRepo();
  const [s, blocks] = await Promise.all([repo.getSettings(), repo.listBlocks()]);
  const today = localDate(new Date());

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form action={saveSchedule} className="space-y-5">
        <div>
          <h1 className="text-xl font-extrabold">Horarios y reglas</h1>
          <p className="text-sm text-slate-500">Dejá las horas vacías los días que no abrís. Podés cargar dos franjas (mañana y tarde).</p>
        </div>
        {sp.ok && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Guardado.</p>}

        <section className="card divide-y divide-slate-100">
          {ORDER.map((d) => {
            const r = s.hours[d] ?? [];
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 p-3">
                <span className="w-24 text-sm font-bold">{WEEKDAYS[d]}</span>
                {[1, 2].map((k) => (
                  <span key={k} className="flex items-center gap-1 text-sm">
                    <input type="time" name={`d${d}_${k}_from`} defaultValue={r[k - 1]?.from} aria-label={`${WEEKDAYS[d]} franja ${k} desde`} className="input !w-28 !py-1.5" />
                    <span className="text-slate-400">a</span>
                    <input type="time" name={`d${d}_${k}_to`} defaultValue={r[k - 1]?.to} aria-label={`${WEEKDAYS[d]} franja ${k} hasta`} className="input !w-28 !py-1.5" />
                  </span>
                ))}
                {r.length === 0 && <span className="text-xs font-semibold text-slate-400">Cerrado</span>}
              </div>
            );
          })}
        </section>

        <section className="card grid gap-3 p-4 sm:grid-cols-2">
          <Field name="businessName" label="Nombre del negocio" value={s.businessName} />
          <Field name="address" label="Dirección" value={s.address} />
          <Field name="tagline" label="Frase de la página" value={s.tagline} />
          <Field name="whatsapp" label="WhatsApp (549 + número)" value={s.whatsapp} />
          <Field name="slotStepMin" label="Turnos cada (min)" value={s.slotStepMin} type="number" />
          <Field name="minAdvanceMin" label="Anticipación mínima (min)" value={s.minAdvanceMin} type="number" />
          <Field name="maxDaysAhead" label="Reservas hasta (días)" value={s.maxDaysAhead} type="number" />
          <Field name="holdMin" label="Tiempo para pagar la seña (min)" value={s.holdMin} type="number" />
          <Field name="cancelLimitHours" label="Cancelación hasta (hs antes)" value={s.cancelLimitHours} type="number" />
        </section>

        <button className="btn-primary"><Save className="size-4" /> Guardar cambios</button>
      </form>

      <aside className="space-y-3">
        <h2 className="flex items-center gap-2 font-extrabold"><CalendarOff className="size-4" /> Días sin atención</h2>
        <p className="text-sm text-slate-500">Feriados, vacaciones o capacitaciones. Ese día no se ofrecen turnos.</p>
        <form action={addBlock} className="card flex flex-wrap items-end gap-2 p-3">
          <label className="flex-1">
            <span className="label">Fecha</span>
            <input type="date" name="date" required min={today} className="input" />
          </label>
          <label className="flex-1">
            <span className="label">Motivo</span>
            <input name="reason" placeholder="Feriado" className="input" />
          </label>
          <button className="btn-primary">Agregar</button>
        </form>
        <ul className="card divide-y divide-slate-100">
          {blocks.length === 0 && <li className="p-4 text-sm text-slate-400">No hay días bloqueados.</li>}
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span><b className="first-letter:uppercase">{longDay(b.date)}</b>{b.reason && <span className="text-slate-500"> · {b.reason}</span>}</span>
              <form action={deleteBlock}>
                <input type="hidden" name="id" value={b.id} />
                <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Quitar"><Trash2 className="size-4" /></button>
              </form>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Field({ name, label, value, type = "text" }: { name: string; label: string; value: string | number; type?: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input name={name} type={type} defaultValue={value} className="input" />
    </label>
  );
}
