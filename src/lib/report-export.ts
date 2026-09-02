import * as XLSX from "xlsx";

export type Row = Record<string, any>;

/** Export rows to an .xlsx file (Arabic-safe). */
export function exportExcel(rows: Row[], fileName: string, sheetName = "Report") {
  const flat = rows.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) {
      o[k] = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : v;
    }
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(flat);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30) || "Report");
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export rows to PDF through the browser print dialog.
 * This keeps full Arabic (RTL) shaping, which embedded-font PDF writers lose.
 */
export function exportPdf(title: string, rows: Row[], subtitle = "") {
  if (!rows.length) return;
  const headers = Array.from(rows.reduce<Set<string>>((s, r) => {
    Object.keys(r).forEach((k) => s.add(k));
    return s;
  }, new Set<string>()));
  const esc = (v: any) =>
    String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  body{font-family:"Cairo","Segoe UI",Tahoma,sans-serif;padding:24px;color:#111}
  h1{font-size:20px;margin:0 0 4px}
  .sub{font-size:12px;color:#666;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #ccc;padding:6px 8px;text-align:right}
  th{background:#f1f5f9}
  tr:nth-child(even) td{background:#fafafa}
  @page{size:A4 landscape;margin:12mm}
</style></head><body>
<h1>${esc(title)}</h1>
<div class="sub">${esc(subtitle)} — ${new Date().toLocaleString("ar-EG")}</div>
<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`).join("")}</tbody>
</table>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

  const w = window.open("", "_blank", "width=1024,height=768");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
