import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/notifications")({ component: NotificationsCenter });

function boolish(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function NotificationsCenter() {
  const { user, loading, isLeader } = useAuth();
  const nav = useNavigate();
  const [, force] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, [user, loading, nav]);

  const items = useMemo(() => {
    if (!user) return [];
    return [...db.userNotifications.byUser(user.ID)].sort(
      (a, b) => (b.Created_At || "").localeCompare(a.Created_At || ""),
    );
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">جاري التحميل…</div>
      </div>
    );
  }

  const sidebar = isLeader
    ? [
        { key: "back_admin", label: "لوحة التحكم", icon: "🛠️", onClick: () => nav({ to: "/admin" }) },
        { key: "back_dashboard", label: "الرئيسية", icon: "🏠", onClick: () => nav({ to: "/dashboard" }) },
      ]
    : [
        { key: "back_dashboard", label: "الرئيسية", icon: "🏠", onClick: () => nav({ to: "/dashboard" }) },
      ];

  const handleClick = (id: string) => {
    const isOpen = openId === id;
    if (isOpen) {
      setOpenId(null);
    } else {
      setOpenId(id);
      db.userNotifications.markRead(id);
    }
  };

  return (
    <AppShell items={sidebar}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">مركز الإشعارات</h1>
        <p className="text-sm text-muted-foreground mb-4">اضغط على الإشعار لقراءة التفاصيل</p>
        <div className="rounded-xl border bg-card divide-y">
          {items.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">لا توجد إشعارات حالياً</div>
          )}
          {items.map((n) => {
            const unread = !boolish(n.Is_Read);
            const isOpen = openId === n.Notification_ID;
            return (
              <div key={n.Notification_ID}>
                <button
                  onClick={() => handleClick(n.Notification_ID)}
                  className={`w-full text-right p-4 flex items-center gap-3 hover:bg-secondary/40 transition ${unread ? "bg-primary/5" : ""}`}
                >
                  <div className="text-2xl relative">
                    🔔
                    {unread && (
                      <span className="absolute -top-1 -end-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${unread ? "font-bold" : "font-medium text-muted-foreground"}`}>
                      {n.Title}
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 -mt-1">
                    <div className="rounded-lg bg-secondary/40 p-3">
                      <div className="text-sm whitespace-pre-wrap">{n.Body}</div>
                      <div className="text-[11px] text-muted-foreground mt-2">
                        {n.Created_At ? new Date(n.Created_At).toLocaleString("ar-EG") : ""}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
