import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/lib/auth";
import { isGeneralLeader } from "@/lib/db";
import { secureImportUpsert } from "@/lib/secure.functions";
import { getSessionToken } from "@/lib/session-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/import")({ component: ImportPage });

type TableConfig = {
  pk: string;
  num?: string[];
  bool?: string[];
};

const TABLES: Record<string, TableConfig> = {
  Users: { pk: "ID", bool: ["Has_WhatsApp"] },
  Teams: { pk: "Team_ID", num: ["Order_Weight"] },
  Patrols: { pk: "Patrol_ID", num: ["Total_Points"] },
  Committees: { pk: "Committee_ID" },
  Attendance: { pk: "Attendance_ID" },
  Leader_Attendance: { pk: "Attendance_ID" },
  Finance: { pk: "Transaction_ID", num: ["Amount"] },
  Financial_Ledger: { pk: "Ledger_ID", num: ["Amount"] },
  News: { pk: "News_ID" },
  Vision_Mission: { pk: "ID" },
  Group_Info: { pk: "ID" },
  Group_Events: { pk: "Event_ID", num: ["Budget_Allocated"] },
  Member_Ranks: { pk: "Rank_ID", num: ["Rank_Level", "Rank_Weight"] },
  Leader_Ranks_Tasks: { pk: "Task_Rank_ID", num: ["Structure_Level", "Order_Weight"] },
  Leader_Structure_Rules: { pk: "Rule_ID", num: ["Level", "Order_Weight"] },
  Role_Types: { pk: "Role_Type_ID", num: ["Order_Weight"] },
  Sub_Group_Types: { pk: "Sub_Group_ID" },
  Hierarchy_Levels: { pk: "Level_Number", num: ["Level_Number"] },
  App_Settings: { pk: "Setting_ID" },
  Auto_Notifications_Config: { pk: "Config_ID", num: ["Days_Before"] },
  History_Log: { pk: "Log_ID" },
  User_Certificates: { pk: "Certificate_ID" },
  User_Notifications: { pk: "Notification_ID" },
  Public_Service: { pk: "Service_ID", bool: ["Reminder_Sent"] },
};

/** Tables that can no longer be written straight from the browser. */
const PROTECTED_TABLES = new Set(["News", "Group_Info"]);

async function upsertInto(table: string, rows: Record<string, any>[], pk: string) {
  if (!PROTECTED_TABLES.has(table)) {
    return await (supabase.from(table as any) as any).upsert(rows, { onConflict: pk });
  }
  const res = await secureImportUpsert({
    data: { token: getSessionToken() || "", table: table as "News" | "Group_Info", rows },
  });
  return { error: res.ok ? null : new Error(res.error || "تعذر الحفظ") };
}

function transformRow(raw: Record<string, any>, cfg: TableConfig) {  const out: Record<string, any> = {};
  for (const [k, vRaw] of Object.entries(raw)) {
    const key = String(k).replace(/\u200B/g, "").trim();
    if (!key) continue;
    if (vRaw === undefined || vRaw === null || vRaw === "") continue;
    let v: any = vRaw;
    if (cfg.num?.includes(key)) {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      v = n;
    } else if (cfg.bool?.includes(key)) {
      v = /^(true|1|yes|y)$/i.test(String(v));
    } else {
      v = String(v);
    }
    out[key] = v;
  }
  return out;
}

function normalizeKeys(rows: Record<string, any>[]) {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const o: Record<string, any> = {};
    for (const k of keys) o[k] = r[k] ?? null;
    return o;
  });
}

function ImportPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [table, setTable] = useState<string>("Users");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (!isGeneralLeader(user)) { nav({ to: "/dashboard" }); return; }
  }, [user, loading, nav]);

  const cfg = TABLES[table];
  const headers = useMemo(() => {
    if (!rows.length) return [];
    const s = new Set<string>();
    for (const r of rows) Object.keys(r).forEach((k) => s.add(k));
    return [...s];
  }, [rows]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    // Prefer a sheet whose name matches the table; else first sheet.
    const sheetName = wb.SheetNames.find((n) => n === table) || wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", raw: true });
    setRows(json);
    setLog([`📄 ${f.name} — ورقة "${sheetName}" — ${json.length} صف`]);
  }

  async function runImport() {
    if (!rows.length) { toast.error("لا توجد بيانات"); return; }
    setBusy(true);
    const out: string[] = [...log];
    try {
      let prepared = rows.map((r) => transformRow(r, cfg)).filter((r) => r[cfg.pk] !== undefined);
      const skipped = rows.length - prepared.length;
      if (!prepared.length) {
        out.push(`✗ لا يوجد صفوف تحتوي على عمود المفتاح "${cfg.pk}"`);
        setLog(out); setBusy(false); return;
      }
      if (skipped > 0) out.push(`⚠ تم تجاهل ${skipped} صف بدون مفتاح "${cfg.pk}"`);

      const dropped = new Set<string>();
      const failed: { row: number; pk: any; error: string }[] = [];
      const CHUNK = 200;
      let inserted = 0;

      for (let i = 0; i < prepared.length; i += CHUNK) {
        let slice = prepared.slice(i, i + CHUNK).map((r) => {
          const o = { ...r };
          for (const k of dropped) delete o[k];
          return o;
        });
        slice = normalizeKeys(slice);

        let bulkOk = false;
        let attempts = 0;
        while (attempts++ < 10) {
          const { error } = await upsertInto(table, slice, cfg.pk);
          if (!error) { inserted += slice.length; bulkOk = true; break; }
          const m = /Could not find the '([^']+)' column/.exec(error.message || "");
          if (m) {
            dropped.add(m[1]);
            slice = slice.map((r) => { const o = { ...r }; delete (o as any)[m[1]]; return o; });
            continue;
          }
          // fall back to per-row to isolate bad data
          break;
        }

        if (!bulkOk) {
          for (let j = 0; j < slice.length; j++) {
            const row = slice[j];
            const { error } = await upsertInto(table, [row], cfg.pk);
            if (error) {
              failed.push({ row: i + j + 2, pk: row[cfg.pk], error: error.message });
            } else {
              inserted++;
            }
          }
        }

        out.push(`… ${Math.min(i + CHUNK, prepared.length)}/${prepared.length}`);
        setLog([...out]);
      }

      out.push(`✓ تم استيراد ${inserted} صف إلى جدول ${table}` + (dropped.size ? ` (تم تجاهل أعمدة: ${[...dropped].join(", ")})` : ""));
      if (failed.length) {
        out.push(`✗ فشل ${failed.length} صف:`);
        for (const f of failed.slice(0, 20)) out.push(`  • صف ${f.row} (${cfg.pk}=${f.pk}): ${f.error}`);
        if (failed.length > 20) out.push(`  … و ${failed.length - 20} صف آخر`);
        toast.warning(`استيراد ${inserted}/${prepared.length} — فشل ${failed.length}`);
      } else {
        toast.success(`تم استيراد ${inserted} صف`);
      }
      setLog(out);
    } catch (e: any) {
      out.push(`✗ خطأ: ${e?.message || e}`);
      setLog(out);
      toast.error(e?.message || "فشل الاستيراد");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">استيراد بيانات من Excel</h1>
          <button onClick={() => nav({ to: "/admin" })} className="text-sm text-muted-foreground hover:text-foreground">← رجوع</button>
        </header>

        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">اختر الجدول</label>
            <select
              value={table}
              onChange={(e) => { setTable(e.target.value); setRows([]); setFileName(""); setLog([]); }}
              className="w-full bg-background border border-input rounded-md px-3 py-2"
            >
              {Object.keys(TABLES).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">المفتاح الأساسي: <code className="font-mono">{cfg.pk}</code></p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ملف Excel (.xlsx / .xls / .csv)</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onFile}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {fileName && <p className="text-xs text-muted-foreground mt-1">📎 {fileName}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              يجب أن يحتوي الصف الأول على أسماء الأعمدة كما هي في قاعدة البيانات. سيتم تجاهل الأعمدة غير المعروفة تلقائياً. سيتم تحديث الصفوف الموجودة (Upsert على المفتاح الأساسي).
            </p>
          </div>

          {rows.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">معاينة ({rows.length} صف)</h3>
              <div className="overflow-x-auto border border-border rounded-md max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>{headers.map((h) => <th key={h} className="px-2 py-1 text-right font-medium whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {headers.map((h) => <td key={h} className="px-2 py-1 whitespace-nowrap">{String(r[h] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 20 && <p className="text-xs text-muted-foreground mt-1">... و {rows.length - 20} صف آخر</p>}
            </div>
          )}

          <button
            onClick={runImport}
            disabled={busy || !rows.length}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 font-medium disabled:opacity-50"
          >
            {busy ? "جارٍ الاستيراد..." : `استيراد إلى ${table}`}
          </button>

          {log.length > 0 && (
            <div className="bg-muted/50 border border-border rounded-md p-3 text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
              {log.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
