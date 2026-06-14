import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/qualification")({
  component: MyQualification,
});

type Criterion = { id: string; title: string; active: boolean; sort_order: number };
type Evaluation = { id: string; trainee_user_id: string; criterion_id: string; eval_date: string; done: boolean };
type Trainee = { id: string; user_id: string; started_at: string; active: boolean };

function dateRange(days: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function MyQualification() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [t, c, e] = await Promise.all([
      supabase.from("Trainees" as any).select("*").eq("user_id", user.ID).maybeSingle(),
      supabase.from("Trainee_Criteria" as any).select("*").eq("active", true).order("sort_order"),
      supabase.from("Trainee_Evaluations" as any).select("*").eq("trainee_user_id", user.ID).order("eval_date", { ascending: false }),
    ]);
    setTrainee((t.data as any) || null);
    setCriteria((c.data || []) as any);
    setEvals((e.data || []) as any);
    setReady(true);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    load();
  }, [user, loading, nav, load]);

  const days = useMemo(() => dateRange(14), []);
  const totalActive = criteria.length;

  const perDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of days) map.set(d, 0);
    for (const e of evals) {
      if (e.done && map.has(e.eval_date)) map.set(e.eval_date, (map.get(e.eval_date) || 0) + 1);
    }
    return days.map(d => ({ date: d, done: map.get(d) || 0, pct: totalActive ? Math.round(((map.get(d) || 0) / totalActive) * 100) : 0 }));
  }, [days, evals, totalActive]);

  const byDate = useMemo(() => {
    const m = new Map<string, Evaluation[]>();
    evals.forEach(e => {
      if (!m.has(e.eval_date)) m.set(e.eval_date, []);
      m.get(e.eval_date)!.push(e);
    });
    return m;
  }, [evals]);

  const totalCount = evals.length;
  const doneCount = evals.filter(e => e.done).length;
  const overallPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  if (loading || !ready) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;

  if (!trainee) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center" dir="rtl">
        <h1 className="text-xl font-bold mb-2">نظام التأهيل</h1>
        <p className="text-muted-foreground">أنت غير مُدرج حالياً في برنامج تأهيل القادة.</p>
        <button onClick={() => nav({ to: "/dashboard" })} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">رجوع</button>
      </div>
    );
  }

  const maxPct = 100;

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-6" rtl="rtl" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">تقييمي للتأهيل</h1>
        <button onClick={() => nav({ to: "/dashboard" })} className="text-sm text-muted-foreground hover:underline">← رجوع</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-xs text-muted-foreground">إجمالي البنود المُقيَّمة</div>
          <div className="text-2xl font-bold mt-1">{totalCount}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-xs text-muted-foreground">المُنجز</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{doneCount}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-xs text-muted-foreground">النسبة الكلية</div>
          <div className="text-2xl font-bold mt-1">{overallPct}%</div>
        </div>
      </div>

      {/* Progress chart */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold mb-3">تقدم آخر 14 يوماً</h2>
        <div className="flex items-end gap-1 h-40 border-b border-r p-2">
          {perDay.map(d => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">{d.pct}%</div>
              <div className="w-full bg-primary/80 rounded-t" style={{ height: `${(d.pct / maxPct) * 100}%`, minHeight: d.pct > 0 ? 4 : 0 }} title={`${d.date}: ${d.pct}%`} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-2">
          <span>{perDay[0]?.date}</span>
          <span>{perDay[perDay.length - 1]?.date}</span>
        </div>
      </section>

      {/* History */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold mb-3">السجل التفصيلي</h2>
        {byDate.size === 0 ? (
          <div className="text-sm text-muted-foreground">لا يوجد تقييمات بعد.</div>
        ) : (
          <div className="space-y-3">
            {Array.from(byDate.entries()).map(([d, list]) => {
              const done = list.filter(e => e.done).length;
              return (
                <div key={d} className="rounded-md border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{d}</div>
                    <div className="text-xs text-muted-foreground">{done}/{list.length} مُنجز</div>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {list.map(e => {
                      const c = criteria.find(c => c.id === e.criterion_id);
                      return (
                        <li key={e.id} className="flex items-center justify-between">
                          <span>{c?.title || "—"}</span>
                          <span className={e.done ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                            {e.done ? "✓ تم" : "✗ لم يتم"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
