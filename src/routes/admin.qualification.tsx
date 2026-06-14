import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { db, fullName, isGeneralLeader, isLeader, type User } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/qualification")({
  component: QualificationAdmin,
});

type Trainee = { id: string; user_id: string; started_at: string; active: boolean; added_by?: string | null };
type Criterion = { id: string; title: string; active: boolean; sort_order: number };
type Evaluator = { id: string; trainee_user_id: string; evaluator_user_id: string };
type Evaluation = { id: string; trainee_user_id: string; criterion_id: string; eval_date: string; done: boolean; evaluator_user_id?: string | null; note?: string | null };

function todayStr() { return new Date().toISOString().slice(0, 10); }

function QualificationAdmin() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<string>("");
  const [date, setDate] = useState<string>(todayStr());
  const [busy, setBusy] = useState(false);

  const users = useMemo(() => db.users.all(), []);
  const userById = useMemo(() => Object.fromEntries(users.map(u => [u.ID, u])) as Record<string, User>, [users]);

  const isGL = isGeneralLeader(user);
  const isAnyLeader = isLeader(user);

  const reload = useCallback(async () => {
    const [t, c, ev, e] = await Promise.all([
      supabase.from("Trainees" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("Trainee_Criteria" as any).select("*").order("sort_order", { ascending: true }),
      supabase.from("Trainee_Evaluators" as any).select("*"),
      supabase.from("Trainee_Evaluations" as any).select("*").order("eval_date", { ascending: false }).limit(2000),
    ]);
    setTrainees((t.data || []) as any);
    setCriteria((c.data || []) as any);
    setEvaluators((ev.data || []) as any);
    setEvals((e.data || []) as any);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (!isAnyLeader) { nav({ to: "/dashboard" }); return; }
    reload();
  }, [user, loading, isAnyLeader, nav, reload]);

  // Which trainees can the current user evaluate?
  const myAssignedTrainees = useMemo(() => {
    if (!user) return new Set<string>();
    if (isGL) return new Set(trainees.map(t => t.user_id));
    const s = new Set<string>();
    evaluators.filter(e => e.evaluator_user_id === user.ID).forEach(e => s.add(e.trainee_user_id));
    return s;
  }, [evaluators, user, isGL, trainees]);

  const visibleTrainees = useMemo(
    () => trainees.filter(t => myAssignedTrainees.has(t.user_id)),
    [trainees, myAssignedTrainees]
  );

  useEffect(() => {
    if (!selectedTrainee && visibleTrainees.length) setSelectedTrainee(visibleTrainees[0].user_id);
  }, [visibleTrainees, selectedTrainee]);

  // ---------- Add trainees (multi-select + search) ----------
  const [newTraineeIds, setNewTraineeIds] = useState<string[]>([]);
  const [traineeSearch, setTraineeSearch] = useState("");
  function toggleNewTrainee(id: string) {
    setNewTraineeIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }
  async function addTrainees() {
    if (newTraineeIds.length === 0) return;
    setBusy(true);
    const rows = newTraineeIds.map(uid => ({
      user_id: uid, added_by: user?.ID, active: true, started_at: todayStr(),
    }));
    const { error } = await supabase.from("Trainees" as any).insert(rows as any);
    setBusy(false);
    if (error) { toast.error("تعذر الإضافة: " + error.message); return; }
    toast.success(`تمت إضافة ${newTraineeIds.length} متدرب`);
    setNewTraineeIds([]);
    setTraineeSearch("");
    reload();
  }

  async function toggleTraineeActive(t: Trainee) {
    await supabase.from("Trainees" as any).update({ active: !t.active } as any).eq("id", t.id);
    reload();
  }
  async function removeTrainee(t: Trainee) {
    if (!confirm("حذف هذا المتدرب وكل تقييماته؟")) return;
    await supabase.from("Trainee_Evaluations" as any).delete().eq("trainee_user_id", t.user_id);
    await supabase.from("Trainee_Evaluators" as any).delete().eq("trainee_user_id", t.user_id);
    await supabase.from("Trainees" as any).delete().eq("id", t.id);
    reload();
  }

  // ---------- Criteria CRUD ----------
  const [newCriterion, setNewCriterion] = useState("");
  async function addCriterion() {
    if (!newCriterion.trim()) return;
    const sort = (criteria[criteria.length - 1]?.sort_order ?? 0) + 1;
    await supabase.from("Trainee_Criteria" as any).insert({ title: newCriterion.trim(), active: true, sort_order: sort } as any);
    setNewCriterion("");
    reload();
  }
  async function updateCriterion(c: Criterion, patch: Partial<Criterion>) {
    await supabase.from("Trainee_Criteria" as any).update(patch as any).eq("id", c.id);
    reload();
  }
  async function removeCriterion(c: Criterion) {
    if (!confirm("حذف هذا البند؟")) return;
    await supabase.from("Trainee_Criteria" as any).delete().eq("id", c.id);
    reload();
  }

  // ---------- Evaluators assignment ----------
  const [newEvaluatorId, setNewEvaluatorId] = useState("");
  const traineeEvaluatorIds = useMemo(
    () => new Set(evaluators.filter(e => e.trainee_user_id === selectedTrainee).map(e => e.evaluator_user_id)),
    [evaluators, selectedTrainee]
  );
  async function addEvaluator() {
    if (!selectedTrainee || !newEvaluatorId) return;
    const { error } = await supabase.from("Trainee_Evaluators" as any).insert({
      trainee_user_id: selectedTrainee, evaluator_user_id: newEvaluatorId,
    } as any);
    if (error) { toast.error(error.message); return; }
    setNewEvaluatorId("");
    reload();
  }
  async function removeEvaluator(id: string) {
    await supabase.from("Trainee_Evaluators" as any).delete().eq("id", id);
    reload();
  }

  // ---------- Daily evaluation entry ----------
  const todayEvals = useMemo(() => {
    const map = new Map<string, Evaluation>();
    evals.filter(e => e.trainee_user_id === selectedTrainee && e.eval_date === date)
      .forEach(e => map.set(e.criterion_id, e));
    return map;
  }, [evals, selectedTrainee, date]);

  async function setDone(c: Criterion, done: boolean) {
    if (!selectedTrainee) return;
    const existing = todayEvals.get(c.id);
    if (existing) {
      await supabase.from("Trainee_Evaluations" as any).update({
        done, evaluator_user_id: user?.ID,
      } as any).eq("id", existing.id);
    } else {
      await supabase.from("Trainee_Evaluations" as any).insert({
        trainee_user_id: selectedTrainee, criterion_id: c.id, eval_date: date,
        done, evaluator_user_id: user?.ID,
      } as any);
    }
    reload();
  }

  if (loading || !user) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;

  const activeCriteria = criteria.filter(c => c.active);
  const leaders = users.filter(u => u.Role === "Leader" && u.Status === "Active");
  const nonTraineeUsers = users.filter(u => u.Status === "Active" && !trainees.some(t => t.user_id === u.ID));

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">نظام تأهيل القادة</h1>
        <button onClick={() => nav({ to: "/admin" })} className="text-sm text-muted-foreground hover:underline">
          ← رجوع للوحة التحكم
        </button>
      </div>

      {/* --- Trainees management (GL only) --- */}
      {isGL && (
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">المتدربون</h2>
          <div className="space-y-2">
            <input
              value={traineeSearch}
              onChange={e => setTraineeSearch(e.target.value)}
              placeholder="ابحث بالاسم..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
              {nonTraineeUsers
                .filter(u => !traineeSearch || fullName(u).includes(traineeSearch))
                .map(u => {
                  const checked = newTraineeIds.includes(u.ID);
                  return (
                    <label key={u.ID} className={`flex items-center gap-2 p-2 cursor-pointer text-sm ${checked ? "bg-primary/10" : ""}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleNewTrainee(u.ID)} />
                      <span>{fullName(u)}</span>
                    </label>
                  );
                })}
              {nonTraineeUsers.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground text-center">كل الأعضاء النشطين متدربون بالفعل.</div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">تم اختيار {newTraineeIds.length}</span>
              <button onClick={addTrainees} disabled={busy || newTraineeIds.length === 0}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
                إضافة المحددين
              </button>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t">
            {trainees.length === 0 && <div className="text-sm text-muted-foreground">لا يوجد متدربون بعد.</div>}
            {trainees.map(t => {
              const u = userById[t.user_id];
              return (
                <div key={t.id} className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <div className="font-medium">{u ? fullName(u) : t.user_id}</div>
                    <div className="text-xs text-muted-foreground">منذ {t.started_at} • {t.active ? "نشط" : "متوقف"}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleTraineeActive(t)} className="text-xs rounded-md border px-2 py-1">
                      {t.active ? "إيقاف" : "تنشيط"}
                    </button>
                    <button onClick={() => removeTrainee(t)} className="text-xs rounded-md border border-destructive text-destructive px-2 py-1">حذف</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* --- Global evaluators (GL only): assigns one leader to ALL trainees --- */}
      {isGL && (
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">المقيِّمون لكل المتدربين</h2>
          <p className="text-xs text-muted-foreground">القائد المُختار هنا سيقيِّم جميع المتدربين الحاليين والمضافين لاحقاً.</p>
          <GlobalEvaluators
            leaders={leaders}
            trainees={trainees}
            evaluators={evaluators}
            userById={userById}
            onChange={reload}
          />
        </section>
      )}


      {/* --- Criteria (GL only) --- */}
      {isGL && (
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">بنود التقييم</h2>
          <div className="flex gap-2">
            <input value={newCriterion} onChange={e => setNewCriterion(e.target.value)}
              placeholder="اسم البند (مثلاً: حضور التدريب اليومي)"
              className="rounded-md border bg-background px-3 py-2 text-sm flex-1" />
            <button onClick={addCriterion} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">إضافة بند</button>
          </div>
          <div className="space-y-2">
            {criteria.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-md border p-2 gap-2">
                <input defaultValue={c.title} onBlur={e => { if (e.target.value !== c.title) updateCriterion(c, { title: e.target.value }); }}
                  className="flex-1 rounded-md border bg-background px-2 py-1 text-sm" />
                <label className="text-xs flex items-center gap-1">
                  <input type="checkbox" checked={c.active} onChange={e => updateCriterion(c, { active: e.target.checked })} />
                  نشط
                </label>
                <button onClick={() => removeCriterion(c)} className="text-xs rounded-md border border-destructive text-destructive px-2 py-1">حذف</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- Pick trainee --- */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-semibold">التقييم اليومي</h2>
        {visibleTrainees.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {isGL ? "أضف متدرباً أولاً." : "لم يتم تعيينك كمقيِّم لأي متدرب بعد."}
          </div>
        ) : (
          <>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">المتدرب</label>
                <select value={selectedTrainee} onChange={e => setSelectedTrainee(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {visibleTrainees.map(t => {
                    const u = userById[t.user_id];
                    return <option key={t.id} value={t.user_id}>{u ? fullName(u) : t.user_id}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">التاريخ</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Evaluators for this trainee (GL only) */}
            {isGL && selectedTrainee && (
              <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                <div className="text-sm font-medium">القادة المُكلفون بتقييم هذا المتدرب</div>
                <div className="flex gap-2 flex-wrap">
                  {Array.from(traineeEvaluatorIds).map(eid => {
                    const u = userById[eid];
                    const row = evaluators.find(e => e.trainee_user_id === selectedTrainee && e.evaluator_user_id === eid);
                    return (
                      <span key={eid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs">
                        {u ? fullName(u) : eid}
                        {row && <button onClick={() => removeEvaluator(row.id)} className="text-destructive">×</button>}
                      </span>
                    );
                  })}
                  {traineeEvaluatorIds.size === 0 && <span className="text-xs text-muted-foreground">لا يوجد مقيِّمون — فقط القائد العام يستطيع التقييم.</span>}
                </div>
                <div className="flex gap-2">
                  <select value={newEvaluatorId} onChange={e => setNewEvaluatorId(e.target.value)}
                    className="flex-1 rounded-md border bg-background px-2 py-1 text-sm">
                    <option value="">اختر قائداً للتكليف</option>
                    {leaders.filter(l => !traineeEvaluatorIds.has(l.ID)).map(l => (
                      <option key={l.ID} value={l.ID}>{fullName(l)}</option>
                    ))}
                  </select>
                  <button onClick={addEvaluator} disabled={!newEvaluatorId}
                    className="rounded-md bg-secondary px-3 py-1 text-xs">تكليف</button>
                </div>
              </div>
            )}

            {/* Criteria checklist */}
            {activeCriteria.length === 0 ? (
              <div className="text-sm text-muted-foreground">لا توجد بنود تقييم نشطة.</div>
            ) : (
              <div className="space-y-2">
                {activeCriteria.map(c => {
                  const ev = todayEvals.get(c.id);
                  const done = !!ev?.done;
                  return (
                    <label key={c.id} className={`flex items-center justify-between rounded-md border p-3 cursor-pointer ${done ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40" : ""}`}>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={done} onChange={e => setDone(c, e.target.checked)} className="h-5 w-5" />
                        <span className="text-sm">{c.title}</span>
                      </div>
                      {ev?.evaluator_user_id && (
                        <span className="text-xs text-muted-foreground">
                          بواسطة {userById[ev.evaluator_user_id] ? fullName(userById[ev.evaluator_user_id]) : "—"}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function GlobalEvaluators({ leaders, trainees, evaluators, userById, onChange }: {
  leaders: User[];
  trainees: Trainee[];
  evaluators: Evaluator[];
  userById: Record<string, User>;
  onChange: () => void;
}) {
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  // A leader is "global" if assigned to every trainee
  const countsByLeader = useMemo(() => {
    const m = new Map<string, number>();
    evaluators.forEach(e => m.set(e.evaluator_user_id, (m.get(e.evaluator_user_id) || 0) + 1));
    return m;
  }, [evaluators]);

  const globalLeaderIds = useMemo(() => {
    if (trainees.length === 0) return new Set<string>();
    const s = new Set<string>();
    countsByLeader.forEach((count, lid) => { if (count >= trainees.length) s.add(lid); });
    return s;
  }, [countsByLeader, trainees.length]);

  async function assignToAll() {
    if (!pick || trainees.length === 0) return;
    setBusy(true);
    const existing = new Set(
      evaluators.filter(e => e.evaluator_user_id === pick).map(e => e.trainee_user_id)
    );
    const rows = trainees
      .filter(t => !existing.has(t.user_id))
      .map(t => ({ trainee_user_id: t.user_id, evaluator_user_id: pick }));
    if (rows.length > 0) {
      const { error } = await supabase.from("Trainee_Evaluators" as any).insert(rows as any);
      if (error) { toast.error(error.message); setBusy(false); return; }
    }
    toast.success("تم تعيين القائد لكل المتدربين");
    setPick("");
    setBusy(false);
    onChange();
  }

  async function removeFromAll(leaderId: string) {
    if (!confirm("إزالة هذا القائد من تقييم كل المتدربين؟")) return;
    await supabase.from("Trainee_Evaluators" as any).delete().eq("evaluator_user_id", leaderId);
    toast.success("تمت الإزالة");
    onChange();
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {Array.from(globalLeaderIds).map(lid => {
          const u = userById[lid];
          return (
            <span key={lid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs">
              {u ? fullName(u) : lid}
              <button onClick={() => removeFromAll(lid)} className="text-destructive">×</button>
            </span>
          );
        })}
        {globalLeaderIds.size === 0 && (
          <span className="text-xs text-muted-foreground">لا يوجد مقيِّمون عامُّون بعد.</span>
        )}
      </div>
      <div className="flex gap-2">
        <select value={pick} onChange={e => setPick(e.target.value)}
          className="flex-1 rounded-md border bg-background px-2 py-2 text-sm">
          <option value="">اختر قائداً لتعيينه على كل المتدربين</option>
          {leaders.filter(l => !globalLeaderIds.has(l.ID)).map(l => (
            <option key={l.ID} value={l.ID}>{fullName(l)}</option>
          ))}
        </select>
        <button onClick={assignToAll} disabled={busy || !pick || trainees.length === 0}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
          تعيين للكل
        </button>
      </div>
    </>
  );
}
