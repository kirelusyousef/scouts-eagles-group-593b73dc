import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, RefreshCw, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { db, syncFromCloud } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/notifications")({ component: NotificationsCenter });

function boolish(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

type FilterMode = "all" | "unread";

function NotificationsCenter() {
  const { user, loading, isLeader } = useAuth();
  const nav = useNavigate();
  const [, force] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const PULL_THRESHOLD = 70;

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, [user, loading, nav]);

  const allItems = useMemo(() => {
    if (!user) return [];
    return [...db.userNotifications.byUser(user.ID)].sort(
      (a, b) => (b.Created_At || "").localeCompare(a.Created_At || ""),
    );
  }, [user]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const n of allItems) if (n.Source) set.add(n.Source);
    return Array.from(set);
  }, [allItems]);

  const items = useMemo(() => {
    return allItems.filter((n) => {
      if (filter === "unread" && boolish(n.Is_Read)) return false;
      if (sourceFilter && n.Source !== sourceFilter) return false;
      return true;
    });
  }, [allItems, filter, sourceFilter]);

  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await syncFromCloud();
    } catch {/* ignore */}
    setTimeout(() => {
      setRefreshing(false);
      setPullY(0);
    }, 400);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 0) { startYRef.current = null; return; }
    startYRef.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current == null || refreshing) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0 && window.scrollY === 0) {
      const damped = Math.min(dy * 0.5, 120);
      setPullY(damped);
    }
  };
  const onTouchEnd = () => {
    if (startYRef.current == null) return;
    startYRef.current = null;
    if (pullY >= PULL_THRESHOLD) {
      setPullY(60);
      doRefresh();
    } else {
      setPullY(0);
    }
  };

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
    if (openId === id) {
      setOpenId(null);
    } else {
      setOpenId(id);
      db.userNotifications.markRead(id);
    }
  };

  const unreadCount = allItems.filter((n) => !boolish(n.Is_Read)).length;

  return (
    <AppShell items={sidebar}>
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="mx-auto max-w-3xl"
        style={{ touchAction: "pan-y" }}
      >
        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-center justify-center text-muted-foreground text-xs overflow-hidden transition-[height] duration-200"
          style={{ height: refreshing ? 48 : pullY }}
          aria-live="polite"
        >
          {(refreshing || pullY > 0) && (
            <div className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                style={{ transform: refreshing ? undefined : `rotate(${Math.min(pullY * 3, 270)}deg)` }} />
              <span>{refreshing ? "جاري التحديث…" : pullY >= PULL_THRESHOLD ? "حرّر للتحديث" : "اسحب للأسفل للتحديث"}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">مركز الإشعارات</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => db.userNotifications.markAllReadForUser(user.ID)}
              disabled={unreadCount === 0}
              aria-label="تعليم الكل كمقروء"
              title="تعليم الكل كمقروء"
              className="rounded-lg p-2 hover:bg-secondary transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
            <button
              onClick={doRefresh}
              disabled={refreshing}
              aria-label="تحديث"
              className="rounded-lg p-2 hover:bg-secondary transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">اضغط على الإشعار لقراءة التفاصيل</p>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex rounded-lg border bg-card p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs rounded-md transition ${filter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
            >الكل ({allItems.length})</button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-xs rounded-md transition ${filter === "unread" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
            >غير المقروءة ({unreadCount})</button>
          </div>
          {sources.length > 0 && (
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">كل الأنواع</option>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div className="rounded-xl border bg-card divide-y">
          {items.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">لا توجد إشعارات مطابقة</div>
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
