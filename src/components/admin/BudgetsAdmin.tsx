import { useEffect, useState } from "react";
import { db, uid, logChange, canCreate, canEdit, canDelete, type Budget, type User } from "@/lib/db";
import { toast } from "sonner";
import { exportExcel, exportPdf } from "@/lib/report-export";

const money = (n: number) => (Number(n) || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 });

export function BudgetsAdmin({ viewer }: { viewer: User | null }) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const mayAdd = canCreate(viewer, "budgets_admin");
  const mayEdit = canEdit(viewer, "budgets_admin");
  const mayDelete = canDelete(viewer, "budgets_admin");
  const by = viewer ? `${viewer.First_Name || ""} ${viewer.Last_Name || ""}`.trim() : "";

  const treasuries = db.treasuries.all();
  const teams = db.teams.all();
  const budgets = db.budgets.all();

  const empty: Budget = {
    Budget_ID: "", Title: "", Scope_Type: "Group", Scope_ID: "", Treasury_ID: "",
    Category: "", Period_Start: "", Period_End: "", Planned_Amount: 0, Notes: "",
    Created_By: by, Created_At: "",
  };
  const [form, setForm] = useState<Budget | null>(null);

  const save = () => {
    if (!form) return;
    if (!form.Title.trim()) { toast.error("عنوان الميزانية مطلوب"); return; }
    const isNew = !form.Budget_ID;
    if (isNew ? !mayAdd : !mayEdit) return;
    const row: Budget = {
      ...form,
      Budget_ID: form.Budget_ID || uid(),
      Planned_Amount: Number(form.Planned_Amount) || 0,
      Created_At: form.Created_At || new Date().toISOString(),
      Created_By: form.Created_By || by,
    };
    db.budgets.upsert(row);
    logChange("Budget", row.Budget_ID, isNew ? "create" : "update", `${isNew ? "إنشاء" : "تعديل"} ميزانية: ${row.Title}`, row, by);
    setForm(null);
    toast.success("تم الحفظ");
  };

  const rows = budgets.map((b) => {
    const spent = db.budgets.spent(b);
    return {
      "الميزانية": b.Title,
      "الخزينة": db.treasuries.get(b.Treasury_ID)?.Treasury_Name || "الكل",
      "التصنيف": b.Category || "الكل",
      "من": b.Period_Start,
      "إلى": b.Period_End,
      "المخطط": b.Planned_Amount,
      "المنصرف": spent,
      "المتبقي": (Number(b.Planned_Amount) || 0) - spent,
    };
  });

  const input = "rounded-lg border bg-background px-3 py-2 text-sm";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">📊 الميزانيات</h2>
      <p className="text-xs text-muted-foreground mb-4">حدّد ميزانية لكل خزينة/تصنيف وفترة، وتابع المنصرف مقابل المخطط.</p>

      <div className="flex gap-2 mb-4">
        {mayAdd && (
          <button onClick={() => setForm(empty)} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm">
            + ميزانية جديدة
          </button>
        )}
        <button onClick={() => exportExcel(rows, "Budgets")} disabled={!rows.length}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">تصدير Excel</button>
        <button onClick={() => exportPdf("تقرير الميزانيات", rows)} disabled={!rows.length}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">تصدير PDF</button>
      </div>

      {form && (
        <div className="rounded-xl border bg-card p-4 mb-6 grid sm:grid-cols-2 gap-3">
          <input className={input} placeholder="عنوان الميزانية" value={form.Title}
            onChange={(e) => setForm({ ...form, Title: e.target.value })} />
          <select className={input} value={form.Treasury_ID}
            onChange={(e) => setForm({ ...form, Treasury_ID: e.target.value })}>
            <option value="">كل الخزائن</option>
            {treasuries.map((t) => <option key={t.Treasury_ID} value={t.Treasury_ID}>{t.Treasury_Name}</option>)}
          </select>
          <select className={input} value={form.Scope_Type}
            onChange={(e) => setForm({ ...form, Scope_Type: e.target.value, Scope_ID: "" })}>
            <option value="Group">المجموعة</option>
            <option value="Team">فرقة</option>
            <option value="Committee">لجنة</option>
            <option value="Event">فعالية</option>
          </select>
          {form.Scope_Type === "Team" && (
            <select className={input} value={form.Scope_ID}
              onChange={(e) => setForm({ ...form, Scope_ID: e.target.value })}>
              <option value="">اختر الفرقة</option>
              {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
            </select>
          )}
          <input className={input} placeholder="التصنيف (اختياري)" value={form.Category}
            onChange={(e) => setForm({ ...form, Category: e.target.value })} />
          <input className={input} type="number" placeholder="المبلغ المخطط" value={form.Planned_Amount || ""}
            onChange={(e) => setForm({ ...form, Planned_Amount: Number(e.target.value) })} />
          <input className={input} type="date" value={form.Period_Start}
            onChange={(e) => setForm({ ...form, Period_Start: e.target.value })} />
          <input className={input} type="date" value={form.Period_End}
            onChange={(e) => setForm({ ...form, Period_End: e.target.value })} />
          <input className={`${input} sm:col-span-2`} placeholder="ملاحظات" value={form.Notes}
            onChange={(e) => setForm({ ...form, Notes: e.target.value })} />
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm">حفظ</button>
            <button onClick={() => setForm(null)} className="rounded-lg border px-4 py-2 text-sm">إلغاء</button>
          </div>
        </div>
      )}

      {budgets.length === 0 && <div className="text-sm text-muted-foreground">لا توجد ميزانيات.</div>}

      <div className="grid sm:grid-cols-2 gap-3">
        {budgets.map((b) => {
          const spent = db.budgets.spent(b);
          const planned = Number(b.Planned_Amount) || 0;
          const pct = planned ? Math.min(100, Math.round((spent / planned) * 100)) : 0;
          return (
            <div key={b.Budget_ID} className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{b.Title}</div>
                <span className="text-[11px] text-muted-foreground">{b.Period_Start} → {b.Period_End}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {db.treasuries.get(b.Treasury_ID)?.Treasury_Name || "كل الخزائن"}{b.Category && ` · ${b.Category}`}
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${pct >= 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-xs flex justify-between">
                <span>المنصرف {money(spent)}</span>
                <span>المخطط {money(planned)}</span>
              </div>
              <div className={`text-xs mt-1 ${planned - spent < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                المتبقي {money(planned - spent)}
              </div>
              <div className="mt-2 flex gap-3">
                {mayEdit && <button onClick={() => setForm(b)} className="text-xs text-primary">تعديل</button>}
                {mayDelete && (
                  <button onClick={() => { if (confirm("حذف الميزانية؟")) { db.budgets.remove(b.Budget_ID); logChange("Budget", b.Budget_ID, "delete", `حذف ميزانية: ${b.Title}`, b, by); } }}
                    className="text-xs text-destructive">حذف</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
