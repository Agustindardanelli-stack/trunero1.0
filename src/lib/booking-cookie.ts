import "server-only";
import { cookies } from "next/headers";

/** El link de gestión del turno se guarda también en una cookie, así al volver de Mercado Pago se puede cancelar. */
const name = (id: string) => `turnea_t_${id.replace(/[^a-zA-Z0-9-]/g, "")}`;

export async function rememberBookingToken(id: string, token: string) {
  (await cookies()).set(name(id), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function bookingTokenFromCookie(id: string) {
  return (await cookies()).get(name(id))?.value ?? null;
}
