/**
 * Protected write/read endpoints for the tables that used to be open to
 * anyone on the internet: News, Group_Info and Profile_Edit_Requests.
 *
 * Every handler verifies the signed session token first, then re-checks the
 * caller's role against the Users row, and only then touches the database
 * through the privileged server client. Browser clients can no longer write
 * these tables directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  MASTER_EMAIL,
  MASTER_ID,
  MASTER_PASSWORD,
  issueSessionToken,
  isGeneralLeaderRow,
  isLeaderRow,
  loadUser,
  readClient,
  verifySessionToken,
  type SessionUser,
} from "./session.server";

const SIGN_IN_FAILED = "تعذر التحقق من بيانات الدخول، حاول مرة أخرى";
const NEED_SIGN_IN = "انتهت الجلسة، يُرجى تسجيل الدخول مرة أخرى";
const NEED_LEADER = "هذه العملية متاحة للقادة فقط";
const NEED_GENERAL_LEADER = "هذه العملية متاحة للقائد العام فقط";

/** Load the privileged client only after the caller has been authorized. */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function session(token: string): Promise<{ userId: string } | null> {
  return verifySessionToken(token);
}

// ---------------------------------------------------------------- sign in

export const loginSession = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().min(1), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    try {
      const { data: row, error } = await readClient()
        .from("Users")
        .select("*")
        .ilike("Email", email)
        .maybeSingle();

      if (error) return { ok: false as const, msg: SIGN_IN_FAILED };

      const user = row as SessionUser | null;

      if (!user) {
        if (email === MASTER_EMAIL && data.password === MASTER_PASSWORD) {
          return { ok: true as const, token: await issueSessionToken(MASTER_ID), userId: MASTER_ID };
        }
        return { ok: false as const, msg: "البريد الإلكتروني غير مسجل" };
      }

      if (user.Password !== data.password) {
        return { ok: false as const, msg: "كلمة المرور غير صحيحة" };
      }
      if (user.Status === "Pending") {
        return { ok: false as const, msg: "حسابك بانتظار موافقة القائد" };
      }
      if (user.Status === "Suspended") {
        return { ok: false as const, msg: "تم إيقاف هذا الحساب من قِبل الإدارة" };
      }

      return { ok: true as const, token: await issueSessionToken(String(user.ID)), userId: String(user.ID) };
    } catch {
      return { ok: false as const, msg: SIGN_IN_FAILED };
    }
  });

// ---------------------------------------------------------------- news

const newsDiff = z.object({
  token: z.string(),
  additions: z.array(z.any()).default([]),
  updates: z.array(z.object({ id: z.string(), row: z.any() })).default([]),
  deletions: z.array(z.string()).default([]),
});

/** Apply a news change set for a leader. Replaces the old direct browser write. */
export const pushNewsDiff = createServerFn({ method: "POST" })
  .inputValidator(newsDiff)
  .handler(async ({ data }) => {
    const s = await session(data.token);
    if (!s) return { ok: false as const, error: NEED_SIGN_IN };
    const user = await loadUser(s.userId);
    if (!isLeaderRow(user)) return { ok: false as const, error: NEED_LEADER };

    const db = await admin();
    if (data.additions.length) {
      const { error } = await db.from("News").upsert(data.additions as any, { onConflict: "News_ID" });
      if (error) return { ok: false as const, error: error.message };
    }
    for (const u of data.updates) {
      const payload = { ...(u.row as Record<string, unknown>) };
      delete payload.News_ID;
      const { error } = await db.from("News").update(payload as any).eq("News_ID", u.id);
      if (error) return { ok: false as const, error: error.message };
    }
    for (const id of data.deletions) {
      const { error } = await db.from("News").delete().eq("News_ID", id);
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

// ---------------------------------------------------------------- import

/** Bulk upsert for the two tables that are no longer writable from the browser. */
export const secureImportUpsert = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      table: z.enum(["News", "Group_Info"]),
      rows: z.array(z.any()).min(1),
    }),
  )
  .handler(async ({ data }) => {
    const s = await session(data.token);
    if (!s) return { ok: false as const, error: NEED_SIGN_IN };
    const user = await loadUser(s.userId);
    if (!isGeneralLeaderRow(user)) return { ok: false as const, error: NEED_GENERAL_LEADER };

    const db = await admin();
    const pk = data.table === "News" ? "News_ID" : "ID";
    const { error } = await db.from(data.table).upsert(data.rows as any, { onConflict: pk });
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

// ---------------------------------------------------------------- profile edits

/** Member submits a change request; only currently-editable fields survive. */
export const submitProfileEdit = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), changes: z.any() }))
  .handler(async ({ data }) => {
    const s = await session(data.token);
    if (!s) return { ok: false as const, error: NEED_SIGN_IN };

    const raw = (data.changes ?? {}) as Record<string, unknown>;
    const wanted = Object.keys(raw).filter((k) => typeof raw[k] === "string");
    if (!wanted.length) return { ok: false as const, error: "لم تغيّر أي بيانات" };

    const db = await admin();
    const { data: settings } = await db
      .from("Profile_Edit_Settings")
      .select("editable_fields")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    const editable = new Set<string>(
      Array.isArray((settings as any)?.editable_fields) ? (settings as any).editable_fields : [],
    );
    const allowed = wanted.filter((k) => editable.has(k));
    if (!allowed.length) {
      return { ok: false as const, error: "البيانات المطلوبة غير مسموح بطلب تعديلها" };
    }

    const me = await loadUser(s.userId);
    const changes: Record<string, string> = {};
    const oldValues: Record<string, string> = {};
    for (const k of allowed) {
      changes[k] = String(raw[k]);
      oldValues[k] = String((me as any)?.[k] ?? "");
    }

    const { error } = await db.from("Profile_Edit_Requests").insert({
      user_id: s.userId,
      changes,
      old_values: oldValues,
      status: "pending",
    } as any);

    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

/** Members see their own requests; the general leader sees every request. */
export const listProfileEdits = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const s = await session(data.token);
    if (!s) return { rows: [] as any[], error: NEED_SIGN_IN };
    const user = await loadUser(s.userId);
    const db = await admin();

    let query = db.from("Profile_Edit_Requests").select("*").order("created_at", { ascending: false });
    if (!isGeneralLeaderRow(user)) query = query.eq("user_id", s.userId);

    const { data: rows, error } = await query;
    return { rows: rows ?? [], error: error ? error.message : undefined };
  });

/** General leader approves (applying the stored changes) or rejects a request. */
export const reviewProfileEdit = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string(), approve: z.boolean() }))
  .handler(async ({ data }) => {
    const s = await session(data.token);
    if (!s) return { ok: false as const, error: NEED_SIGN_IN };
    const user = await loadUser(s.userId);
    if (!isGeneralLeaderRow(user)) return { ok: false as const, error: NEED_GENERAL_LEADER };

    const db = await admin();
    const { data: req } = await db
      .from("Profile_Edit_Requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!req) return { ok: false as const, error: "الطلب غير موجود" };
    if ((req as any).status !== "pending") return { ok: false as const, error: "تمت مراجعة هذا الطلب بالفعل" };

    if (data.approve) {
      const { error } = await db.from("Users").update((req as any).changes).eq("ID", (req as any).user_id);
      if (error) return { ok: false as const, error: error.message };
    }

    const { error } = await db
      .from("Profile_Edit_Requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        reviewed_by: s.userId,
        reviewed_at: new Date().toISOString(),
      } as any)
      .eq("id", data.id);

    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });
