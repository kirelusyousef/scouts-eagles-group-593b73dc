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
export type PaymentStatus = "تم الدفع" | "غير مدفوع";
export type TargetType = "Team" | "Patrol" | "User";
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
  House_Number?: string;
  Street_Name?: string;
  Sub_Street_Name?: string;
  City?: string;
  Governorate?: string;
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
  Is_Skipped?: string; // "True" / "False" — skipped from Account Type screen
}

export interface Committee {
  Committee_ID: string;
  Committee_Name: string;
}
export interface TeamRole {
  Team_Role_ID: string;
  Role_Name: string;
  Weight: number; // 1 = قائد فرقة, 2 = مساعد, 3+ = باقي القادة
  Structure_Level?: number;
}
export interface CommitteeRole {
  Committee_Role_ID: string;
  Role_Name: string;
  Weight: number; // 1 = قائد اللجنة, 2 = مساعد, 3+ = أعضاء
  Structure_Level?: number;
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
  Order_Weight: number; // ascending — 1 appears first within a level
}

export interface LeaderStructureRule {
  Rule_ID: string;
  Level: number;        // 1..4
  Category: string;     // e.g. "راعي الكنيسة" | "القيادة العامة" | "الفرق الكشفية" | "اللجان الكشفية"
  Role_Name: string;    // matches Team_Roles.Role_Name / Committee_Roles.Role_Name / Leader_Ranks_Tasks.Rank_Name
  Order_Weight: number; // ascending
}

export interface HierarchyLevel {
  Level_ID: string;
  Level_Number: number;
  Level_Name: string;
}

export interface RoleType {
  Role_Type_ID: string;
  Role_Type_Name: string;
  Order_Weight: number;
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

export interface GroupInfo {
  ID: string;
  Facebook_Link: string;
  Instagram_Link: string;
  WhatsApp_Number: string;
  TikTok_Link: string;
  Updated_By: string;
  Timestamp: string;
}

export interface Team {
  Team_ID: string;
  Team_Name: string;
  Leader_In_Charge: string;
  Order_Weight?: number;
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
  Target_Type: TargetType;       // "Team" | "Patrol" | "User"
  Target_ID: string;             // Team_ID / Patrol_ID / User_ID matching Target_Type
  User_ID: string;               // Specific member or leader ID
  Payment_Status: PaymentStatus; // "تم الدفع" | "غير مدفوع"
  Date: string;
}

export interface UserCertificate {
  Certificate_ID: string;
  User_ID: string;
  Course_Name: string;
  Course_Type: string;       // e.g. "دورة", "دراسة"
  Provider: string;          // الجهة المانحة
  Start_Date: string;        // تاريخ بداية الدورة
  End_Date: string;          // تاريخ نهاية الدورة (الحقل الجديد)
  Notes: string;
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

// Notification center & automated reminder configuration
export interface UserNotification {
  Notification_ID: string;
  User_ID: string;
  Title: string;
  Body: string;
  Created_At: string;
  Is_Read: string;        // "True" / "False" — stored as string to match Sheet Best
  Source: string;         // "manual" | "auto_public_service" | ...
  Reference_ID?: string;  // optional FK (e.g. Service_ID)
  Opened_At?: string;     // ISO timestamp of first open by the user (empty if never opened)
}

export interface AutoNotificationConfig {
  Config_ID: string;
  Type: string;           // e.g. "public_service_reminder"
  Message_Template: string;
  Days_Before: number;
  Updated_By: string;
  Timestamp: string;
}

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function notifyApiError(context: string, e: any) {
  const msg = e?.message || String(e);
  console.error(`[Cloud] ${context}:`, msg);
  toast.error(`${context}: ${msg}`, { duration: 6000 });
}

const KEYS = {
  users: "sms_Users",
  teams: "sms_Teams",
  patrols: "sms_Patrols",
  attendance: "sms_Attendance",
  leaderAttendance: "sms_Leader_Attendance",
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
  leaderStructureRules: "sms_Leader_Structure_Rules",
  hierarchyLevels: "sms_Hierarchy_Levels",
  roleTypes: "sms_Role_Types",
  badges: "sms_Badges",
  notices: "sms_Notices",
  tasks: "sms_Tasks",
  notes: "sms_Educator_Notes",
  userNotifications: "sms_User_Notifications",
  autoNotificationsConfig: "sms_Auto_Notifications_Config",
  userCertificates: "sms_User_Certificates",
  groupInfo: "sms_Group_Info",
  socialAccounts: "sms_Social_Accounts",
  session: "sms_Session",
  /** Device-local set of notification IDs that the user marked as read.
   *  Never touched by sync — guarantees the badge stays cleared even if the
   *  cloud row is slow to propagate or arrives back as unread. */
  notificationReads: "sms_Notification_Reads_Local",
};

export interface SocialAccount {
  Social_ID: string;
  Platform: string;     // facebook | instagram | whatsapp | tiktok | youtube | telegram | x | website | custom
  Label: string;        // display name
  URL: string;          // full URL (https://...) or phone for whatsapp
  Icon: string;         // emoji or single char
  Sort_Order: number;
  Is_Active: string;    // "True" / "False"
}

type CloudMap = {
  tab: string;
  idCol: string;
  /** Optional: local id column name when it differs from the remote idCol. */
  localIdCol?: string;
  normalize?: (r: any) => any;
  /** Optional: transform a local row into the remote sheet shape before push. */
  toRemote?: (r: any) => any;
};
const boolish = (v: any) =>
  v === true ||
  v === 1 ||
  v === "1" ||
  (typeof v === "string" && v.trim().toLowerCase() === "true");

// Sheet headers may contain invisible chars (e.g. zero-width space). Find a field tolerantly.
const pickField = (r: any, name: string): any => {
  if (r == null) return undefined;
  if (r[name] != null && r[name] !== "") return r[name];
  for (const k of Object.keys(r)) {
    if (k.replace(/[\u200B-\u200D\uFEFF\s]/g, "") === name) {
      return r[k];
    }
  }
  return undefined;
};
const pickRoleType = (r: any): string => {
  const explicit = String(pickField(r, "Role_Type") ?? "").trim();
  if (explicit) return explicit;
  // Fallback: infer from Task_Rank_ID prefix (TR- = Team, CR- = Committee, LR- = Leader)
  const id = String(pickField(r, "Task_Rank_ID") ?? "").trim().toUpperCase();
  if (id.startsWith("TR-")) return "Team";
  if (id.startsWith("CR-")) return "Committee";
  if (id.startsWith("LR-")) return "Leader";
  return "";
};




const CLOUD: Record<string, CloudMap> = {
  [KEYS.users]: {
    tab: "Users",
    idCol: "ID",
    normalize: (r) => {
      // Some Users sheet headers contain a leading zero-width space
      // (e.g. "\u200BTeam_Role_ID"). Re-key them so app code sees clean names.
      const out: any = {};
      for (const k of Object.keys(r)) {
        const clean = k.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
        out[clean] = r[k];
      }
      // Sheet header is "Surname" — surface as Last_Name in the app model.
      if (out.Surname != null && (out.Last_Name == null || out.Last_Name === "")) {
        out.Last_Name = out.Surname;
      }
      out.Has_WhatsApp = boolish(out.Has_WhatsApp);
      return out;
    },
    // Defensive: mirror role-related fields into possible ZWSP-prefixed header
    // variants in the Google Sheet so PATCH/POST hits the actual column.
    toRemote: (r) => {
      const out: any = { ...r };
      // Strip legacy Google Sheets-only fields that don't exist in Supabase
      delete out.Surname;
      delete out["\u200BTeam_Role_ID"];
      return out;
    },
  },
  [KEYS.teams]: {
    tab: "Teams",
    idCol: "Team_ID",
    normalize: (r) => ({ ...r, Order_Weight: Number(r.Order_Weight) || 99 }),
  },
  [KEYS.patrols]: {
    tab: "Patrols",
    idCol: "Patrol_ID",
    normalize: (r) => ({ ...r, Total_Points: Number(r.Total_Points) || 0 }),
  },
  [KEYS.attendance]: { tab: "Attendance", idCol: "Attendance_ID" },
  [KEYS.leaderAttendance]: { tab: "Leader_Attendance", idCol: "Attendance_ID" },
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
    normalize: (r) => ({
      ...r,
      Rank_Level: Number(r.Rank_Level) || 0,
      Rank_Weight: Number(r.Rank_Weight ?? r.Rank_Level) || 99,
    }),
  },
  [KEYS.leaderRanksTasks]: {
    tab: "Leader_Ranks_Tasks",
    idCol: "Task_Rank_ID",
    normalize: (r) => ({
      ...r,
      Structure_Level: Number(pickField(r, "Structure_Level")) || 0,
      Order_Weight: Number(pickField(r, "Order_Weight")) || 99,
    }),
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
    tab: "Leader_Ranks_Tasks",
    idCol: "Task_Rank_ID",
    localIdCol: "Team_Role_ID",
    normalize: (r) => {
      const raw = String(pickRoleType(r) || "").trim();
      const type = raw.toLowerCase();
      if (!raw) return null;
      if (type !== "team") return null;
      return {
        Team_Role_ID: r.Task_Rank_ID || r.Team_Role_ID,
        Role_Name: r.Rank_Name || r.Role_Name || "",
        Weight: Number(r.Order_Weight ?? r.Weight) || 99,
        Structure_Level: Number(pickField(r, "Structure_Level")) || 0,
      };
    },
    toRemote: (r) => ({
      Task_Rank_ID: r.Team_Role_ID,
      Rank_Name: r.Role_Name,
      Role_Type: "Team",
      Order_Weight: Number(r.Weight) || 99,
      Structure_Level: Number(r.Structure_Level) || 0,
    }),
  },
  [KEYS.committeeRoles]: {
    tab: "Leader_Ranks_Tasks",
    idCol: "Task_Rank_ID",
    localIdCol: "Committee_Role_ID",
    normalize: (r) => {
      const raw = String(pickRoleType(r) || "").trim();
      const type = raw.toLowerCase();
      if (!raw) return null;
      if (type !== "committee") return null;
      return {
        Committee_Role_ID: r.Task_Rank_ID || r.Committee_Role_ID,
        Role_Name: r.Rank_Name || r.Role_Name || "",
        Weight: Number(r.Order_Weight ?? r.Weight) || 99,
        Structure_Level: Number(pickField(r, "Structure_Level")) || 0,
      };
    },
    toRemote: (r) => ({
      Task_Rank_ID: r.Committee_Role_ID,
      Rank_Name: r.Role_Name,
      Role_Type: "Committee",
      Order_Weight: Number(r.Weight) || 99,
      Structure_Level: Number(r.Structure_Level) || 0,
    }),
  },
  [KEYS.leaderStructureRules]: {
    tab: "Leader_Structure_Rules",
    idCol: "Rule_ID",
    normalize: (r) => ({
      ...r,
      Level: Number(r.Level) || 0,
      Order_Weight: Number(r.Order_Weight) || 99,
    }),
  },
  [KEYS.hierarchyLevels]: {
    tab: "Hierarchy_Levels",
    idCol: "Level_Number",
    normalize: (r) => ({
      ...r,
      Level_Number: Number(r.Level_Number) || 0,
      Level_ID: `HL-${Number(r.Level_Number) || 0}`,
    }),
    toRemote: (r) => ({
      Level_Number: Number(r.Level_Number) || 0,
      Level_Name: r.Level_Name,
    }),
  },
  [KEYS.roleTypes]: {
    tab: "Role_Types",
    idCol: "Role_Type_ID",
    normalize: (r) => ({
      Role_Type_ID: r.Role_Type_ID,
      Role_Type_Name: r.Role_Type_Name || "",
      Order_Weight: Number(r.Order_Weight) || 99,
    }),
  },
  [KEYS.userNotifications]: {
    tab: "User_Notifications",
    idCol: "Notification_ID",
    normalize: (r) => ({
      Notification_ID: r.Notification_ID || "",
      User_ID: r.User_ID || "",
      Title: r.Title || "",
      Body: r.Body || "",
      Created_At: r.Created_At || "",
      Is_Read: boolish(r.Is_Read) ? "True" : "False",
      Source: r.Source || "",
      Reference_ID: r.Reference_ID || "",
      Opened_At: r.Opened_At || "",
    }),
  },
  [KEYS.autoNotificationsConfig]: {
    tab: "Auto_Notifications_Config",
    idCol: "Config_ID",
    normalize: (r) => ({
      Config_ID: r.Config_ID || "",
      Type: r.Type || "",
      Message_Template: r.Message_Template || "",
      Days_Before: Number(r.Days_Before) || 0,
      Updated_By: r.Updated_By || "",
      Timestamp: r.Timestamp || "",
    }),
  },
  [KEYS.userCertificates]: {
    tab: "User_Certificates",
    idCol: "Certificate_ID",
    normalize: (r) => {
      const out: any = {};
      for (const k of Object.keys(r)) {
        const clean = k.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
        out[clean] = r[k];
      }
      return {
        Certificate_ID: out.Certificate_ID || "",
        User_ID: out.User_ID || "",
        Course_Name: out.Course_Name || "",
        Course_Type: out.Course_Type || "",
        Provider: out.Provider || "",
        Start_Date: out.Start_Date || "",
        End_Date: out.End_Date || "",
        Notes: out.Notes || "",
      };
    },
  },
  [KEYS.groupInfo]: {
    tab: "Group_Info",
    idCol: "ID",
    normalize: (r) => {
      const out: any = {};
      for (const k of Object.keys(r)) {
        const clean = k.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
        out[clean] = r[k];
      }
      return {
        ID: out.ID || "GI-1",
        Facebook_Link: out.Facebook_Link || "",
        Instagram_Link: out.Instagram_Link || "",
        WhatsApp_Number: out.WhatsApp_Number || "",
        TikTok_Link: out.TikTok_Link || "",
        Updated_By: out.Updated_By || "",
        Timestamp: out.Timestamp || "",
      };
    },
  },
  [KEYS.socialAccounts]: {
    tab: "Social_Accounts",
    idCol: "Social_ID",
    normalize: (r) => ({
      Social_ID: r.Social_ID || "",
      Platform: r.Platform || "",
      Label: r.Label || "",
      URL: r.URL || "",
      Icon: r.Icon || "",
      Sort_Order: Number(r.Sort_Order) || 0,
      Is_Active: boolish(r.Is_Active) ? "True" : "False",
    }),
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

function castId(idCol: string, v: any) {
  return idCol === "Level_Number" ? Number(v) : v;
}

function cloudDiffPush(map: CloudMap, oldList: any[], newList: any[]) {
  const { tab, idCol, localIdCol, toRemote } = map;
  const localId = localIdCol || idCol;
  const project = (r: any) => (toRemote ? toRemote(r) : r);
  const oldById = new Map(oldList.map((r) => [String(r[localId]), r]));
  const newById = new Map(newList.map((r) => [String(r[localId]), r]));
  const additions: any[] = [];
  const updates: { id: string; row: any }[] = [];
  for (const [id, row] of newById) {
    const prev = oldById.get(id);
    if (!prev) additions.push(project(row));
    else if (JSON.stringify(prev) !== JSON.stringify(row)) updates.push({ id, row: project(row) });
  }
  const deletions: string[] = [];
  for (const id of oldById.keys()) if (!newById.has(id)) deletions.push(id);

  if (additions.length) {
    (supabase as any).from(tab).upsert(additions, { onConflict: idCol })
      .then(({ error }: any) => { if (error) notifyApiError(`إضافة ${tab}`, error); });
  }
  for (const u of updates) {
    const payload = { ...u.row };
    delete payload[idCol];
    (supabase as any).from(tab).update(payload).eq(idCol, castId(idCol, u.id))
      .then(({ error }: any) => { if (error) notifyApiError(`تحديث ${tab}`, error); });
  }
  for (const id of deletions) {
    (supabase as any).from(tab).delete().eq(idCol, castId(idCol, id))
      .then(({ error }: any) => { if (error) notifyApiError(`حذف ${tab}`, error); });
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
  leaderAttendance: {
    all: () => read<AttendanceRecord[]>(KEYS.leaderAttendance, []),
    save: (v: AttendanceRecord[]) => write(KEYS.leaderAttendance, v),
    mark: (userId: string, date: string, status: AttendanceStatus, activity = "اجتماع قادة", notes = "") => {
      const all = db.leaderAttendance.all();
      const i = all.findIndex((a) => a.User_ID === userId && a.Date === date);
      const rec: AttendanceRecord = {
        Attendance_ID: i >= 0 ? all[i].Attendance_ID : uid(),
        Date: date, Activity_Type: activity, User_ID: userId, Status: status, Notes: notes,
      };
      if (i >= 0) all[i] = rec; else all.push(rec);
      db.leaderAttendance.save(all);
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
  leaderStructureRules: {
    all: () => read<LeaderStructureRule[]>(KEYS.leaderStructureRules, []),
    save: (v: LeaderStructureRule[]) => write(KEYS.leaderStructureRules, v),
    byLevel: (lvl: number) =>
      db.leaderStructureRules.all().filter((r) => r.Level === lvl),
  },
  hierarchyLevels: {
    all: () => read<HierarchyLevel[]>(KEYS.hierarchyLevels, []),
    save: (v: HierarchyLevel[]) => write(KEYS.hierarchyLevels, v),
    get: (id: string) => db.hierarchyLevels.all().find((x) => x.Level_ID === id),
    upsert: (r: HierarchyLevel) => {
      const all = db.hierarchyLevels.all();
      const i = all.findIndex((x) => x.Level_Number === r.Level_Number);
      if (i >= 0) all[i] = r; else all.push(r);
      db.hierarchyLevels.save(all);
    },
    remove: (id: string) => db.hierarchyLevels.save(db.hierarchyLevels.all().filter((x) => x.Level_ID !== id && String(x.Level_Number) !== id)),
  },
  roleTypes: {
    all: () => read<RoleType[]>(KEYS.roleTypes, []),
    save: (v: RoleType[]) => write(KEYS.roleTypes, v),
    get: (id: string) => db.roleTypes.all().find((x) => x.Role_Type_ID === id),
    upsert: (r: RoleType) => {
      const all = db.roleTypes.all();
      const i = all.findIndex((x) => x.Role_Type_ID === r.Role_Type_ID);
      if (i >= 0) all[i] = r; else all.push(r);
      db.roleTypes.save(all);
    },
    remove: (id: string) => db.roleTypes.save(db.roleTypes.all().filter((x) => x.Role_Type_ID !== id)),
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
  userNotifications: {
    all: () => read<UserNotification[]>(KEYS.userNotifications, []),
    save: (v: UserNotification[]) => write(KEYS.userNotifications, v),
    /** Set of notification IDs marked read on this device. Local-only. */
    _localReadSet: (): Set<string> => {
      if (typeof window === "undefined") return new Set();
      try {
        const raw = localStorage.getItem(KEYS.notificationReads);
        const list: string[] = raw ? JSON.parse(raw) : [];
        return new Set(list);
      } catch { return new Set(); }
    },
    _addLocalRead: (ids: string[]) => {
      if (typeof window === "undefined" || !ids.length) return;
      const set = db.userNotifications._localReadSet();
      for (const id of ids) set.add(id);
      localStorage.setItem(KEYS.notificationReads, JSON.stringify(Array.from(set)));
    },
    /** Read overlay: returns rows with Is_Read forced to "True" for any
     *  notification id present in the local read set. */
    _withOverlay: (rows: UserNotification[]): UserNotification[] => {
      const set = db.userNotifications._localReadSet();
      if (!set.size) return rows;
      return rows.map((n) =>
        set.has(n.Notification_ID) && !boolish(n.Is_Read)
          ? { ...n, Is_Read: "True", Opened_At: n.Opened_At || new Date().toISOString() }
          : n,
      );
    },
    byUser: (uid: string) =>
      db.userNotifications._withOverlay(
        db.userNotifications.all().filter((n) => n.User_ID === uid),
      ),
    unreadCount: (uid: string) => {
      const set = db.userNotifications._localReadSet();
      return db.userNotifications
        .all()
        .filter((n) => n.User_ID === uid && !boolish(n.Is_Read) && !set.has(n.Notification_ID))
        .length;
    },
    add: (rows: UserNotification[]) => {
      if (!rows.length) return;
      db.userNotifications.save([...db.userNotifications.all(), ...rows]);
    },
    markAllReadForUser: (uid: string) => {
      const all = db.userNotifications.all();
      const now = new Date().toISOString();
      const newlyRead: string[] = [];
      for (const n of all) {
        if (n.User_ID === uid && !boolish(n.Is_Read)) {
          n.Is_Read = "True";
          if (!n.Opened_At) n.Opened_At = now;
          newlyRead.push(n.Notification_ID);
        }
      }
      if (newlyRead.length) {
        db.userNotifications._addLocalRead(newlyRead);
        db.userNotifications.save(all);
        window.dispatchEvent(new Event("sms-db-change"));
      }
    },
    markRead: (notificationId: string) => {
      // Always record the local read overlay first so the badge clears
      // immediately, even if the cloud row write is delayed or fails.
      db.userNotifications._addLocalRead([notificationId]);
      const all = db.userNotifications.all();
      const i = all.findIndex((n) => n.Notification_ID === notificationId);
      if (i < 0) {
        window.dispatchEvent(new Event("sms-db-change"));
        return;
      }
      const row = all[i];
      const wasUnread = !boolish(row.Is_Read);
      const noTimestamp = !row.Opened_At;
      if (!wasUnread && !noTimestamp) {
        window.dispatchEvent(new Event("sms-db-change"));
        return;
      }
      if (wasUnread) row.Is_Read = "True";
      if (noTimestamp) row.Opened_At = new Date().toISOString();
      db.userNotifications.save(all);
    },
  },
  autoNotificationsConfig: {
    all: () => read<AutoNotificationConfig[]>(KEYS.autoNotificationsConfig, []),
    save: (v: AutoNotificationConfig[]) => write(KEYS.autoNotificationsConfig, v),
    getByType: (type: string) =>
      db.autoNotificationsConfig.all().find((c) => c.Type === type),
    upsert: (c: AutoNotificationConfig) => {
      const all = db.autoNotificationsConfig.all();
      const i = all.findIndex((x) => x.Config_ID === c.Config_ID || x.Type === c.Type);
      if (i >= 0) all[i] = c; else all.push(c);
      db.autoNotificationsConfig.save(all);
    },
  },
  userCertificates: {
    all: () => read<UserCertificate[]>(KEYS.userCertificates, []),
    save: (v: UserCertificate[]) => write(KEYS.userCertificates, v),
    byUser: (userId: string) =>
      db.userCertificates.all().filter((c) => c.User_ID === userId),
    upsert: (c: UserCertificate) => {
      const all = db.userCertificates.all();
      const i = all.findIndex((x) => x.Certificate_ID === c.Certificate_ID);
      if (i >= 0) all[i] = c; else all.push(c);
      db.userCertificates.save(all);
    },
    remove: (id: string) =>
      db.userCertificates.save(db.userCertificates.all().filter((x) => x.Certificate_ID !== id)),
  },
  groupInfo: {
    all: () => read<GroupInfo[]>(KEYS.groupInfo, []),
    save: (v: GroupInfo[]) => write(KEYS.groupInfo, v),
    getLatest: (): GroupInfo | undefined => {
      const rows = db.groupInfo.all();
      if (!rows.length) return undefined;
      return [...rows].sort((a, b) => (b.Timestamp || "").localeCompare(a.Timestamp || ""))[0];
    },
  },
  socialAccounts: {
    all: (): SocialAccount[] =>
      [...read<SocialAccount[]>(KEYS.socialAccounts, [])]
        .sort((a, b) => (a.Sort_Order || 0) - (b.Sort_Order || 0)),
    save: (v: SocialAccount[]) => write(KEYS.socialAccounts, v),
    active: (): SocialAccount[] =>
      db.socialAccounts.all().filter((s) => boolish(s.Is_Active)),
    upsert: (s: SocialAccount) => {
      const all = db.socialAccounts.all();
      const i = all.findIndex((x) => x.Social_ID === s.Social_ID);
      if (i >= 0) all[i] = s; else all.push(s);
      db.socialAccounts.save(all);
    },
    remove: (id: string) =>
      db.socialAccounts.save(db.socialAccounts.all().filter((x) => x.Social_ID !== id)),
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
  privacy: {
    /** Returns the list of User field names hidden from public/other-user views. */
    hidden: (): string[] => read<string[]>("sms_Privacy_Hidden_Fields", DEFAULT_HIDDEN_FIELDS),
    set: (list: string[]) => {
      write("sms_Privacy_Hidden_Fields", list);
      window.dispatchEvent(new Event("sms-db-change"));
    },
    isHidden: (field: string): boolean => db.privacy.hidden().includes(field),
  },
};

/** Default-hidden User fields (sensitive PII). Admin can override from /admin/privacy. */
export const DEFAULT_HIDDEN_FIELDS = [
  "Phone", "Email", "National_ID", "Birth_Date", "Parent_Phone",
  "Confession_Father", "National_ID_Front", "National_ID_Back",
  "Birth_Certificate",
];

/** All User fields exposed in the privacy admin screen, with Arabic labels. */
export const PRIVACY_USER_FIELDS: { key: string; label: string }[] = [
  { key: "Profile_Photo",     label: "الصورة الشخصية" },
  { key: "First_Name",        label: "الاسم الأول" },
  { key: "Father_Name",       label: "اسم الأب" },
  { key: "Grandfather_Name",  label: "اسم الجد" },
  { key: "Last_Name",         label: "اسم العائلة" },
  { key: "Gender",            label: "النوع" },
  { key: "Rank",              label: "الرتبة" },
  { key: "Team_ID",           label: "الفرقة" },
  { key: "Patrol_ID",         label: "الطليعة" },
  { key: "Education_Stage",   label: "المرحلة الدراسية" },
  { key: "Phone",             label: "رقم الهاتف" },
  { key: "Email",             label: "البريد الإلكتروني" },
  { key: "National_ID",       label: "الرقم القومي" },
  { key: "Birth_Date",        label: "تاريخ الميلاد" },
  { key: "Parent_Phone",      label: "هاتف ولي الأمر" },
  { key: "Confession_Father", label: "أب الاعتراف" },
  { key: "National_ID_Front", label: "صورة البطاقة (الوجه)" },
  { key: "National_ID_Back",  label: "صورة البطاقة (الظهر)" },
  { key: "Birth_Certificate", label: "شهادة الميلاد" },
];

const REQUIRED_COLUMNS: Record<string, string[]> = {
  Users: ["ID", "Team_ID", "Team_Role_ID", "Committee_ID", "Committee_Role_ID", "Leader_Rank_ID"],
  Leader_Ranks_Tasks: ["Task_Rank_ID", "Rank_Name", "Role_Type", "Structure_Level", "Order_Weight"],
};

/** Normalize header by stripping zero-width spaces (Sheet Best sometimes prefixes \u200B) and trimming. */
const cleanKey = (k: string) => k.replace(/\u200B/g, "").trim();

/** Validate that a sheet contains the required columns. Returns the list of missing ones. */
export function validateSheetSchema(tab: string, rows: any[]): string[] {
  const required = REQUIRED_COLUMNS[tab];
  if (!required || !rows || rows.length === 0) return [];
  const headers = new Set(Object.keys(rows[0]).map(cleanKey));
  return required.filter((c) => !headers.has(c));
}

// Track which schema warnings have already been shown to avoid spamming toasts on every sync.
const shownSchemaWarnings = new Set<string>();

export async function syncFromCloud(): Promise<{ ok: boolean; error?: string; schemaIssues?: Record<string, string[]> }> {
  suppressCloud = true;
  const schemaIssues: Record<string, string[]> = {};
  try {
    await Promise.all(
      Object.entries(CLOUD).map(async ([key, map]) => {
        try {
          const { data, error } = await (supabase as any).from(map.tab).select("*");
          if (error) throw error;
          const rows = data || [];
          const missing = validateSheetSchema(map.tab, rows);
          if (missing.length > 0) {
            schemaIssues[map.tab] = missing;
            const sig = `${map.tab}:${missing.join(",")}`;
            if (!shownSchemaWarnings.has(sig)) {
              shownSchemaWarnings.add(sig);
              const msg = `تنبيه: الورقة "${map.tab}" تفتقد الأعمدة المطلوبة: ${missing.join("، ")}`;
              console.warn(`[SheetBest] ${msg}`);
              toast.error(msg, { duration: 10000 });
            }
          }
          let norm = map.normalize
            ? rows.map(map.normalize).filter((r: any) => r != null)
            : rows;
          // Preserve local "read" state for notifications so a sync doesn't
          // resurrect the red badge while the cloud row is still catching up.
          if (key === KEYS.userNotifications) {
            const localRaw = localStorage.getItem(key);
            if (localRaw) {
              try {
                const localList: any[] = JSON.parse(localRaw);
                const localById = new Map(localList.map((r: any) => [r.Notification_ID, r]));
                norm = norm.map((r: any) => {
                  const l = localById.get(r.Notification_ID);
                  if (!l) return r;
                  const localRead = boolish(l.Is_Read);
                  const cloudRead = boolish(r.Is_Read);
                  return {
                    ...r,
                    Is_Read: (localRead || cloudRead) ? "True" : "False",
                    Opened_At: r.Opened_At || l.Opened_At || "",
                  };
                });
              } catch { /* ignore */ }
            }
          }
          writeLocal(key, norm);
        } catch (e) {
          // Missing tab shouldn't crash the whole sync — log and continue.
          console.warn(`[SheetBest] sync ${map.tab} failed:`, e);
        }
      })
    );
    return { ok: true, schemaIssues: Object.keys(schemaIssues).length ? schemaIssues : undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    notifyApiError("تحميل البيانات", e);
    return { ok: false, error: msg };
  } finally {
    suppressCloud = false;
  }
}

// ---------- Helpers ----------
export const fullName = (u: Pick<User, "First_Name" | "Father_Name" | "Grandfather_Name" | "Last_Name">) =>
  [u.First_Name, u.Father_Name, u.Grandfather_Name, u.Last_Name].filter(Boolean).join(" ");

/** Get the Rank_Weight for a user from Member_Ranks (ascending = higher rank). */
export const rankWeightOf = (u: Pick<User, "Rank">): number => {
  if (!u.Rank) return 9999;
  const r = db.memberRanks.all().find(
    (x) => x.Rank_ID === u.Rank || x.Rank_Name === u.Rank,
  );
  return r ? (r.Rank_Weight ?? r.Rank_Level ?? 9999) : 9999;
};

/** Hierarchical leadership weight (lower = higher rank). Uses Structure_Level from Leader_Ranks_Tasks. */
export const leaderWeightOf = (u: Pick<User, "Leader_Rank_ID" | "Team_Role_ID" | "Committee_Role_ID">): number => {
  if (u.Leader_Rank_ID) {
    const r = db.leaderRanksTasks.all().find((x) => x.Task_Rank_ID === u.Leader_Rank_ID);
    if (r) return r.Structure_Level || 9999;
  }
  // Fallback: use team role weight, then committee role weight
  if (u.Team_Role_ID) {
    const r = db.teamRoles.all().find((x) => x.Team_Role_ID === u.Team_Role_ID);
    if (r) return r.Weight || 9999;
  }
  if (u.Committee_Role_ID) {
    const r = db.committeeRoles.all().find((x) => x.Committee_Role_ID === u.Committee_Role_ID);
    if (r) return r.Weight || 9999;
  }
  return 9999;
};

const _isMaster = (u: User | null | undefined) =>
  !!u && (u.Email || "").toLowerCase() === "admin@admin.com";

export const isGeneralLeader = (u: User | null | undefined) =>
  !!u && (_isMaster(u) || /قائد\s*عام/.test(String(u.Rank || "")) || /قائد\s*عام/.test(String((u as any).Leader_Rank_ID || "")));

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
  | "news_admin" | "vision_admin" | "social_accounts"
  | "users_manage" | "password_requests" | "sub_groups_admin"
  | "events_admin" | "finance_ledger"
  | "hierarchy_report" | "hierarchy_levels" | "role_assignment"
  | "leader_attendance" | "leader_attendance_report" | "data_verification"
  | "send_notifications" | "auto_notifications_config" | "notifications_tracking";

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
  { key: "hierarchy_levels", label: "إدارة مستويات الهيكل التنظيمي", icon: "🪜" },
  { key: "scanner", label: "ماسح QR", icon: "📷" },
  { key: "manual", label: "حضور يدوي (أعضاء)", icon: "📝" },
  { key: "reports", label: "تقرير حضور الأعضاء", icon: "📈" },
  { key: "leader_attendance", label: "تسجيل حضور القادة", icon: "📋" },
  { key: "leader_attendance_report", label: "تقرير حضور القادة", icon: "📊" },
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
  { key: "data_verification", label: "تحقق البيانات", icon: "🔍" },
  { key: "notes", label: "ملاحظات سرية", icon: "🔒" },
  { key: "send_notifications", label: "إرسال الإشعارات والرسائل", icon: "📣" },
  { key: "auto_notifications_config", label: "إعدادات تذكير الخدمة العامة", icon: "⏰" },
  { key: "notifications_tracking", label: "متابعة فتح الإشعارات", icon: "📬" },
  { key: "social_accounts", label: "حسابات التواصل الاجتماعي", icon: "🔗" },
  { key: "settings", label: "هوية الموقع", icon: "⚙️" },
];

export const DEFAULT_MEMBER_SCREENS = "id,attendance,badges_my,tasks_my,finance_my,profile";

export const MASTER_ADMIN_EMAIL = "admin@admin.com";
export const MASTER_ADMIN_PASSWORD = "admin123123";
export const isMasterAdmin = (u: User | null | undefined) =>
  !!u && (u.Email || "").toLowerCase() === MASTER_ADMIN_EMAIL;

// If Visible_Screens is empty → leaders see all, members see defaults.
// Master admin (admin@admin.com) always sees every screen.
//
// Per-screen CRUD permissions are encoded as `screen_key:<flags>` inside the
// same Visible_Screens string (comma-separated). Flag characters:
//   r = read (the screen is visible)
//   a = add  (can create new rows)
//   e = edit (can update existing rows)
//   d = delete
// Legacy entries:
//   - no colon (e.g. "attendance")         → full access r+a+e+d
//   - "rwd" / "rw" / "w"                   → 'w' is expanded to 'a'+'e' for back-compat
// Examples:
//   "attendance,finance:rae,notes:r"  → finance allows read/add/edit but not delete
//   "reports:r,manual:ra"             → manual allows read+add (no edit/delete)
export type PermAction = "r" | "a" | "e" | "d";

/** Expand legacy 'w' flag to 'a' + 'e' so old data keeps working. */
function _expand(p: string): string {
  if (!p) return "";
  let out = p.toLowerCase();
  if (out.includes("w")) {
    if (!out.includes("a")) out += "a";
    if (!out.includes("e")) out += "e";
  }
  return out;
}

function _parsePerms(raw: string): Map<string, string> {
  const out = new Map<string, string>();
  raw.split(",").map((s) => s.trim()).filter(Boolean).forEach((tok) => {
    const [k, p] = tok.split(":");
    const key = (k || "").trim();
    if (!key) return;
    // No colon → full access (legacy default).
    const perms = _expand((p == null ? "raed" : p.trim().toLowerCase()) || "r");
    out.set(key, perms);
  });
  return out;
}

function _serializePerms(map: Map<string, string>): string {
  return Array.from(map.entries())
    .filter(([, p]) => p && p.includes("r"))
    .map(([k, p]) => {
      const has = (c: string) => p.includes(c);
      // Canonical full access → store as bare key for compactness.
      if (has("r") && has("a") && has("e") && has("d")) return k;
      // Sort flags in canonical order for readability.
      let flags = "";
      if (has("r")) flags += "r";
      if (has("a")) flags += "a";
      if (has("e")) flags += "e";
      if (has("d")) flags += "d";
      return `${k}:${flags}`;
    })
    .join(",");
}

export function getScreenPerms(user: User | null | undefined, key: ScreenKey): string {
  if (!user) return "";
  if (isMasterAdmin(user)) return "raed";
  const raw = (user.Visible_Screens || "").trim();
  if (!raw) {
    if (isLeader(user)) return "raed";
    return DEFAULT_MEMBER_SCREENS.split(",").includes(key) ? "raed" : "";
  }
  return _parsePerms(raw).get(key) || "";
}

export function hasScreen(user: User | null | undefined, key: ScreenKey): boolean {
  if (!user) return false;
  if (key === "admin_overview" && !isGeneralLeader(user)) return false;
  return getScreenPerms(user, key).includes("r");
}

export const canRead = (u: User | null | undefined, k: ScreenKey) =>
  hasScreen(u, k);
export const canCreate = (u: User | null | undefined, k: ScreenKey) =>
  hasScreen(u, k) && getScreenPerms(u, k).includes("a");
export const canEdit = (u: User | null | undefined, k: ScreenKey) =>
  hasScreen(u, k) && getScreenPerms(u, k).includes("e");
/** Back-compat: true when the user can add OR edit. */
export const canWrite = (u: User | null | undefined, k: ScreenKey) =>
  canCreate(u, k) || canEdit(u, k);
export const canDelete = (u: User | null | undefined, k: ScreenKey) =>
  hasScreen(u, k) && getScreenPerms(u, k).includes("d");

/** Per-screen permission shape used by the Permissions admin UI. */
export type PermBits = { r: boolean; a: boolean; e: boolean; d: boolean };

/**
 * Build a Visible_Screens string from a permission map for the Permissions admin UI.
 */
export function buildVisibleScreensString(perms: Record<string, PermBits>): string {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(perms)) {
    if (!v.r && !v.a && !v.e && !v.d) continue;
    let s = "";
    if (v.r) s += "r";
    if (v.a) s += "a";
    if (v.e) s += "e";
    if (v.d) s += "d";
    map.set(k, s || "r");
  }
  return _serializePerms(map);
}

/**
 * Parse a user's Visible_Screens into an explicit Record for editing.
 * Returns the EFFECTIVE permissions including the implicit defaults.
 */
export function readUserPerms(user: User | null | undefined): Record<string, PermBits> {
  const out: Record<string, PermBits> = {};
  if (!user) return out;
  const all = [...MEMBER_SCREENS.map((s) => s.key), ...ADMIN_SCREENS.map((s) => s.key)];
  for (const k of all) {
    const p = getScreenPerms(user, k);
    out[k] = {
      r: p.includes("r"),
      a: p.includes("a"),
      e: p.includes("e"),
      d: p.includes("d"),
    };
  }
  return out;
}

// ---------- Team-scope helpers ----------
/**
 * Returns the Team_ID a viewer is restricted to, or null for unrestricted
 * (master admin and general leaders see all teams).
 */
export function viewerTeamScope(user: User | null | undefined): string | null {
  if (!user) return "__none__";
  if (isMasterAdmin(user) || isGeneralLeader(user)) return null;
  return user.Team_ID || "__none__";
}

export function isInScope(user: User | null | undefined, targetTeamId: string | undefined | null): boolean {
  const scope = viewerTeamScope(user);
  if (scope === null) return true;
  return (targetTeamId || "") === scope;
}

export function seedIfEmpty() {}

