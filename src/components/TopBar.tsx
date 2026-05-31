import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export function GroupHeader() {
  const s = db.settings.get();
  return (
    <div className="flex items-center gap-3">
      {s.logo ? (
        <img src={s.logo} alt="شعار" className="h-12 w-12 rounded-full object-cover ring-2 ring-gold" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-2xl">
          ⚜️
        </div>
      )}
      <div>
        <div className="text-xs text-muted-foreground">نظام إدارة الكشافة</div>
        <div className="font-bold text-foreground">{s.groupName}</div>
      </div>
    </div>
  );
}

export function TopBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <GroupHeader />
        {user && (
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/80"
            >
              <span className="hidden sm:inline">{user.firstName} {user.lastName}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {user.firstName[0]}
              </span>
            </button>
            {open && (
              <div className="absolute left-0 mt-2 w-48 rounded-lg border bg-popover p-1 shadow-lg">
                <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                  {user.role === "admin" ? "مدير" : user.role === "leader" ? "قائد" : "عضو"} · {user.rank}
                </div>
                <button
                  onClick={() => { logout(); nav({ to: "/login" }); }}
                  className="w-full rounded px-3 py-2 text-right text-sm hover:bg-secondary"
                >تسجيل الخروج</button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
