"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block">
        <span className="label">Contraseña</span>
        <input type="password" name="password" required autoFocus autoComplete="current-password" className="input" />
      </label>
      {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />} Ingresar
      </button>
    </form>
  );
}
