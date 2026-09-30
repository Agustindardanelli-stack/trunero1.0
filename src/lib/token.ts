import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Link secreto para ver/cancelar un turno sin crear cuenta. En la base se guarda solo el hash. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(18).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string | undefined | null, hash: string): boolean {
  if (!token) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
