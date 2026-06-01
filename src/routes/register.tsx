import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { db, uid, type User } from "@/lib/db";
import { GroupHeader } from "@/components/TopBar";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({ component: Register });

const STAGES = [
  "حضانة", "ابتدائي 1", "ابتدائي 2", "ابتدائي 3", "ابتدائي 4", "ابتدائي 5", "ابتدائي 6",
  "إعدادي 1", "إعدادي 2", "إعدادي 3",
  "1 ثانوي", "2 ثانوي", "3 ثانوي",
  "جامعة 1", "جامعة 2", "جامعة 3", "جامعة 4", "خريج",
];
const stageNeedsParent = (s: string) => {
  const i = STAGES.indexOf(s);
  return i >= 0 && i < STAGES.indexOf("1 ثانوي");
};

function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({
    First_Name: "", Father_Name: "", Grandfather_Name: "", Last_Name: "",
    Phone: "", Has_WhatsApp: false, National_ID: "", Confession_Father: "",
    Email: "", Password: "", Education_Stage: "ابتدائي 1", Parent_Phone: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const needsParent = stageNeedsParent(f.Education_Stage);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.National_ID.length !== 14 || !/^\d+$/.test(f.National_ID))
      return toast.error("الرقم القومي يجب أن يكون 14 رقماً");
    if (needsParent && !f.Parent_Phone) return toast.error("رقم ولي الأمر مطلوب");
    if (db.users.all().some((u) => u.Email.toLowerCase() === f.Email.toLowerCase()))
      return toast.error("البريد الإلكتروني مستخدم بالفعل");

    const user: User = {
      ID: uid(),
      ...f,
      Parent_Phone: needsParent ? f.Parent_Phone : "",
      Role: "Member",
      Rank: "مبتدئ",
      Team_ID: "",
      Patrol_ID: "",
      Status: "Pending",
    };
    db.users.upsert(user);
    toast.success("تم التسجيل! حسابك بانتظار الموافقة");
    nav({ to: "/login" });
  };

  const inp = "w-full rounded-lg border bg-background px-3 py-2 focus:ring-2 focus:ring-ring outline-none text-sm";
  const lbl = "text-sm font-medium block mb-1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-gold/10 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex justify-center"><GroupHeader /></div>
        <div className="rounded-2xl border bg-card p-6 shadow-xl">
          <h1 className="text-2xl font-bold mb-1">التسجيل لأول مرة</h1>
          <p className="text-sm text-muted-foreground mb-6">املأ بياناتك وسيتم مراجعتها من قبل القائد العام</p>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lbl}>الاسم الأول</label><input required className={inp} value={f.First_Name} onChange={(e) => set("First_Name", e.target.value)} /></div>
            <div><label className={lbl}>اسم الأب</label><input required className={inp} value={f.Father_Name} onChange={(e) => set("Father_Name", e.target.value)} /></div>
            <div><label className={lbl}>اسم الجد</label><input required className={inp} value={f.Grandfather_Name} onChange={(e) => set("Grandfather_Name", e.target.value)} /></div>
            <div><label className={lbl}>اسم العائلة</label><input required className={inp} value={f.Last_Name} onChange={(e) => set("Last_Name", e.target.value)} /></div>
            <div>
              <label className={lbl}>رقم الهاتف</label>
              <input required className={inp} value={f.Phone} onChange={(e) => set("Phone", e.target.value)} />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.Has_WhatsApp} onChange={(e) => set("Has_WhatsApp", e.target.checked)} />
                يمتلك واتساب
              </label>
            </div>
            <div><label className={lbl}>الرقم القومي (14 رقم)</label><input required maxLength={14} className={inp} value={f.National_ID} onChange={(e) => set("National_ID", e.target.value)} /></div>
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
            <button type="submit" className="sm:col-span-2 rounded-lg bg-primary py-2.5 text-primary-foreground font-medium hover:bg-primary/90">
              إرسال طلب التسجيل
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
