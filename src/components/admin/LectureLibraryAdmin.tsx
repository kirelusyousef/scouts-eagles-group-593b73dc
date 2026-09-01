import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  db, uid, fullName, logChange, canCreate, canEdit, canDelete,
  type Lecture, type User,
} from "@/lib/db";

const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

export function LectureLibraryAdmin({ viewer }: { viewer: User }) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const allowCreate = canCreate(viewer, "lectures_admin");
  const allowEdit = canEdit(viewer, "lectures_admin");
  const allowDelete = canDelete(viewer, "lectures_admin");
  const by = fullName(viewer);

  const rows = db.lectures.all();
  const [q, setQ] = useState("");
  const shown = rows.filter((l) =>
    !q.trim() ||
    (l.Title + " " + l.Category + " " + l.Tags).toLowerCase().includes(q.trim().toLowerCase()));

  const blank: Lecture = {
    Lecture_ID: "", Title: "", Category: "", Content: "", Attachment_URL: "",
    Duration_Minutes: 15, Tags: "", Created_By: by, Created_At: "",
  };
  const [form, setForm] = useState<Lecture>(blank);
  const editing = !!form.Lecture_ID;

  const save = () => {
    if (!form.Title.trim()) return toast.error("أدخل عنوان المحاضرة");
    const rec: Lecture = {
      ...form,
      Lecture_ID: form.Lecture_ID || "LC-" + uid(),
      Title: form.Title.trim(),
      Duration_Minutes: Number(form.Duration_Minutes) || 0,
      Created_At: form.Created_At || new Date().toISOString(),
      Created_By: form.Created_By || by,
    };
    db.lectures.upsert(rec);
    logChange("Lecture", rec.Lecture_ID, editing ? "update" : "create",
      `${editing ? "تعديل" : "إضافة"} محاضرة: ${rec.Title}`, rec, by);
    toast.success("تم الحفظ");
    setForm({ ...blank });
  };

  const remove = (l: Lecture) => {
    if (!allowDelete) return;
    if (!confirm(`حذف المحاضرة "${l.Title}"؟`)) return;
    db.lectures.remove(l.Lecture_ID);
    logChange("Lecture", l.Lecture_ID, "delete", `حذف محاضرة: ${l.Title}`, l, by);
    if (form.Lecture_ID === l.Lecture_ID) setForm({ ...blank });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">📚 مكتبة المحاضرات</h2>
      <p className="text-xs text-muted-foreground mb-4">
        مكتبة مركزية قابلة لإعادة الاستخدام — يمكن إدراج أي محاضرة كفقرة داخل أي اجتماع.
      </p>

      <input className={inputCls + " mb-4"} placeholder="بحث بالعنوان أو التصنيف أو الوسوم"
        value={q} onChange={(e) => setQ(e.target.value)} />

      {(allowCreate || (allowEdit && editing)) && (
        <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm"><span className="block mb-1">العنوان</span>
            <input className={inputCls} value={form.Title}
              onChange={(e) => setForm((f) => ({ ...f, Title: e.target.value }))} /></label>
          <label className="text-sm"><span className="block mb-1">التصنيف</span>
            <input className={inputCls} value={form.Category}
              onChange={(e) => setForm((f) => ({ ...f, Category: e.target.value }))} /></label>
          <label className="text-sm"><span className="block mb-1">المدة (دقيقة)</span>
            <input type="number" className={inputCls} value={form.Duration_Minutes}
              onChange={(e) => setForm((f) => ({ ...f, Duration_Minutes: Number(e.target.value) }))} /></label>
          <label className="text-sm"><span className="block mb-1">وسوم (مفصولة بفاصلة)</span>
            <input className={inputCls} value={form.Tags}
              onChange={(e) => setForm((f) => ({ ...f, Tags: e.target.value }))} /></label>
          <label className="text-sm sm:col-span-2"><span className="block mb-1">رابط مرفق (اختياري)</span>
            <input className={inputCls} value={form.Attachment_URL}
              onChange={(e) => setForm((f) => ({ ...f, Attachment_URL: e.target.value }))} /></label>
          <label className="text-sm sm:col-span-2"><span className="block mb-1">المحتوى</span>
            <textarea className={inputCls} rows={5} value={form.Content}
              onChange={(e) => setForm((f) => ({ ...f, Content: e.target.value }))} /></label>
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              {editing ? "تحديث" : "إضافة"}
            </button>
            {editing && <button onClick={() => setForm({ ...blank })} className="rounded-lg border px-4 py-2 text-sm">إلغاء</button>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shown.length === 0 && <div className="text-sm text-muted-foreground">لا توجد محاضرات.</div>}
        {shown.map((l) => (
          <div key={l.Lecture_ID} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold">{l.Title}</div>
                <div className="text-xs text-muted-foreground">
                  {l.Category || "بدون تصنيف"} · {l.Duration_Minutes} دقيقة
                </div>
                {l.Content && <p className="mt-2 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{l.Content}</p>}
                {l.Attachment_URL && (
                  <a href={l.Attachment_URL} target="_blank" rel="noreferrer"
                    className="mt-2 inline-block text-xs text-primary underline">فتح المرفق</a>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {allowEdit && (
                  <button className="rounded-lg border px-2 py-1 text-xs"
                    onClick={() => { setForm({ ...l }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>تعديل</button>
                )}
                {allowDelete && (
                  <button className="rounded-lg border border-destructive/40 px-2 py-1 text-xs text-destructive"
                    onClick={() => remove(l)}>حذف</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
