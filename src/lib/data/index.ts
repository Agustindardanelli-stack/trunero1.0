import "server-only";
import { createDemoRepo } from "./demo";
import { createSupabaseRepo } from "./supabase";
import type { Repo } from "./repo";

/** Supabase si hay credenciales; si no, modo demo en memoria. */
export function getRepo(): Repo {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createSupabaseRepo(url, key) : createDemoRepo();
}

export type { Repo } from "./repo";
