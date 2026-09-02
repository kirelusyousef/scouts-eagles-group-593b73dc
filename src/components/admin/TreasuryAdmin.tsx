import { useEffect, useMemo, useState } from "react";
import {
  db, uid, logChange, canCreate, canEdit, canDelete,
  type Treasury, type TreasuryTx, type User,
} from "@/lib/db";
import { toast } from "sonner";
import { exportExcel, exportPdf } from "@/lib/report-export";

const TX_LABELS: Record<string, string> = {
  income: "إيراد",
  expense: "مصروف",
  transfer_in: "تحويل وارد",
  transfer_out: "تحويل صادر",
};

const money = (n: number) => (Number(n) || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

export function TreasuryAdmin({ viewer }: { viewer: User | null }) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const mayAdd = canCreate(viewer, "treasury_admin");
  const mayEdit = canEdit(viewer, "treasury_admin");
  const mayDelete = canDelete(viewer, "treasury_admin");
  const by = viewer ? `${viewer.First_Name || ""} ${viewer.Last_Name || ""}`.trim() : "";

  const treasuries = db.treasuries.all();
  const teams = db.teams.all();
  const [selected, setSelected] = useState<string>("");
  const current = treasuries.find((t) => t.Treasury_ID === selected) || treasuries[0];

  // ----- treasury form -----
  const empty: Treasury = {
    Treasury_ID: "", Treasury_Name: "", Treasury_Type: "main", Parent_Treasury_ID: "",
    Scope_Type: "Group", Scope_ID: "", Opening_Balance: 0, Notes: "",
    Is_Active: "True", Created_By: by, Created_At: "",
  };
  const [form, setForm] = useState<Treasury | null>(null);

  const saveTreasury = () => {
    if (!form) return;
    if (!form.Treasury_Name.trim()) { toast.error("اسم الخزينة مطلوب"); return; }
    const isNew = !form.Treasury_ID;
    if (isNew && !mayAdd) return;
    if (!isNew && !mayEdit) return;
    const row: Treasury = {
      ...form,
      Treasury_ID: form.Treasury_ID || uid(),
      Opening_Balance: Number(form.Opening_Balance) || 0,
      Created_At: form.Created_At || new Date().toISOString(),
      Created_By: form.Created_By || by,
    };
    db.treasuries.upsert(row);
    logChange("Treasury", row.Treasury_ID, isNew ? "create" : "update", `${isNew ? "إنشاء" : "تعديل"} خزينة: ${row.Treasury_Name}`, row, by);
    setForm(null);
    toast.success("تم الحفظ");
  };

  const removeTreasury = (t: Treasury) => {
    if (!mayDelete) return;
    if (db.treasuryTx.byTreasury(t.Treasury_ID).length) { toast.error("لا يمكن حذف خزينة بها حركات"); return; }
    if (!confirm(`حذف الخزينة "${t.Treasury_Name}"؟`)) return;
    db.treasuries.remove(t.Treasury_ID);
    logChange("Treasury", t.Treasury_ID, "delete", `حذف خزينة: ${t.Treasury_Name}`, t, by);
  };

  // ----- transaction form -----
  const [tx, setTx] = useState<Partial<TreasuryTx>>({ Tx_Type: "income", Tx_Date: today(), Amount: 0 });
  const addTx = () => {
    if (!mayAdd || !current) return;
    const amount = Number(tx.Amount) || 0;
    if (amount <= 0) { toast.error("أدخل مبلغاً صحيحاً"); return; }
    const row: TreasuryTx = {
      Tx_ID: uid(),
      Treasury_ID: current.Treasury_ID,
      Tx_Type: (tx.Tx_Type as any) || "income",
      Amount: amount,
      Category: tx.Category || "",
      Statement: tx.Statement || "",
      Tx_Date: tx.Tx_Date || today(),
      Target_Treasury_ID: "",
      Related_Tx_ID: "",
      Created_By: by,
      Created_At: new Date().toISOString(),
    };
    db.treasuryTx.upsert(row);
    logChange("TreasuryTx", row.Tx_ID, "create", `${TX_LABELS[row.Tx_Type] || row.Tx_Type} ${money(row.Amount)} — ${current.Treasury_Name}`, row, by);
    setTx({ Tx_Type: row.Tx_Type, Tx_Date: row.Tx_Date, Amount: 0 });
    toast.success("تم تسجيل الحركة");
  };

  // ----- transfer form -----
  const [tr, setTr] = useState({ from: "", to: "", amount: 0, statement: "", date: today() });
  const doTransfer = () => {
    if (!mayAdd) return;
    if (!tr.from || !tr.to || tr.from === tr.to) { toast.error("اختر خزينتين مختلفتين"); return; }
    const amount = Number(tr.amount) || 0;
    if (amount <= 0) { toast.error("أدخل مبلغاً صحيحاً"); return; }
    if (db.treasuries.balance(tr.from) < amount && !confirm("الرصيد غير كافٍ — المتابعة؟")) return;
    db.treasuryTx.transfer(tr.from, tr.to, amount, tr.statement, tr.date, by);
    logChange("TreasuryTx", tr.from, "create",
      `تحويل ${money(amount)} من ${db.treasuries.get(tr.from)?.Treasury_Name} إلى ${db.treasuries.get(tr.to)?.Treasury_Name}`, tr, by);
    setTr({ from: "", to: "", amount: 0, statement: "", date: today() });
    toast.success("تم التحويل");
  };

  const rows = current ? db.treasuryTx.byTreasury(current.Treasury_ID) : [];
  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const r of rows) {
      const a = Number(r.Amount) || 0;
      if (r.Tx_Type === "income" || r.Tx_Type === "transfer_in") income += a; else expense += a;
    }
    return { income, expense };
  }, [rows]);

  const exportRows = rows.map((r) => ({
    "التاريخ": r.Tx_Date,
    "النوع": TX_LABELS[r.Tx_Type] || r.Tx_Type,
    "المبلغ": r.Amount,
    "التصنيف": r.Category,
    "البيان": r.Statement,
    "بواسطة": r.Created_By,
  }));

  const input = "rounded-lg border bg-background px-3 py-2 text-sm";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">🏦 الخزائن والتحويلات</h2>
      <p className="text-xs text-muted-foreground mb-4">خزائن رئيسية وفرعية، إيرادات ومصروفات وتحويلات بين الخزائن.</p>

      {/* Treasury cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {treasuries.map((t) => {
          const bal = db.treasuries.balance(t.Treasury_ID);
          const total = db.treasuries.totalBalance(t.Treasury_ID);
          const active = current?.Treasury_ID === t.Treasury_ID;
          return (
            <div key={t.Treasury_ID}
              onClick={() => setSelected(t.Treasury_ID)}
              className={`cursor-pointer rounded-xl border p-3 bg-card ${active ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{t.Treasury_Name}</div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                  {t.Treasury_Type === "sub" ? "فرعية" : "رئيسية"}
                </span>
              </div>
              <div className="mt-2 text-lg font-bold">{money(bal)}</div>
              {total !== bal && <div className="text-[11px] text-muted-foreground">مع الفرعية: {money(total)}</div>}
              {t.Parent_Treasury_ID && (
                <div className="text-[11px] text-muted-foreground">
                  تابعة لـ {db.treasuries.get(t.Parent_Treasury_ID)?.Treasury_Name || "—"}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                {mayEdit && <button onClick={(e) => { e.stopPropagation(); setForm(t); }} className="text-xs text-primary">تعديل</button>}
                {mayDelete && <button onClick={(e) => { e.stopPropagation(); removeTreasury(t); }} className="text-xs text-destructive">حذف</button>}
              </div>
            </div>
          );
        })}
        {mayAdd && (
          <button onClick={() => setForm(empty)}
            className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/40">
            + خزينة جديدة
          </button>
        )}
      </div>

      {/* Treasury form */}
      {form && (
        <div className="rounded-xl border bg-card p-4 mb-6 grid sm:grid-cols-2 gap-3">
          <input className={input} placeholder="اسم الخزينة" value={form.Treasury_Name}
            onChange={(e) => setForm({ ...form, Treasury_Name: e.target.value })} />
          <select className={input} value={form.Treasury_Type}
            onChange={(e) => setForm({ ...form, Treasury_Type: e.target.value })}>
            <option value="main">رئيسية</option>
            <option value="sub">فرعية</option>
          </select>
          <select className={input} value={form.Parent_Treasury_ID}
            onChange={(e) => setForm({ ...form, Parent_Treasury_ID: e.target.value })}>
            <option value="">بدون خزينة أم</option>
            {treasuries.filter((t) => t.Treasury_ID !== form.Treasury_ID)
              .map((t) => <option key={t.Treasury_ID} value={t.Treasury_ID}>{t.Treasury_Name}</option>)}
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
          <input className={input} type="number" placeholder="رصيد افتتاحي" value={form.Opening_Balance}
            onChange={(e) => setForm({ ...form, Opening_Balance: Number(e.target.value) })} />
          <input className={`${input} sm:col-span-2`} placeholder="ملاحظات" value={form.Notes}
            onChange={(e) => setForm({ ...form, Notes: e.target.value })} />
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={saveTreasury} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm">حفظ</button>
            <button onClick={() => setForm(null)} className="rounded-lg border px-4 py-2 text-sm">إلغاء</button>
          </div>
        </div>
      )}

      {/* Transfer */}
      {mayAdd && treasuries.length > 1 && (
        <div className="rounded-xl border bg-card p-4 mb-6">
          <div className="text-sm font-medium mb-3">🔁 تحويل بين الخزائن</div>
          <div className="grid sm:grid-cols-5 gap-2">
            <select className={input} value={tr.from} onChange={(e) => setTr({ ...tr, from: e.target.value })}>
              <option value="">من خزينة</option>
              {treasuries.map((t) => <option key={t.Treasury_ID} value={t.Treasury_ID}>{t.Treasury_Name}</option>)}
            </select>
            <select className={input} value={tr.to} onChange={(e) => setTr({ ...tr, to: e.target.value })}>
              <option value="">إلى خزينة</option>
              {treasuries.map((t) => <option key={t.Treasury_ID} value={t.Treasury_ID}>{t.Treasury_Name}</option>)}
            </select>
            <input className={input} type="number" placeholder="المبلغ" value={tr.amount || ""}
              onChange={(e) => setTr({ ...tr, amount: Number(e.target.value) })} />
            <input className={input} type="date" value={tr.date} onChange={(e) => setTr({ ...tr, date: e.target.value })} />
            <button onClick={doTransfer} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm">تحويل</button>
            <input className={`${input} sm:col-span-5`} placeholder="بيان التحويل" value={tr.statement}
              onChange={(e) => setTr({ ...tr, statement: e.target.value })} />
          </div>
        </div>
      )}

      {/* Transactions of current treasury */}
      {current && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="text-sm font-medium">حركات: {current.Treasury_Name}</div>
            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-success/10 px-2 py-1">وارد {money(totals.income)}</span>
              <span className="rounded-full bg-destructive/10 px-2 py-1">صادر {money(totals.expense)}</span>
              <span className="rounded-full bg-muted px-2 py-1">الرصيد {money(db.treasuries.balance(current.Treasury_ID))}</span>
            </div>
          </div>

          {mayAdd && (
            <div className="grid sm:grid-cols-5 gap-2 mb-4">
              <select className={input} value={tx.Tx_Type} onChange={(e) => setTx({ ...tx, Tx_Type: e.target.value as any })}>
                <option value="income">إيراد</option>
                <option value="expense">مصروف</option>
              </select>
              <input className={input} type="number" placeholder="المبلغ" value={tx.Amount || ""}
                onChange={(e) => setTx({ ...tx, Amount: Number(e.target.value) })} />
              <input className={input} placeholder="التصنيف" value={tx.Category || ""}
                onChange={(e) => setTx({ ...tx, Category: e.target.value })} />
              <input className={input} type="date" value={tx.Tx_Date || today()}
                onChange={(e) => setTx({ ...tx, Tx_Date: e.target.value })} />
              <button onClick={addTx} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm">إضافة</button>
              <input className={`${input} sm:col-span-5`} placeholder="البيان" value={tx.Statement || ""}
                onChange={(e) => setTx({ ...tx, Statement: e.target.value })} />
            </div>
          )}

          <div className="flex gap-2 mb-3">
            <button onClick={() => exportExcel(exportRows, `Treasury_${current.Treasury_Name}`)}
              disabled={!rows.length}
              className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50">تصدير Excel</button>
            <button onClick={() => exportPdf(`كشف حساب — ${current.Treasury_Name}`, exportRows)}
              disabled={!rows.length}
              className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50">تصدير PDF</button>
          </div>

          {rows.length === 0 && <div className="text-sm text-muted-foreground">لا توجد حركات.</div>}
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.Tx_ID} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <div>
                  <div className="font-medium">{TX_LABELS[r.Tx_Type] || r.Tx_Type} · {money(r.Amount)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.Tx_Date} {r.Category && `· ${r.Category}`} {r.Statement && `· ${r.Statement}`}
                  </div>
                </div>
                {mayDelete && (
                  <button onClick={() => { if (confirm("حذف الحركة؟")) db.treasuryTx.remove(r.Tx_ID); }}
                    className="text-xs text-destructive">حذف</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
