// LocalStorage-backed mock DB. Object keys mirror the EXACT Google Sheets
// column names so swapping `read/write` for Sheet Best calls is 1:1.
//
// Schema (Google Sheets):
//   Users           → ID, First_Name, Father_Name, Grandfather_Name, Last_Name,
//                     Phone, Has_WhatsApp, National_ID, Birth_Date,
//                     Profile_Photo, National_ID_Front, National_ID_Back,
//                     Birth_Certificate, Confession_Father, Email, Password,
//                     Education_Stage, Parent_Phone, Role, Rank, Team_ID,
//                     Patrol_ID, Status, Visible_Screens
//   Teams           → Team_ID, Team_Name, Leader_In_Charge
//   Patrols         → Patrol_ID, Patrol_Name, Team_ID, Patrol_Leader_Name, Total_Points
//   Attendance      → Attendance_ID, Date, Activity_Type, User_ID, Status, Notes
//   Finance         → Transaction_ID, Title, Amount, Target_Type, Target_ID,
//                     User_ID, Payment_Status, Date
//   History_Log     → Log_ID, Timestamp, User_ID, Action_Type, Details, Admin_Name
//   App_Settings    → Setting_ID, Timestamp, Group_Name, Logo_URL, Updated_By
//   Public_Service  → Service_ID, Service_Date, Leader_Of_Day,
//                     Assistant_Leader_Of_Day, Leaders_List, Members_List,
//                     Evaluation_Data, Reminder_Sent
//
// Local-only feature sheets (not in user's schema):
//   Badges, Notices, Tasks, Educator_Notes

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
  Birth_Date: string;
  Profile_Photo: string;
  National_ID_Front: string;
  National_ID_Back: string;
  Birth_Certificate: string;
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
  Visible_Screens: string; // comma-separated screen keys
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
  Target_ID: string;
  User_ID: string;
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

export interface AppSetting {
  Setting_ID: string;
  Timestamp: string;
  Group_Name: string;
  Logo_URL: string;
  Updated_By: string;
}

export interface PublicService {
  Service_ID: string;
  Service_Date: string;
  Leader_Of_Day: string;             // User ID
  Assistant_Leader_Of_Day: string;   // User ID
  Leaders_List: string;              // comma-separated User IDs
  Members_List: string;              // comma-separated User IDs
  Evaluation_Data: string;           // JSON string: { [userId]: { score, notes } }
  Reminder_Sent: boolean;
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

import { sheet, notifyApiError } from "./api";

const KEYS = {
  users: "sms_Users",
  teams: "sms_Teams",
  patrols: "sms_Patrols",
  attendance: "sms_Attendance",
  finance: "sms_Finance",
  history: "sms_History_Log",
  appSettings: "sms_App_Settings",
  publicService: "sms_Public_Service",
  badges: "sms_Badges",
  notices: "sms_Notices",
  tasks: "sms_Tasks",
  notes: "sms_Educator_Notes",
  session: "sms_Session",
};

type CloudMap = { tab: string; idCol: string; normalize?: (r: any) => any };
const boolish = (v: any) =>
  v === true || v === "TRUE" || v === "true" || v === 1 || v === "1";

const CLOUD: Record<string, CloudMap> = {
  [KEYS.users]: {
    tab: "Users",
    idCol: "ID",
    normalize: (r) => ({ ...r, Has_WhatsApp: boolish(r.Has_WhatsApp) }),
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
  [KEYS.appSettings]: { tab: "App_Settings", idCol: "Setting_ID" },
  [KEYS.publicService]: {
    tab: "Public_Service",
    idCol: "Service_ID",
    normalize: (r) => ({ ...r, Reminder_Sent: boolish(r.Reminder_Sent) }),
  },
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
    mark: (userId: string, date: string, status: AttendanceStatus, activity = "اجتماع أسبوعي", notes = "") => {
      const all = db.attendance.all();
      const i = all.findIndex((a) => a.User_ID === userId && a.Date === date);
      const rec: AttendanceRecord = {
        Attendance_ID: i >= 0 ? all[i].Attendance_ID : uid(),
        Date: date, Activity_Type: activity, User_ID: userId, Status: status, Notes: notes,
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
        Log_ID: uid(), Timestamp: new Date().toISOString(),
        User_ID: userId, Action_Type: action, Details: details, Admin_Name: adminName,
      });
      write(KEYS.history, all);
    },
  },
  appSettings: {
    all: () => read<AppSetting[]>(KEYS.appSettings, []),
    save: (v: AppSetting[]) => write(KEYS.appSettings, v),
    append: (groupName: string, logoUrl: string, updatedBy: string) => {
      const all = db.appSettings.all();
      all.push({
        Setting_ID: "S-" + uid(),
        Timestamp: new Date().toISOString(),
        Group_Name: groupName,
        Logo_URL: logoUrl,
        Updated_By: updatedBy,
      });
      db.appSettings.save(all);
    },
    latest: (): { Group_Name: string; Logo_URL: string } => {
      const all = db.appSettings.all();
      if (!all.length) return { Group_Name: "مجموعة الكشافة", Logo_URL: "" };
      const sorted = [...all].sort((a, b) => (b.Timestamp || "").localeCompare(a.Timestamp || ""));
      return { Group_Name: sorted[0].Group_Name, Logo_URL: sorted[0].Logo_URL };
    },
  },
  publicService: {
    all: () => read<PublicService[]>(KEYS.publicService, []),
    save: (v: PublicService[]) => write(KEYS.publicService, v),
    get: (id: string) => db.publicService.all().find((x) => x.Service_ID === id),
    upsert: (s: PublicService) => {
      const all = db.publicService.all();
      const i = all.findIndex((x) => x.Service_ID === s.Service_ID);
      if (i >= 0) all[i] = s; else all.push(s);
      db.publicService.save(all);
    },
    remove: (id: string) => db.publicService.save(db.publicService.all().filter((x) => x.Service_ID !== id)),
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
  // Backwards-compatible shim — reads latest App_Settings row.
  settings: {
    get: (): { Group_Name: string; Logo: string } => {
      const l = db.appSettings.latest();
      return { Group_Name: l.Group_Name, Logo: l.Logo_URL };
    },
  },
  session: {
    get: (): string | null => read<string | null>(KEYS.session, null),
    set: (id: string | null) => write(KEYS.session, id),
  },
};

export async function syncFromCloud(): Promise<{ ok: boolean; error?: string }> {
  suppressCloud = true;
  try {
    await Promise.all(
      Object.entries(CLOUD).map(async ([key, map]) => {
        try {
          const rows = await sheet.get<any>(map.tab);
          const norm = map.normalize ? rows.map(map.normalize) : rows;
          writeLocal(key, norm);
        } catch (e) {
          // Missing tab shouldn't crash the whole sync — log and continue.
          console.warn(`[SheetBest] sync ${map.tab} failed:`, e);
        }
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

const _isMaster = (u: User | null | undefined) =>
  !!u && (u.Email || "").toLowerCase() === "admin@admin.com";

export const isGeneralLeader = (u: User | null | undefined) =>
  !!u && (_isMaster(u) || (u.Role === "Leader" && /قائد\s*عام/.test(u.Rank)));

export const isLeader = (u: User | null | undefined) =>
  !!u && (u.Role === "Leader" || _isMaster(u));

// ---------- Education stages ----------
export const STAGES = [
  "حضانة", "ابتدائي 1", "ابتدائي 2", "ابتدائي 3", "ابتدائي 4", "ابتدائي 5", "ابتدائي 6",
  "إعدادي 1", "إعدادي 2", "إعدادي 3",
  "1 ثانوي", "2 ثانوي", "3 ثانوي",
  "جامعة 1", "جامعة 2", "جامعة 3", "جامعة 4", "خريج",
];
export const SECONDARY_INDEX = STAGES.indexOf("1 ثانوي");
export const stageIsSecondaryOrAbove = (s: string) => {
  const i = STAGES.indexOf(s);
  return i >= 0 && i >= SECONDARY_INDEX;
};
export const stageNeedsParent = (s: string) => {
  const i = STAGES.indexOf(s);
  return i >= 0 && i < SECONDARY_INDEX;
};

// ---------- Screen permissions ----------
export type ScreenKey =
  | "dashboard" | "id" | "profile" | "attendance" | "badges_my" | "tasks_my" | "finance_my"
  | "admin_overview" | "approvals" | "allocation" | "scanner" | "manual" | "reports"
  | "teams_crud" | "finance_admin" | "badges_admin" | "notices" | "tasks_admin"
  | "leaderboard" | "notes" | "settings" | "public_service" | "permissions";

export const MEMBER_SCREENS: { key: ScreenKey; label: string }[] = [
  { key: "id", label: "بطاقتي" },
  { key: "attendance", label: "حضوري" },
  { key: "badges_my", label: "شاراتي" },
  { key: "tasks_my", label: "مهامي" },
  { key: "finance_my", label: "اشتراكاتي" },
  { key: "profile", label: "ملفي الشخصي" },
];

export const ADMIN_SCREENS: { key: ScreenKey; label: string; icon: string }[] = [
  { key: "admin_overview", label: "نظرة عامة", icon: "📊" },
  { key: "approvals", label: "طلبات الانضمام", icon: "✅" },
  { key: "allocation", label: "توزيع الأعضاء على الفرق", icon: "🗂️" },
  { key: "scanner", label: "ماسح QR", icon: "📷" },
  { key: "manual", label: "حضور يدوي", icon: "📝" },
  { key: "reports", label: "تقارير الحضور", icon: "📈" },
  { key: "teams_crud", label: "الفرق والطلائع", icon: "👥" },
  { key: "finance_admin", label: "الإدارة المالية", icon: "💰" },
  { key: "public_service", label: "الخدمة العامة", icon: "🤝" },
  { key: "badges_admin", label: "الشارات", icon: "🏅" },
  { key: "notices", label: "لوحة الإعلانات", icon: "📢" },
  { key: "tasks_admin", label: "المهام", icon: "✔️" },
  { key: "leaderboard", label: "ترتيب الطلائع", icon: "🏆" },
  { key: "permissions", label: "صلاحيات المستخدمين", icon: "🛡️" },
  { key: "notes", label: "ملاحظات سرية", icon: "🔒" },
  { key: "settings", label: "هوية الموقع", icon: "⚙️" },
];

export const DEFAULT_MEMBER_SCREENS = "id,attendance,badges_my,tasks_my,finance_my,profile";

export const MASTER_ADMIN_EMAIL = "admin@admin.com";
export const MASTER_ADMIN_PASSWORD = "admin123123";
export const isMasterAdmin = (u: User | null | undefined) =>
  !!u && (u.Email || "").toLowerCase() === MASTER_ADMIN_EMAIL;

// If Visible_Screens is empty → leaders see all, members see defaults.
// Master admin (admin@admin.com) always sees every screen.
export function hasScreen(user: User | null | undefined, key: ScreenKey): boolean {
  if (!user) return false;
  if (isMasterAdmin(user)) return true;
  const raw = (user.Visible_Screens || "").trim();
  if (!raw) {
    if (isLeader(user)) return true;
    return DEFAULT_MEMBER_SCREENS.split(",").includes(key);
  }
  return raw.split(",").map((s) => s.trim()).includes(key);
}

export function seedIfEmpty() {}
