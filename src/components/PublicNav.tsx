import { Link } from "@tanstack/react-router";
import { GroupHeader } from "./TopBar";

export function PublicNav() {
  const linkCls =
    "rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-secondary transition";
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/"><GroupHeader /></Link>
        <nav className="flex flex-wrap items-center gap-1">
          <Link to="/news" className={linkCls}>الأخبار</Link>
          <Link to="/structure" className={linkCls}>الهيكل التنظيمي</Link>
          <Link to="/hierarchy" className={linkCls}>التقرير الهرمي</Link>
          <Link to="/vision" className={linkCls}>الرؤية والرسالة</Link>
          <Link to="/login" className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
            تسجيل الدخول
          </Link>
        </nav>
      </div>
    </header>
  );
}
