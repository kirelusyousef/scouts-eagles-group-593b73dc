import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { GroupHeader } from "@/components/TopBar";
import { db } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (!r.ok) { toast.error(r.msg ?? "فشل تسجيل الدخول"); return; }
    toast.success("مرحباً بك");
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-gold/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><GroupHeader /></div>
        <div className="rounded-2xl border bg-card p-6 shadow-xl">
          <h1 className="text-2xl font-bold mb-1">تسجيل الدخول</h1>
          <p className="text-sm text-muted-foreground mb-6">أدخل بياناتك للوصول إلى حسابك</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">البريد الإلكتروني</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ""))}
                onBlur={(e) => setEmail(e.target.value.trim())}
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                autoCapitalize="none"
                className="w-full rounded-lg border bg-background px-3 py-2.5 focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">كلمة المرور</label>
                <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-primary hover:underline">
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPass ? "text" : "password"} required
                  className="w-full rounded-lg border bg-background px-3 py-2.5 pe-11 focus:ring-2 focus:ring-ring outline-none" />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition press hover:bg-secondary"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button disabled={loading} type="submit"
              className="w-full rounded-lg bg-primary py-2.5 text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "..." : "دخول"}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">سجل الآن</Link>
          </div>
        </div>
      </div>
      {forgotOpen && <ForgotModal onClose={() => setForgotOpen(false)} />}
    </div>
  );
}

function ForgotModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const emailIn = email.trim().toLowerCase();
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneNoLead = phoneDigits.replace(/^0+/, "");
    const u = db.users.all().find((x) => {
      const xEmail = (x.Email || "").trim().toLowerCase();
      const xPhone = (x.Phone || "").replace(/\D/g, "");
      const xPhoneNoLead = xPhone.replace(/^0+/, "");
      if (xEmail !== emailIn) return false;
      return (
        xPhone === phoneDigits ||
        xPhone === phoneNoLead ||
        xPhoneNoLead === phoneDigits ||
        xPhoneNoLead === phoneNoLead
      );
    });
    if (!u) {
      setBusy(false);
      toast.error("لا يوجد حساب مطابق للبريد ورقم الهاتف معاً");
      return;
    }
    u.Reset_Requested = "True";
    u.Reset_Phone = phone.trim();
    db.users.upsert(u);
    setBusy(false);
    toast.success("تم إرسال طلبك إلى الإدارة. سيتم التواصل معك على واتساب قريباً.");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
        <h3 className="text-xl font-bold mb-3">طلب استعادة كلمة المرور</h3>
        <p className="text-sm text-muted-foreground mb-4">أدخل بريدك الإلكتروني ورقم هاتفك. ستراجع الإدارة طلبك وترسل كلمة مرور مؤقتة عبر واتساب.</p>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-secondary py-2 text-sm">إلغاء</button>
            <button disabled={busy} type="submit" className="flex-1 rounded-lg bg-primary py-2 text-primary-foreground text-sm font-medium disabled:opacity-50">
              {busy ? "..." : "إرسال الطلب"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
