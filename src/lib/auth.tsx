import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db, seedIfEmpty, type User } from "./db";

interface AuthCtx {
  user: User | null;
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
    const u = db.users.all().find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u) return { ok: false, msg: "البريد الإلكتروني غير مسجل" };
    if (u.password !== password) return { ok: false, msg: "كلمة المرور غير صحيحة" };
    if (u.status === "pending") return { ok: false, msg: "حسابك بانتظار موافقة القائد" };
    if (u.status === "rejected") return { ok: false, msg: "تم رفض حسابك" };
    db.session.set(u.id);
    setUser(u);
    return { ok: true };
  };
  const logout = () => { db.session.set(null); setUser(null); };

  return <Ctx.Provider value={{ user, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
