import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { db, fullName, isGeneralLeader, syncFromCloud } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { EDITABLE_CANDIDATES, fieldLabel, getEditableFields, setEditableFields } from "@/lib/profile-edits";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/profile-edits")({
  component: ProfileEditsAdmin,
  head: () => ({
    meta: [
      { title: "طلبات تعديل البيانات | إدارة المجموعة" },
      { name: "description", content: "تحديد البيانات المسموح بتعديلها ومراجعة طلبات التعديل." },
      { property: "og:title", content: "طلبات تعديل البيانات" },
      { property: "og:description", content: "تحديد البيانات المسموح بتعديلها ومراجعة طلبات التعديل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Req = { id: string; user_id: string; changes: Record<string, string>; old_values: Record<string, string>; status: string; created_at: string; review_note: string | null };
const sb = supabase as any;

function ProfileEditsAdmin() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [fields, setFields] = useState<Set<string>>(new Set());
  const [reqs, setReqs] = useState<Req[]>([]);
  const [filter, setFilter] = useState("pending");

  const reload = useCallback(async () => {
    setFields(new Set(await getEditableFields()));
    const { data } = await sb.from("Profile_Edit_Requests").select("*").order("created_at", { ascending: false });
    setReqs(data || []);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  if (loading) return null;
  if (!user || !isGeneralLeader(user)) return <div dir="rtl" className="p-8">هذه الشاشة متاحة للقائد العام فقط</div>;

  const toggle = (k: string) => { const n = new Set(fields); n.has(k) ? n.delete(k) : n.add(k); setFields(n); };
  const saveFields = async () => {
    const { error } = await setEditableFields([...fields]);
    error ? toast.error(error.message) : toast.success("تم حفظ البيانات المسموح بتعديلها");
  };

  const review = async (r: Req, approve: boolean) => {
    if (!confirm(approve ? "الموافقة وتطبيق التعديل؟" : "رفض الطلب؟")) return;
    if (approve) {
      const { error } = await sb.from("Users").update(r.changes).eq("ID", r.user_id);
      if (error) return toast.error(error.message);
    }
    await sb.from("Profile_Edit_Requests").update({
      status: approve ? "approved" : "rejected", reviewed_by: user.ID, reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (approve) await syncFromCloud();
    toast.success(approve ? "تم تطبيق التعديل" : "تم الرفض");
    reload();
  };

  const shown = reqs.filter((r) => filter === "all" || r.status === filter);
  const statusLabel: Record<string, string> = { pending: "قيد المراجعة", approved: "مقبول", rejected: "مرفوض" };

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">✏️ طلبات تعديل البيانات</h1>
          <button onClick={() => nav({ to: "/admin" })} className="text-sm text-muted-foreground">← رجوع</button>
        </header>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-bold">البيانات المسموح للمستخدم بطلب تعديلها</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {EDITABLE_CANDIDATES.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm rounded-lg border p-2 cursor-pointer">
                <input type="checkbox" className="accent-primary" checked={fields.has(f.key)} onChange={() => toggle(f.key)} />
                {f.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">البيانات غير المحددة لا يمكن تعديلها.</p>
          <button onClick={saveFields} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">حفظ</button>
        </section>

        <section className="space-y-3">
          <div className="flex gap-2">
            {["pending", "approved", "rejected", "all"].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-sm border ${filter === s ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                {s === "all" ? "الكل" : statusLabel[s]}
              </button>
            ))}
          </div>
          {!shown.length && <p className="text-sm text-muted-foreground">لا توجد طلبات.</p>}
          {shown.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <b>{fullName(db.users.get(r.user_id) as any) || r.user_id}</b>
                <span className="text-xs text-muted-foreground">{statusLabel[r.status]} · {new Date(r.created_at).toLocaleDateString("ar-EG")}</span>
              </div>
              <div className="text-sm space-y-1">
                {Object.entries(r.changes).map(([k, v]) => (
                  <div key={k}><span className="text-muted-foreground">{fieldLabel(k)}:</span> <s className="text-muted-foreground">{r.old_values?.[k] || "—"}</s> ← <b>{v || "—"}</b></div>
                ))}
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => review(r, true)} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">موافقة</button>
                  <button onClick={() => review(r, false)} className="rounded-lg bg-destructive px-3 py-1.5 text-sm text-destructive-foreground">رفض</button>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
