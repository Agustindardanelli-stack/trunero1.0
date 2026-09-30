import { NextResponse, type NextRequest } from "next/server";
import { applyPayment } from "@/lib/booking";
import { getRepo } from "@/lib/data";
import { getPayment, isMpConfigured, verifySignature } from "@/lib/mercadopago";

/**
 * Notificaciones de Mercado Pago.
 * 1. Valida la firma (x-signature) si hay MP_WEBHOOK_SECRET.
 * 2. No confía en el contenido: consulta el pago en la API de Mercado Pago.
 * 3. Aplica el pago al turno de forma idempotente.
 * Responde 500 ante errores transitorios para que Mercado Pago reintente.
 */
export async function POST(req: NextRequest) {
  const url = req.nextUrl;
  const body = (await req.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } };
  const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = String(url.searchParams.get("data.id") ?? body.data?.id ?? url.searchParams.get("id") ?? "");

  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true, ignored: true });

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    const valid = verifySignature({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
      secret,
      maxAgeSec: 60 * 60,
    });
    if (!valid) return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }
  if (!isMpConfigured()) return NextResponse.json({ error: "Mercado Pago no configurado" }, { status: 503 });

  try {
    const payment = await getPayment(dataId);
    const result = await applyPayment(
      getRepo(),
      { paymentId: payment.id, status: payment.status, bookingId: payment.bookingId, amount: payment.amount },
      new Date(),
    );
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[webhook mp]", e);
    return NextResponse.json({ error: "reintentar" }, { status: 500 });
  }
}
