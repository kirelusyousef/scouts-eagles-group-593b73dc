/**
 * Server-only authorization rules for the protected tables.
 *
 * Identity comes from the signed session token; permissions come from the
 * caller's Users row, which is itself only writable through these rules
 * (no one can change their own role, screens or team without the general
 * leader). Nothing here trusts values sent by the browser.
 */
import { MASTER_ID, type SessionUser } from "./session.server";
import type { SecureTable } from "./secure-tables";

export type Caller = {
  id: string;
  user: SessionUser;
  leader: boolean;
  general: boolean;
  team: string;
  patrol: string;
};

export type Row = Record<string, any>;
export type WriteItem = { kind: "a" | "e" | "d"; prev?: Row; next?: Row };

export const DENIED = "ليست لديك صلاحية لهذه العملية";
export const NEED_SIGN_IN = "انتهت الجلسة، يُرجى تسجيل الدخول مرة أخرى";

/** Primary key of every protected table (server-side truth, never from the client). */
export const PK: Record<SecureTable, string> = {
  Users: "ID",
  Plans: "Plan_ID",
  Plan_Tasks: "Task_ID",
  Treasuries: "Treasury_ID",
  Treasury_Transactions: "Tx_ID",
  Budgets: "Budget_ID",
  Finance: "Transaction_ID",
  Financial_Ledger: "Ledger_ID",
  Attendance: "Attendance_ID",
  Leader_Attendance: "Attendance_ID",
  Unified_Attendance: "Record_ID",
  Patrols: "Patrol_ID",
  Group_Events: "Event_ID",
  History_Log: "Log_ID",
  Change_Log: "Change_ID",
  User_Notifications: "Notification_ID",
  User_Certificates: "Certificate_ID",
  Member_Ranks: "Rank_ID",
  Leader_Ranks_Tasks: "Task_Rank_ID",
  Leader_Structure_Rules: "Rule_ID",
  Hierarchy_Levels: "Level_Number",
  Role_Types: "Role_Type_ID",
  App_Settings: "Setting_ID",
  Auto_Notifications_Config: "Config_ID",
  Stage_Transitions: "id",
  Promotion_Cycles: "id",
  Promotion_Log: "id",
  Profile_Edit_Settings: "id",
  Trainees: "id",
  Trainee_Criteria: "id",
  Trainee_Evaluators: "id",
  Trainee_Evaluations: "id",
  Study_Event_Attendees: "id",
};

const str = (v: unknown) => (v == null ? "" : String(v));
const GENERAL_RE = /قائد\s*عام/;
export const isGeneralish = (r: Row | undefined | null) =>
  !!r && (GENERAL_RE.test(str(r.Rank)) || GENERAL_RE.test(str(r.Leader_Rank_ID)));

export function buildCaller(userId: string, user: SessionUser | null): Caller | null {
  if (!user) return null;
  const status = str(user.Status);
  if (status === "Pending" || status === "Suspended") return null;
  const master = userId === MASTER_ID;
  const leader = master || user.Role === "Leader";
  return {
    id: userId,
    user,
    leader,
    general: master || (leader && isGeneralish(user)),
    team: str(user.Team_ID),
    patrol: str(user.Patrol_ID),
  };
}

// ------------------------------------------------------------ screen perms
// Mirrors the Visible_Screens encoding used by the app ("key" or "key:raed").
const DEFAULT_MEMBER = ["id", "attendance", "badges_my", "tasks_my", "finance_my", "profile"];

function expand(p: string): string {
  let out = p.toLowerCase();
  if (out.includes("w")) {
    if (!out.includes("a")) out += "a";
    if (!out.includes("e")) out += "e";
  }
  return out;
}

export function screenPerms(c: Caller | null, screen: string): string {
  if (!c) return "";
  if (c.general) return "raed";
  const raw = str(c.user.Visible_Screens).trim();
  if (!raw) return c.leader ? "raed" : DEFAULT_MEMBER.includes(screen) ? "raed" : "";
  for (const tok of raw.split(",")) {
    const [k, p] = tok.trim().split(":");
    if ((k || "").trim() === screen) return expand(p == null ? "raed" : p.trim() || "r");
  }
  return "";
}

export const can = (c: Caller | null, screens: string[], letter: "r" | "a" | "e" | "d") =>
  screens.some((s) => {
    const p = screenPerms(c, s);
    return p.includes("r") && p.includes(letter);
  });

// ------------------------------------------------------------ team scope
const scopeTeam = (r: Row) => (str(r.Scope_Type).toLowerCase() === "team" ? str(r.Scope_ID) : "");

/** Tables whose rows belong to one team ("" = group-wide). */
const TEAM_OF: Partial<Record<SecureTable, (r: Row) => string>> = {
  Plans: (r) => str(r.Team_ID),
  Unified_Attendance: (r) => str(r.Team_ID),
  Treasuries: scopeTeam,
  Budgets: scopeTeam,
  Financial_Ledger: scopeTeam,
};

type Db = any;

/** Team ids for child rows that inherit scope from a parent table. */
async function parentTeams(db: Db, table: SecureTable, rows: Row[]): Promise<Map<string, string> | null> {
  if (table === "Plan_Tasks") {
    const ids = [...new Set(rows.map((r) => str(r.Plan_ID)).filter(Boolean))];
    const out = new Map<string, string>();
    if (ids.length) {
      const { data } = await db.from("Plans").select("Plan_ID, Team_ID").in("Plan_ID", ids);
      for (const p of data || []) out.set(str(p.Plan_ID), str(p.Team_ID));
    }
    return out;
  }
  if (table === "Treasury_Transactions") {
    const ids = [
      ...new Set(rows.flatMap((r) => [str(r.Treasury_ID), str(r.Target_Treasury_ID)]).filter(Boolean)),
    ];
    const out = new Map<string, string>();
    if (ids.length) {
      const { data } = await db.from("Treasuries").select("Treasury_ID, Scope_Type, Scope_ID").in("Treasury_ID", ids);
      for (const t of data || []) out.set(str(t.Treasury_ID), scopeTeam(t));
    }
    return out;
  }
  return null;
}

/** Teams a row touches ([""] = group-wide). */
function rowTeams(table: SecureTable, r: Row, parents: Map<string, string> | null): string[] {
  const direct = TEAM_OF[table];
  if (direct) return [direct(r)];
  if (table === "Plan_Tasks") return [parents?.get(str(r.Plan_ID)) ?? ""];
  if (table === "Treasury_Transactions") {
    const a = parents?.get(str(r.Treasury_ID)) ?? "";
    const b = r.Target_Treasury_ID ? parents?.get(str(r.Target_Treasury_ID)) ?? "" : null;
    return b == null ? [a] : [a, b];
  }
  return [""];
}

const isScoped = (t: SecureTable) =>
  !!TEAM_OF[t] || t === "Plan_Tasks" || t === "Treasury_Transactions";

// ------------------------------------------------------------ reads
const PUBLIC_LOOKUPS = new Set<SecureTable>([
  "App_Settings",
  "Hierarchy_Levels",
  "Member_Ranks",
  "Role_Types",
  "Leader_Ranks_Tasks",
  "Leader_Structure_Rules",
]);
const MEMBER_SHARED = new Set<SecureTable>([
  ...PUBLIC_LOOKUPS,
  "Patrols",
  "Group_Events",
  "Trainee_Criteria",
  "Profile_Edit_Settings",
]);
const OWN_COL: Partial<Record<SecureTable, string[]>> = {
  User_Notifications: ["User_ID"],
  Attendance: ["User_ID"],
  Leader_Attendance: ["User_ID"],
  Unified_Attendance: ["User_ID"],
  User_Certificates: ["User_ID"],
  Trainees: ["user_id"],
  Trainee_Evaluations: ["trainee_user_id"],
  Trainee_Evaluators: ["trainee_user_id", "evaluator_user_id"],
  Study_Event_Attendees: ["user_id"],
};

const PUBLIC_USER_FIELDS = [
  "ID", "First_Name", "Father_Name", "Grandfather_Name", "Last_Name", "Profile_Photo", "Gender",
  "User_Type", "Role", "Rank", "Leader_Rank_ID", "Team_ID", "Team_Role_ID", "Committee_ID",
  "Committee_Role_ID", "Status",
];
const MEMBER_VISIBLE_USER_FIELDS = [...PUBLIC_USER_FIELDS, "Patrol_ID", "Phone", "Has_WhatsApp", "Education_Stage"];

const pick = (r: Row, keys: string[]) => {
  const o: Row = {};
  for (const k of keys) if (k in r) o[k] = r[k];
  return o;
};
const withoutPassword = (r: Row) => {
  const { Password: _p, ...rest } = r;
  return rest;
};

/** Filter and project rows the caller is allowed to read. */
export async function filterRead(c: Caller | null, db: Db, table: SecureTable, rows: Row[]): Promise<Row[]> {
  if (table === "Users") {
    if (!c) {
      return rows
        .filter((r) => str(r.User_Type) === "قائد" && str(r.Status) !== "Pending" && str(r.Status) !== "Suspended")
        .map((r) => pick(r, PUBLIC_USER_FIELDS));
    }
    if (c.leader) return rows.map(withoutPassword);
    return rows.map((r) => (str(r.ID) === c.id ? withoutPassword(r) : pick(r, MEMBER_VISIBLE_USER_FIELDS)));
  }
  if (!c) return PUBLIC_LOOKUPS.has(table) ? rows : [];
  if (c.general) return rows;

  if (c.leader) {
    if (table === "Profile_Edit_Settings" || MEMBER_SHARED.has(table)) return rows;
    if (isScoped(table)) {
      const parents = await parentTeams(db, table, rows);
      return rows.filter((r) => rowTeams(table, r, parents).some((t) => t === "" || t === c.team));
    }
    return rows;
  }

  // Members
  if (MEMBER_SHARED.has(table)) return rows;
  if (table === "Finance") {
    const mine = new Set([c.id, c.team, c.patrol].filter(Boolean));
    return rows.filter((r) => str(r.User_ID) === c.id || mine.has(str(r.Target_ID)));
  }
  const cols = OWN_COL[table];
  if (cols) return rows.filter((r) => cols.some((k) => str(r[k]) === c.id));
  return [];
}

// ------------------------------------------------------------ writes
const WRITE_SCREENS: Partial<Record<SecureTable, string[]>> = {
  Plans: ["planning_admin"],
  Plan_Tasks: ["planning_admin", "tasks_admin"],
  Treasuries: ["treasury_admin"],
  Treasury_Transactions: ["treasury_admin"],
  Budgets: ["budgets_admin"],
  Finance: ["finance_admin"],
  Financial_Ledger: ["finance_ledger", "finance_admin"],
  Attendance: ["scanner", "manual", "unified_attendance"],
  Leader_Attendance: ["leader_attendance", "unified_attendance"],
  Unified_Attendance: ["unified_attendance", "manual", "scanner", "leader_attendance"],
  Patrols: ["teams_crud", "leaderboard", "badges_admin", "allocation", "scanner", "manual"],
  Group_Events: ["events_admin"],
  Member_Ranks: ["member_ranks_assign"],
  Leader_Ranks_Tasks: ["leader_ranks_tasks", "role_assignment"],
  Leader_Structure_Rules: ["leader_ranks_tasks", "hierarchy_levels"],
  Hierarchy_Levels: ["hierarchy_levels"],
  Role_Types: ["leader_ranks_tasks", "role_assignment", "hierarchy_levels"],
  App_Settings: ["settings"],
  Auto_Notifications_Config: ["auto_notifications_config"],
  User_Certificates: ["users_manage", "data_verification"],
  Stage_Transitions: ["promotion_admin"],
  Promotion_Cycles: ["promotion_admin"],
  Promotion_Log: ["promotion_admin"],
  Trainees: ["qualification_admin"],
  Trainee_Criteria: ["qualification_admin"],
  Trainee_Evaluators: ["qualification_admin"],
  Trainee_Evaluations: ["qualification_admin"],
  Study_Event_Attendees: ["events_admin"],
};

const USER_ADMIN_SCREENS = [
  "users_manage", "approvals", "password_requests", "allocation", "account_type", "member_ranks_assign",
  "role_assignment", "permissions", "data_verification", "promotion_admin", "teams_crud", "sub_groups_admin",
];
const USER_PRIVILEGED = [
  "Role", "User_Type", "Rank", "Leader_Rank_ID", "Team_ID", "Team_Role_ID", "Committee_ID", "Committee_Role_ID",
  "Patrol_ID", "Status", "Visible_Screens", "Email", "Is_Skipped", "Reset_Requested", "Reset_Phone", "Password",
];
const USER_SELF_FIELDS = ["Profile_Photo", "Has_WhatsApp"];
const USER_FIELD_SCREENS: Record<string, string[]> = {
  Visible_Screens: ["permissions"],
  Role: ["account_type", "permissions"],
  User_Type: ["account_type", "permissions", "users_manage"],
  Is_Skipped: ["account_type", "users_manage"],
  Password: ["password_requests", "users_manage"],
  Reset_Requested: ["password_requests", "users_manage"],
  Reset_Phone: ["password_requests", "users_manage"],
};

export function changedFields(prev: Row, next: Row): string[] {
  return Object.keys(next).filter((k) => {
    const a = prev[k];
    const b = next[k];
    if (typeof a === "object" || typeof b === "object") return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
    return str(a) !== str(b);
  });
}

function checkUser(c: Caller, it: WriteItem): boolean {
  if (it.kind === "a") {
    const n = it.next || {};
    if (!c.leader || !can(c, ["users_manage", "approvals"], "a")) return false;
    if (isGeneralish(n)) return false;
    if (str(n.Role) === "Leader" || str(n.Visible_Screens)) return can(c, ["permissions", "account_type"], "e");
    return true;
  }
  if (it.kind === "d") {
    const p = it.prev || {};
    return c.leader && can(c, ["users_manage"], "d") && str(p.ID) !== c.id && !isGeneralish(p);
  }
  const prev = it.prev || {};
  const next = it.next || {};
  const changed = changedFields(prev, next).filter((k) => k !== "ID");
  if (!changed.length) return true;
  if (str(prev.ID) === c.id) {
    if (changed.every((k) => USER_SELF_FIELDS.includes(k))) return true;
    return c.leader && can(c, USER_ADMIN_SCREENS, "e") && !changed.some((k) => USER_PRIVILEGED.includes(k));
  }
  if (!c.leader || !can(c, USER_ADMIN_SCREENS, "e")) return false;
  if (isGeneralish(prev) || isGeneralish(next)) return false;
  return changed.every((k) => {
    const need = USER_FIELD_SCREENS[k];
    return !need || can(c, need, "e");
  });
}

/** Returns an error message, or null when every item is allowed. */
export async function checkWrite(
  c: Caller | null,
  db: Db,
  table: SecureTable,
  items: WriteItem[],
): Promise<string | null> {
  if (!c) return NEED_SIGN_IN;
  if (!items.length || c.general) return null;

  switch (table) {
    case "Users":
      return items.every((it) => checkUser(c, it)) ? null : DENIED;

    case "History_Log":
    case "Change_Log":
      return items.every((it) => it.kind === "a" || (c.leader && can(c, ["change_log"], "d") && it.kind === "d"))
        ? null
        : DENIED;

    case "User_Notifications":
      return items.every((it) => {
        if (it.kind === "a") return true;
        const own = str(it.prev?.User_ID) === c.id && (!it.next || str(it.next.User_ID) === c.id);
        return own || (c.leader && can(c, ["send_notifications", "notifications_tracking"], it.kind));
      })
        ? null
        : DENIED;

    case "User_Certificates":
      return items.every((it) => {
        const rows = [it.prev, it.next].filter(Boolean) as Row[];
        if (rows.every((r) => str(r.User_ID) === c.id)) return true;
        return c.leader && can(c, WRITE_SCREENS.User_Certificates!, it.kind);
      })
        ? null
        : DENIED;

    case "Profile_Edit_Settings":
      return DENIED;

    case "Trainee_Evaluations": {
      if (!c.leader) return DENIED;
      if (items.every((it) => can(c, ["qualification_admin"], it.kind))) return null;
      const trainees = [
        ...new Set(items.flatMap((it) => [it.prev, it.next]).filter(Boolean).map((r) => str((r as Row).trainee_user_id))),
      ];
      const { data } = await db
        .from("Trainee_Evaluators")
        .select("trainee_user_id")
        .eq("evaluator_user_id", c.id)
        .in("trainee_user_id", trainees);
      const assigned = new Set((data || []).map((r: Row) => str(r.trainee_user_id)));
      return trainees.every((t) => assigned.has(t)) ? null : DENIED;
    }
  }

  if (!c.leader) return DENIED;
  const screens = WRITE_SCREENS[table];
  if (!screens || !items.every((it) => can(c, screens, it.kind))) return DENIED;

  if (isScoped(table)) {
    const rows = items.flatMap((it) => [it.prev, it.next]).filter(Boolean) as Row[];
    const parents = await parentTeams(db, table, rows);
    const groupOk = table === "Unified_Attendance" || !c.team;
    const ok = rows.every((r) => {
      const teams = rowTeams(table, r, parents);
      // Transfers may land in another treasury; one side must be the caller's.
      if (table === "Treasury_Transactions") return teams.some((t) => (t ? t === c.team : groupOk));
      return teams.every((t) => (t ? t === c.team : groupOk));
    });
    if (!ok) return DENIED;
  }
  return null;
}

/** Remove fields the browser must never be able to blank out. */
export function sanitizeWrite(table: SecureTable, row: Row): Row {
  const out = { ...row };
  if (table === "Users") {
    if (out.Password == null || out.Password === "") delete out.Password;
    delete out.Surname;
    delete out["\u200BTeam_Role_ID"];
  }
  return out;
}
