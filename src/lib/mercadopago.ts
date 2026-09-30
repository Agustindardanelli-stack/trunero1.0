/**
 * Integración con Mercado Pago (Checkout Pro) usando la API REST directamente.
 * - createPreference: link de pago de la seña, que vence junto con la reserva del horario.
 * - verifySignature: valida el header x-signature del webhook (HMAC-SHA256).
 * - getPayment: consulta el pago en la API. El webhook nunca confía en el body: siempre re-consulta.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.mercadopago.com";

export const isMpConfigured = () => Boolean(process.env.MP_ACCESS_TOKEN);

function token() {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("Falta MP_ACCESS_TOKEN");
  return t;
}

export type PreferenceInput = {
  bookingId: string;
  title: string;
  amount: number;
  expiresAt: string; // ISO
  baseUrl: string;
};

export function preferenceBody({ bookingId, title, amount, expiresAt, baseUrl }: PreferenceInput) {
  const back = `${baseUrl}/turno/${bookingId}`;
  return {
    items: [{ id: bookingId, title, quantity: 1, unit_price: amount, currency_id: "ARS" }],
    external_reference: bookingId,
    notification_url: `${baseUrl}/api/mp/webhook`,
    back_urls: { success: back, pending: back, failure: back },
    auto_return: "approved",
    expires: true,
    expiration_date_to: expiresAt,
    // Medios de pago en efectivo (Rapipago, etc.) también vencen con la reserva
    date_of_expiration: expiresAt,
    statement_descriptor: "SENA TURNO",
  };
}

export async function createPreference(input: PreferenceInput): Promise<string> {
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `pref-${input.bookingId}`,
    },
    body: JSON.stringify(preferenceBody(input)),
  });
  if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status}`);
  const data = (await res.json()) as { init_point: string };
  return data.init_point;
}

export type MpPayment = {
  id: string;
  status: string; // approved | pending | rejected | refunded | ...
  bookingId: string | null;
  amount: number;
};

export async function getPayment(id: string): Promise<MpPayment> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo consultar el pago ${id} (${res.status})`);
  const p = (await res.json()) as { id: number; status: string; external_reference: string | null; transaction_amount: number };
  return { id: String(p.id), status: p.status, bookingId: p.external_reference, amount: p.transaction_amount };
}

/**
 * Valida la firma del webhook según la documentación de Mercado Pago:
 *   x-signature: "ts=1704908010,v1=<hmac>"
 *   manifest:    "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 *   v1 = HMAC_SHA256(secret, manifest) en hex
 * Si data.id es alfanumérico va en minúsculas. Se rechazan firmas de más de `maxAgeSec`.
 */
export function verifySignature(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
  now?: number;
  maxAgeSec?: number;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = opts;
  if (!xSignature || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false;

  if (opts.maxAgeSec) {
    const tsMs = ts.length > 10 ? Number(ts) : Number(ts) * 1000;
    if (Math.abs((opts.now ?? Date.now()) - tsMs) > opts.maxAgeSec * 1000) return false;
  }

  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifest = `id:${id};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest();
  const got = Buffer.from(v1, "hex");
  return got.length === expected.length && timingSafeEqual(got, expected);
}
