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

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  return v ? (JSON.parse(v) as T) : fallback;
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new Event("sms-db-change"));
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

// ---------- Helpers ----------
export const fullName = (u: Pick<User, "First_Name" | "Father_Name" | "Last_Name">) =>
  [u.First_Name, u.Father_Name, u.Last_Name].filter(Boolean).join(" ");

// "General Leader" = Role 'Leader' + Rank includes 'قائد عام'.
// Used to gate confidential modules (Educator Notes, settings, approvals).
export const isGeneralLeader = (u: User | null | undefined) =>
  !!u && u.Role === "Leader" && /قائد\s*عام/.test(u.Rank);

export const isLeader = (u: User | null | undefined) => !!u && u.Role === "Leader";

export function seedIfEmpty() {
  if (db.users.all().length > 0) return;

  const teams: Team[] = [
    { Team_ID: "T-001", Team_Name: "الأشبال", Leader_In_Charge: "—" },
    { Team_ID: "T-002", Team_Name: "الكشافة", Leader_In_Charge: "القائد العام" },
    { Team_ID: "T-003", Team_Name: "الجوالة", Leader_In_Charge: "—" },
  ];
  const patrols: Patrol[] = [
    { Patrol_ID: "P-001", Patrol_Name: "طليعة النسر", Team_ID: "T-001", Patrol_Leader_Name: "—", Total_Points: 0 },
    { Patrol_ID: "P-002", Patrol_Name: "طليعة الصقر", Team_ID: "T-001", Patrol_Leader_Name: "—", Total_Points: 0 },
    { Patrol_ID: "P-003", Patrol_Name: "طليعة الأسد", Team_ID: "T-002", Patrol_Leader_Name: "—", Total_Points: 0 },
    { Patrol_ID: "P-004", Patrol_Name: "طليعة الفهد", Team_ID: "T-002", Patrol_Leader_Name: "—", Total_Points: 0 },
    { Patrol_ID: "P-005", Patrol_Name: "طليعة الذئب", Team_ID: "T-003", Patrol_Leader_Name: "—", Total_Points: 0 },
  ];
  db.teams.save(teams);
  db.patrols.save(patrols);

  const admin: User = {
    ID: "U-ADMIN",
    First_Name: "القائد",
    Father_Name: "العام",
    Grandfather_Name: "—",
    Last_Name: "للمجموعة",
    Phone: "01000000000",
    Has_WhatsApp: true,
    National_ID: "00000000000000",
    Confession_Father: "—",
    Email: "admin@scout.local",
    Password: "admin123",
    Education_Stage: "خريج",
    Parent_Phone: "",
    Role: "Leader",
    Rank: "قائد عام",
    Team_ID: "T-002",
    Patrol_ID: "P-003",
    Status: "Active",
  };
  db.users.save([admin]);
}
