import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell, Moon, Sun, LogOut, User as UserIcon, Shield, Newspaper, Info,
  Search, Menu, X,
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
        icon: <Icon className="h-4 w-4" strokeWidth={2} />,
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
  const [menuOpen, setMenuOpen] = useState(false);
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
        className="sticky top-0 z-40 border-b border-border bg-card shadow-soft"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-12 items-center gap-2 px-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setMenuOpen(true)} aria-label="القائمة" className="rounded-lg p-1.5 transition press hover:bg-secondary lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            {group.Logo_URL ? (
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full gradient-hero opacity-70 blur-md" />
                <img src={group.Logo_URL} alt="شعار" className="relative h-6 w-6 rounded-full object-cover ring-1 ring-gold shadow-gold" />
              </div>
            ) : (
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full gradient-primary text-xs shadow-elegant">⚜️</div>
            )}
            <div className="min-w-0">
              <div className="text-[9px] leading-none tracking-wide text-muted-foreground">نظام إدارة الكشافة</div>
              <div className="truncate text-xs font-bold text-gradient-primary">{group.Group_Name}</div>
            </div>
          </div>

          <div className="ms-auto flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="بحث سريع"
              className="rounded-lg p-1.5 transition press hover:bg-secondary"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              onClick={() => { nav({ to: "/notifications" }); setUserOpen(false); }}
              aria-label="مركز الإشعارات"
              className="relative rounded-lg p-2.5 transition press hover:bg-secondary"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground animate-pulse-ring">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setUserOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full bg-secondary py-0.5 ps-0.5 pe-2 text-xs transition press hover:bg-secondary/80"
              >
                <span className="grid h-5 w-5 place-items-center overflow-hidden rounded-full gradient-primary text-primary-foreground shadow-soft">
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

      {menuOpen && <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden />}
      <div className="flex">
        <aside
          className={`fixed inset-y-0 start-0 z-50 w-72 border-e border-border bg-card shadow-pop transition-transform lg:sticky lg:top-12 lg:z-10 lg:h-[calc(100vh-3rem)] lg:translate-x-0 lg:shadow-none ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2 lg:hidden">
            <span className="text-sm font-bold">القائمة</span>
            <button onClick={() => setMenuOpen(false)} aria-label="إغلاق" className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-5 w-5" /></button>
          </div>
          <SideNav
            items={items}
            displayGroups={displayGroups}
            activeKey={activeKey}
            onPick={() => setMenuOpen(false)}
            onGoNews={() => { setMenuOpen(false); nav({ to: "/news" }); }}
            onGoAbout={() => { setMenuOpen(false); nav({ to: "/vision" }); }}
          />
        </aside>
        <main className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 animate-fade-up sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function SideNav({
  items, displayGroups, activeKey, onPick, onGoNews, onGoAbout,
}: {
  items?: NavItem[];
  displayGroups: DisplayGroup[];
  activeKey?: string;
  onPick: () => void;
  onGoNews: () => void;
  onGoAbout: () => void;
}) {
  const btn = (key: string, label: string, icon: ReactNode, onClick: () => void, active = false) => (
    <button
      key={key}
      onClick={onClick}
      className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-[11px] font-medium leading-tight shadow-soft transition press ${
        active ? "border-gold bg-accent text-primary" : "border-border bg-background text-foreground hover:bg-secondary"
      }`}
    >
      <span className={active ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      <span className="line-clamp-2">{label}</span>
    </button>
  );
  const sections = displayGroups.length > 0
    ? displayGroups
    : [{ key: "main", label: "الشاشات", icon: null, items: items ?? [] }];
  return (
    <div className="h-[calc(100%-3rem)] space-y-4 overflow-y-auto p-3 lg:h-full">
      {sections.map((g) => (
        <section key={g.key}>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">{g.icon}{g.label}</h3>
          <div className="grid grid-cols-3 gap-2">
            {g.items.map((it) => btn(it.key, it.label, navIcon(it.key, it.icon, "h-5 w-5"), () => { onPick(); it.onClick(); }, it.key === activeKey))}
          </div>
        </section>
      ))}
      <section>
        <h3 className="mb-2 text-xs font-bold text-muted-foreground">عام</h3>
        <div className="grid grid-cols-3 gap-2">
          {btn("news", "الأخبار", <Newspaper className="h-5 w-5" />, onGoNews)}
          {btn("about", "عن المجموعة", <Info className="h-5 w-5" />, onGoAbout)}
        </div>
      </section>
    </div>
  );
}
