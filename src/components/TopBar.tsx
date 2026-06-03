import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { db, fullName } from "@/lib/db";

function useSettings() {
  // Start empty to match SSR output, then hydrate from localStorage on client.
  const [s, setS] = useState<{ Group_Name: string; Logo_URL: string }>({
    Group_Name: "مجموعة الكشافة",
    Logo_URL: "",
  });
  useEffect(() => {
    setS(db.appSettings.latest());
    const h = () => setS(db.appSettings.latest());
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);
  return s;
}

export function GroupHeader() {
  const s = useSettings();
  return (
    <div className="flex items-center gap-3">
      {s.Logo_URL ? (
        <img src={s.Logo_URL} alt="شعار" className="h-12 w-12 rounded-full object-cover ring-2 ring-gold" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-2xl">
          ⚜️
        </div>
      )}
      <div>
        <div className="text-xs text-muted-foreground">نظام إدارة الكشافة</div>
        <div className="font-bold text-foreground">{s.Group_Name}</div>
      </div>
    </div>
  );
}

export function TopBar() {
  const { user, logout, isGeneralLeader } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <GroupHeader />
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/80"
          >
            <span className="hidden sm:inline">{fullName(user)}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground overflow-hidden">
              {user.Profile_Photo ? <img src={user.Profile_Photo} alt="" className="h-full w-full object-cover" /> : user.First_Name[0]}
            </span>
          </button>
          {open && (
            <div className="absolute left-0 mt-2 w-56 rounded-lg border bg-popover p-1 shadow-lg">
              <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                {isGeneralLeader ? "قائد عام" : user.Role === "Leader" ? "قائد" : "عضو"} · {user.Rank}
              </div>
              <button
                onClick={() => { logout(); nav({ to: "/login" }); }}
                className="w-full rounded px-3 py-2 text-right text-sm hover:bg-secondary"
              >تسجيل الخروج</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
