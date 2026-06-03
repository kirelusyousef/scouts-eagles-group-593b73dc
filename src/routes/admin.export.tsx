import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/lib/auth";
import { isGeneralLeader } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/export")({ component: ExportPage });

const TABLES = [
  "Users", "Teams", "Patrols", "Committees", "Attendance", "Leader_Attendance",
  "Finance", "Financial_Ledger", "News", "Vision_Mission", "Group_Info",
  "Group_Events", "Member_Ranks", "Leader_Ranks_Tasks", "Leader_Structure_Rules",
  "Role_Types", "Sub_Group_Types", "Hierarchy_Levels", "App_Settings",
  "Auto_Notifications_Config", "History_Log", "User_Certificates",
  "User_Notifications", "Public_Service",
] as const;

function ExportPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [table, setTable] = useState<string>("Users");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [busy, setBusy] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (!isGeneralLeader(user)) { nav({ to: "/dashboard" }); return; }
  }, [user, loading, nav]);

  const headers = useMemo(() => {
    if (!rows.length) return [];
    const s = new Set<string>();
    for (const r of rows) Object.keys(r).forEach((k) => s.add(k));
    return [...s];
  }, [rows]);

  async function fetchData() {
    setBusy(true);
    try {
      const PAGE = 1000;
      let all: Record<string, any>[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await (supabase.from(table as any) as any)
          .select("*")
          .range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        const batch = data || [];
        all = all.concat(batch);
        if (batch.length < PAGE) break;
        from += PAGE;
      }
      setRows(all);
      setFetched(true);
      toast.success(`تم جلب ${all.length} صف`);
    } catch (e: any) {
      toast.error(e?.message || "فشل الجلب");
    } finally {
      setBusy(false);
    }
  }

  function exportXlsx() {
    if (!rows.length) { toast.error("لا توجد بيانات"); return; }
    const flat = rows.map((r) => {
      const o: Record<string, any> = {};
      for (const [k, v] of Object.entries(r)) {
        o[k] = v === null || v === undefined
          ? ""
          : typeof v === "object"
            ? JSON.stringify(v)
            : v;
      }
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, table);
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${table}_${date}.xlsx`);
    toast.success("تم التصدير");
  }

  if (loading || !user) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">تصدير البيانات إلى Excel</h1>
          <button onClick={() => nav({ to: "/admin" })} className="text-sm text-muted-foreground hover:text-foreground">← رجوع</button>
        </header>

        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">اختر الجدول</label>
            <select
              value={table}
              onChange={(e) => { setTable(e.target.value); setRows([]); setFetched(false); }}
              className="w-full bg-background border border-input rounded-md px-3 py-2"
            >
              {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchData}
              disabled={busy}
              className="flex-1 bg-secondary text-secondary-foreground rounded-md py-2 font-medium disabled:opacity-50"
            >
              {busy ? "جارٍ الجلب..." : "جلب البيانات"}
            </button>
            <button
              onClick={exportXlsx}
              disabled={!rows.length}
              className="flex-1 bg-primary text-primary-foreground rounded-md py-2 font-medium disabled:opacity-50"
            >
              تصدير إلى Excel ({rows.length})
            </button>
          </div>

          {fetched && rows.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">لا توجد بيانات في هذا الجدول</div>
          )}

          {rows.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">معاينة (أول 20 من {rows.length})</h3>
              <div className="overflow-x-auto border border-border rounded-md max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>{headers.map((h) => <th key={h} className="px-2 py-1 text-right font-medium whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {headers.map((h) => <td key={h} className="px-2 py-1 whitespace-nowrap max-w-[200px] truncate">{String(r[h] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
