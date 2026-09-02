import { useEffect, useMemo, useState } from "react";
import {
  db, uid, fullName, canCreate, canDelete, viewerTeamScope,
  type UnifiedAttendance, type User,
} from "@/lib/db";
import { toast } from "sonner";
import { exportExcel, exportPdf } from "@/lib/report-export";

const STATUSES = ["حاضر", "متأخر", "معتذر", "غائب"];
const today = () => new Date().toISOString().slice(0, 10);

export function UnifiedAttendanceAdmin({ viewer }: { viewer: User | null }) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const mayAdd = canCreate(viewer, "unified_attendance");
  const mayDelete = canDelete(viewer, "unified_attendance");
  const scope = viewerTeamScope(viewer);
  const by = viewer ? fullName(viewer) : "";

  const [date, setDate] = useState(today());
  const [activity, setActivity] = useState("اجتماع أسبوعي");
  const [personType, setPersonType] = useState<"member" | "leader" | "guest">("member");
  const [q, setQ] = useState("");
  const [guest, setGuest] = useState({ name: "", phone: "" });

  const people = useMemo(() => {
    let list = db.users.all().filter((u) => (u.Status || "") !== "Rejected");
    list = list.filter((u) => (personType === "leader" ? u.Role === "Leader" : u.Role !== "Leader"));
    if (scope !== null) list = list.filter((u) => (u.Team_ID || "") === scope);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((u) => fullName(u).toLowerCase().includes(s));
    }
    return list;
  }, [personType, q, scope]);

  const dayRows = db.unifiedAttendance.all()
    .filter((r) => r.Date === date && r.Activity_Type === activity)
    .filter((r) => scope === null || (r.Team_ID || "") === scope);

  const statusOf = (userId: string) =>
    dayRows.find((r) => r.User_ID === userId)?.Status || "";

  const mark = (u: User, status: string) => {
    if (!mayAdd) return;
    db.unifiedAttendance.mark({
      Date: date,
      Activity_Type: activity,
      Person_Type: u.Role === "Leader" ? "leader" : "member",
      User_ID: u.ID,
      Guest_Name: "",
      Guest_Phone: "",
      Team_ID: u.Team_ID || "",
      Status: status,
      Notes: "",
      Meeting_ID: "",
      Recorded_By: by,
    });
  };

  const addGuest = () => {
    if (!mayAdd) return;
    if (!guest.name.trim()) { toast.error("اسم الضيف مطلوب"); return; }
    db.unifiedAttendance.mark({
      Date: date, Activity_Type: activity, Person_Type: "guest",
      User_ID: "", Guest_Name: guest.name.trim(), Guest_Phone: guest.phone.trim(),
      Team_ID: scope || "", Status: "حاضر", Notes: "", Meeting_ID: "", Recorded_By: by,
    });
    setGuest({ name: "", phone: "" });
    toast.success("تم تسجيل الضيف");
  };

  const exportRows = dayRows.map((r) => ({
    "التاريخ": r.Date,
    "النشاط": r.Activity_Type,
    "النوع": r.Person_Type === "guest" ? "ضيف" : r.Person_Type === "leader" ? "قائد" : "عضو",
    "الاسم": r.Person_Type === "guest" ? r.Guest_Name : fullName(db.users.get(r.User_ID) as any) || r.User_ID,
    "الفرقة": db.teams.get(r.Team_ID)?.Team_Name || "",
    "الحالة": r.Status,
    "سجّل بواسطة": r.Recorded_By,
  }));

  const input = "rounded-lg border bg-background px-3 py-2 text-sm";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">🧾 الحضور الموحّد</h2>
      <p className="text-xs text-muted-foreground mb-4">تسجيل حضور الأعضاء والقادة والضيوف في مكان واحد.</p>

      <div className="grid sm:grid-cols-4 gap-2 mb-4">
        <input className={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className={input} placeholder="نوع النشاط" value={activity} onChange={(e) => setActivity(e.target.value)} />
        <select className={input} value={personType} onChange={(e) => setPersonType(e.target.value as any)}>
          <option value="member">الأعضاء</option>
          <option value="leader">القادة</option>
          <option value="guest">الضيوف</option>
        </select>
        <input className={input} placeholder="بحث بالاسم" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {personType === "guest" ? (
        <div className="rounded-xl border bg-card p-4 mb-4">
          {mayAdd && (
            <div className="grid sm:grid-cols-3 gap-2">
              <input className={input} placeholder="اسم الضيف" value={guest.name}
                onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
              <input className={input} placeholder="رقم الهاتف" value={guest.phone}
                onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
              <button onClick={addGuest} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm">
                تسجيل ضيف
              </button>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {dayRows.filter((r) => r.Person_Type === "guest").map((r) => (
              <div key={r.Record_ID} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <span>👤 {r.Guest_Name} {r.Guest_Phone && <span className="text-xs text-muted-foreground">· {r.Guest_Phone}</span>}</span>
                {mayDelete && <button onClick={() => db.unifiedAttendance.remove(r.Record_ID)} className="text-xs text-destructive">حذف</button>}
              </div>
            ))}
            {dayRows.filter((r) => r.Person_Type === "guest").length === 0 &&
              <div className="text-sm text-muted-foreground">لا يوجد ضيوف مسجلون.</div>}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-2">
          {people.length === 0 && <div className="text-sm text-muted-foreground">لا يوجد أشخاص مطابقون.</div>}
          {people.map((u) => {
            const st = statusOf(u.ID);
            return (
              <div key={u.ID} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2">
                <div className="text-sm">
                  <div className="font-medium">{fullName(u)}</div>
                  <div className="text-[11px] text-muted-foreground">{db.teams.get(u.Team_ID || "")?.Team_Name || "—"}</div>
                </div>
                <div className="flex gap-1">
                  {STATUSES.map((s) => (
                    <button key={s} disabled={!mayAdd} onClick={() => mark(u, s)}
                      className={`rounded-lg px-2 py-1 text-xs border disabled:opacity-50 ${st === s ? "bg-primary text-primary-foreground border-primary" : ""}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => exportExcel(exportRows, `Attendance_${date}`)} disabled={!exportRows.length}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">تصدير Excel</button>
        <button onClick={() => exportPdf(`كشف حضور ${activity}`, exportRows, date)} disabled={!exportRows.length}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">تصدير PDF</button>
        <span className="text-xs text-muted-foreground self-center">عدد السجلات اليوم: {dayRows.length}</span>
      </div>
    </div>
  );
}
