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
    // Ensure we have the latest Users snapshot before validating.
    await syncFromCloud();
    const u = db.users.all().find(
      (x) => x.Email && x.Email.toLowerCase() === email.toLowerCase()
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
