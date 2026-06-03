import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { db, fullName, isMasterAdmin } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/history")({ component: HistoryLogScreen });

function HistoryLogScreen() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [, force] = useState(0);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (!isMasterAdmin(user)) { nav({ to: "/dashboard" }); return; }
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, [user, loading, nav]);

  if (loading || !user || !isMasterAdmin(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        جاري التحقق من الصلاحيات…
      </div>
    );
  }

  const q = filter.trim();
  const rows = db.history.all().filter((h) => {
    if (!q) return true;
    const u = db.users.get(h.User_ID);
    const name = u ? fullName(u) : "";
    return (
      name.includes(q) ||
      (h.Action_Type || "").includes(q) ||
      (h.Details || "").includes(q) ||
      (h.Admin_Name || "").includes(q)
    );
  });

  const sidebar = [
    { key: "back_admin", label: "لوحة التحكم", icon: "🛠️", onClick: () => nav({ to: "/admin" }) },
    { key: "back_dashboard", label: "الرئيسية", icon: "🏠", onClick: () => nav({ to: "/dashboard" }) },
  ];

  return (
    <AppShell items={sidebar}>
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">سجل النشاط (History Log)</h1>
            <p className="text-sm text-muted-foreground">شاشة سرية — للمدير العام فقط</p>
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="بحث في السجل…"
            className="rounded-lg border bg-background px-3 py-2 text-sm w-56"
          />
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs">
              <tr>
                <th className="text-right px-3 py-2">الوقت</th>
                <th className="text-right px-3 py-2">المستخدم</th>
                <th className="text-right px-3 py-2">الإجراء</th>
                <th className="text-right px-3 py-2">التفاصيل</th>
                <th className="text-right px-3 py-2">بواسطة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => {
                const u = db.users.get(h.User_ID);
                return (
                  <tr key={h.Log_ID} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {h.Timestamp ? new Date(h.Timestamp).toLocaleString("ar-EG") : "—"}
                    </td>
                    <td className="px-3 py-2">{u ? fullName(u) : h.User_ID || "—"}</td>
                    <td className="px-3 py-2">{h.Action_Type}</td>
                    <td className="px-3 py-2 text-muted-foreground">{h.Details}</td>
                    <td className="px-3 py-2">{h.Admin_Name}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا يوجد سجل</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
