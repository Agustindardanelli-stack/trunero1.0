import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { preferenceBody, verifySignature } from "./mercadopago";

const secret = "secreto-de-prueba";
const sign = (manifest: string) => createHmac("sha256", secret).update(manifest).digest("hex");

describe("verifySignature (webhook de Mercado Pago)", () => {
  const ts = "1704908010";
  const v1 = sign(`id:123456;request-id:req-1;ts:${ts};`);

  it("acepta una firma válida", () => {
    expect(verifySignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "123456", secret })).toBe(true);
  });

  it("rechaza firmas alteradas, otro id u otro secreto", () => {
    expect(verifySignature({ xSignature: `ts=${ts},v1=${v1.replace(/.$/, "0")}`, xRequestId: "req-1", dataId: "123456", secret })).toBe(false);
    expect(verifySignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "999", secret })).toBe(false);
    expect(verifySignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "123456", secret: "otro" })).toBe(false);
    expect(verifySignature({ xSignature: null, xRequestId: "req-1", dataId: "123456", secret })).toBe(false);
    expect(verifySignature({ xSignature: "basura", xRequestId: "req-1", dataId: "123456", secret })).toBe(false);
  });

  it("rechaza notificaciones viejas (replay)", () => {
    const opts = { xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "123456", secret, maxAgeSec: 300 };
    expect(verifySignature({ ...opts, now: 1704908010_000 + 60_000 })).toBe(true);
    expect(verifySignature({ ...opts, now: 1704908010_000 + 3_600_000 })).toBe(false);
  });

  it("pasa a minúsculas los ids alfanuméricos", () => {
    const v = sign(`id:abc123;request-id:r;ts:${ts};`);
    expect(verifySignature({ xSignature: `ts=${ts},v1=${v}`, xRequestId: "r", dataId: "ABC123", secret })).toBe(true);
  });
});

describe("preferenceBody", () => {
  it("vincula el pago al turno y vence junto con la reserva", () => {
    const body = preferenceBody({ bookingId: "t1", title: "Seña · Corte", amount: 4000, expiresAt: "2026-10-02T12:15:00.000Z", baseUrl: "https://x.app" });
    expect(body.external_reference).toBe("t1");
    expect(body.notification_url).toBe("https://x.app/api/mp/webhook");
    expect(body.expiration_date_to).toBe("2026-10-02T12:15:00.000Z");
    expect(body.items[0]).toMatchObject({ unit_price: 4000, currency_id: "ARS" });
  });
});
