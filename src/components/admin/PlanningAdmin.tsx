import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  db, uid, fullName, logChange, planTypeLabel, PLAN_TYPES,
  canCreate, canEdit, canDelete, viewerTeamScope,
  type Plan, type Meeting, type AgendaItem, type PlanTask, type User,
} from "@/lib/db";

const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

const MEETING_STATUS: { key: string; label: string; cls: string }[] = [
  { key: "planned", label: "مخططة", cls: "bg-muted text-muted-foreground" },
  { key: "prepared", label: "تم التحضير", cls: "bg-primary/15 text-primary" },
  { key: "executed", label: "تم التنفيذ", cls: "bg-emerald-500/15 text-emerald-600" },
  { key: "cancelled", label: "ملغاة", cls: "bg-destructive/15 text-destructive" },
];
const ITEM_TYPES = [
  { key: "activity", label: "فقرة نشاط", icon: "🎯" },
  { key: "lecture", label: "محاضرة", icon: "📚" },
  { key: "game", label: "لعبة", icon: "🎲" },
  { key: "prayer", label: "صلاة/تأمل", icon: "🙏" },
  { key: "break", label: "استراحة", icon: "☕" },
  { key: "other", label: "أخرى", icon: "📌" },
];
const PHASES = [
  { key: "preparation", label: "تحضير" },
  { key: "execution", label: "تنفيذ" },
  { key: "followup", label: "متابعة" },
];

export function PlanningAdmin({ viewer }: { viewer: User }) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const allowCreate = canCreate(viewer, "planning_admin");
  const allowEdit = canEdit(viewer, "planning_admin");
  const allowDelete = canDelete(viewer, "planning_admin");
  const scope = viewerTeamScope(viewer);
  const by = fullName(viewer);

  const teams = db.teams.all();
  const allPlans = db.plans.all();
  const plans = scope ? allPlans.filter((p) => !p.Team_ID || p.Team_ID === scope) : allPlans;

  const [typeFilter, setTypeFilter] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedMeeting, setSelectedMeeting] = useState<string>("");

  const shown = typeFilter ? plans.filter((p) => p.Plan_Type === typeFilter) : plans;
  const plan = db.plans.get(selectedPlan);

  // ---------- Plan form ----------
  const blankPlan: Plan = {
    Plan_ID: "", Plan_Type: "annual", Title: "", Description: "",
    Start_Date: today(), End_Date: today(), Parent_Plan_ID: "",
    Team_ID: scope || "", Status: "draft", Created_By: by,
    Created_At: "", Updated_At: "",
  };
  const [pForm, setPForm] = useState<Plan>(blankPlan);
  const editingPlan = !!pForm.Plan_ID;
  const [showPlanForm, setShowPlanForm] = useState(false);

  const savePlan = () => {
    if (!pForm.Title.trim()) return toast.error("أدخل عنوان الخطة");
    const rec: Plan = {
      ...pForm,
      Plan_ID: pForm.Plan_ID || "PL-" + uid(),
      Title: pForm.Title.trim(),
      Created_At: pForm.Created_At || now(),
      Created_By: pForm.Created_By || by,
      Updated_At: now(),
    };
    db.plans.upsert(rec);
    logChange("Plan", rec.Plan_ID, editingPlan ? "update" : "create",
      `${editingPlan ? "تعديل" : "إنشاء"} خطة: ${rec.Title}`, rec, by);
    toast.success(editingPlan ? "تم تحديث الخطة" : "تم إنشاء الخطة");
    setPForm({ ...blankPlan });
    setShowPlanForm(false);
  };

  const removePlan = (p: Plan) => {
    if (!allowDelete) return;
    if (!confirm(`حذف الخطة "${p.Title}" وكل اجتماعاتها؟`)) return;
    db.meetings.byPlan(p.Plan_ID).forEach((m) => db.meetings.remove(m.Meeting_ID));
    db.plans.remove(p.Plan_ID);
    logChange("Plan", p.Plan_ID, "delete", `حذف خطة: ${p.Title}`, p, by);
    if (selectedPlan === p.Plan_ID) { setSelectedPlan(""); setSelectedMeeting(""); }
    toast.success("تم الحذف");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">🗓️ الخطط والاجتماعات</h2>
      <p className="text-xs text-muted-foreground mb-4">
        خطط سنوية وفصلية وشهرية وأسبوعية وأيام كشفية ومعسكرات ودورات. تعديل الاجتماع
        وفقراته لا يؤثر على الخطة نفسها، وكل تغيير يُسجَّل في سجل التعديلات.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">كل الأنواع</option>
          {PLAN_TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
        </select>
        {allowCreate && (
          <button
            onClick={() => { setPForm({ ...blankPlan }); setShowPlanForm(true); }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            + خطة جديدة
          </button>
        )}
      </div>

      {showPlanForm && (allowCreate || (allowEdit && editingPlan)) && (
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <h3 className="font-bold">{editingPlan ? "تعديل خطة" : "خطة جديدة"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm"><span className="block mb-1">نوع الخطة</span>
              <select className={inputCls} value={pForm.Plan_Type}
                onChange={(e) => setPForm((f) => ({ ...f, Plan_Type: e.target.value }))}>
                {PLAN_TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
              </select>
            </label>
            <label className="text-sm"><span className="block mb-1">العنوان</span>
              <input className={inputCls} value={pForm.Title}
                onChange={(e) => setPForm((f) => ({ ...f, Title: e.target.value }))} />
            </label>
            <label className="text-sm"><span className="block mb-1">من تاريخ</span>
              <input type="date" className={inputCls} value={pForm.Start_Date}
                onChange={(e) => setPForm((f) => ({ ...f, Start_Date: e.target.value }))} />
            </label>
            <label className="text-sm"><span className="block mb-1">إلى تاريخ</span>
              <input type="date" className={inputCls} value={pForm.End_Date}
                onChange={(e) => setPForm((f) => ({ ...f, End_Date: e.target.value }))} />
            </label>
            <label className="text-sm"><span className="block mb-1">الفريق (اختياري)</span>
              <select className={inputCls} value={pForm.Team_ID} disabled={!!scope}
                onChange={(e) => setPForm((f) => ({ ...f, Team_ID: e.target.value }))}>
                <option value="">كل المجموعة</option>
                {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
              </select>
            </label>
            <label className="text-sm"><span className="block mb-1">خطة أعلى (اختياري)</span>
              <select className={inputCls} value={pForm.Parent_Plan_ID}
                onChange={(e) => setPForm((f) => ({ ...f, Parent_Plan_ID: e.target.value }))}>
                <option value="">— بدون —</option>
                {plans.filter((p) => p.Plan_ID !== pForm.Plan_ID)
                  .map((p) => <option key={p.Plan_ID} value={p.Plan_ID}>{p.Title}</option>)}
              </select>
            </label>
            <label className="text-sm"><span className="block mb-1">الحالة</span>
              <select className={inputCls} value={pForm.Status}
                onChange={(e) => setPForm((f) => ({ ...f, Status: e.target.value }))}>
                <option value="draft">مسودة</option>
                <option value="active">جارية</option>
                <option value="done">منتهية</option>
                <option value="archived">مؤرشفة</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2"><span className="block mb-1">الوصف</span>
              <textarea className={inputCls} rows={2} value={pForm.Description}
                onChange={(e) => setPForm((f) => ({ ...f, Description: e.target.value }))} />
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={savePlan}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">حفظ</button>
            <button onClick={() => { setShowPlanForm(false); setPForm({ ...blankPlan }); }}
              className="rounded-lg border px-4 py-2 text-sm">إلغاء</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {shown.length === 0 && (
          <div className="text-sm text-muted-foreground">لا توجد خطط بعد.</div>
        )}
        {shown.map((p) => (
          <div key={p.Plan_ID}
            className={`rounded-xl border bg-card p-4 transition ${selectedPlan === p.Plan_ID ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <button className="text-right" onClick={() => { setSelectedPlan(p.Plan_ID); setSelectedMeeting(""); }}>
                <div className="font-bold">{p.Title}</div>
                <div className="text-xs text-muted-foreground">
                  {planTypeLabel(p.Plan_Type)} · {p.Start_Date} → {p.End_Date}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {db.meetings.byPlan(p.Plan_ID).length} اجتماع
                </div>
              </button>
              <div className="flex gap-1">
                {allowEdit && (
                  <button className="rounded-lg border px-2 py-1 text-xs"
                    onClick={() => { setPForm({ ...p }); setShowPlanForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                    تعديل
                  </button>
                )}
                {allowDelete && (
                  <button className="rounded-lg border border-destructive/40 px-2 py-1 text-xs text-destructive"
                    onClick={() => removePlan(p)}>حذف</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {plan && (
        <MeetingsSection
          plan={plan}
          viewer={viewer}
          selectedMeeting={selectedMeeting}
          setSelectedMeeting={setSelectedMeeting}
          allowCreate={allowCreate} allowEdit={allowEdit} allowDelete={allowDelete}
        />
      )}
    </div>
  );
}

// ============================ Meetings ============================

function MeetingsSection({
  plan, viewer, selectedMeeting, setSelectedMeeting, allowCreate, allowEdit, allowDelete,
}: {
  plan: Plan; viewer: User; selectedMeeting: string; setSelectedMeeting: (v: string) => void;
  allowCreate: boolean; allowEdit: boolean; allowDelete: boolean;
}) {
  const by = fullName(viewer);
  const teams = db.teams.all();
  const meetings = db.meetings.byPlan(plan.Plan_ID);

  const blank: Meeting = {
    Meeting_ID: "", Plan_ID: plan.Plan_ID, Title: "", Meeting_Type: "meeting",
    Meeting_Date: today(), Start_Time: "", End_Time: "", Location: "",
    Team_ID: plan.Team_ID || "", Leader_In_Charge: "", Status: "planned",
    Notes: "", Created_By: by, Created_At: "", Updated_At: "",
  };
  const [form, setForm] = useState<Meeting>(blank);
  const [open, setOpen] = useState(false);
  const editing = !!form.Meeting_ID;

  const save = () => {
    if (!form.Title.trim()) return toast.error("أدخل عنوان الاجتماع");
    const rec: Meeting = {
      ...form,
      Meeting_ID: form.Meeting_ID || "MT-" + uid(),
      Plan_ID: plan.Plan_ID,
      Title: form.Title.trim(),
      Created_At: form.Created_At || now(),
      Updated_At: now(),
    };
    db.meetings.upsert(rec);
    logChange("Meeting", rec.Meeting_ID, editing ? "update" : "create",
      `${editing ? "تعديل" : "إنشاء"} اجتماع: ${rec.Title}`, rec, by);
    toast.success("تم الحفظ");
    setForm({ ...blank });
    setOpen(false);
  };

  const remove = (m: Meeting) => {
    if (!allowDelete) return;
    if (!confirm(`حذف اجتماع "${m.Title}"؟`)) return;
    db.meetings.remove(m.Meeting_ID);
    logChange("Meeting", m.Meeting_ID, "delete", `حذف اجتماع: ${m.Title}`, m, by);
    if (selectedMeeting === m.Meeting_ID) setSelectedMeeting("");
    toast.success("تم الحذف");
  };

  const meeting = db.meetings.get(selectedMeeting);

  return (
    <div className="rounded-xl border bg-card/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-bold">📌 اجتماعات: {plan.Title}</h3>
        {allowCreate && (
          <button onClick={() => { setForm({ ...blank }); setOpen(true); }}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            + اجتماع
          </button>
        )}
      </div>

      {open && (allowCreate || (allowEdit && editing)) && (
        <div className="rounded-xl border bg-card p-4 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm"><span className="block mb-1">العنوان</span>
            <input className={inputCls} value={form.Title}
              onChange={(e) => setForm((f) => ({ ...f, Title: e.target.value }))} /></label>
          <label className="text-sm"><span className="block mb-1">التاريخ</span>
            <input type="date" className={inputCls} value={form.Meeting_Date}
              onChange={(e) => setForm((f) => ({ ...f, Meeting_Date: e.target.value }))} /></label>
          <label className="text-sm"><span className="block mb-1">من الساعة</span>
            <input type="time" className={inputCls} value={form.Start_Time}
              onChange={(e) => setForm((f) => ({ ...f, Start_Time: e.target.value }))} /></label>
          <label className="text-sm"><span className="block mb-1">إلى الساعة</span>
            <input type="time" className={inputCls} value={form.End_Time}
              onChange={(e) => setForm((f) => ({ ...f, End_Time: e.target.value }))} /></label>
          <label className="text-sm"><span className="block mb-1">المكان</span>
            <input className={inputCls} value={form.Location}
              onChange={(e) => setForm((f) => ({ ...f, Location: e.target.value }))} /></label>
          <label className="text-sm"><span className="block mb-1">الفريق</span>
            <select className={inputCls} value={form.Team_ID}
              onChange={(e) => setForm((f) => ({ ...f, Team_ID: e.target.value }))}>
              <option value="">كل المجموعة</option>
              {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
            </select></label>
          <label className="text-sm"><span className="block mb-1">القائد المسؤول</span>
            <input className={inputCls} value={form.Leader_In_Charge}
              onChange={(e) => setForm((f) => ({ ...f, Leader_In_Charge: e.target.value }))} /></label>
          <label className="text-sm"><span className="block mb-1">الحالة</span>
            <select className={inputCls} value={form.Status}
              onChange={(e) => setForm((f) => ({ ...f, Status: e.target.value }))}>
              {MEETING_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select></label>
          <label className="text-sm sm:col-span-2"><span className="block mb-1">ملاحظات</span>
            <textarea className={inputCls} rows={2} value={form.Notes}
              onChange={(e) => setForm((f) => ({ ...f, Notes: e.target.value }))} /></label>
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">حفظ</button>
            <button onClick={() => { setOpen(false); setForm({ ...blank }); }} className="rounded-lg border px-4 py-2 text-sm">إلغاء</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {meetings.length === 0 && <div className="text-sm text-muted-foreground">لا توجد اجتماعات لهذه الخطة.</div>}
        {meetings.map((m) => {
          const st = MEETING_STATUS.find((s) => s.key === m.Status) || MEETING_STATUS[0];
          return (
            <div key={m.Meeting_ID}
              className={`rounded-lg border bg-card p-3 ${selectedMeeting === m.Meeting_ID ? "ring-2 ring-primary" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button className="text-right"
                  onClick={() => setSelectedMeeting(selectedMeeting === m.Meeting_ID ? "" : m.Meeting_ID)}>
                  <div className="font-bold text-sm">{m.Title}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.Meeting_Date} {m.Start_Time && `· ${m.Start_Time}`} {m.Location && `· ${m.Location}`}
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${st.cls}`}>{st.label}</span>
                  {allowEdit && (
                    <button className="rounded-lg border px-2 py-1 text-xs"
                      onClick={() => { setForm({ ...m }); setOpen(true); }}>تعديل</button>
                  )}
                  {allowDelete && (
                    <button className="rounded-lg border border-destructive/40 px-2 py-1 text-xs text-destructive"
                      onClick={() => remove(m)}>حذف</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {meeting && (
        <div className="mt-4 space-y-4">
          <AgendaEditor meeting={meeting} by={by} allowCreate={allowCreate} allowEdit={allowEdit} allowDelete={allowDelete} />
          <TasksEditor meeting={meeting} by={by} allowCreate={allowCreate} allowEdit={allowEdit} allowDelete={allowDelete} />
          <HistoryList entityType="Meeting" entityId={meeting.Meeting_ID} />
        </div>
      )}
    </div>
  );
}

// ============================ Agenda (Drag & Drop) ============================

function AgendaEditor({
  meeting, by, allowCreate, allowEdit, allowDelete,
}: { meeting: Meeting; by: string; allowCreate: boolean; allowEdit: boolean; allowDelete: boolean }) {
  const items = db.agendaItems.byMeeting(meeting.Meeting_ID);
  const lectures = db.lectures.all();
  const [dragId, setDragId] = useState<string | null>(null);

  const blank: AgendaItem = {
    Item_ID: "", Meeting_ID: meeting.Meeting_ID, Title: "", Item_Type: "activity",
    Duration_Minutes: 10, Lecture_ID: "", Responsible_User_ID: "", Notes: "", Sort_Order: 0,
  };
  const [form, setForm] = useState<AgendaItem>(blank);
  const editing = !!form.Item_ID;

  const total = useMemo(() => items.reduce((s, i) => s + (Number(i.Duration_Minutes) || 0), 0), [items]);

  const save = () => {
    const lecture = db.lectures.get(form.Lecture_ID);
    const title = form.Title.trim() || lecture?.Title || "";
    if (!title) return toast.error("أدخل عنوان الفقرة أو اختر محاضرة");
    const rec: AgendaItem = {
      ...form,
      Item_ID: form.Item_ID || "AG-" + uid(),
      Title: title,
      Duration_Minutes: Number(form.Duration_Minutes) || 0,
      Sort_Order: form.Sort_Order || items.length + 1,
    };
    db.agendaItems.upsert(rec);
    logChange("Meeting", meeting.Meeting_ID, "update",
      `${editing ? "تعديل" : "إضافة"} فقرة: ${rec.Title}`, rec, by);
    setForm({ ...blank });
    toast.success("تم حفظ الفقرة");
  };

  const remove = (it: AgendaItem) => {
    if (!allowDelete) return;
    if (!confirm(`حذف الفقرة "${it.Title}"؟`)) return;
    db.agendaItems.remove(it.Item_ID);
    logChange("Meeting", meeting.Meeting_ID, "update", `حذف فقرة: ${it.Title}`, it, by);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || !allowEdit || dragId === targetId) return;
    const ids = items.map((i) => i.Item_ID);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    db.agendaItems.reorder(meeting.Meeting_ID, ids);
    logChange("Meeting", meeting.Meeting_ID, "update", "إعادة ترتيب فقرات الاجتماع", ids, by);
    setDragId(null);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm">🧩 فقرات الاجتماع</h4>
        <span className="text-xs text-muted-foreground">إجمالي المدة: {total} دقيقة</span>
      </div>

      {items.length === 0 && <div className="text-sm text-muted-foreground mb-3">لا توجد فقرات بعد.</div>}

      <ul className="space-y-2 mb-4">
        {items.map((it, idx) => {
          const t = ITEM_TYPES.find((x) => x.key === it.Item_Type);
          return (
            <li key={it.Item_ID}
              draggable={allowEdit}
              onDragStart={() => setDragId(it.Item_ID)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(it.Item_ID)}
              className={`flex items-center gap-2 rounded-lg border bg-background p-2 ${allowEdit ? "cursor-move" : ""} ${dragId === it.Item_ID ? "opacity-50" : ""}`}>
              <span className="text-muted-foreground text-xs w-5 text-center">{idx + 1}</span>
              <span>{t?.icon || "📌"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{it.Title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t?.label} · {it.Duration_Minutes} د
                  {it.Lecture_ID && ` · من المكتبة`}
                  {it.Responsible_User_ID && ` · مسؤول: ${it.Responsible_User_ID}`}
                </div>
              </div>
              {allowEdit && <span className="text-muted-foreground text-xs">⠿</span>}
              {allowEdit && (
                <button className="rounded border px-2 py-0.5 text-xs" onClick={() => setForm({ ...it })}>تعديل</button>
              )}
              {allowDelete && (
                <button className="rounded border border-destructive/40 px-2 py-0.5 text-xs text-destructive"
                  onClick={() => remove(it)}>حذف</button>
              )}
            </li>
          );
        })}
      </ul>

      {(allowCreate || (allowEdit && editing)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t pt-3">
          <label className="text-sm"><span className="block mb-1">النوع</span>
            <select className={inputCls} value={form.Item_Type}
              onChange={(e) => setForm((f) => ({ ...f, Item_Type: e.target.value }))}>
              {ITEM_TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
            </select></label>
          <label className="text-sm"><span className="block mb-1">من مكتبة المحاضرات</span>
            <select className={inputCls} value={form.Lecture_ID}
              onChange={(e) => {
                const l = db.lectures.get(e.target.value);
                setForm((f) => ({
                  ...f,
                  Lecture_ID: e.target.value,
                  Item_Type: e.target.value ? "lecture" : f.Item_Type,
                  Title: f.Title || l?.Title || "",
                  Duration_Minutes: l?.Duration_Minutes || f.Duration_Minutes,
                }));
              }}>
              <option value="">— بدون —</option>
              {lectures.map((l) => <option key={l.Lecture_ID} value={l.Lecture_ID}>{l.Title}</option>)}
            </select></label>
          <label className="text-sm"><span className="block mb-1">العنوان</span>
            <input className={inputCls} value={form.Title}
              onChange={(e) => setForm((f) => ({ ...f, Title: e.target.value }))} /></label>
          <label className="text-sm"><span className="block mb-1">المدة (دقيقة)</span>
            <input type="number" className={inputCls} value={form.Duration_Minutes}
              onChange={(e) => setForm((f) => ({ ...f, Duration_Minutes: Number(e.target.value) }))} /></label>
          <label className="text-sm sm:col-span-2"><span className="block mb-1">المسؤول / ملاحظات</span>
            <input className={inputCls} value={form.Notes}
              onChange={(e) => setForm((f) => ({ ...f, Notes: e.target.value }))} /></label>
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={save} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
              {editing ? "تحديث الفقرة" : "+ إضافة فقرة"}
            </button>
            {editing && <button onClick={() => setForm({ ...blank })} className="rounded-lg border px-4 py-1.5 text-sm">إلغاء</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================ Tasks ============================

function TasksEditor({
  meeting, by, allowCreate, allowEdit, allowDelete,
}: { meeting: Meeting; by: string; allowCreate: boolean; allowEdit: boolean; allowDelete: boolean }) {
  const tasks = db.planTasks.byMeeting(meeting.Meeting_ID);
  const users = db.users.all();
  const blank: PlanTask = {
    Task_ID: "", Plan_ID: meeting.Plan_ID, Meeting_ID: meeting.Meeting_ID,
    Title: "", Description: "", Assignee_User_ID: "", Due_Date: meeting.Meeting_Date,
    Phase: "preparation", Status: "pending", Created_By: by, Created_At: "",
  };
  const [form, setForm] = useState<PlanTask>(blank);

  const add = () => {
    if (!form.Title.trim()) return toast.error("أدخل عنوان المهمة");
    const rec: PlanTask = {
      ...form,
      Task_ID: form.Task_ID || "PT-" + uid(),
      Title: form.Title.trim(),
      Created_At: form.Created_At || now(),
    };
    db.planTasks.upsert(rec);
    logChange("Meeting", meeting.Meeting_ID, "update", `مهمة: ${rec.Title}`, rec, by);
    setForm({ ...blank });
    toast.success("تم الحفظ");
  };

  const cycle = (t: PlanTask) => {
    if (!allowEdit) return;
    const next = t.Status === "pending" ? "in_progress" : t.Status === "in_progress" ? "done" : "pending";
    db.planTasks.upsert({ ...t, Status: next });
  };

  const statusLabel = (s: string) =>
    s === "done" ? "منجزة" : s === "in_progress" ? "قيد التنفيذ" : "قيد الانتظار";

  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="font-bold text-sm mb-3">✅ مهام التحضير والتنفيذ</h4>
      {tasks.length === 0 && <div className="text-sm text-muted-foreground mb-3">لا توجد مهام.</div>}
      <ul className="space-y-2 mb-3">
        {tasks.map((t) => (
          <li key={t.Task_ID} className="flex items-center gap-2 rounded-lg border bg-background p-2">
            <button onClick={() => cycle(t)}
              className={`rounded-full px-2 py-0.5 text-[11px] ${t.Status === "done" ? "bg-emerald-500/15 text-emerald-600" : t.Status === "in_progress" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
              {statusLabel(t.Status)}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{t.Title}</div>
              <div className="text-[11px] text-muted-foreground">
                {PHASES.find((p) => p.key === t.Phase)?.label}
                {t.Due_Date && ` · ${t.Due_Date}`}
                {t.Assignee_User_ID && ` · ${fullName(users.find((u) => u.ID === t.Assignee_User_ID) || null as any) || t.Assignee_User_ID}`}
              </div>
            </div>
            {allowDelete && (
              <button className="rounded border border-destructive/40 px-2 py-0.5 text-xs text-destructive"
                onClick={() => { if (confirm("حذف المهمة؟")) db.planTasks.remove(t.Task_ID); }}>حذف</button>
            )}
          </li>
        ))}
      </ul>
      {allowCreate && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-t pt-3">
          <input className={inputCls} placeholder="عنوان المهمة" value={form.Title}
            onChange={(e) => setForm((f) => ({ ...f, Title: e.target.value }))} />
          <select className={inputCls} value={form.Phase}
            onChange={(e) => setForm((f) => ({ ...f, Phase: e.target.value }))}>
            {PHASES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <select className={inputCls} value={form.Assignee_User_ID}
            onChange={(e) => setForm((f) => ({ ...f, Assignee_User_ID: e.target.value }))}>
            <option value="">— المسؤول —</option>
            {users.map((u) => <option key={u.ID} value={u.ID}>{fullName(u)}</option>)}
          </select>
          <button onClick={add} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">+ إضافة</button>
        </div>
      )}
    </div>
  );
}

// ============================ History ============================

export function HistoryList({ entityType, entityId }: { entityType: string; entityId: string }) {
  const rows = db.changeLog.forEntity(entityType, entityId).slice(0, 20);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="font-bold text-sm mb-2">🕓 سجل التعديلات</h4>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {rows.map((r) => (
          <li key={r.Change_ID}>
            <span className="text-foreground">{r.Summary}</span>
            {" — "}{r.Changed_By || "غير معروف"} · {new Date(r.Changed_At).toLocaleString("ar-EG")}
          </li>
        ))}
      </ul>
    </div>
  );
}
