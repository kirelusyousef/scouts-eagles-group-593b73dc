import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  db, uid, type User,
  STAGES, stageNeedsParent, stageIsSecondaryOrAbove, DEFAULT_MEMBER_SCREENS,
} from "@/lib/db";
import { GroupHeader } from "@/components/TopBar";
import { uploadImage } from "@/lib/upload";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({ component: Register });

const MAX_FILE_BYTES = 8 * 1024 * 1024; // ImgBB allows up to 32MB; cap at 8MB.

const ARABIC_NAME_RE = /^[\u0621-\u064A\s]+$/;
const isArabicName = (v: string) => ARABIC_NAME_RE.test(v.trim());

type ImgField = "Profile_Photo" | "National_ID_Front" | "National_ID_Back" | "Birth_Certificate";

function Register() {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<Record<ImgField, boolean>>({
    Profile_Photo: false, National_ID_Front: false, National_ID_Back: false, Birth_Certificate: false,
  });
  const [f, setF] = useState({
    First_Name: "", Father_Name: "", Grandfather_Name: "", Last_Name: "",
    Phone: "", Has_WhatsApp: false, National_ID: "", Birth_Date: "",
    Gender: "ذكر",
    Confession_Father: "", Email: "", Password: "",
    Education_Stage: "ابتدائي 1", Parent_Phone: "",
    Profile_Photo: "", National_ID_Front: "", National_ID_Back: "", Birth_Certificate: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const needsParent = stageNeedsParent(f.Education_Stage);
  const isSecondaryUp = stageIsSecondaryOrAbove(f.Education_Stage);

  const onFile = async (field: ImgField, file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("حجم الملف كبير جداً (الحد الأقصى 8 م.ب). الرجاء ضغط الصورة.");
      return;
    }
    setUploading((p) => ({ ...p, [field]: true }));
    try {
      const url = await uploadImage(file);
      set(field, url);
      toast.success("تم رفع الصورة بنجاح");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`فشل رفع الصورة: ${msg}`);
    } finally {
      setUploading((p) => ({ ...p, [field]: false }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.National_ID.length !== 14 || !/^\d+$/.test(f.National_ID))
      return toast.error("الرقم القومي يجب أن يكون 14 رقماً");
    if (needsParent && !f.Parent_Phone) return toast.error("رقم ولي الأمر مطلوب");
    if (isSecondaryUp && (!f.National_ID_Front || !f.National_ID_Back))
      return toast.error("صور البطاقة (الوجه/الظهر) مطلوبة");
    if (!isSecondaryUp && !f.Birth_Certificate)
      return toast.error("شهادة الميلاد مطلوبة");
    if (db.users.all().some((u) => (u.Email || "").toLowerCase() === f.Email.toLowerCase()))
      return toast.error("البريد الإلكتروني مستخدم بالفعل");

    if (!isArabicName(f.First_Name) || !isArabicName(f.Father_Name) || !isArabicName(f.Grandfather_Name) || !isArabicName(f.Last_Name))
      return toast.error("يرجى كتابة الاسم باللغة العربية فقط");

    setSubmitting(true);
    const user: User = {
      ID: uid(),
      First_Name: f.First_Name,
      Father_Name: f.Father_Name,
      Grandfather_Name: f.Grandfather_Name,
      Last_Name: f.Last_Name,
      Phone: f.Phone,
      Has_WhatsApp: f.Has_WhatsApp,
      National_ID: f.National_ID,
      Birth_Date: f.Birth_Date,
      Gender: f.Gender,
      Profile_Photo: f.Profile_Photo,
      National_ID_Front: isSecondaryUp ? f.National_ID_Front : "",
      National_ID_Back: isSecondaryUp ? f.National_ID_Back : "",
      Birth_Certificate: isSecondaryUp ? "" : f.Birth_Certificate,
      Confession_Father: f.Confession_Father,
      Email: f.Email,
      Password: f.Password,
      Education_Stage: f.Education_Stage,
      Parent_Phone: needsParent ? f.Parent_Phone : "",
      Role: "Member",
      User_Type: "عضو",
      Rank: "مبتدئ",
      Leader_Rank_ID: "",
      Team_ID: "",
      Patrol_ID: "",
      Status: "Pending",
      Visible_Screens: DEFAULT_MEMBER_SCREENS,
    };
    db.users.upsert(user);
    toast.success("تم التسجيل! حسابك بانتظار الموافقة");
    nav({ to: "/login" });
    setSubmitting(false);
  };

  const inp = "w-full rounded-lg border bg-background px-3 py-2 focus:ring-2 focus:ring-ring outline-none text-sm";
  const lbl = "text-sm font-medium block mb-1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-gold/10 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex justify-center"><GroupHeader /></div>
        <div className="rounded-2xl border bg-card p-6 shadow-xl">
          <h1 className="text-2xl font-bold mb-1">التسجيل لأول مرة</h1>
          <p className="text-sm text-muted-foreground mb-6">املأ بياناتك وارفع المستندات وسيتم مراجعتها من قبل القائد العام</p>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ArabicNameField label="الاسم الأول" value={f.First_Name} onChange={(v) => set("First_Name", v)} inp={inp} lbl={lbl} />
            <ArabicNameField label="اسم الأب" value={f.Father_Name} onChange={(v) => set("Father_Name", v)} inp={inp} lbl={lbl} />
            <ArabicNameField label="اسم الجد" value={f.Grandfather_Name} onChange={(v) => set("Grandfather_Name", v)} inp={inp} lbl={lbl} />
            <ArabicNameField label="اسم العائلة" value={f.Last_Name} onChange={(v) => set("Last_Name", v)} inp={inp} lbl={lbl} />
            <div>
              <label className={lbl}>رقم الهاتف</label>
              <input required className={inp} value={f.Phone} onChange={(e) => set("Phone", e.target.value)} />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.Has_WhatsApp} onChange={(e) => set("Has_WhatsApp", e.target.checked)} />
                يمتلك واتساب
              </label>
            </div>
            <div><label className={lbl}>الرقم القومي (14 رقم)</label><input required maxLength={14} className={inp} value={f.National_ID} onChange={(e) => set("National_ID", e.target.value)} /></div>
            <div><label className={lbl}>تاريخ الميلاد</label><input required type="date" className={inp} value={f.Birth_Date} onChange={(e) => set("Birth_Date", e.target.value)} /></div>
            <div>
              <label className={lbl}>الجنس <span className="text-destructive">*</span></label>
              <select required className={inp} value={f.Gender} onChange={(e) => set("Gender", e.target.value)}>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>
            <div><label className={lbl}>أب الاعتراف</label><input required className={inp} value={f.Confession_Father} onChange={(e) => set("Confession_Father", e.target.value)} /></div>
            <div><label className={lbl}>البريد الإلكتروني</label><input required type="email" className={inp} value={f.Email} onChange={(e) => set("Email", e.target.value)} /></div>
            <div><label className={lbl}>كلمة المرور</label><input required type="password" minLength={6} className={inp} value={f.Password} onChange={(e) => set("Password", e.target.value)} /></div>
            <div>
              <label className={lbl}>المرحلة الدراسية</label>
              <select className={inp} value={f.Education_Stage} onChange={(e) => set("Education_Stage", e.target.value)}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {needsParent && (
              <div className="sm:col-span-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <label className={lbl}>رقم هاتف ولي الأمر <span className="text-destructive">*</span></label>
                <input required className={inp} value={f.Parent_Phone} onChange={(e) => set("Parent_Phone", e.target.value)} />
              </div>
            )}

            {/* Documents */}
            <div className="sm:col-span-2 border-t pt-4">
              <h2 className="font-bold mb-3">المستندات</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileField label="صورة شخصية (اختياري)" value={f.Profile_Photo} uploading={uploading.Profile_Photo} onPick={(file) => onFile("Profile_Photo", file)} />
                {isSecondaryUp ? (
                  <>
                    <FileField required label="صورة البطاقة - الوجه" value={f.National_ID_Front} uploading={uploading.National_ID_Front} onPick={(file) => onFile("National_ID_Front", file)} />
                    <FileField required label="صورة البطاقة - الظهر" value={f.National_ID_Back} uploading={uploading.National_ID_Back} onPick={(file) => onFile("National_ID_Back", file)} />
                  </>
                ) : (
                  <FileField required label="شهادة الميلاد" value={f.Birth_Certificate} uploading={uploading.Birth_Certificate} onPick={(file) => onFile("Birth_Certificate", file)} />
                )}
              </div>
            </div>

            <button disabled={submitting} type="submit" className="sm:col-span-2 rounded-lg bg-primary py-2.5 text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50">
              {submitting ? "..." : "إرسال طلب التسجيل"}
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            لديك حساب؟{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">سجل الدخول</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileField({ label, value, onPick, required, uploading }: { label: string; value: string; onPick: (file: File) => void; required?: boolean; uploading?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {value && (
        <img src={value} alt="معاينة" className="h-24 w-24 object-cover rounded-lg ring-1 ring-border mb-2" />
      )}
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => { const file = e.target.files?.[0]; if (file) onPick(file); }}
        className="block text-sm w-full disabled:opacity-50"
      />
      {uploading && (
        <div className="mt-1 flex items-center gap-2 text-xs text-primary">
          <span className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          جاري رفع الصورة...
        </div>
      )}
    </div>
  );
}
