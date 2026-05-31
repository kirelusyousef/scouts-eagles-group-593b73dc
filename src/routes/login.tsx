import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { GroupHeader } from "@/components/TopBar";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@scout.local");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = login(email, password);
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
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
                className="w-full rounded-lg border bg-background px-3 py-2.5 focus:ring-2 focus:ring-ring outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">كلمة المرور</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
                className="w-full rounded-lg border bg-background px-3 py-2.5 focus:ring-2 focus:ring-ring outline-none" />
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
          <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
            <div className="font-medium mb-1">حساب تجريبي للمدير:</div>
            admin@scout.local / admin123
          </div>
        </div>
      </div>
    </div>
  );
}
