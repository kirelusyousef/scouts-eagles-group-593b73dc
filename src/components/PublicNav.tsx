import { Link } from "@tanstack/react-router";
import { GroupHeader } from "./TopBar";
import { useAuth } from "@/lib/auth";
import { fullName } from "@/lib/db";

export function PublicNav() {
  const { user } = useAuth();
  const linkCls =
    "rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-secondary transition";
  const initial = (user?.First_Name || user?.Email || "?").slice(0, 1);
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/"><GroupHeader /></Link>
        <nav className="flex flex-wrap items-center gap-1">
          <Link to="/news" className={linkCls}>الأخبار</Link>
          <Link to="/hierarchy" className={linkCls}>الهيكل التنظيمي</Link>
          <Link to="/vision" className={linkCls}>الرؤية والرسالة</Link>
          <Link to="/about" className={linkCls}>عن المجموعة</Link>
          {user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-full bg-secondary ps-1 pe-3 py-1 text-sm hover:bg-secondary/80 transition"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground overflow-hidden">
                {user.Profile_Photo ? (
                  <img src={user.Profile_Photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </span>
              <span className="max-w-[140px] truncate font-medium">{fullName(user)}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              تسجيل الدخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
