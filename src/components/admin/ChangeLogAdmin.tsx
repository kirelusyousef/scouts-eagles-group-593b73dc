import { useEffect, useState } from "react";
import { db } from "@/lib/db";

const ENTITY_LABELS: Record<string, string> = {
  Plan: "خطة",
  Meeting: "اجتماع",
  Lecture: "محاضرة",
};
const ACTION_LABELS: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
};

export function ChangeLogAdmin() {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const [entity, setEntity] = useState("");
  const [q, setQ] = useState("");
  const rows = db.changeLog.all()
    .filter((r) => !entity || r.Entity_Type === entity)
    .filter((r) => !q.trim() || (r.Summary + " " + r.Changed_By).toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 300);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">🕓 سجل التعديلات</h2>
      <p className="text-xs text-muted-foreground mb-4">
        كل تغيير على الخطط والاجتماعات والفقرات والمحاضرات مع اسم من قام به ووقته.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={entity} onChange={(e) => setEntity(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">كل الأنواع</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="flex-1 min-w-40 rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="بحث" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {rows.length === 0 && <div className="text-sm text-muted-foreground">لا توجد تعديلات مسجلة.</div>}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.Change_ID} className="rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{r.Summary}</div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {ENTITY_LABELS[r.Entity_Type] || r.Entity_Type} · {ACTION_LABELS[r.Action] || r.Action}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {r.Changed_By || "غير معروف"} · {r.Changed_At ? new Date(r.Changed_At).toLocaleString("ar-EG") : ""}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
