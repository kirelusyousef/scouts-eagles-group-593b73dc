import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { db, isGeneralLeader, PRIVACY_USER_FIELDS, DEFAULT_HIDDEN_FIELDS } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [hidden, setHidden] = useState<Set<string>>(new Set(db.privacy.hidden()));

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (!isGeneralLeader(user)) { nav({ to: "/dashboard" }); return; }
  }, [user, loading, nav]);

  const toggle = (k: string) => {
    const next = new Set(hidden);
    if (next.has(k)) next.delete(k); else next.add(k);
    setHidden(next);
  };

  const save = () => {
    db.privacy.set([...hidden]);
    toast.success("تم حفظ إعدادات الخصوصية");
  };

  const reset = () => {
    setHidden(new Set(DEFAULT_HIDDEN_FIELDS));
    toast.message("تم استرجاع الإعدادات الافتراضية (لم يُحفظ بعد)");
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">🔒 خصوصية بيانات المستخدمين</h1>
            <p className="text-sm text-muted-foreground mt-1">
              حدد الحقول التي تكون <b>مخفية</b> عن باقي الأعضاء في الشاشات العامة (الهيكل التنظيمي، البطاقة الرقمية، ...).
              الحقول غير المحددة تظهر للجميع.
            </p>
          </div>
          <button
            onClick={() => nav({ to: "/admin" })}
            className="rounded-lg border bg-card px-3 py-2 text-sm shrink-0"
          >رجوع</button>
        </header>

        <section className="rounded-xl border bg-card divide-y">
          {PRIVACY_USER_FIELDS.map((f) => {
            const isHidden = hidden.has(f.key);
            return (
              <label key={f.key} className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-muted/30">
                <div className="flex-1">
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isHidden ? "مخفي عن باقي الأعضاء" : "ظاهر للجميع"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isHidden}
                  onChange={() => toggle(f.key)}
                  className="h-5 w-5 accent-primary"
                />
              </label>
            );
          })}
        </section>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={save}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >حفظ التغييرات</button>
          <button
            onClick={reset}
            className="rounded-lg border bg-card px-5 py-2.5 text-sm"
          >استرجاع الافتراضي</button>
        </div>
      </main>
    </div>
  );
}
