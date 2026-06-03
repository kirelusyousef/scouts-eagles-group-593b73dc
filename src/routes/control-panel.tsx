import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { isGeneralLeader } from "@/lib/db";
import { AppShell, type NavItem } from "@/components/AppShell";
import { Overview } from "./admin";

export const Route = createFileRoute("/control-panel")({ component: ControlPanel });

function ControlPanel() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (!isGeneralLeader(user)) {
      toast.error("عذرًا، هذه الشاشة مخصصة للقائد العام للمجموعة فقط");
      nav({ to: "/profile" });
    }
  }, [user, loading, nav]);

  if (loading || !user || !isGeneralLeader(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <div>جاري التحقق من الصلاحيات...</div>
        </div>
      </div>
    );
  }

  const items: NavItem[] = [
    { key: "overview", label: "لوحة التحكم", icon: "📊", onClick: () => {} },
    { key: "back", label: "العودة للإدارة", icon: "↩️", onClick: () => nav({ to: "/admin" }) },
    { key: "profile", label: "ملفي الشخصي", icon: "👤", onClick: () => nav({ to: "/profile" }) },
  ];

  return (
    <AppShell items={items} activeKey="overview">
      <div className="mx-auto max-w-6xl">
        <Overview />
      </div>
    </AppShell>
  );
}
