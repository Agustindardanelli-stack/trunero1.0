import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SlotTakenError, type Block, type Booking, type Service, type Settings, type WeeklyHours } from "../types";
import type { Repo, ServiceInput } from "./repo";

type Row = Record<string, unknown>;

const toSettings = (r: Row): Settings => ({
  businessName: r.business_name as string,
  tagline: r.tagline as string,
  address: r.address as string,
  whatsapp: r.whatsapp as string,
  hours: r.hours as WeeklyHours,
  slotStepMin: r.slot_step_min as number,
  minAdvanceMin: r.min_advance_min as number,
  maxDaysAhead: r.max_days_ahead as number,
  holdMin: r.hold_min as number,
  cancelLimitHours: r.cancel_limit_hours as number,
});

const SETTINGS_COLS: Record<keyof Settings, string> = {
  businessName: "business_name",
  tagline: "tagline",
  address: "address",
  whatsapp: "whatsapp",
  hours: "hours",
  slotStepMin: "slot_step_min",
  minAdvanceMin: "min_advance_min",
  maxDaysAhead: "max_days_ahead",
  holdMin: "hold_min",
  cancelLimitHours: "cancel_limit_hours",
};

const toService = (r: Row): Service => ({
  id: r.id as string,
  name: r.name as string,
  description: r.description as string,
  durationMin: r.duration_min as number,
  price: r.price as number,
  deposit: r.deposit as number,
  active: r.active as boolean,
  sortOrder: r.sort_order as number,
});

const toBooking = (r: Row): Booking => ({
  id: r.id as string,
  serviceId: r.service_id as string,
  serviceName: r.service_name as string,
  startsAt: new Date(r.starts_at as string).toISOString(),
  endsAt: new Date(r.ends_at as string).toISOString(),
  customerName: r.customer_name as string,
  customerPhone: r.customer_phone as string,
  status: r.status as Booking["status"],
  deposit: r.deposit as number,
  paymentId: (r.payment_id as string) ?? null,
  paidAt: (r.paid_at as string) ?? null,
  holdUntil: (r.hold_until as string) ?? null,
  remindedAt: (r.reminded_at as string) ?? null,
  manageTokenHash: r.manage_token_hash as string,
  createdAt: r.created_at as string,
});

const BOOKING_COLS: Partial<Record<keyof Booking, string>> = {
  serviceId: "service_id",
  serviceName: "service_name",
  startsAt: "starts_at",
  endsAt: "ends_at",
  customerName: "customer_name",
  customerPhone: "customer_phone",
  status: "status",
  deposit: "deposit",
  paymentId: "payment_id",
  paidAt: "paid_at",
  holdUntil: "hold_until",
  remindedAt: "reminded_at",
  manageTokenHash: "manage_token_hash",
};

function toColumns<T extends object>(obj: T, map: Partial<Record<keyof T, string>>): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(obj)) {
    const col = map[k as keyof T];
    if (col && v !== undefined) out[col] = v;
  }
  return out;
}

/** Postgres exclusion_violation → el horario ya está ocupado. */
function check<T>(res: { data: T; error: { code?: string; message: string } | null }): T {
  if (res.error) {
    if (res.error.code === "23P01") throw new SlotTakenError();
    throw new Error(res.error.message);
  }
  return res.data;
}

export function createSupabaseRepo(url: string, serviceKey: string): Repo {
  const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });

  return {
    mode: "supabase",

    async getSettings() {
      const row = check(await db.from("settings").select("*").eq("id", 1).single());
      return toSettings(row as Row);
    },
    async updateSettings(patch) {
      check(await db.from("settings").update(toColumns(patch, SETTINGS_COLS)).eq("id", 1));
    },

    async listServices(opts) {
      let q = db.from("services").select("*").order("sort_order").order("name");
      if (!opts?.includeInactive) q = q.eq("active", true);
      return (check(await q) as Row[]).map(toService);
    },
    async getService(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const row = check(await db.from("services").select("*").eq("id", id).maybeSingle());
      return row ? toService(row as Row) : null;
    },
    async saveService(input: ServiceInput) {
      const row = {
        name: input.name,
        description: input.description,
        duration_min: input.durationMin,
        price: input.price,
        deposit: input.deposit,
        active: input.active,
        sort_order: input.sortOrder,
      };
      const res = input.id
        ? await db.from("services").update(row).eq("id", input.id).select().single()
        : await db.from("services").insert(row).select().single();
      return toService(check(res) as Row);
    },

    async listBlocks() {
      return check(await db.from("blocks").select("*").order("date")) as Block[];
    },
    async addBlock(date, reason) {
      check(await db.from("blocks").upsert({ date, reason }, { onConflict: "date" }));
    },
    async deleteBlock(id) {
      check(await db.from("blocks").delete().eq("id", id));
    },

    async listBookings(from, to) {
      const rows = check(
        await db
          .from("bookings")
          .select("*")
          .gte("starts_at", from.toISOString())
          .lt("starts_at", to.toISOString())
          .order("starts_at"),
      ) as Row[];
      return rows.map(toBooking);
    },
    async getBooking(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const row = check(await db.from("bookings").select("*").eq("id", id).maybeSingle());
      return row ? toBooking(row as Row) : null;
    },
    async getBookingByPayment(paymentId) {
      const row = check(await db.from("bookings").select("*").eq("payment_id", paymentId).maybeSingle());
      return row ? toBooking(row as Row) : null;
    },
    async insertBooking(nb) {
      // Primero se liberan reservas vencidas para que no bloqueen el horario.
      check(await db.rpc("expirar_reservas"));
      const row = check(await db.from("bookings").insert(toColumns(nb, BOOKING_COLS)).select().single());
      return toBooking(row as Row);
    },
    async updateBooking(id, patch) {
      const row = check(
        await db.from("bookings").update(toColumns(patch, BOOKING_COLS)).eq("id", id).select().single(),
      );
      return toBooking(row as Row);
    },
    async expireHolds() {
      return (check(await db.rpc("expirar_reservas")) as number) ?? 0;
    },
  };
}
