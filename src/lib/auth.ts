import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRepo } from "./data";

/**
 * Acceso al panel con una contraseña (PANEL_PASSWORD). Es un sistema pensado para un negocio,
 * así que no hace falta un sistema de usuarios. La cookie guarda un HMAC, nunca la contraseña.
 * En modo demo, sin contraseña configurada, el panel queda abierto para poder probarlo.
 */
const COOKIE = "turnea_panel";

const sessionValue = (password: string) => createHmac("sha256", password).update("turnea-panel-v1").digest("hex");

export function panelPasswordConfigured() {
  return Boolean(process.env.PANEL_PASSWORD);
}

export async function isPanelAuthed(): Promise<boolean> {
  const password = process.env.PANEL_PASSWORD;
  if (!password) return getRepo().mode === "demo";
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(sessionValue(password));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function requirePanel() {
  if (!(await isPanelAuthed())) redirect("/panel/ingresar");
}

export async function logIn(password: string): Promise<boolean> {
  const expected = process.env.PANEL_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  (await cookies()).set(COOKIE, sessionValue(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function logOut() {
  (await cookies()).delete(COOKIE);
}
