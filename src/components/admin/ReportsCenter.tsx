import { useEffect, useMemo, useState } from "react";
import { db, fullName, viewerTeamScope, planTypeLabel, type User } from "@/lib/db";
import { exportExcel, exportPdf } from "@/lib/report-export";

type ReportKey = "plan" | "leaders" | "attendance" | "finance" | "budgets";

const REPORTS: { key: ReportKey; label: string; icon: string }[] = [
  { key: "plan", label: "تقرير الخطط والاجتماعات", icon: "🗓️" },
  { key: "leaders", label: "تقرير القادة", icon: "🧑‍✈️" },
  { key: "attendance", label: "تقرير الحضور", icon: "📋" },
  { key: "finance", label: "التقرير المالي", icon: "💰" },
  { key: "budgets", label: "تقرير الميزانيات", icon: "📊" },
];

const money = (n: number) => (Number(n) || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 });

export function ReportsCenter({ viewer }: { viewer: User | null }) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const scope = viewerTeamScope(viewer);
  const [key, setKey] = useState<ReportKey>("plan");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const inRange = (d: string) =>
    (!from || (d || "") >= from) && (!to || (d || "") <= to);

  const rows = useMemo<Record<string, any>[]>(() => {
    if (key === "plan") {
      return db.plans
        .all()
        .filter((p) => scope === null || (p.Team_ID || "") === scope)
        .filter((p) => inRange(p.Start_Date))
        .map((p) => {
          const meetings = db.meetings.byPlan(p.Plan_ID);
          const tasks = db.planTasks.all().filter((t) => t.Plan_ID === p.Plan_ID);
          return {
            "الخطة": p.Title,
            "النوع": planTypeLabel(p.Plan_Type),
            "من": p.Start_Date,
            "إلى": p.End_Date,
            "الفرقة": db.teams.get(p.Team_ID)?.Team_Name || "المجموعة",
            "الحالة": p.Status,
            "عدد الاجتماعات": meetings.length,
            "منفذة": meetings.filter((m) => m.Status === "executed").length,
            "المهام": tasks.length,
            "مهام منجزة": tasks.filter((t) => t.Status === "done").length,
          };
        });
    }
    if (key === "leaders") {
      const leaders = db.users.all()
        .filter((u) => u.Role === "Leader")
        .filter((u) => scope === null || (u.Team_ID || "") === scope);
      const att = db.unifiedAttendance.all().filter((r) => inRange(r.Date));
      return leaders.map((u) => {
        const mine = att.filter((r) => r.User_ID === u.ID);
        const tasks = db.planTasks.all().filter((t) => t.Assignee_User_ID === u.ID);
        return {
          "القائد": fullName(u),
          "الفرقة": db.teams.get(u.Team_ID || "")?.Team_Name || "—",
          "الرتبة": u.Rank || "",
          "حضور": mine.filter((r) => r.Status === "حاضر").length,
          "غياب": mine.filter((r) => r.Status === "غائب").length,
          "مهام مسندة": tasks.length,
          "مهام منجزة": tasks.filter((t) => t.Status === "done").length,
        };
      });
    }
    if (key === "attendance") {
      return db.unifiedAttendance.all()
        .filter((r) => inRange(r.Date))
        .filter((r) => scope === null || (r.Team_ID || "") === scope)
        .map((r) => ({
          "التاريخ": r.Date,
          "النشاط": r.Activity_Type,
          "النوع": r.Person_Type === "guest" ? "ضيف" : r.Person_Type === "leader" ? "قائد" : "عضو",
          "الاسم": r.Person_Type === "guest" ? r.Guest_Name : fullName(db.users.get(r.User_ID) as any) || r.User_ID,
          "الفرقة": db.teams.get(r.Team_ID)?.Team_Name || "",
          "الحالة": r.Status,
        }));
    }
    if (key === "finance") {
      return db.treasuryTx.all()
        .filter((t) => inRange(t.Tx_Date))
        .map((t) => ({
          "التاريخ": t.Tx_Date,
          "الخزينة": db.treasuries.get(t.Treasury_ID)?.Treasury_Name || "",
          "النوع": t.Tx_Type === "income" ? "إيراد" : t.Tx_Type === "expense" ? "مصروف"
            : t.Tx_Type === "transfer_in" ? "تحويل وارد" : "تحويل صادر",
          "المبلغ": t.Amount,
          "التصنيف": t.Category,
          "البيان": t.Statement,
        }));
    }
    return db.budgets.all().map((b) => {
      const spent = db.budgets.spent(b);
      return {
        "الميزانية": b.Title,
        "الخزينة": db.treasuries.get(b.Treasury_ID)?.Treasury_Name || "الكل",
        "من": b.Period_Start,
        "إلى": b.Period_End,
        "المخطط": b.Planned_Amount,
        "المنصرف": spent,
        "المتبقي": (Number(b.Planned_Amount) || 0) - spent,
      };
    });
  }, [key, from, to, scope]);

  const summary = useMemo(() => {
    if (key === "finance") {
      const income = rows.filter((r) => String(r["النوع"]).includes("إيراد") || String(r["النوع"]).includes("وارد"))
        .reduce((s, r) => s + (Number(r["المبلغ"]) || 0), 0);
      const expense = rows.filter((r) => String(r["النوع"]).includes("مصروف") || String(r["النوع"]).includes("صادر"))
        .reduce((s, r) => s + (Number(r["المبلغ"]) || 0), 0);
      return `الوارد ${money(income)} · الصادر ${money(expense)} · الصافي ${money(income - expense)}`;
    }
    return `${rows.length} سجل`;
  }, [rows, key]);

  const title = REPORTS.find((r) => r.key === key)!.label;
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const input = "rounded-lg border bg-background px-3 py-2 text-sm";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">📑 مركز التقارير</h2>
      <p className="text-xs text-muted-foreground mb-4">تقارير شاملة للخطط والقادة والحضور والمالية مع تصدير PDF و Excel.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {REPORTS.map((r) => (
          <button key={r.key} onClick={() => setKey(r.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${key === r.key ? "bg-primary text-primary-foreground border-primary" : ""}`}>
            {r.icon} {r.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className={input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className={input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={() => exportExcel(rows, title)} disabled={!rows.length}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">تصدير Excel</button>
        <button onClick={() => exportPdf(title, rows, summary)} disabled={!rows.length}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">تصدير PDF</button>
        <span className="text-xs text-muted-foreground self-center">{summary}</span>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">لا توجد بيانات لهذا التقرير.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>{headers.map((h) => <th key={h} className="px-2 py-2 text-right font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r, i) => (
                <tr key={i} className="border-t">
                  {headers.map((h) => <td key={h} className="px-2 py-1.5 whitespace-nowrap">{String(r[h] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 200 && <p className="text-xs text-muted-foreground mt-2">تعرض أول 200 صف — التصدير يشمل الكل.</p>}
    </div>
  );
}
