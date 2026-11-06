import { supabase } from "@/integrations/supabase/client";
import { PRIVACY_USER_FIELDS } from "@/lib/db";

const sb = supabase as any;
const IMAGE_FIELDS = ["Profile_Photo", "National_ID_Front", "National_ID_Back", "Birth_Certificate"];
const SYSTEM_FIELDS = ["Rank", "Team_ID", "Patrol_ID"];

/** User registration fields that can be offered for edit requests. */
export const EDITABLE_CANDIDATES = PRIVACY_USER_FIELDS.filter(
  (f) => !IMAGE_FIELDS.includes(f.key) && !SYSTEM_FIELDS.includes(f.key),
);
export const fieldLabel = (k: string) => PRIVACY_USER_FIELDS.find((f) => f.key === k)?.label || k;

export async function getEditableFields(): Promise<string[]> {
  const { data } = await sb.from("Profile_Edit_Settings").select("editable_fields").eq("id", "main").maybeSingle();
  return Array.isArray(data?.editable_fields) ? data.editable_fields : [];
}

export async function setEditableFields(fields: string[]) {
  return sb.from("Profile_Edit_Settings").upsert({ id: "main", editable_fields: fields, updated_at: new Date().toISOString() });
}
