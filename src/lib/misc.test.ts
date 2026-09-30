import { describe, expect, it } from "vitest";
import { normalizePhone, prettyPhone } from "./phone";
import { dueReminders, monthStats } from "./stats";
import type { Booking } from "./types";

describe("normalizePhone", () => {
  it.each([
    ["358 412-3456", "5493584123456"],
    ["0358 4123456", "5493584123456"],
    ["+54 9 358 412 3456", "5493584123456"],
    ["5493584123456", "5493584123456"],
    ["11 5555-1234", "5491155551234"],
  ])("%s → %s", (input, out) => expect(normalizePhone(input)).toBe(out));

  it("rechaza números incompletos", () => {
    expect(normalizePhone("412345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("formatea para mostrar", () => expect(prettyPhone("5493584123456")).toBe("358 412-3456"));
});

const b = (status: Booking["status"], extra: Partial<Booking> = {}): Booking => ({
  id: Math.random().toString(), serviceId: "s", serviceName: "S", customerName: "X", customerPhone: "",
  startsAt: "2026-10-02T12:00:00.000Z", endsAt: "2026-10-02T12:30:00.000Z", status, deposit: 4000,
  paymentId: null, paidAt: null, holdUntil: null, remindedAt: null, manageTokenHash: "", createdAt: "", ...extra,
});

describe("monthStats", () => {
  it("calcula ausentismo y plata protegida por la seña", () => {
    const s = monthStats([
      b("asistio", { paidAt: "x" }), b("asistio", { paidAt: "x" }), b("asistio"),
      b("ausente", { paidAt: "x" }), b("cancelado"), b("expirado"), b("reembolsar", { paidAt: "x" }),
    ]);
    expect(s.booked).toBe(4);
    expect(s.noShowRate).toBeCloseTo(0.25);
    expect(s.depositsCollected).toBe(12000);
    expect(s.protectedMoney).toBe(4000);
    expect(s.toRefund).toBe(1);
  });
});

describe("dueReminders", () => {
  it("solo confirmados de las próximas 24 hs sin recordatorio", () => {
    const now = new Date("2026-10-01T15:00:00.000Z");
    const list = [
      b("confirmado"), // mañana 12:00 UTC → entra
      b("confirmado", { remindedAt: "x" }),
      b("pendiente_pago"),
      b("confirmado", { startsAt: "2026-10-05T12:00:00.000Z" }),
      b("confirmado", { startsAt: "2026-10-01T14:00:00.000Z" }), // ya pasó
    ];
    expect(dueReminders(list, now)).toHaveLength(1);
  });
});
