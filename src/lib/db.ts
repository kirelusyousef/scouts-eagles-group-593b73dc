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
export type UserStatus = "Active" | "Pending" | "Suspended";
export type AttendanceStatus = "حاضر" | "عذر" | "غائب";
export type PaymentStatus = "Paid" | "Partial" | "Unpaid";
export type TargetType = "Global" | "Team";
export type LedgerScope = "Group" | "Team";
export type LedgerTxType = "Deposit" | "Withdraw";

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
  Gender: string; // "ذكر" | "أنثى"
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
  User_Type: string; // "عضو" | "قائد" (scouting classification — independent of permissions)
  Rank: string;
  Leader_Rank_ID: string; // FK → Leader_Ranks_Tasks.Task_Rank_ID
  Team_ID: string;
  Team_Role_ID?: string;       // FK → Team_Roles.Team_Role_ID
  Committee_ID?: string;       // FK → Committees.Committee_ID
  Committee_Role_ID?: string;  // FK → Committee_Roles.Committee_Role_ID
  Patrol_ID: string;
  Status: UserStatus;
  Visible_Screens: string; // comma-separated screen keys
  Reset_Requested?: string; // "True" / "False"
  Reset_Phone?: string;
}

export interface Committee {
  Committee_ID: string;
  Committee_Name: string;
}
export interface TeamRole {
  Team_Role_ID: string;
  Role_Name: string;
  Weight: number; // 1 = قائد فرقة, 2 = مساعد, 3+ = باقي القادة
}
export interface CommitteeRole {
  Committee_Role_ID: string;
  Role_Name: string;
  Weight: number; // 1 = قائد اللجنة, 2 = مساعد, 3+ = أعضاء
}

export interface SubGroupType {
  Sub_Group_ID: string;
  Team_Type: string; // براعم / أشبال / كشافة ...
  Sub_Group_Name: string; // خماسي / سداسي / طليعة ...
}

export interface GroupEvent {
  Event_ID: string;
  Event_Name: string;
  Event_Type: string;
  Event_Start_Date: string;
  Event_End_Date: string;
  Leader_In_Charge: string; // User ID
  Staff_List: string;       // comma-separated User IDs
  Budget_Allocated: number;
}

export interface LedgerEntry {
  Ledger_ID: string;
  Timestamp: string;
  Scope_Type: LedgerScope; // Group | Team
  Scope_ID: string;        // "" for Group, Team_ID for Team
  Transaction_Type: LedgerTxType;
  Amount: number;
  Statement: string;
  Updated_By: string;
}

export interface MemberRank {
  Rank_ID: string;
  Rank_Name: string;
  Rank_Level: number;
  Rank_Weight: number; // ascending sort weight (1 = highest rank)
}

export interface LeaderRankTask {
  Task_Rank_ID: string;
  Rank_Name: string;
  Task_Name: string;
  Structure_Level: number;
}

export interface VisionMission {
  ID: string;
  Type: "Vision" | "Mission"; // الرؤية / الرسالة
  Content: string;
  Updated_By: string;
  Timestamp: string;
}

export interface NewsItem {
  News_ID: string;
  Timestamp: string;
  Title: string;
  Content: string;
  News_Images: string; // comma-separated URLs
  Created_By: string;
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
  memberRanks: "sms_Member_Ranks",
  leaderRanksTasks: "sms_Leader_Ranks_Tasks",
  visionMission: "sms_Vision_Mission",
  news: "sms_News",
  subGroupTypes: "sms_Sub_Group_Types",
  groupEvents: "sms_Group_Events",
  ledger: "sms_Financial_Ledger",
  committees: "sms_Committees",
  teamRoles: "sms_Team_Roles",
  committeeRoles: "sms_Committee_Roles",
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
  [KEYS.memberRanks]: {
    tab: "Member_Ranks",
    idCol: "Rank_ID",
    normalize: (r) => ({ ...r, Rank_Level: Number(r.Rank_Level) || 0 }),
  },
  [KEYS.leaderRanksTasks]: {
    tab: "Leader_Ranks_Tasks",
    idCol: "Task_Rank_ID",
    normalize: (r) => ({ ...r, Structure_Level: Number(r.Structure_Level) || 0 }),
  },
  [KEYS.visionMission]: { tab: "Vision_Mission", idCol: "ID" },
  [KEYS.news]: { tab: "News", idCol: "News_ID" },
  [KEYS.subGroupTypes]: { tab: "Sub_Group_Types", idCol: "Sub_Group_ID" },
  [KEYS.groupEvents]: {
    tab: "Group_Events",
    idCol: "Event_ID",
    normalize: (r) => ({ ...r, Budget_Allocated: Number(r.Budget_Allocated) || 0 }),
  },
  [KEYS.ledger]: {
    tab: "Financial_Ledger",
    idCol: "Ledger_ID",
    normalize: (r) => ({ ...r, Amount: Number(r.Amount) || 0 }),
  },
  [KEYS.committees]: { tab: "Committees", idCol: "Committee_ID" },
  [KEYS.teamRoles]: {
    tab: "Team_Roles",
    idCol: "Team_Role_ID",
    normalize: (r) => ({ ...r, Weight: Number(r.Weight) || 99 }),
  },
  [KEYS.committeeRoles]: {
    tab: "Committee_Roles",
    idCol: "Committee_Role_ID",
    normalize: (r) => ({ ...r, Weight: Number(r.Weight) || 99 }),
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
  memberRanks: {
    all: () => read<MemberRank[]>(KEYS.memberRanks, []),
    save: (v: MemberRank[]) => write(KEYS.memberRanks, v),
    get: (id: string) => db.memberRanks.all().find((x) => x.Rank_ID === id),
    upsert: (r: MemberRank) => {
      const all = db.memberRanks.all();
      const i = all.findIndex((x) => x.Rank_ID === r.Rank_ID);
      if (i >= 0) all[i] = r; else all.push(r);
      db.memberRanks.save(all);
    },
    remove: (id: string) => db.memberRanks.save(db.memberRanks.all().filter((x) => x.Rank_ID !== id)),
  },
  leaderRanksTasks: {
    all: () => read<LeaderRankTask[]>(KEYS.leaderRanksTasks, []),
    save: (v: LeaderRankTask[]) => write(KEYS.leaderRanksTasks, v),
    get: (id: string) => db.leaderRanksTasks.all().find((x) => x.Task_Rank_ID === id),
    upsert: (r: LeaderRankTask) => {
      const all = db.leaderRanksTasks.all();
      const i = all.findIndex((x) => x.Task_Rank_ID === r.Task_Rank_ID);
      if (i >= 0) all[i] = r; else all.push(r);
      db.leaderRanksTasks.save(all);
    },
    remove: (id: string) => db.leaderRanksTasks.save(db.leaderRanksTasks.all().filter((x) => x.Task_Rank_ID !== id)),
  },
  visionMission: {
    all: () => read<VisionMission[]>(KEYS.visionMission, []),
    save: (v: VisionMission[]) => write(KEYS.visionMission, v),
    getLatest: (type: "Vision" | "Mission"): VisionMission | undefined => {
      const rows = db.visionMission.all().filter((r) => r.Type === type);
      return [...rows].sort((a, b) => (b.Timestamp || "").localeCompare(a.Timestamp || ""))[0];
    },
    setText: (type: "Vision" | "Mission", content: string, updatedBy: string) => {
      const all = db.visionMission.all();
      const existing = all.find((r) => r.Type === type);
      if (existing) {
        existing.Content = content;
        existing.Updated_By = updatedBy;
        existing.Timestamp = new Date().toISOString();
      } else {
        all.push({ ID: "VM-" + uid(), Type: type, Content: content, Updated_By: updatedBy, Timestamp: new Date().toISOString() });
      }
      db.visionMission.save(all);
    },
  },
  news: {
    all: () => read<NewsItem[]>(KEYS.news, []),
    save: (v: NewsItem[]) => write(KEYS.news, v),
    get: (id: string) => db.news.all().find((x) => x.News_ID === id),
    upsert: (n: NewsItem) => {
      const all = db.news.all();
      const i = all.findIndex((x) => x.News_ID === n.News_ID);
      if (i >= 0) all[i] = n; else all.push(n);
      db.news.save(all);
    },
    remove: (id: string) => db.news.save(db.news.all().filter((x) => x.News_ID !== id)),
  },
  subGroupTypes: {
    all: () => read<SubGroupType[]>(KEYS.subGroupTypes, []),
    save: (v: SubGroupType[]) => write(KEYS.subGroupTypes, v),
    byTeamType: (t: string) => db.subGroupTypes.all().filter((x) => x.Team_Type === t),
    upsert: (r: SubGroupType) => {
      const all = db.subGroupTypes.all();
      const i = all.findIndex((x) => x.Sub_Group_ID === r.Sub_Group_ID);
      if (i >= 0) all[i] = r; else all.push(r);
      db.subGroupTypes.save(all);
    },
    remove: (id: string) =>
      db.subGroupTypes.save(db.subGroupTypes.all().filter((x) => x.Sub_Group_ID !== id)),
  },
  events: {
    all: () => read<GroupEvent[]>(KEYS.groupEvents, []),
    save: (v: GroupEvent[]) => write(KEYS.groupEvents, v),
    get: (id: string) => db.events.all().find((x) => x.Event_ID === id),
    upsert: (e: GroupEvent) => {
      const all = db.events.all();
      const i = all.findIndex((x) => x.Event_ID === e.Event_ID);
      if (i >= 0) all[i] = e; else all.push(e);
      db.events.save(all);
    },
    remove: (id: string) => db.events.save(db.events.all().filter((x) => x.Event_ID !== id)),
  },
  ledger: {
    all: () => read<LedgerEntry[]>(KEYS.ledger, []),
    save: (v: LedgerEntry[]) => write(KEYS.ledger, v),
    add: (e: Omit<LedgerEntry, "Ledger_ID" | "Timestamp">) => {
      const row: LedgerEntry = {
        ...e,
        Ledger_ID: "LDG-" + uid(),
        Timestamp: new Date().toISOString(),
      };
      db.ledger.save([...db.ledger.all(), row]);
      return row;
    },
    remove: (id: string) => db.ledger.save(db.ledger.all().filter((x) => x.Ledger_ID !== id)),
    balanceFor: (scope: LedgerScope, scopeId = "") => {
      const rows = db.ledger.all().filter((r) => r.Scope_Type === scope && (scope === "Group" || r.Scope_ID === scopeId));
      const dep = rows.filter((r) => r.Transaction_Type === "Deposit").reduce((s, r) => s + Number(r.Amount || 0), 0);
      const wd  = rows.filter((r) => r.Transaction_Type === "Withdraw").reduce((s, r) => s + Number(r.Amount || 0), 0);
      return { deposits: dep, withdrawals: wd, balance: dep - wd, rows };
    },
  },
  committees: {
    all: () => read<Committee[]>(KEYS.committees, []),
    save: (v: Committee[]) => write(KEYS.committees, v),
    get: (id: string) => db.committees.all().find((x) => x.Committee_ID === id),
    upsert: (c: Committee) => {
      const all = db.committees.all();
      const i = all.findIndex((x) => x.Committee_ID === c.Committee_ID);
      if (i >= 0) all[i] = c; else all.push(c);
      db.committees.save(all);
    },
    remove: (id: string) => db.committees.save(db.committees.all().filter((x) => x.Committee_ID !== id)),
  },
  teamRoles: {
    all: () => read<TeamRole[]>(KEYS.teamRoles, []),
    save: (v: TeamRole[]) => write(KEYS.teamRoles, v),
    get: (id: string) => db.teamRoles.all().find((x) => x.Team_Role_ID === id),
    upsert: (r: TeamRole) => {
      const all = db.teamRoles.all();
      const i = all.findIndex((x) => x.Team_Role_ID === r.Team_Role_ID);
      if (i >= 0) all[i] = r; else all.push(r);
      db.teamRoles.save(all);
    },
    remove: (id: string) => db.teamRoles.save(db.teamRoles.all().filter((x) => x.Team_Role_ID !== id)),
  },
  committeeRoles: {
    all: () => read<CommitteeRole[]>(KEYS.committeeRoles, []),
    save: (v: CommitteeRole[]) => write(KEYS.committeeRoles, v),
    get: (id: string) => db.committeeRoles.all().find((x) => x.Committee_Role_ID === id),
    upsert: (r: CommitteeRole) => {
      const all = db.committeeRoles.all();
      const i = all.findIndex((x) => x.Committee_Role_ID === r.Committee_Role_ID);
      if (i >= 0) all[i] = r; else all.push(r);
      db.committeeRoles.save(all);
    },
    remove: (id: string) => db.committeeRoles.save(db.committeeRoles.all().filter((x) => x.Committee_Role_ID !== id)),
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
  | "leaderboard" | "notes" | "settings" | "public_service" | "permissions"
  | "account_type" | "member_ranks_assign" | "leader_ranks_tasks"
  | "news_admin" | "vision_admin"
  | "users_manage" | "password_requests" | "sub_groups_admin"
  | "events_admin" | "finance_ledger"
  | "hierarchy_report" | "role_assignment";

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
  { key: "users_manage", label: "إدارة المستخدمين", icon: "👤" },
  { key: "password_requests", label: "طلبات استعادة كلمات المرور", icon: "🔑" },
  { key: "allocation", label: "توزيع الأعضاء على الفرق", icon: "🗂️" },
  { key: "sub_groups_admin", label: "أنواع الطلائع الفرعية", icon: "🧩" },
  { key: "events_admin", label: "لوحة الفعاليات", icon: "🗓️" },
  { key: "finance_ledger", label: "السجل المالي والخزينة", icon: "🏦" },
  { key: "account_type", label: "تغيير نوع الحساب", icon: "🔄" },
  { key: "member_ranks_assign", label: "تحديد رتب الأعضاء", icon: "🎖️" },
  { key: "leader_ranks_tasks", label: "إدارة رتب ومهام القادة", icon: "🏛️" },
  { key: "role_assignment", label: "أدوار القادة (فرقة/لجنة)", icon: "🎯" },
  { key: "hierarchy_report", label: "التقرير الهرمي للمجموعة", icon: "🌳" },
  { key: "scanner", label: "ماسح QR", icon: "📷" },
  { key: "manual", label: "حضور يدوي", icon: "📝" },
  { key: "reports", label: "تقارير الحضور", icon: "📈" },
  { key: "teams_crud", label: "الفرق والطلائع", icon: "👥" },
  { key: "finance_admin", label: "الإدارة المالية", icon: "💰" },
  { key: "public_service", label: "الخدمة العامة", icon: "🤝" },
  { key: "news_admin", label: "إضافة خبر جديد", icon: "📰" },
  { key: "vision_admin", label: "الرؤية والرسالة", icon: "🎯" },
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
