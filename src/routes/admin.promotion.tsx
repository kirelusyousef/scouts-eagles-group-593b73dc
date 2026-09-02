import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  db, fullName, hasScreen, canEdit, STAGES, syncFromCloud,
  MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD, type User,
} from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/promotion")({
  component: PromotionAdmin,
  head: () => ({
    meta: [
      { title: "الترقية السنوية للمراحل | إدارة المجموعة" },
      { name: "description", content: "إعداد انتقالات المراحل الدراسية وتنفيذ الترقية السنوية وإعادة توزيع الأعضاء على الفرق." },
      { property: "og:title", content: "الترقية السنوية للمراحل" },
      { property: "og:description", content: "إعداد انتقالات المراحل الدراسية وتنفيذ الترقية السنوية وإعادة توزيع الأعضاء." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Transition = { id: string; current_stage: string; next_stage: string };
type Cycle = {
  id: string; label: string; status: string; created_by: string;
  created_at: string; executed_at: string | null; stats: any;
};
type LogRow = {
  id: string; cycle_id: string; user_id: string; user_name: string;
  old_stage: string; new_stage: string; old_team: string; new_team: string;
  changed_by: string; changed_at: string;
};

const input = "rounded-lg border bg-background px-3 py-2 text-sm";
const nextSeasonLabel = () => {
  const y = new Date().getFullYear();
  return `${y}/${y + 1}`;
};

function PromotionAdmin() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"rules" | "run" | "redistribute" | "history">("rules");

  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const reload = useCallback(async () => {
    const [t, c, l] = await Promise.all([
      supabase.from("Stage_Transitions" as any).select("*"),
      supabase.from("Promotion_Cycles" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("Promotion_Log" as any).select("*").order("changed_at", { ascending: false }).limit(2000),
    ]);
    setTransitions(((t.data as any) || []) as Transition[]);
    setCycles(((c.data as any) || []) as Cycle[]);
    setLogs(((l.data as any) || []) as LogRow[]);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const allowed = hasScreen(user, "promotion_admin");
  const mayEdit = canEdit(user, "promotion_admin");

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;
  }
  if (!user || !allowed) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <div className="text-4xl mb-2">🚫</div>
        <h1 className="text-xl font-bold mb-1">لا تملك صلاحية الوصول</h1>
        <p className="text-sm text-muted-foreground mb-4">شاشة الترقية السنوية متاحة للقادة المصرح لهم فقط.</p>
        <button onClick={() => nav({ to: "/admin" })} className="rounded-lg border px-4 py-2 text-sm">العودة</button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">🎓 الترقية السنوية للمراحل</h1>
          <p className="text-xs text-muted-foreground">
            إعداد الانتقالات ← معاينة ← تأكيد بكلمة المرور ← تنفيذ ← إعادة التوزيع
          </p>
        </div>
        <button onClick={() => nav({ to: "/admin" })} className="rounded-lg border px-3 py-2 text-sm">رجوع</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {([
          ["rules", "انتقالات المراحل"],
          ["run", "تنفيذ الترقية"],
          ["redistribute", "إعادة التوزيع"],
          ["history", "سجل الترقيات"],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-lg border px-3 py-2 text-sm ${tab === k ? "bg-primary text-primary-foreground border-primary" : ""}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "rules" && (
        <RulesTab transitions={transitions} mayEdit={mayEdit} busy={busy} setBusy={setBusy} reload={reload} />
      )}
      {tab === "run" && (
        <RunTab viewer={user} transitions={transitions} cycles={cycles} logs={logs}
          mayEdit={mayEdit} busy={busy} setBusy={setBusy} reload={reload} />
      )}
      {tab === "redistribute" && <RedistributeTab mayEdit={mayEdit} />}
      {tab === "history" && <HistoryTab cycles={cycles} logs={logs} />}
    </div>
  );
}

/* ---------------- Rules ---------------- */

function RulesTab({ transitions, mayEdit, busy, setBusy, reload }: {
  transitions: Transition[]; mayEdit: boolean; busy: boolean;
  setBusy: (b: boolean) => void; reload: () => Promise<void>;
}) {
  const map = useMemo(
    () => Object.fromEntries(transitions.map((t) => [t.current_stage, t.next_stage])) as Record<string, string>,
    [transitions],
  );
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => { setDraft(map); }, [map]);

  const usage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of db.users.all()) {
      if (String(u.Status || "") === "Rejected") continue;
      const s = u.Education_Stage || "";
      if (!s) continue;
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, []);

  const save = async () => {
    if (!mayEdit) return;
    setBusy(true);
    try {
      const rows = STAGES.map((s) => ({ current_stage: s, next_stage: draft[s] || "" }));
      const { error } = await (supabase as any)
        .from("Stage_Transitions").upsert(rows, { onConflict: "current_stage" });
      if (error) throw error;
      await reload();
      toast.success("تم حفظ انتقالات المراحل");
    } catch (e: any) {
      toast.error(e?.message || "تعذر الحفظ");
    } finally { setBusy(false); }
  };

  const autoFill = () => {
    const d: Record<string, string> = {};
    STAGES.forEach((s, i) => { d[s] = STAGES[i + 1] || ""; });
    setDraft(d);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-bold">إعداد انتقالات المراحل الدراسية</h2>
        {mayEdit && (
          <div className="flex gap-2">
            <button onClick={autoFill} className="rounded-lg border px-3 py-2 text-sm">ملء تلقائي بالترتيب</button>
            <button onClick={save} disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">حفظ</button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        المرحلة بدون «مرحلة تالية» لن يتم ترقيتها تلقائيًا، وستظهر في قسم «يحتاجون إجراء يدوي».
        هذه المراحل دراسية فقط ولا علاقة لها بالمرحلة الكشفية (الرتبة/الفريق).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-muted-foreground">
              <th className="p-2">المرحلة الحالية</th>
              <th className="p-2">عدد المستخدمين</th>
              <th className="p-2">المرحلة الجديدة</th>
            </tr>
          </thead>
          <tbody>
            {STAGES.map((s) => (
              <tr key={s} className="border-t">
                <td className="p-2 font-medium">{s}</td>
                <td className="p-2 text-muted-foreground">{usage[s] || 0}</td>
                <td className="p-2">
                  <select className={input} disabled={!mayEdit} value={draft[s] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [s]: e.target.value })}>
                    <option value="">— بدون ترقية (إجراء يدوي) —</option>
                    {STAGES.filter((x) => x !== s).map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Run ---------------- */

function RunTab({ viewer, transitions, cycles, logs, mayEdit, busy, setBusy, reload }: {
  viewer: User; transitions: Transition[]; cycles: Cycle[]; logs: LogRow[];
  mayEdit: boolean; busy: boolean; setBusy: (b: boolean) => void; reload: () => Promise<void>;
}) {
  const [label, setLabel] = useState(nextSeasonLabel());
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<null | { promoted: number; manual: number; breakdown: Record<string, number> }>(null);

  const tmap = useMemo(
    () => Object.fromEntries(transitions.map((t) => [t.current_stage, t.next_stage])) as Record<string, string>,
    [transitions],
  );

  const candidates = useMemo(() => {
    const users = db.users.all().filter((u) => String(u.Status || "") !== "Rejected");
    const promote: { u: User; next: string }[] = [];
    const manual: User[] = [];
    for (const u of users) {
      const cur = u.Education_Stage || "";
      if (!cur) { manual.push(u); continue; }
      const next = tmap[cur] || "";
      if (next) promote.push({ u, next });
      else manual.push(u);
    }
    return { promote, manual };
  }, [tmap]);

  const breakdown = useMemo(() => {
    const b: Record<string, number> = {};
    for (const { u, next } of candidates.promote) {
      const k = `${u.Education_Stage} → ${next}`;
      b[k] = (b[k] || 0) + 1;
    }
    return b;
  }, [candidates]);

  const duplicate = cycles.find((c) => c.label.trim() === label.trim() && c.status === "executed");

  const verifyPassword = () => {
    const email = (viewer.Email || "").toLowerCase();
    if (email === MASTER_ADMIN_EMAIL) return password === MASTER_ADMIN_PASSWORD;
    const fresh = db.users.get(viewer.ID);
    return !!password && password === String(fresh?.Password ?? viewer.Password ?? "");
  };

  const execute = async () => {
    if (!mayEdit) return;
    if (attempts >= 5) { toast.error("تم تجاوز عدد المحاولات المسموح بها"); return; }
    if (!verifyPassword()) {
      setAttempts((a) => a + 1);
      setPassword("");
      toast.error("كلمة المرور غير صحيحة — لم يتم تنفيذ أي تعديل");
      return;
    }
    if (duplicate) { toast.error("تم تنفيذ هذه الدورة من قبل"); return; }
    if (!candidates.promote.length) { toast.error("لا يوجد مستخدمون للترقية"); return; }

    setBusy(true);
    let cycleId = "";
    try {
      const by = fullName(viewer);
      const stats = {
        promoted: candidates.promote.length,
        detached: candidates.promote.length,
        manual: candidates.manual.length,
        breakdown,
      };
      const { data: cyc, error: cErr } = await (supabase as any)
        .from("Promotion_Cycles")
        .insert({ label: label.trim(), status: "draft", created_by: by, stats })
        .select().single();
      if (cErr) throw cErr;
      cycleId = cyc.id;

      const now = new Date().toISOString();
      const updated = candidates.promote.map(({ u, next }) => ({
        ...u, Education_Stage: next, Team_ID: "", Patrol_ID: "",
      }));

      // Push all user changes in a single request — either all rows land or none.
      const { error: uErr } = await (supabase as any)
        .from("Users").upsert(updated.map((u) => {
          const o: any = { ...u };
          delete o.Surname;
          return o;
        }), { onConflict: "ID" });
      if (uErr) throw uErr;

      const { error: lErr } = await (supabase as any).from("Promotion_Log").insert(
        candidates.promote.map(({ u, next }) => ({
          cycle_id: cycleId,
          user_id: u.ID,
          user_name: fullName(u),
          old_stage: u.Education_Stage || "",
          new_stage: next,
          old_team: db.teams.get(u.Team_ID || "")?.Team_Name || u.Team_ID || "",
          new_team: "",
          changed_by: by,
          changed_at: now,
        })),
      );
      if (lErr) throw lErr;

      await (supabase as any).from("Promotion_Cycles")
        .update({ status: "executed", executed_at: now }).eq("id", cycleId);

      await syncFromCloud();
      await reload();
      setResult({ promoted: candidates.promote.length, manual: candidates.manual.length, breakdown });
      setAskPassword(false);
      setPassword("");
      toast.success("تمت الترقية السنوية بنجاح");
    } catch (e: any) {
      // Rollback: remove the partially-created cycle and its log rows.
      if (cycleId) {
        await (supabase as any).from("Promotion_Log").delete().eq("cycle_id", cycleId);
        await (supabase as any).from("Promotion_Cycles").delete().eq("id", cycleId);
      }
      toast.error(e?.message || "فشل تنفيذ الترقية — تم التراجع عن العملية");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="font-bold mb-3">معاينة الترقية</h2>
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <label className="text-sm">
            <span className="block text-xs text-muted-foreground mb-1">دورة الترقية</span>
            <input className={`${input} w-full`} value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
        </div>
        {duplicate && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm mb-3">
            ⚠️ الدورة «{label}» تم تنفيذها بالفعل بتاريخ{" "}
            {duplicate.executed_at ? new Date(duplicate.executed_at).toLocaleString("ar-EG") : ""} — لا يمكن تكرارها.
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-2 mb-3">
          <Stat label="سيتم ترقيتهم" value={candidates.promote.length} />
          <Stat label="سيتم فك ارتباطهم بالفرق" value={candidates.promote.length} />
          <Stat label="يحتاجون إجراء يدوي" value={candidates.manual.length} />
        </div>
        <ul className="text-sm space-y-1 mb-3">
          {Object.entries(breakdown).sort().map(([k, v]) => (
            <li key={k} className="flex justify-between rounded-lg border p-2">
              <span>{k}</span><span className="text-muted-foreground">{v} مستخدم</span>
            </li>
          ))}
          {!Object.keys(breakdown).length && (
            <li className="text-muted-foreground">لا توجد انتقالات معدّة — اضبط الانتقالات أولًا.</li>
          )}
        </ul>
        {mayEdit && (
          <button onClick={() => setAskPassword(true)}
            disabled={busy || !!duplicate || !candidates.promote.length}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            بدء الترقية السنوية
          </button>
        )}
      </div>

      {candidates.manual.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-bold mb-2">مستخدمون يحتاجون إلى إجراء يدوي ({candidates.manual.length})</h3>
          <div className="max-h-72 overflow-auto space-y-1 text-sm">
            {candidates.manual.map((u) => (
              <div key={u.ID} className="flex justify-between rounded-lg border p-2">
                <span>{fullName(u)}</span>
                <span className="text-muted-foreground">{u.Education_Stage || "بدون مرحلة"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-bold mb-2">نتيجة الترقية السنوية</h3>
          <div className="grid sm:grid-cols-3 gap-2 mb-2">
            <Stat label="تمت ترقيتهم" value={result.promoted} />
            <Stat label="تم فك ارتباطهم" value={result.promoted} />
            <Stat label="إجراء يدوي" value={result.manual} />
          </div>
          <ul className="text-sm space-y-1">
            {Object.entries(result.breakdown).sort().map(([k, v]) => (
              <li key={k} className="flex justify-between rounded-lg border p-2"><span>{k}</span><span>{v}</span></li>
            ))}
          </ul>
        </div>
      )}

      {askPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-xl border bg-card p-5">
            <h3 className="text-lg font-bold mb-2">تأكيد الترقية السنوية</h3>
            <p className="text-sm text-muted-foreground mb-3">
              هذه العملية ستقوم بتغيير المراحل الدراسية وفك ارتباط المستخدمين بفرقهم.
              لإتمام العملية، أدخل كلمة مرور حسابك.
            </p>
            <input type="password" autoComplete="current-password" className={`${input} w-full mb-3`}
              placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
            {attempts > 0 && (
              <div className="text-xs text-destructive mb-2">محاولات خاطئة: {attempts} / 5</div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAskPassword(false); setPassword(""); }}
                className="rounded-lg border px-4 py-2 text-sm">إلغاء</button>
              <button onClick={execute} disabled={busy || !password}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
                {busy ? "جاري التنفيذ..." : "تأكيد وتنفيذ الترقية"}
              </button>
            </div>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <p className="text-xs text-muted-foreground">آخر سجلات الترقية متاحة في تبويب «سجل الترقيات».</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/* ---------------- Redistribute ---------------- */

function RedistributeTab({ mayEdit }: { mayEdit: boolean }) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const [stage, setStage] = useState("");
  const [kind, setKind] = useState<"" | "member" | "leader">("");
  const [q, setQ] = useState("");

  const teams = db.teams.all();
  const rows = db.users.all()
    .filter((u) => String(u.Status || "") !== "Rejected")
    .filter((u) => !u.Team_ID)
    .filter((u) => !stage || u.Education_Stage === stage)
    .filter((u) => !kind || (kind === "leader" ? u.Role === "Leader" : u.Role !== "Leader"))
    .filter((u) => !q.trim() || fullName(u).toLowerCase().includes(q.trim().toLowerCase()));

  const assign = (u: User, teamId: string) => {
    if (!mayEdit) return;
    db.users.upsert({ ...u, Team_ID: teamId, Patrol_ID: "" });
    toast.success("تم تعيين الفريق");
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="font-bold mb-1">المستخدمون بدون فريق ({rows.length})</h2>
      <p className="text-xs text-muted-foreground mb-3">أعد توزيع الأعضاء والقادة على الفرق بعد الترقية.</p>
      <div className="grid sm:grid-cols-3 gap-2 mb-3">
        <select className={input} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">كل المراحل</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={input} value={kind} onChange={(e) => setKind(e.target.value as any)}>
          <option value="">الكل</option>
          <option value="member">أعضاء</option>
          <option value="leader">قادة</option>
        </select>
        <input className={input} placeholder="بحث بالاسم" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground">لا يوجد مستخدمون بدون فريق.</div>}
        {rows.map((u) => (
          <div key={u.ID} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2">
            <div className="text-sm">
              <div className="font-medium">{fullName(u)}</div>
              <div className="text-[11px] text-muted-foreground">
                {u.Education_Stage || "—"} · {u.Role === "Leader" ? "قائد" : "عضو"}
              </div>
            </div>
            <select className={input} disabled={!mayEdit} defaultValue=""
              onChange={(e) => e.target.value && assign(u, e.target.value)}>
              <option value="">اختر فريق</option>
              {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- History ---------------- */

function HistoryTab({ cycles, logs }: { cycles: Cycle[]; logs: LogRow[] }) {
  const [open, setOpen] = useState<string>("");
  return (
    <div className="space-y-3">
      {cycles.length === 0 && <div className="text-sm text-muted-foreground">لا توجد دورات ترقية بعد.</div>}
      {cycles.map((c) => {
        const rows = logs.filter((l) => l.cycle_id === c.id);
        return (
          <div key={c.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold">دورة {c.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {c.created_by} · {c.executed_at ? new Date(c.executed_at).toLocaleString("ar-EG") : "لم تُنفذ"} · {c.status}
                </div>
              </div>
              <button onClick={() => setOpen(open === c.id ? "" : c.id)} className="rounded-lg border px-3 py-1.5 text-sm">
                {open === c.id ? "إخفاء" : `عرض السجل (${rows.length})`}
              </button>
            </div>
            {open === c.id && (
              <div className="mt-3 max-h-96 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-right text-muted-foreground">
                      <th className="p-2">المستخدم</th><th className="p-2">المرحلة القديمة</th>
                      <th className="p-2">المرحلة الجديدة</th><th className="p-2">الفريق القديم</th>
                      <th className="p-2">بواسطة</th><th className="p-2">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="p-2">{l.user_name}</td>
                        <td className="p-2">{l.old_stage}</td>
                        <td className="p-2">{l.new_stage}</td>
                        <td className="p-2">{l.old_team || "—"}</td>
                        <td className="p-2">{l.changed_by}</td>
                        <td className="p-2">{new Date(l.changed_at).toLocaleString("ar-EG")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
