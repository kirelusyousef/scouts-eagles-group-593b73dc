// LocalStorage-backed mock DB. Each "table" mirrors a Google Sheets row shape
// so it's trivial to swap for a Sheet Best / Stein / Apps Script API later.

export type Role = "admin" | "leader" | "member";
export type Status = "pending" | "approved" | "rejected";
export type AttendanceStatus = "present" | "excused" | "absent";
export type PaymentStatus = "paid" | "partial" | "unpaid";

export interface User {
  id: string;
  firstName: string;
  fatherName: string;
  grandfatherName: string;
  lastName: string;
  phone: string;
  hasWhatsapp: boolean;
  nationalId: string;
  confessionFather: string;
  email: string;
  password: string;
  educationStage: string;
  parentPhone?: string;
  role: Role;
  status: Status;
  teamId?: string;
  patrolId?: string;
  rank: string;
  photo?: string;
  createdAt: string;
}

export interface Team { id: string; name: string; }
export interface Patrol { id: string; name: string; teamId: string; }

export interface AttendanceRecord {
  id: string; userId: string; date: string; status: AttendanceStatus; activity?: string;
}

export interface FinanceRecord {
  id: string; userId: string; teamId?: string; scope: "team" | "global";
  title: string; amount: number; status: PaymentStatus; date: string;
}

export interface Badge {
  id: string; userId: string; name: string;
  status: "requested" | "granted" | "rejected"; date: string;
}

export interface HistoryLog {
  id: string; userId: string; action: string; by: string; timestamp: string;
}

export interface Notice {
  id: string; title: string; body: string; teamIds: string[]; createdAt: string;
  readBy: string[];
}

export interface Task {
  id: string; title: string; description: string; patrolId: string;
  doneBy: string[]; createdAt: string;
}

export interface EducatorNote {
  id: string; userId: string; note: string; author: string; timestamp: string;
}

export interface Settings {
  groupName: string;
  logo: string;
}

const KEYS = {
  users: "sms_users", teams: "sms_teams", patrols: "sms_patrols",
  attendance: "sms_attendance", finance: "sms_finance", badges: "sms_badges",
  history: "sms_history", notices: "sms_notices", tasks: "sms_tasks",
  notes: "sms_notes", settings: "sms_settings", session: "sms_session",
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

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const db = {
  // generic
  users: {
    all: () => read<User[]>(KEYS.users, []),
    save: (u: User[]) => write(KEYS.users, u),
    get: (id: string) => db.users.all().find((x) => x.id === id),
    upsert: (u: User) => {
      const all = db.users.all();
      const i = all.findIndex((x) => x.id === u.id);
      if (i >= 0) all[i] = u; else all.push(u);
      db.users.save(all);
    },
  },
  teams: {
    all: () => read<Team[]>(KEYS.teams, []),
    save: (v: Team[]) => write(KEYS.teams, v),
  },
  patrols: {
    all: () => read<Patrol[]>(KEYS.patrols, []),
    save: (v: Patrol[]) => write(KEYS.patrols, v),
    byTeam: (teamId: string) => db.patrols.all().filter((p) => p.teamId === teamId),
  },
  attendance: {
    all: () => read<AttendanceRecord[]>(KEYS.attendance, []),
    save: (v: AttendanceRecord[]) => write(KEYS.attendance, v),
    mark: (userId: string, date: string, status: AttendanceStatus, activity?: string) => {
      const all = db.attendance.all();
      const i = all.findIndex((a) => a.userId === userId && a.date === date);
      const rec = { id: i >= 0 ? all[i].id : uid(), userId, date, status, activity };
      if (i >= 0) all[i] = rec; else all.push(rec);
      db.attendance.save(all);
      return rec;
    },
  },
  finance: {
    all: () => read<FinanceRecord[]>(KEYS.finance, []),
    save: (v: FinanceRecord[]) => write(KEYS.finance, v),
  },
  badges: {
    all: () => read<Badge[]>(KEYS.badges, []),
    save: (v: Badge[]) => write(KEYS.badges, v),
  },
  history: {
    all: () => read<HistoryLog[]>(KEYS.history, []),
    log: (userId: string, action: string, by: string) => {
      const all = db.history.all();
      all.unshift({ id: uid(), userId, action, by, timestamp: new Date().toISOString() });
      write(KEYS.history, all);
    },
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
    get: (): Settings => read<Settings>(KEYS.settings, {
      groupName: "مجموعة الكشافة",
      logo: "",
    }),
    save: (s: Settings) => write(KEYS.settings, s),
  },
  session: {
    get: (): string | null => read<string | null>(KEYS.session, null),
    set: (id: string | null) => write(KEYS.session, id),
  },
};

export function seedIfEmpty() {
  if (db.users.all().length > 0) return;
  const teams: Team[] = [
    { id: "t1", name: "الأشبال" },
    { id: "t2", name: "الكشافة" },
    { id: "t3", name: "الجوالة" },
  ];
  const patrols: Patrol[] = [
    { id: "p1", name: "طليعة النسر", teamId: "t1" },
    { id: "p2", name: "طليعة الصقر", teamId: "t1" },
    { id: "p3", name: "طليعة الأسد", teamId: "t2" },
    { id: "p4", name: "طليعة الفهد", teamId: "t2" },
    { id: "p5", name: "طليعة الذئب", teamId: "t3" },
  ];
  db.teams.save(teams);
  db.patrols.save(patrols);
  const admin: User = {
    id: "admin-1", firstName: "القائد", fatherName: "العام", grandfatherName: "—",
    lastName: "للمجموعة", phone: "01000000000", hasWhatsapp: true, nationalId: "00000000000000",
    confessionFather: "—", email: "admin@scout.local", password: "admin123",
    educationStage: "خريج", role: "admin", status: "approved", rank: "قائد عام",
    teamId: "t2", patrolId: "p3", createdAt: new Date().toISOString(),
  };
  db.users.save([admin]);
}
