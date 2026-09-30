import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isPanelAuthed, panelPasswordConfigured } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Ingresar al panel", robots: { index: false } };

export default async function Login() {
  await connection();
  if (await isPanelAuthed()) redirect("/panel");
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="card w-full max-w-sm p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand)]">Turnea</p>
        <h1 className="mt-1 text-xl font-extrabold">Panel del negocio</h1>
        {panelPasswordConfigured() ? (
          <LoginForm />
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Configurá la variable <code className="rounded bg-slate-100 px-1">PANEL_PASSWORD</code> para habilitar el acceso.
          </p>
        )}
      </div>
    </main>
  );
}
