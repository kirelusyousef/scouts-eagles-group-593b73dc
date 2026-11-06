import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db, syncFromCloud, isGeneralLeader, isLeader, MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD, type User } from "./db";
import { loginSession } from "./secure.functions";
import { clearSessionToken, getSessionToken, setSessionToken } from "./session-store";

const PERSIST_KEY = "scout_user";

interface AuthCtx {
  user: User | null;
  isAuthenticated: boolean;
  isLeader: boolean;
  isGeneralLeader: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
  logout: () => void;
  refresh: () => void;
  reload: () => Promise<void>;
  setUser: (u: User) => void;
}
const Ctx = createContext<AuthCtx>({} as AuthCtx);

function loadPersisted(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function persist(u: User | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(PERSIST_KEY, JSON.stringify(u));
  else localStorage.removeItem(PERSIST_KEY);
}

/** A stored user object is only trusted while the server-issued session
 *  token that came with the sign-in is still there. Otherwise the person
 *  has to sign in again before the app hands back a session. */
function loadPersistedWithSession(): User | null {
  if (typeof window === "undefined") return null;
  if (!getSessionToken()) {
    try {
      localStorage.removeItem(PERSIST_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
  return loadPersisted();
}

/** Normalize any user payload: defaults Status to "Active" when missing/null
 *  and ensures Visible_Screens is at least an empty string. Prevents the
 *  app from kicking authenticated users out because of empty DB cells. */
function normalizeUser(u: User): User {
  const s: any = u.Status;
  const status: User["Status"] = s === "Pending" ? "Pending" : s === "Suspended" ? "Suspended" : "Active";
  return {
    ...u,
    Status: status,
    Visible_Screens: u.Visible_Screens ?? "",
    Role: u.Role || "Member",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize synchronously from localStorage to avoid a null-flash that
  // would cause route guards to kick the user back to /login.
  const [user, setUserState] = useState<User | null>(() => loadPersistedWithSession());
  const [loading, setLoading] = useState(true);

  // Sync session id (legacy) + persisted user.
  const applyUser = (u: User | null) => {
    if (u) {
      const norm = normalizeUser(u);
      persist(norm);
      db.session.set(norm.ID);
      setUserState(norm);
    } else {
      persist(null);
      db.session.set(null);
      setUserState(null);
    }
  };

  const refresh = () => {
    // Background DB updates may rewrite the Users table. Try to find the
    // currently-logged-in user in the latest snapshot, but NEVER null out
    // an authenticated session just because a cloud sync missed the row.
    const current = loadPersisted();
    if (!current) {
      setUserState(null);
      return;
    }
    // Master admin: always keep session.
    if ((current.Email || "").toLowerCase() === MASTER_ADMIN_EMAIL) {
      setUserState(current);
      return;
    }
    const fresh = db.users.get(current.ID);
    if (fresh) {
      const norm = normalizeUser(fresh);
      persist(norm);
      setUserState(norm);
    } else {
      // Keep the persisted copy — do not force a logout.
      setUserState(current);
    }
  };

  const reload = async () => {
    setLoading(true);
    try {
      await syncFromCloud();
    } catch {
      /* ignore — keep persisted session */
    }
    refresh();
    setLoading(false);
  };

  useEffect(() => {
    reload();
    const h = () => refresh();
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const login = async (email: string, password: string) => {
    const normEmail = email.trim().toLowerCase();

    // The server checks the password against the Users table and mints a
    // signed session token. Protected writes (news, group info, edit
    // requests) are refused without it.
    let server: { ok: boolean; token?: string; msg?: string } | null = null;
    try {
      server = await loginSession({ data: { email: normEmail, password } });
    } catch {
      server = null;
    }
    if (server && !server.ok) {
      clearSessionToken();
      return { ok: false, msg: server.msg || "تعذر تسجيل الدخول" };
    }
    if (server?.token) setSessionToken(server.token);
    else clearSessionToken();

    // Master Super Admin — hardcoded bypass.
    if (normEmail === MASTER_ADMIN_EMAIL && password === MASTER_ADMIN_PASSWORD) {
      await syncFromCloud().catch(() => {});
      const existing = db.users.all().find(
        (x) => (x.Email || "").toLowerCase() === MASTER_ADMIN_EMAIL
      );
      const master: User = existing
        ? { ...existing, Role: "Leader", Status: "Active", Password: MASTER_ADMIN_PASSWORD }
        : {
            ID: "MASTER-ADMIN",
            First_Name: "Master", Father_Name: "", Grandfather_Name: "", Last_Name: "Admin",
            Phone: "", Has_WhatsApp: false, National_ID: "", Birth_Date: "",
            Gender: "ذكر",
            Profile_Photo: "", National_ID_Front: "", National_ID_Back: "", Birth_Certificate: "",
            Confession_Father: "", Email: MASTER_ADMIN_EMAIL, Password: MASTER_ADMIN_PASSWORD,
            Education_Stage: "خريج", Parent_Phone: "",
            Role: "Leader", User_Type: "قائد", Rank: "قائد عام", Leader_Rank_ID: "",
            Team_ID: "", Patrol_ID: "", Status: "Active", Visible_Screens: "",
          };
      try { db.users.upsert(master); } catch { /* ignore */ }
      applyUser(master);
      return { ok: true };
    }

    try { await syncFromCloud(); } catch { /* offline-tolerant */ }
    const u = db.users.all().find(
      (x) => x.Email && x.Email.toLowerCase() === normEmail
    );
    if (!u) return { ok: false, msg: "البريد الإلكتروني غير مسجل" };
    if (u.Password !== password) return { ok: false, msg: "كلمة المرور غير صحيحة" };
    if (u.Status === "Pending") return { ok: false, msg: "حسابك بانتظار موافقة القائد" };
    if ((u.Status as any) === "Suspended") return { ok: false, msg: "تم إيقاف هذا الحساب من قِبل الإدارة" };
    applyUser(u);
    return { ok: true };
  };

  const logout = () => {
    clearSessionToken();
    applyUser(null);
  };

  // External setter (e.g. after profile photo update) — instantly refreshes
  // header avatar and persisted session.
  const setUser = (u: User) => applyUser(u);

  return (
    <Ctx.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLeader: isLeader(user),
        isGeneralLeader: isGeneralLeader(user),
        loading,
        login,
        logout,
        refresh,
        reload,
        setUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
