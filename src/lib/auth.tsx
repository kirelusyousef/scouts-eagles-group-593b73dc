import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db, seedIfEmpty, isGeneralLeader, isLeader, type User } from "./db";

interface AuthCtx {
  user: User | null;
  isLeader: boolean;
  isGeneralLeader: boolean;
  login: (email: string, password: string) => { ok: boolean; msg?: string };
  logout: () => void;
  refresh: () => void;
}
const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const refresh = () => {
    const id = db.session.get();
    setUser(id ? db.users.get(id) ?? null : null);
  };

  useEffect(() => {
    seedIfEmpty();
    refresh();
    const h = () => refresh();
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const login = (email: string, password: string) => {
    const u = db.users.all().find(
      (x) => x.Email.toLowerCase() === email.toLowerCase()
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
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
