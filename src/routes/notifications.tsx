import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/notifications")({ component: NotificationsCenter });

function NotificationsCenter() {
  const { user, loading, isLeader } = useAuth();
  const nav = useNavigate();
  const [, force] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    // Mark all unread as read on entering the center.
    db.userNotifications.markAllReadForUser(user.ID);
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

  return (
    <AppShell items={sidebar}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">مركز الإشعارات</h1>
        <p className="text-sm text-muted-foreground mb-4">جميع الإشعارات الخاصة بك</p>
        <div className="rounded-xl border bg-card divide-y">
          {items.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">لا توجد إشعارات حالياً</div>
          )}
          {items.map((n) => (
            <div key={n.Notification_ID} className="p-4 flex items-start gap-3">
              <div className="text-2xl">🔔</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{n.Title}</div>
                <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.Body}</div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  {n.Created_At ? new Date(n.Created_At).toLocaleString("ar-EG") : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
