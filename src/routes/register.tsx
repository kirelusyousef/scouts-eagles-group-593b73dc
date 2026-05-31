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
    firstName: "", fatherName: "", grandfatherName: "", lastName: "",
    phone: "", hasWhatsapp: false, nationalId: "", confessionFather: "",
    email: "", password: "", educationStage: "ابتدائي 1", parentPhone: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const needsParent = stageNeedsParent(f.educationStage);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.nationalId.length !== 14 || !/^\d+$/.test(f.nationalId))
      return toast.error("الرقم القومي يجب أن يكون 14 رقماً");
    if (needsParent && !f.parentPhone) return toast.error("رقم ولي الأمر مطلوب");
    if (db.users.all().some((u) => u.email.toLowerCase() === f.email.toLowerCase()))
      return toast.error("البريد الإلكتروني مستخدم بالفعل");

    const user: User = {
      id: uid(), ...f, role: "member", status: "pending",
      rank: "مبتدئ", createdAt: new Date().toISOString(),
      parentPhone: needsParent ? f.parentPhone : undefined,
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
          <p className="text-sm text-muted-foreground mb-6">املأ بياناتك وسيتم مراجعتها من قبل القائد</p>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lbl}>الاسم الأول</label><input required className={inp} value={f.firstName} onChange={(e) => set("firstName", e.target.value)} /></div>
            <div><label className={lbl}>اسم الأب</label><input required className={inp} value={f.fatherName} onChange={(e) => set("fatherName", e.target.value)} /></div>
            <div><label className={lbl}>اسم الجد</label><input required className={inp} value={f.grandfatherName} onChange={(e) => set("grandfatherName", e.target.value)} /></div>
            <div><label className={lbl}>اسم العائلة</label><input required className={inp} value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></div>
            <div>
              <label className={lbl}>رقم الهاتف</label>
              <input required className={inp} value={f.phone} onChange={(e) => set("phone", e.target.value)} />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.hasWhatsapp} onChange={(e) => set("hasWhatsapp", e.target.checked)} />
                يمتلك واتساب
              </label>
            </div>
            <div><label className={lbl}>الرقم القومي (14 رقم)</label><input required maxLength={14} className={inp} value={f.nationalId} onChange={(e) => set("nationalId", e.target.value)} /></div>
            <div><label className={lbl}>أب الاعتراف</label><input required className={inp} value={f.confessionFather} onChange={(e) => set("confessionFather", e.target.value)} /></div>
            <div><label className={lbl}>البريد الإلكتروني</label><input required type="email" className={inp} value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div><label className={lbl}>كلمة المرور</label><input required type="password" minLength={6} className={inp} value={f.password} onChange={(e) => set("password", e.target.value)} /></div>
            <div>
              <label className={lbl}>المرحلة الدراسية</label>
              <select className={inp} value={f.educationStage} onChange={(e) => set("educationStage", e.target.value)}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {needsParent && (
              <div className="sm:col-span-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <label className={lbl}>رقم هاتف ولي الأمر <span className="text-destructive">*</span></label>
                <input required className={inp} value={f.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
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
