"use client";

import { useActionState, startTransition } from "react";
import { Loader2, Lock } from "lucide-react";
import { reservar, type FormState } from "@/app/actions";

export function BookingForm({ serviceId, start, deposit, depositLabel }: { serviceId: string; start: number; deposit: number; depositLabel: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reservar, {});

  return (
    <form
      onSubmit={(e) => {
        // React 19 resetea el form al usar `action`; así se conservan los datos si hay error.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
    >
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="start" value={start} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <label className="block">
        <span className="label">Nombre y apellido</span>
        <input name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={state.fields?.name} placeholder="Ej: Juan Pérez" className="input" />
      </label>
      <label className="block">
        <span className="label">Celular (WhatsApp)</span>
        <input
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel-national"
          defaultValue={state.fields?.phone}
          placeholder="358 412-3456"
          className="input"
        />
        <span className="mt-1 block text-xs text-slate-500">Con característica, sin 0 ni 15. Te mandamos el recordatorio por acá.</span>
      </label>

      {state.error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}

      <button disabled={pending} className="btn-primary w-full py-3 text-base">
        {pending ? <Loader2 className="size-4 animate-spin" /> : deposit > 0 ? <Lock className="size-4" /> : null}
        {deposit > 0 ? `Pagar seña de ${depositLabel}` : "Confirmar turno"}
      </button>
      {deposit > 0 && (
        <p className="text-center text-xs text-slate-500">Pagás con Mercado Pago. Tu horario queda reservado mientras completás el pago.</p>
      )}
    </form>
  );
}
