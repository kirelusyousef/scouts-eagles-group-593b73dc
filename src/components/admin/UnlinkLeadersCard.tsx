import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { syncFromCloud } from "@/lib/db";
import { toast } from "sonner";

export function UnlinkLeadersCard() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!confirm("هل أنت متأكد من فك ربط جميع القادة من الفرق واللجان؟ لا يمكن التراجع.")) return;
    setBusy(true);
    const { error } = await (supabase as any).from("Users")
      .update({ Team_ID: "", Team_Role_ID: "", Committee_ID: "", Committee_Role_ID: "" })
      .eq("Role", "Leader");
    setBusy(false);
    if (error) return toast.error(error.message);
    await syncFromCloud();
    toast.success("تم فك ربط القادة");
  };
  return (
    <div className="mt-6 rounded-xl border bg-card p-4 flex items-center justify-between">
      <div>
        <div className="font-medium">فك ربط القادة بالفرق واللجان</div>
        <div className="text-xs text-muted-foreground">يفرّغ الفريق واللجنة وأدوارهم لكل القادة مرة واحدة</div>
      </div>
      <button disabled={busy} onClick={run} className="rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50">
        {busy ? "جارٍ…" : "فك الربط"}
      </button>
    </div>
  );
}
