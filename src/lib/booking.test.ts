import { beforeEach, describe, expect, it } from "vitest";
import { applyPayment, canCancel, createBooking } from "./booking";
import { createDemoRepo, resetDemoStore } from "./data/demo";
import { DEMO_SETTINGS } from "./data/seed";
import { addDays, atLocal, localDate, weekday } from "./time";
import { SlotTakenError } from "./types";

// Horario abierto todos los días para que el test no dependa de qué día es hoy
const allWeek = { from: "08:00", to: "22:00" };
const hours = { 0: [allWeek], 1: [allWeek], 2: [allWeek], 3: [allWeek], 4: [allWeek], 5: [allWeek], 6: [allWeek] };

const now = new Date();
const tomorrow = addDays(localDate(now), 1);
const at = (t: string) => atLocal(tomorrow, t);
const input = (serviceId: string, t: string, name = "Juan Pérez") => ({ serviceId, start: at(t), customerName: name, customerPhone: "5493584123456" });

beforeEach(() => resetDemoStore({ settings: { ...DEMO_SETTINGS, hours } }));

describe("createBooking", () => {
  it("con seña queda pendiente y reserva el horario unos minutos", async () => {
    const repo = createDemoRepo();
    const { booking, token } = await createBooking(repo, input("corte", "10:00"), now);
    expect(booking.status).toBe("pendiente_pago");
    expect(Date.parse(booking.holdUntil!) - +now).toBe(15 * 60_000);
    expect(token.length).toBeGreaterThan(20);
    expect(booking.manageTokenHash).not.toContain(token);
  });

  it("sin seña queda confirmado directo", async () => {
    const { booking } = await createBooking(createDemoRepo(), input("barba", "10:00"), now);
    expect(booking.status).toBe("confirmado");
    expect(booking.holdUntil).toBeNull();
  });

  it("no deja reservar un horario superpuesto", async () => {
    const repo = createDemoRepo();
    await createBooking(repo, input("corte", "10:00"), now);
    await expect(createBooking(repo, input("barba", "10:15", "Otro"), now)).rejects.toBeInstanceOf(SlotTakenError);
    await expect(createBooking(repo, input("barba", "10:30", "Otro"), now)).resolves.toBeTruthy();
  });

  it("no acepta horarios fuera de la grilla ni días bloqueados", async () => {
    const repo = createDemoRepo();
    await expect(createBooking(repo, input("corte", "10:07"), now)).rejects.toBeInstanceOf(SlotTakenError);
    await repo.addBlock(tomorrow, "Feriado");
    await expect(createBooking(repo, input("corte", "11:00"), now)).rejects.toBeInstanceOf(SlotTakenError);
  });
});

describe("applyPayment (webhook)", () => {
  it("confirma el turno y es idempotente", async () => {
    const repo = createDemoRepo();
    const { booking } = await createBooking(repo, input("corte", "10:00"), now);
    const ev = { paymentId: "p1", status: "approved", bookingId: booking.id, amount: 4000 };
    expect(await applyPayment(repo, ev, now)).toBe("confirmado");
    expect(await applyPayment(repo, ev, now)).toBe("ya_procesado");
    const saved = await repo.getBooking(booking.id);
    expect(saved).toMatchObject({ status: "confirmado", paymentId: "p1", holdUntil: null });
  });

  it("ignora pagos no aprobados y montos menores a la seña", async () => {
    const repo = createDemoRepo();
    const { booking } = await createBooking(repo, input("corte", "10:00"), now);
    expect(await applyPayment(repo, { paymentId: "p1", status: "rejected", bookingId: booking.id, amount: 4000 }, now)).toBe("ignorado");
    expect(await applyPayment(repo, { paymentId: "p2", status: "approved", bookingId: booking.id, amount: 100 }, now)).toBe("monto_insuficiente");
    expect((await repo.getBooking(booking.id))?.status).toBe("pendiente_pago");
  });

  it("si paga tarde y el horario sigue libre, recupera el turno", async () => {
    const repo = createDemoRepo();
    const { booking } = await createBooking(repo, input("corte", "10:00"), now);
    await repo.updateBooking(booking.id, { status: "expirado" });
    expect(await applyPayment(repo, { paymentId: "p1", status: "approved", bookingId: booking.id, amount: 4000 }, now)).toBe("confirmado");
  });

  it("si paga tarde y otro tomó el horario, queda para devolver la seña", async () => {
    const repo = createDemoRepo();
    const { booking } = await createBooking(repo, input("corte", "10:00"), now);
    await repo.updateBooking(booking.id, { status: "expirado" });
    await createBooking(repo, input("barba", "10:00", "Otro cliente"), now);
    expect(await applyPayment(repo, { paymentId: "p1", status: "approved", bookingId: booking.id, amount: 4000 }, now)).toBe("reembolsar");
    expect((await repo.getBooking(booking.id))?.status).toBe("reembolsar");
  });
});

describe("canCancel", () => {
  it("solo con la anticipación configurada", async () => {
    const { booking } = await createBooking(createDemoRepo(), input("barba", "20:00"), now);
    expect(canCancel(booking, 12, atLocal(tomorrow, "07:00"))).toBe(true);
    expect(canCancel(booking, 12, atLocal(tomorrow, "09:00"))).toBe(false);
    expect(canCancel({ ...booking, status: "asistio" }, 0, now)).toBe(false);
  });
});

it("el día de mañana existe en la semana (sanity)", () => {
  expect(weekday(tomorrow)).toBeGreaterThanOrEqual(0);
});
