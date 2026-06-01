// LocalStorage-backed mock DB. Object keys mirror the EXACT Google Sheets
// column names so swapping `read/write` for Sheet Best / Stein / Apps Script
// calls is a 1:1 replacement.
//
// Schema (Google Sheets):
//   Users           → ID, First_Name, Father_Name, Grandfather_Name, Last_Name,
//                     Phone, Has_WhatsApp, National_ID, Confession_Father, Email,
//                     Password, Education_Stage, Parent_Phone, Role, Rank,
//                     Team_ID, Patrol_ID, Status
//   Teams           → Team_ID, Team_Name, Leader_In_Charge
//   Patrols         → Patrol_ID, Patrol_Name, Team_ID, Patrol_Leader_Name, Total_Points
//   Attendance      → Attendance_ID, Date, Activity_Type, User_ID, Status, Notes
//   Finance         → Transaction_ID, Title, Amount, Target_Type, Target_ID,
//                     User_ID, Payment_Status
//   History_Log     → Log_ID, Timestamp, User_ID, Action_Type, Details, Admin_Name
//
// Local-only feature sheets (not in the user's schema, kept for app features):
//   Badges, Notices, Tasks, Educator_Notes, Settings

export type Role = "Member" | "Leader";
export type UserStatus = "Active" | "Pending";
export type AttendanceStatus = "حاضر" | "عذر" | "غائب";
export type PaymentStatus = "Paid" | "Partial" | "Unpaid";
export type TargetType = "Global" | "Team";

export interface User {
  ID: string;
  First_Name: string;
  Father_Name: string;
  Grandfather_Name: string;
  Last_Name: string;
  Phone: string;
  Has_WhatsApp: boolean;
  National_ID: string;
  Confession_Father: string;
  Email: string;
  Password: string;
  Education_Stage: string;
  Parent_Phone: string;
  Role: Role;
  Rank: string;
  Team_ID: string;
  Patrol_ID: string;
  Status: UserStatus;
}

export interface Team {
  Team_ID: string;
  Team_Name: string;
  Leader_In_Charge: string;
}

export interface Patrol {
  Patrol_ID: string;
  Patrol_Name: string;
  Team_ID: string;
  Patrol_Leader_Name: string;
  Total_Points: number;
}

export interface AttendanceRecord {
  Attendance_ID: string;
  Date: string;
  Activity_Type: string;
  User_ID: string;
  Status: AttendanceStatus;
  Notes: string;
}

export interface FinanceRecord {
  Transaction_ID: string;
  Title: string;
  Amount: number;
  Target_Type: TargetType;
  Target_ID: string;   // Team_ID when Target_Type='Team', empty when 'Global'
  User_ID: string;     // empty for collective entries
  Payment_Status: PaymentStatus;
  Date: string;
}

export interface HistoryLog {
  Log_ID: string;
  Timestamp: string;
  User_ID: string;
  Action_Type: string;
  Details: string;
  Admin_Name: string;
}

// ---- Local-only feature tables ----
export interface Badge {
  Badge_ID: string;
  User_ID: string;
  Name: string;
  Status: "Requested" | "Granted" | "Rejected";
  Date: string;
}

export interface Notice {
  Notice_ID: string;
  Title: string;
  Body: string;
  Team_IDs: string[];
  Created_At: string;
  Read_By: string[];
}

export interface Task {
  Task_ID: string;
  Title: string;
  Description: string;
  Patrol_ID: string;
  Done_By: string[];
  Created_At: string;
}

export interface EducatorNote {
  Note_ID: string;
  User_ID: string;
  Note: string;
  Author: string;
  Timestamp: string;
}

export interface Settings {
  Group_Name: string;
  Logo: string;
}

import { sheet, notifyApiError } from "./api";

const KEYS = {
  users: "sms_Users",
  teams: "sms_Teams",
  patrols: "sms_Patrols",
  attendance: "sms_Attendance",
  finance: "sms_Finance",
  history: "sms_History_Log",
  badges: "sms_Badges",
  notices: "sms_Notices",
  tasks: "sms_Tasks",
  notes: "sms_Educator_Notes",
  settings: "sms_Settings",
  session: "sms_Session",
};

// Tabs that mirror to Sheet Best. Local-only tabs (badges/notices/tasks/notes/
// settings) are NOT pushed — they live in localStorage only.
type CloudMap = { tab: string; idCol: string; normalize?: (r: any) => any };
const CLOUD: Record<string, CloudMap> = {
  [KEYS.users]: {
    tab: "Users",
    idCol: "ID",
    normalize: (r) => ({
      ...r,
      Has_WhatsApp:
        r.Has_WhatsApp === true ||
        r.Has_WhatsApp === "TRUE" ||
        r.Has_WhatsApp === "true" ||
        r.Has_WhatsApp === 1 ||
        r.Has_WhatsApp === "1",
    }),
  },
  [KEYS.teams]: { tab: "Teams", idCol: "Team_ID" },
  [KEYS.patrols]: {
    tab: "Patrols",
    idCol: "Patrol_ID",
    normalize: (r) => ({ ...r, Total_Points: Number(r.Total_Points) || 0 }),
  },
  [KEYS.attendance]: { tab: "Attendance", idCol: "Attendance_ID" },
  [KEYS.finance]: {
    tab: "Finance",
    idCol: "Transaction_ID",
    normalize: (r) => ({ ...r, Amount: Number(r.Amount) || 0 }),
  },
  [KEYS.history]: { tab: "History_Log", idCol: "Log_ID" },
};

let suppressCloud = false;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  return v ? (JSON.parse(v) as T) : fallback;
}
function writeLocal<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new Event("sms-db-change"));
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  const map = CLOUD[key];
  let oldList: any[] = [];
  if (map && Array.isArray(val)) {
    const raw = localStorage.getItem(key);
    oldList = raw ? JSON.parse(raw) : [];
  }
  writeLocal(key, val);
  if (!suppressCloud && map && Array.isArray(val)) {
    cloudDiffPush(map, oldList, val as any[]);
  }
}

function cloudDiffPush(map: CloudMap, oldList: any[], newList: any[]) {
  const { tab, idCol } = map;
  const oldById = new Map(oldList.map((r) => [String(r[idCol]), r]));
  const newById = new Map(newList.map((r) => [String(r[idCol]), r]));
  const additions: any[] = [];
  const updates: { id: string; row: any }[] = [];
  for (const [id, row] of newById) {
    const prev = oldById.get(id);
    if (!prev) additions.push(row);
    else if (JSON.stringify(prev) !== JSON.stringify(row)) updates.push({ id, row });
  }
  const deletions: string[] = [];
  for (const id of oldById.keys()) if (!newById.has(id)) deletions.push(id);

  if (additions.length) {
    sheet.post(tab, additions.length === 1 ? additions[0] : additions)
      .catch((e) => notifyApiError(`إضافة ${tab}`, e));
  }
  for (const u of updates) {
    sheet.patch(tab, idCol, u.id, u.row)
      .catch((e) => notifyApiError(`تحديث ${tab}`, e));
  }
  for (const id of deletions) {
    sheet.remove(tab, idCol, id)
      .catch((e) => notifyApiError(`حذف ${tab}`, e));
  }
}

export const uid = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase() +
  Date.now().toString(36).toUpperCase();

export const db = {
  users: {
    all: () => read<User[]>(KEYS.users, []),
    save: (u: User[]) => write(KEYS.users, u),
    get: (id: string) => db.users.all().find((x) => x.ID === id),
    upsert: (u: User) => {
      const all = db.users.all();
      const i = all.findIndex((x) => x.ID === u.ID);
      if (i >= 0) all[i] = u; else all.push(u);
      db.users.save(all);
    },
    remove: (id: string) => db.users.save(db.users.all().filter((x) => x.ID !== id)),
  },
  teams: {
    all: () => read<Team[]>(KEYS.teams, []),
    save: (v: Team[]) => write(KEYS.teams, v),
    get: (id: string) => db.teams.all().find((x) => x.Team_ID === id),
  },
  patrols: {
    all: () => read<Patrol[]>(KEYS.patrols, []),
    save: (v: Patrol[]) => write(KEYS.patrols, v),
    get: (id: string) => db.patrols.all().find((x) => x.Patrol_ID === id),
    byTeam: (teamId: string) =>
      db.patrols.all().filter((p) => p.Team_ID === teamId),
  },
  attendance: {
    all: () => read<AttendanceRecord[]>(KEYS.attendance, []),
    save: (v: AttendanceRecord[]) => write(KEYS.attendance, v),
    mark: (
      userId: string,
      date: string,
      status: AttendanceStatus,
      activity = "اجتماع أسبوعي",
      notes = ""
    ) => {
      const all = db.attendance.all();
      const i = all.findIndex((a) => a.User_ID === userId && a.Date === date);
      const rec: AttendanceRecord = {
        Attendance_ID: i >= 0 ? all[i].Attendance_ID : uid(),
        Date: date,
        Activity_Type: activity,
        User_ID: userId,
        Status: status,
        Notes: notes,
      };
      if (i >= 0) all[i] = rec; else all.push(rec);
      db.attendance.save(all);
      return rec;
    },
  },
  finance: {
    all: () => read<FinanceRecord[]>(KEYS.finance, []),
    save: (v: FinanceRecord[]) => write(KEYS.finance, v),
  },
  history: {
    all: () => read<HistoryLog[]>(KEYS.history, []),
    log: (userId: string, action: string, details: string, adminName: string) => {
      const all = db.history.all();
      all.unshift({
        Log_ID: uid(),
        Timestamp: new Date().toISOString(),
        User_ID: userId,
        Action_Type: action,
        Details: details,
        Admin_Name: adminName,
      });
      write(KEYS.history, all);
    },
  },
  badges: {
    all: () => read<Badge[]>(KEYS.badges, []),
    save: (v: Badge[]) => write(KEYS.badges, v),
  },
  notices: {
    all: () => read<Notice[]>(KEYS.notices, []),
    save: (v: Notice[]) => write(KEYS.notices, v),
  },
  tasks: {
    all: () => read<Task[]>(KEYS.tasks, []),
    save: (v: Task[]) => write(KEYS.tasks, v),
  },
  notes: {
    all: () => read<EducatorNote[]>(KEYS.notes, []),
    save: (v: EducatorNote[]) => write(KEYS.notes, v),
  },
  settings: {
    get: (): Settings =>
      read<Settings>(KEYS.settings, { Group_Name: "مجموعة الكشافة", Logo: "" }),
    save: (s: Settings) => write(KEYS.settings, s),
  },
  session: {
    get: (): string | null => read<string | null>(KEYS.session, null),
    set: (id: string | null) => write(KEYS.session, id),
  },
};

// Pull all cloud tabs into localStorage. Suppresses push during the load.
export async function syncFromCloud(): Promise<{ ok: boolean; error?: string }> {
  suppressCloud = true;
  try {
    await Promise.all(
      Object.entries(CLOUD).map(async ([key, map]) => {
        const rows = await sheet.get<any>(map.tab);
        const norm = map.normalize ? rows.map(map.normalize) : rows;
        writeLocal(key, norm);
      })
    );
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    notifyApiError("تحميل البيانات", e);
    return { ok: false, error: msg };
  } finally {
    suppressCloud = false;
  }
}

// ---------- Helpers ----------
export const fullName = (u: Pick<User, "First_Name" | "Father_Name" | "Last_Name">) =>
  [u.First_Name, u.Father_Name, u.Last_Name].filter(Boolean).join(" ");

// "General Leader" = Role 'Leader' + Rank includes 'قائد عام'.
// Used to gate confidential modules (Educator Notes, settings, approvals).
export const isGeneralLeader = (u: User | null | undefined) =>
  !!u && u.Role === "Leader" && /قائد\s*عام/.test(u.Rank);

export const isLeader = (u: User | null | undefined) => !!u && u.Role === "Leader";

// Cloud-backed: data lives in the Google Sheet, no local seeding required.
// Kept as a no-op so existing imports continue to compile.
export function seedIfEmpty() {}

