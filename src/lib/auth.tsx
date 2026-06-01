import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db, syncFromCloud, isGeneralLeader, isLeader, type User } from "./db";

interface AuthCtx {
  user: User | null;
  isLeader: boolean;
  isGeneralLeader: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
  logout: () => void;
  refresh: () => void;
  reload: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    const id = db.session.get();
    setUser(id ? db.users.get(id) ?? null : null);
  };

  const reload = async () => {
    setLoading(true);
    await syncFromCloud();
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

    // Master Super Admin — hardcoded bypass. Never blocked by Status,
    // always treated as Leader with full screen permissions.
    if (normEmail === "admin@admin.com" && password === "admin123123") {
      await syncFromCloud().catch(() => {});
      const existing = db.users.all().find(
        (x) => (x.Email || "").toLowerCase() === "admin@admin.com"
      );
      const master: User = existing
        ? { ...existing, Role: "Leader", Status: "Active", Password: "admin123123" }
        : {
            ID: "MASTER-ADMIN",
            First_Name: "Master", Father_Name: "", Grandfather_Name: "", Last_Name: "Admin",
            Phone: "", Has_WhatsApp: false, National_ID: "", Birth_Date: "",
            Profile_Photo: "", National_ID_Front: "", National_ID_Back: "", Birth_Certificate: "",
            Confession_Father: "", Email: "admin@admin.com", Password: "admin123123",
            Education_Stage: "خريج", Parent_Phone: "",
            Role: "Leader", Rank: "قائد عام",
            Team_ID: "", Patrol_ID: "", Status: "Active", Visible_Screens: "",
          };
      db.users.upsert(master);
      db.session.set(master.ID);
      setUser(master);
      return { ok: true };
    }

    // Ensure we have the latest Users snapshot before validating.
    await syncFromCloud();
    const u = db.users.all().find(
      (x) => x.Email && x.Email.toLowerCase() === normEmail
    );
    if (!u) return { ok: false, msg: "البريد الإلكتروني غير مسجل" };
    if (u.Password !== password) return { ok: false, msg: "كلمة المرور غير صحيحة" };
    if (u.Status === "Pending") return { ok: false, msg: "حسابك بانتظار موافقة القائد" };
    db.session.set(u.ID);
    setUser(u);
    return { ok: true };
  };
  const logout = () => { db.session.set(null); setUser(null); };

  return (
    <Ctx.Provider
      value={{
        user,
        isLeader: isLeader(user),
        isGeneralLeader: isGeneralLeader(user),
        loading,
        login,
        logout,
        refresh,
        reload,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
