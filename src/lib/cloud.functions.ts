/**
 * Protected data gateway for the tables in secure-tables.ts.
 *
 * The browser can no longer read or change these tables directly. Each call
 * verifies the signed session token, loads the caller's permissions on the
 * server, filters what may be read, and authorizes every row before a write
 * is executed with the privileged server client.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { MASTER_ID, loadUser, verifySessionToken } from "./session.server";
import { SECURE_TABLES, type SecureTable } from "./secure-tables";
import {
  DENIED,
  NEED_SIGN_IN,
  PK,
  buildCaller,
  checkWrite,
  filterRead,
  sanitizeWrite,
  type Caller,
  type Row,
  type WriteItem,
} from "./access.server";


const SAVE_FAILED = "تعذر حفظ البيانات، حاول مرة أخرى";
const LOAD_FAILED = "تعذر تحميل البيانات";

async function adminDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function callerFrom(token: string | undefined): Promise<Caller | null> {
  if (!token) return null;
  const s = await verifySessionToken(token);
  if (!s) return null;
  const c=buildCaller(s.userId, await loadUser(s.userId));
  if(c){const db=await adminDb();const {data,error}=await db.from("Screen_Visibility_Rules").select("*");if(error)throw new Error(LOAD_FAILED);c.visibilityRules=data||[];}
  return c;
}

const col = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).max(64);
const scalar = z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]);
const tableEnum = z.enum(SECURE_TABLES);

const castPk = (table: SecureTable, v: unknown) => (table === "Hierarchy_Levels" ? Number(v) : v);

async function fetchAll(db: any, table: SecureTable): Promise<Row[]> {
  const PAGE = 1000;
  let out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw error;
    out = out.concat(data || []);
    if (!data || data.length < PAGE) break;
  }
  return out;
}

// ------------------------------------------------------------ write core

async function doUpsert(c: Caller | null, db: any, table: SecureTable, raw: Row[], conflict: string, returning: boolean) {
  const rows = raw.map((r) => sanitizeWrite(table, r));
  const keys = [...new Set(rows.map((r) => r[conflict]).filter((v) => v != null && v !== ""))];
  const existing = new Map<string, Row>();
  if (keys.length) {
    const { data, error } = await db.from(table).select("*").in(conflict, keys);
    if (error) throw error;
    for (const r of data || []) existing.set(String(r[conflict]), r);
  }
  const items: WriteItem[] = rows.map((r) => {
    const prev = r[conflict] != null ? existing.get(String(r[conflict])) : undefined;
    return prev ? { kind: "e", prev, next: { ...prev, ...r } } : { kind: "a", next: r };
  });
  const denied = await checkWrite(c, db, table, items);
  if (denied) return { data: null, error: denied };
  if (!rows.length) return { data: [], error: null };
  let q = db.from(table).upsert(rows, { onConflict: conflict });
  if (returning) q = q.select();
  const { data, error } = await q;
  if (error) return { data: null, error: error.message || SAVE_FAILED };
  return { data: returning ? await filterRead(c, db, table, data || []) : null, error: null };
}

async function doInsert(c: Caller | null, db: any, table: SecureTable, raw: Row[], returning: boolean) {
  const rows = raw.map((r) => sanitizeWrite(table, r));
  const denied = await checkWrite(c, db, table, rows.map((r) => ({ kind: "a" as const, next: r })));
  if (denied) return { data: null, error: denied };
  let q = db.from(table).insert(rows);
  if (returning) q = q.select();
  const { data, error } = await q;
  if (error) return { data: null, error: error.message || SAVE_FAILED };
  return { data: returning ? await filterRead(c, db, table, data || []) : null, error: null };
}

function applyFilters(q: any, filters: { col: string; value: unknown }[]) {
  for (const f of filters) q = f.value === null ? q.is(f.col, null) : q.eq(f.col, f.value);
  return q;
}

async function doUpdate(
  c: Caller | null, db: any, table: SecureTable,
  filters: { col: string; value: unknown }[], patchRaw: Row, returning: boolean,
) {
  if (!filters.length) return { data: null, error: DENIED };
  const patch = sanitizeWrite(table, patchRaw);
  const pk = PK[table];
  delete patch[pk];
  const { data: matches, error } = await applyFilters(db.from(table).select("*"), filters);
  if (error) throw error;
  const rows: Row[] = matches || [];
  const denied = await checkWrite(c, db, table, rows.map((prev) => ({ kind: "e" as const, prev, next: { ...prev, ...patch } })));
  if (denied) return { data: null, error: denied };
  if (!rows.length || !Object.keys(patch).length) return { data: [], error: null };
  let q = db.from(table).update(patch).in(pk, rows.map((r) => r[pk]));
  if (returning) q = q.select();
  const res = await q;
  if (res.error) return { data: null, error: res.error.message || SAVE_FAILED };
  return { data: returning ? await filterRead(c, db, table, res.data || []) : null, error: null };
}

async function doDelete(c: Caller | null, db: any, table: SecureTable, filters: { col: string; value: unknown }[]) {
  if (!filters.length) return { data: null, error: DENIED };
  const pk = PK[table];
  const { data: matches, error } = await applyFilters(db.from(table).select("*"), filters);
  if (error) throw error;
  const rows: Row[] = matches || [];
  const denied = await checkWrite(c, db, table, rows.map((prev) => ({ kind: "d" as const, prev })));
  if (denied) return { data: null, error: denied };
  if (!rows.length) return { data: [], error: null };
  const res = await db.from(table).delete().in(pk, rows.map((r) => r[pk]));
  if (res.error) return { data: null, error: res.error.message || SAVE_FAILED };
  return { data: null, error: null };
}

// ------------------------------------------------------------ bulk sync

/** Load every protected table the caller may see (used by the app-wide sync). */
export const cloudPull = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().max(4000).optional(), tables: z.array(tableEnum).max(64) }))
  .handler(async ({ data }) => {
    const c = await callerFrom(data.token);
    const db = await adminDb();
    const out: Record<string, Row[] | null> = {};
    await Promise.all(
      [...new Set(data.tables)].map(async (t) => {
        try {
          out[t] = await filterRead(c, db, t, await fetchAll(db, t));
        } catch {
          out[t] = null;
        }
      }),
    );
    return { signedIn: !!c, tables: out };
  });

/** Apply a local change set (additions / updates / deletions) for one table. */
export const cloudWrite = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().max(4000).optional(),
      table: tableEnum,
      additions: z.array(z.record(z.string(), z.any())).max(2000).default([]),
      updates: z.array(z.object({ id: scalar, row: z.record(z.string(), z.any()) })).max(2000).default([]),
      deletions: z.array(scalar).max(2000).default([]),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const c = await callerFrom(data.token);
      if (!c) return { ok: false as const, error: NEED_SIGN_IN };
      const db = await adminDb();
      const t = data.table;
      const pk = PK[t];
      if (data.additions.length) {
        const r = await doUpsert(c, db, t, data.additions, pk, false);
        if (r.error) return { ok: false as const, error: r.error };
      }
      for (const u of data.updates) {
        const r = await doUpdate(c, db, t, [{ col: pk, value: castPk(t, u.id) }], u.row, false);
        if (r.error) return { ok: false as const, error: r.error };
      }
      if (data.deletions.length) {
        for (const id of data.deletions) {
          const r = await doDelete(c, db, t, [{ col: pk, value: castPk(t, id) }]);
          if (r.error) return { ok: false as const, error: r.error };
        }
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: SAVE_FAILED };
    }
  });

// ------------------------------------------------------------ query builder backend

export const cloudQuery = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().max(4000).optional(),
      table: tableEnum,
      action: z.enum(["select", "insert", "upsert", "update", "delete"]),
      columns: z.string().max(500).optional(),
      filters: z.array(z.object({ col, value: scalar })).max(10).default([]),
      order: z.object({ col, ascending: z.boolean() }).optional(),
      range: z.tuple([z.number().int().min(0), z.number().int().min(0)]).optional(),
      limit: z.number().int().min(1).max(5000).optional(),
      values: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any())).max(2000)]).optional(),
      onConflict: col.optional(),
      returning: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const c = await callerFrom(data.token);
      const db = await adminDb();
      const t = data.table;
      const asArray = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []) as Row[];

      if (data.action === "select") {
        let q = applyFilters(db.from(t).select("*"), data.filters);
        if (data.order) q = q.order(data.order.col, { ascending: data.order.ascending });
        if (data.range) q = q.range(data.range[0], data.range[1]);
        else if (data.limit) q = q.limit(data.limit);
        const { data: rows, error } = await q;
        if (error) return { data: null, error: LOAD_FAILED };
        let visible = await filterRead(c, db, t, rows || []);
        const cols = (data.columns || "*").split(",").map((s) => s.trim()).filter(Boolean);
        if (cols.length && !cols.includes("*")) {
          visible = visible.map((r) => Object.fromEntries(cols.filter((k) => k in r).map((k) => [k, r[k]])));
        }
        return { data: visible, error: null };
      }

      if (!c) return { data: null, error: NEED_SIGN_IN };
      if (data.action === "insert") return await doInsert(c, db, t, asArray(data.values), !!data.returning);
      if (data.action === "upsert") return await doUpsert(c, db, t, asArray(data.values), data.onConflict || PK[t], !!data.returning);
      if (data.action === "update") {
        if (!data.values || Array.isArray(data.values)) return { data: null, error: DENIED };
        return await doUpdate(c, db, t, data.filters, data.values, !!data.returning);
      }
      return await doDelete(c, db, t, data.filters);
    } catch {
      return { data: null, error: SAVE_FAILED };
    }
  });

// ------------------------------------------------------------ account flows

const DEFAULT_MEMBER_SCREENS = "id,attendance,badges_my,tasks_my,finance_my,profile";
const short = (n = 300) => z.string().max(n).optional().default("");
const newId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const rand = Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 6).toUpperCase();
  return rand + Date.now().toString(36).toUpperCase();
};

/** Public sign-up: always creates a pending member account. */
export const registerAccount = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      First_Name: z.string().min(1).max(60), Father_Name: z.string().min(1).max(60),
      Grandfather_Name: z.string().min(1).max(60), Last_Name: z.string().min(1).max(60),
      Phone: short(30), Has_WhatsApp: z.boolean().optional().default(false), National_ID: short(20),
      Birth_Date: short(20), Gender: short(10), Profile_Photo: short(1000),
      National_ID_Front: short(1000), National_ID_Back: short(1000), Birth_Certificate: short(1000),
      Confession_Father: short(120), Email: z.string().email().max(200), Password: z.string().min(6).max(200),
      Education_Stage: short(40), Parent_Phone: short(30), House_Number: short(40), Street_Name: short(120),
      Sub_Street_Name: short(120), City: short(80), Governorate: short(80),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const db = await adminDb();
      const email = data.Email.trim().toLowerCase();
      if (email === "admin@admin.com") return { ok: false as const, error: "البريد الإلكتروني مستخدم بالفعل" };
      const { data: dup } = await db.from("Users").select("ID").ilike("Email", email).limit(1);
      if (dup && dup.length) return { ok: false as const, error: "البريد الإلكتروني مستخدم بالفعل" };
      const row = {
        ...data,
        ID: newId(),
        Email: data.Email.trim(),
        Role: "Member",
        User_Type: "عضو",
        Rank: "مبتدئ",
        Leader_Rank_ID: "",
        Team_ID: "",
        Patrol_ID: "",
        Status: "Pending",
        Visible_Screens: DEFAULT_MEMBER_SCREENS,
      };
      const { error } = await db.from("Users").insert(row);
      return error ? { ok: false as const, error: SAVE_FAILED } : { ok: true as const };
    } catch {
      return { ok: false as const, error: SAVE_FAILED };
    }
  });

/** Public "forgot password": flags the matching account for the leaders. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().min(3).max(200), phone: z.string().min(3).max(30) }))
  .handler(async ({ data }) => {
    const NO_MATCH = "لا يوجد حساب مطابق للبريد ورقم الهاتف معاً";
    try {
      const db = await adminDb();
      const { data: rows } = await db.from("Users").select("ID, Phone").ilike("Email", data.email.trim().toLowerCase()).limit(1);
      const u = rows?.[0];
      if (!u) return { ok: false as const, error: NO_MATCH };
      const digits = (s: string) => s.replace(/\D/g, "");
      const strip = (s: string) => s.replace(/^0+/, "");
      const a = digits(String(u.Phone || ""));
      const b = digits(data.phone);
      if (!a || !b || strip(a) !== strip(b)) return { ok: false as const, error: NO_MATCH };
      await db.from("Users").update({ Reset_Requested: "True", Reset_Phone: data.phone.trim() }).eq("ID", u.ID);
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: SAVE_FAILED };
    }
  });

/** Signed-in user changes their own password (current one is checked when given). */
export const changeOwnPassword = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().max(4000), current: z.string().max(200).optional(), next: z.string().min(6).max(200) }))
  .handler(async ({ data }) => {
    try {
      const c = await callerFrom(data.token);
      if (!c || c.id === MASTER_ID) return { ok: false as const, error: NEED_SIGN_IN };
      if (data.current != null && data.current !== String(c.user.Password ?? "")) {
        return { ok: false as const, error: "كلمة المرور الحالية غير صحيحة" };
      }
      const db = await adminDb();
      const { error } = await db.from("Users").update({ Password: data.next }).eq("ID", c.id);
      return error ? { ok: false as const, error: SAVE_FAILED } : { ok: true as const };
    } catch {
      return { ok: false as const, error: SAVE_FAILED };
    }
  });
