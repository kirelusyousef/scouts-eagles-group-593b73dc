import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell, Moon, Sun, LogOut, User as UserIcon, Shield, Newspaper, Info,
  Search, ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { db, fullName, isMasterAdmin, syncFromCloud } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { navIcon, ADMIN_GROUP_DISPLAY, ADMIN_CATEGORY_TO_GROUP } from "@/lib/nav-icons";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";

export interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

export interface NavGroup {
  key: string;
  label: string;
  icon?: ReactNode;
  items: NavItem[];
}

function useGroup() {
  const [s, setS] = useState(() => db.appSettings.latest());
  useEffect(() => {
    const h = () => setS(db.appSettings.latest());
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);
  return s;
}

interface DisplayGroup {
  key: string;
  label: string;
  icon: ReactNode;
  items: NavItem[];
}

/** Merge legacy sidebar categories into the 8 main display groups. */
function mergeGroups(groups: NavGroup[]): DisplayGroup[] {
  const order = Object.keys(ADMIN_GROUP_DISPLAY);
  const merged = new Map<string, DisplayGroup>();
  for (const g of groups) {
    const dispKey = ADMIN_CATEGORY_TO_GROUP[g.key] ?? "system";
    const disp = ADMIN_GROUP_DISPLAY[dispKey];
    const existing = merged.get(dispKey);
    if (existing) existing.items.push(...g.items);
    else {
      const Icon = disp.icon;
      merged.set(dispKey, {
        key: dispKey,
        label: disp.label,
        icon: <Icon className="h-6 w-6" strokeWidth={2} />,
        items: [...g.items],
      });
    }
  }
  return order
    .map((k) => merged.get(k))
    .filter((g): g is DisplayGroup => !!g && g.items.length > 0);
}

export function AppShell({
  items,
  groups,
  activeKey,
  children,
}: {
  items?: NavItem[];
  groups?: NavGroup[];
  activeKey?: string;
  children: ReactNode;
}) {
  const { user, logout, isLeader } = useAuth();
  const nav = useNavigate();
  const { isDark, toggle: toggleTheme } = useTheme();
  const group = useGroup();

  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  // Periodically pull fresh data from the cloud so new notifications and
  // other updates appear without requiring a full page refresh.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      syncFromCloud().catch(() => {});
    };
    const interval = window.setInterval(tick, 30000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [user]);

  const unreadCount = user ? db.userNotifications.unreadCount(user.ID) : 0;

  const displayGroups = useMemo(() => (groups ? mergeGroups(groups) : []), [groups]);
  const flatItems = useMemo(
    () => (items ?? []).length > 0 ? items! : displayGroups.flatMap((g) => g.items),
    [items, displayGroups],
  );

  if (!user) return <>{children}</>;

  if ((user.Status as any) === "Suspended") {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-red-950 text-white p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="text-6xl">⛔</div>
          <h1 className="text-2xl font-bold text-red-300">تم إيقاف حسابك مؤقتاً</h1>
          <p className="text-zinc-300 text-sm leading-relaxed">
            لقد قامت إدارة المجموعة بتعليق نشاط حسابك. لن تتمكن من الوصول إلى أي جزء من النظام حتى يتم إعادة تفعيله. للاستفسار، يُرجى التواصل مع القيادة العامة.
          </p>
          <button
            onClick={() => { logout(); nav({ to: "/login" }); }}
            className="rounded-lg bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-medium"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  const initial = (user.First_Name || user.Email || "?").slice(0, 1);
  const master = isMasterAdmin(user);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Compact app header (56px + safe area) */}
      <header
        className="sticky top-0 z-40 border-b glass shadow-soft"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {group.Logo_URL ? (
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full gradient-hero opacity-70 blur-md" />
                <img src={group.Logo_URL} alt="شعار" className="relative h-9 w-9 rounded-full object-cover ring-2 ring-gold shadow-gold" />
              </div>
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-primary text-lg shadow-elegant">⚜️</div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] leading-none tracking-wide text-muted-foreground">نظام إدارة الكشافة</div>
              <div className="truncate text-sm font-bold text-gradient-primary">{group.Group_Name}</div>
            </div>
          </div>

          <div className="ms-auto flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="بحث سريع"
              className="rounded-lg p-2.5 transition press hover:bg-secondary"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={() => { nav({ to: "/notifications" }); setUserOpen(false); }}
              aria-label="مركز الإشعارات"
              className="relative rounded-lg p-2.5 transition press hover:bg-secondary"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse-ring">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setUserOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full bg-secondary py-1 ps-1 pe-3 text-sm transition press hover:bg-secondary/80"
              >
                <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full gradient-primary text-primary-foreground shadow-soft">
                  {user.Profile_Photo ? <img src={user.Profile_Photo} alt="" className="h-full w-full object-cover" /> : initial}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">{fullName(user)}</span>
              </button>
              {userOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} aria-hidden />
                  <div className="absolute end-0 z-50 mt-2 w-56 rounded-xl border glass p-1 shadow-pop animate-scale-in">
                    <div className="border-b px-3 py-2 text-xs text-muted-foreground">
                      {master ? "مدير عام (Super)" : isLeader ? "قائد" : "عضو"} · {user.Rank || "—"}
                    </div>
                    <button
                      onClick={() => { setUserOpen(false); nav({ to: "/profile" }); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-sm transition hover:bg-secondary"
                    >
                      <UserIcon className="h-4 w-4" /> الملف الشخصي
                    </button>
                    {isLeader && (
                      <button
                        onClick={() => { setUserOpen(false); nav({ to: "/admin" }); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-sm transition hover:bg-secondary"
                      >
                        <Shield className="h-4 w-4" /> لوحة التحكم
                      </button>
                    )}
                    <button
                      onClick={() => { toggleTheme(); }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-right text-sm transition hover:bg-secondary"
                    >
                      <span className="flex items-center gap-2">
                        {isDark ? <Sun className="h-4 w-4 text-gold" /> : <Moon className="h-4 w-4" />}
                        الوضع الليلي الكشفي
                      </span>
                      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${isDark ? "bg-gold" : "bg-border"}`}>
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${isDark ? "-translate-x-4" : "-translate-x-0.5"}`} />
                      </span>
                    </button>
                    <button
                      onClick={() => { logout(); nav({ to: "/login" }); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-sm text-destructive transition hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" /> تسجيل الخروج
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Horizontal icon navigation (replaces the sidebar) */}
        <IconNav
          items={items}
          displayGroups={displayGroups}
          activeKey={activeKey}
          onGoNews={() => nav({ to: "/news" })}
          onGoAbout={() => nav({ to: "/vision" })}
        />
      </header>

      {/* Quick search across all screens */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="ابحث عن شاشة..." />
        <CommandList>
          <CommandEmpty>لا توجد نتائج</CommandEmpty>
          <CommandGroup heading="الشاشات">
            {flatItems.map((it) => (
              <CommandItem
                key={it.key}
                value={it.label}
                onSelect={() => { setSearchOpen(false); it.onClick(); }}
              >
                <span className="me-2 text-muted-foreground">{navIcon(it.key, it.icon, "h-4 w-4")}</span>
                {it.label}
              </CommandItem>
            ))}
            <CommandItem value="الأخبار" onSelect={() => { setSearchOpen(false); nav({ to: "/news" }); }}>
              <Newspaper className="me-2 h-4 w-4 text-muted-foreground" /> الأخبار
            </CommandItem>
            <CommandItem value="عن المجموعة" onSelect={() => { setSearchOpen(false); nav({ to: "/vision" }); }}>
              <Info className="me-2 h-4 w-4 text-muted-foreground" /> عن المجموعة
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Main */}
      <main className="mx-auto w-full max-w-6xl px-3 py-4 animate-fade-up sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}

function IconNav({
  items,
  displayGroups,
  activeKey,
  onGoNews,
  onGoAbout,
}: {
  items?: NavItem[];
  displayGroups: DisplayGroup[];
  activeKey?: string;
  onGoNews: () => void;
  onGoAbout: () => void;
}) {
  const useGroups = displayGroups.length > 0;
  const activeGroupKey = displayGroups.find((g) => g.items.some((i) => i.key === activeKey))?.key;
  const [selGroup, setSelGroup] = useState<string | undefined>(activeGroupKey ?? displayGroups[0]?.key);
  useEffect(() => {
    if (activeGroupKey) setSelGroup(activeGroupKey);
  }, [activeGroupKey]);

  const barRef = useRef<HTMLDivElement>(null);

  // Keep the active item centered in the scrollable bar.
  useEffect(() => {
    const el = barRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeKey, selGroup]);

  const sel = displayGroups.find((g) => g.key === selGroup);

  const itemBtn = (it: NavItem) => {
    const active = it.key === activeKey;
    return (
      <button
        key={it.key}
        data-active={active}
        onClick={it.onClick}
        className={`flex w-16 shrink-0 snap-center flex-col items-center gap-1 rounded-2xl px-1 pb-1.5 pt-2 transition press ${
          active ? "bg-accent" : "hover:bg-secondary/70"
        }`}
      >
        <span className={active ? "text-primary" : "text-muted-foreground"}>
          {navIcon(it.key, it.icon)}
        </span>
        <span className={`max-w-full truncate text-[11px] leading-none ${active ? "font-bold text-primary" : "text-muted-foreground"}`}>
          {it.label}
        </span>
        <span className={`h-0.5 w-8 rounded-full transition ${active ? "bg-gold" : "bg-transparent"}`} />
      </button>
    );
  };

  return (
    <nav className="border-t border-border/50">
      <div
        ref={barRef}
        className="no-scrollbar flex snap-x snap-mandatory items-stretch gap-1 overflow-x-auto px-2 py-1.5"
      >
        {useGroups
          ? displayGroups.map((g) => {
              const active = g.key === selGroup;
              return (
                <button
                  key={g.key}
                  data-active={active}
                  onClick={() => setSelGroup(g.key)}
                  className={`flex w-16 shrink-0 snap-center flex-col items-center gap-1 rounded-2xl px-1 pb-1.5 pt-2 transition press ${
                    active ? "bg-accent" : "hover:bg-secondary/70"
                  }`}
                >
                  <span className={active ? "text-primary" : "text-muted-foreground"}>{g.icon}</span>
                  <span className={`max-w-full truncate text-[11px] leading-none ${active ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {g.label}
                  </span>
                  <span className={`h-0.5 w-8 rounded-full transition ${active ? "bg-gold" : "bg-transparent"}`} />
                </button>
              );
            })
          : (items ?? []).map(itemBtn)}

        {/* Fixed entries */}
        <button
          onClick={onGoNews}
          className="flex w-16 shrink-0 snap-center flex-col items-center gap-1 rounded-2xl px-1 pb-1.5 pt-2 transition press hover:bg-secondary/70"
        >
          <span className="text-muted-foreground"><Newspaper className="h-6 w-6" strokeWidth={2} /></span>
          <span className="text-[11px] leading-none text-muted-foreground">الأخبار</span>
          <span className="h-0.5 w-8 rounded-full bg-transparent" />
        </button>
        <button
          onClick={onGoAbout}
          className="flex w-16 shrink-0 snap-center flex-col items-center gap-1 rounded-2xl px-1 pb-1.5 pt-2 transition press hover:bg-secondary/70"
        >
          <span className="text-muted-foreground"><Info className="h-6 w-6" strokeWidth={2} /></span>
          <span className="text-[11px] leading-none text-muted-foreground">عن المجموعة</span>
          <span className="h-0.5 w-8 rounded-full bg-transparent" />
        </button>
      </div>

      {/* Second row: chips of the selected group's screens */}
      {useGroups && sel && (
        <div className="no-scrollbar flex snap-x items-center gap-1.5 overflow-x-auto border-t border-border/40 px-3 py-2">
          {sel.items.map((it) => {
            const active = it.key === activeKey;
            return (
              <button
                key={it.key}
                data-active={active}
                onClick={it.onClick}
                className={`flex shrink-0 snap-center items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition press ${
                  active
                    ? "border-gold bg-accent text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {navIcon(it.key, it.icon, "h-3.5 w-3.5")}
                {it.label}
                {active && <ChevronLeft className="h-3 w-3 text-gold" />}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}
