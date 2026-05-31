import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!user) nav({ to: "/login" });
    else if (user.role === "admin" || user.role === "leader") nav({ to: "/admin" });
    else nav({ to: "/dashboard" });
  }, [user, nav]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground">جاري التحميل...</div>
    </div>
  );
}
