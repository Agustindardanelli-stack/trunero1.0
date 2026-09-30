/**
 * Normaliza un celular argentino al formato de WhatsApp (549 + característica + número).
 * Acepta "358 412-3456", "0358 4123456", "+54 9 358 4123456", "5493584123456".
 * No puede quitar un "15" de forma segura sin conocer la característica, por eso el formulario
 * pide el número "sin 0 ni 15".
 */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9") && d.length === 11) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10) return null;
  return `549${d}`;
}

/** "5493584123456" → "358 412-3456" (para mostrar) */
export function prettyPhone(normalized: string): string {
  const d = normalized.replace(/^549/, "");
  if (d.length !== 10) return normalized;
  return `${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6)}`;
}

export const waLink = (phone: string, text: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
