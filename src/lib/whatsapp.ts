import "server-only";
import { localDate, localTime, longDay } from "./time";
import type { Booking, Settings } from "./types";

/**
 * Envío automático de recordatorios con la API de WhatsApp Cloud (Meta).
 * Requiere una plantilla aprobada con 4 variables: nombre, servicio, negocio, fecha/hora.
 * Si no está configurado, los recordatorios se mandan con un clic desde el panel.
 */
export const isWhatsAppConfigured = () =>
  Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TEMPLATE);

export async function sendReminder(b: Booking, s: Settings): Promise<void> {
  const when = `${longDay(localDate(new Date(b.startsAt)))} ${localTime(new Date(b.startsAt))} hs`;
  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: b.customerPhone,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE,
        language: { code: "es_AR" },
        components: [
          {
            type: "body",
            parameters: [b.customerName.split(" ")[0], b.serviceName, s.businessName, when].map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp respondió ${res.status}`);
}
