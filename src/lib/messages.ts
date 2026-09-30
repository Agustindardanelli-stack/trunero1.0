import { money } from "./format";
import { localDate, localTime, longDay } from "./time";
import type { Booking, Settings } from "./types";

const when = (b: Booking) => `${longDay(localDate(new Date(b.startsAt)))} a las ${localTime(new Date(b.startsAt))} hs`;

export function reminderText(b: Booking, s: Settings, manageUrl?: string) {
  const first = b.customerName.split(" ")[0];
  return [
    `Hola ${first}! Te recordamos tu turno de *${b.serviceName}* en ${s.businessName} el ${when(b)}.`,
    `📍 ${s.address}`,
    manageUrl ? `Si no podés venir, cancelalo acá: ${manageUrl}` : "Si no podés venir, avisanos por acá. ¡Gracias!",
  ].join("\n");
}

export function customerToBusinessText(b: Booking) {
  return `Hola! Soy ${b.customerName}, tengo turno de ${b.serviceName} el ${when(b)}.`;
}

export function refundText(b: Booking) {
  const first = b.customerName.split(" ")[0];
  return `Hola ${first}! Recibimos tu seña de ${money(b.deposit)}, pero el horario del ${when(b)} se ocupó antes de que se acreditara el pago. Te la devolvemos o, si preferís, te reservamos otro horario. ¿Qué te queda mejor?`;
}

/** Link para agregar el turno a Google Calendar. */
export function googleCalendarUrl(b: Booking, s: Settings) {
  const fmt = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${b.serviceName} · ${s.businessName}`,
    dates: `${fmt(b.startsAt)}/${fmt(b.endsAt)}`,
    location: s.address,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
