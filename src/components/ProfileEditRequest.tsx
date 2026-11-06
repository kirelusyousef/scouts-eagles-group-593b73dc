import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/lib/db";
import { fieldLabel, getEditableFields } from "@/lib/profile-edits";
import { toast } from "sonner";

const sb = supabase as any;

export function ProfileEditRequest({ user }: { user: User }) {
  const [fields, setFields] = useState<string[]>([]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const f = await getEditableFields();
    setFields(f);
    setVals(Object.fromEntries(f.map((k) => [k, String((user as any)[k] ?? "")])));
    const { data } = await sb.from("Profile_Edit_Requests").select("*").eq("user_id", user.ID).order("created_at", { ascending: false }).limit(5);
    setPending(data || []);
  };
  useEffect(() => { load(); }, [user.ID]);

  if (!fields.length) return null;
  const hasPending = pending.some((p) => p.status === "pending");

  const submit = async () => {
    const changes: Record<string, string> = {};
    const old: Record<string, string> = {};
    for (const k of fields) {
      const before = String((user as any)[k] ?? "");
      if (vals[k].trim() !== before) { changes[k] = vals[k].trim(); old[k] = before; }
    }
    if (!Object.keys(changes).length) return toast.info("لم تغيّر أي بيانات");
    setBusy(true);
    const { error } = await sb.from("Profile_Edit_Requests").insert({ user_id: user.ID, changes, old_values: old });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم إرسال طلب التعديل، سيتم تطبيقه بعد الموافقة");
    load();
  };

  const statusLabel: Record<string, string> = { pending: "قيد المراجعة", approved: "مقبول", rejected: "مرفوض" };

  return (
    <div className="mt-4 rounded-2xl border bg-card p-4">
      <h2 className="font-bold mb-1">طلب تعديل بياناتي</h2>
      <p className="text-xs text-muted-foreground mb-3">التعديل لا يُطبق إلا بعد موافقة الإدارة.</p>
      {hasPending ? (
        <p className="text-sm rounded-lg bg-secondary p-3">لديك طلب قيد المراجعة. انتظر الرد قبل إرسال طلب جديد.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-2">
          {fields.map((k) => (
            <label key={k} className="text-sm space-y-1">
              <span className="text-muted-foreground">{fieldLabel(k)}</span>
              <input value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2" />
            </label>
          ))}
          <button disabled={busy} onClick={submit} className="md:col-span-2 rounded-lg bg-primary py-2 text-sm text-primary-foreground disabled:opacity-50">
            {busy ? "جارٍ الإرسال…" : "إرسال طلب التعديل"}
          </button>
        </div>
      )}
      {!!pending.length && (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          {pending.map((p) => (
            <div key={p.id}>{new Date(p.created_at).toLocaleDateString("ar-EG")} — {Object.keys(p.changes).map(fieldLabel).join("، ")} — <b>{statusLabel[p.status]}</b></div>
          ))}
        </div>
      )}
    </div>
  );
}
