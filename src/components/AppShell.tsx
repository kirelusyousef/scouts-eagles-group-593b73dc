import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Menu, Bell, Moon, Sun, LogOut, User as UserIcon, Shield, Newspaper, Info } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { db, fullName, isMasterAdmin } from "@/lib/db";
import { useTheme } from "@/lib/theme";

export interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
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

export function AppShell({
  items,
  activeKey,
  children,
}: {
  items: NavItem[];
  activeKey?: string;
  children: ReactNode;
}) {
  const { user, logout, isLeader } = useAuth();
  const nav = useNavigate();
  const { isDark, toggle: toggleTheme } = useTheme();
  const group = useGroup();

  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });
  const [, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const unreadCount = user ? db.userNotifications.unreadCount(user.ID) : 0;

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
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="فتح القائمة"
            className="rounded-lg p-2 hover:bg-secondary transition"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {group.Logo_URL ? (
              <img src={group.Logo_URL} alt="شعار" className="h-9 w-9 rounded-full object-cover ring-2 ring-gold" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/15 grid place-items-center text-lg">⚜️</div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground leading-none">نظام إدارة الكشافة</div>
              <div className="font-bold text-sm truncate">{group.Group_Name}</div>
            </div>
          </div>

          <div className="ms-auto flex items-center gap-1">
            <button
              onClick={toggleTheme}
              aria-label="الوضع الليلي"
              title={isDark ? "الوضع النهاري" : "الوضع الليلي الكشفي"}
              className="rounded-lg p-2 hover:bg-secondary transition"
            >
              {isDark ? <Sun className="h-5 w-5 text-gold" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => { nav({ to: "/notifications" }); setBellOpen(false); setUserOpen(false); }}
                aria-label="مركز الإشعارات"
                className="relative rounded-lg p-2 hover:bg-secondary transition"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => { setUserOpen((v) => !v); setBellOpen(false); }}
                className="flex items-center gap-2 rounded-full bg-secondary ps-1 pe-3 py-1 text-sm hover:bg-secondary/80 transition"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground overflow-hidden">
                  {user.Profile_Photo ? <img src={user.Profile_Photo} alt="" className="h-full w-full object-cover" /> : initial}
                </span>
                <span className="hidden sm:inline max-w-[120px] truncate">{fullName(user)}</span>
              </button>
              {userOpen && (
                <div className="absolute end-0 mt-2 w-56 rounded-xl border bg-popover p-1 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                    {master ? "مدير عام (Super)" : isLeader ? "قائد" : "عضو"} · {user.Rank || "—"}
                  </div>
                  <button
                    onClick={() => { setUserOpen(false); nav({ to: "/profile" }); }}
                    className="w-full flex items-center gap-2 rounded px-3 py-2 text-right text-sm hover:bg-secondary"
                  >
                    <UserIcon className="h-4 w-4" /> الملف الشخصي
                  </button>
                  {isLeader && (
                    <button
                      onClick={() => { setUserOpen(false); nav({ to: "/admin" }); }}
                      className="w-full flex items-center gap-2 rounded px-3 py-2 text-right text-sm hover:bg-secondary"
                    >
                      <Shield className="h-4 w-4" /> لوحة التحكم
                    </button>
                  )}
                  <button
                    onClick={() => { logout(); nav({ to: "/login" }); }}
                    className="w-full flex items-center gap-2 rounded px-3 py-2 text-right text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-[57px] z-30 h-[calc(100vh-57px)] bg-sidebar text-sidebar-foreground border-e border-sidebar-border overflow-y-auto transition-all duration-300 ease-out ${
            open ? "w-64 translate-x-0" : "w-0 lg:w-0 translate-x-full lg:translate-x-0 overflow-hidden"
          }`}
          style={{ insetInlineStart: 0 }}
          aria-hidden={!open}
        >
          <nav className="p-2 space-y-0.5">
            <button
              onClick={() => { nav({ to: "/profile" }); if (window.innerWidth < 1024) setOpen(false); }}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-sidebar-accent ${
                activeKey === "__profile__" ? "bg-sidebar-accent" : ""
              }`}
            >
              <UserIcon className="h-4 w-4" />
              <span>الملف الشخصي</span>
            </button>
            <button
              onClick={() => { nav({ to: "/news" }); if (window.innerWidth < 1024) setOpen(false); }}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-sidebar-accent"
            >
              <Newspaper className="h-4 w-4" />
              <span>الأخبار</span>
            </button>
            <button
              onClick={() => { nav({ to: "/vision" }); if (window.innerWidth < 1024) setOpen(false); }}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-sidebar-accent"
            >
              <Info className="h-4 w-4" />
              <span>عن المجموعة</span>
            </button>
            <div className="my-2 h-px bg-sidebar-border" />
            {items.map((it) => (
              <button
                key={it.key}
                onClick={() => { it.onClick(); if (window.innerWidth < 1024) setOpen(false); }}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-right transition ${
                  activeKey === it.key
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow"
                    : "hover:bg-sidebar-accent"
                }`}
              >
                <span className="text-base">{it.icon}</span>
                <span className="flex-1 text-right">{it.label}</span>
              </button>
            ))}
            <div className="my-2 h-px bg-sidebar-border" />

            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"
            >
              <span className="flex items-center gap-2">
                {isDark ? <Sun className="h-4 w-4 text-gold" /> : <Moon className="h-4 w-4" />}
                الوضع الليلي الكشفي
              </span>
              <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${isDark ? "bg-gold" : "bg-sidebar-border"}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${isDark ? "translate-x-4" : "translate-x-0.5"}`} />
              </span>
            </button>
          </nav>
        </aside>

        {/* Mobile overlay */}
        {open && (
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[57px] z-20 bg-black/40 lg:hidden"
            aria-hidden
          />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 px-3 sm:px-6 py-4 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

