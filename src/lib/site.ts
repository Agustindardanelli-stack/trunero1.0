import "server-only";
import { headers } from "next/headers";

/** URL pública del sitio: NEXT_PUBLIC_SITE_URL o el host del request. */
export async function siteUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function siteHost(): Promise<string> {
  return (await siteUrl()).replace(/^https?:\/\//, "");
}
