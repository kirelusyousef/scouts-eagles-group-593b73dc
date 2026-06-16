import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { db, fullName } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { uploadImage } from "@/lib/upload";
import { ImageCropDialog } from "@/components/ImageCropDialog";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, loading, refresh, setUser, isLeader } = useAuth();
  const nav = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/login" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <div>جاري تحميل بياناتك...</div>
        </div>
      </div>
    );
  }

  const team = db.teams.get(user.Team_ID);
  const patrol = db.patrols.get(user.Patrol_ID);

  const onPhoto = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم الصورة كبير (الحد 8 ميجابايت)");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      const fresh = db.users.get(user.ID) || { ...user };
      fresh.Profile_Photo = url;
      db.users.upsert(fresh);
      // Instantly refresh local state + localStorage so header avatar updates.
      setUser(fresh);
      refresh();
      toast.success("تم تحديث الصورة الشخصية");
    } catch (e) {
      toast.error("فشل رفع الصورة: " + (e instanceof Error ? e.message : "خطأ"));
    } finally {
      setUploading(false);
    }
  };

  const savePassword = () => {
    if (pw.next.length < 6) return toast.error("كلمة المرور قصيرة (6 أحرف على الأقل)");
    if (pw.next !== pw.confirm) return toast.error("تأكيد كلمة المرور غير مطابق");
    const fresh = db.users.get(user.ID);
    if (!fresh) return toast.error("تعذر العثور على المستخدم");
    fresh.Password = pw.next;
    db.users.upsert(fresh);
    setPw({ next: "", confirm: "" });
    refresh();
    toast.success("تم تحديث كلمة المرور");
  };

  // sidebar items navigate back to dashboard/admin
  const items = isLeader
    ? [
        { key: "back_admin", label: "لوحة التحكم", icon: "🛠️", onClick: () => nav({ to: "/admin" }) },
        { key: "back_dashboard", label: "الرئيسية", icon: "🏠", onClick: () => nav({ to: "/dashboard" }) },
      ]
    : [
        { key: "back_dashboard", label: "الرئيسية", icon: "🏠", onClick: () => nav({ to: "/dashboard" }) },
      ];

  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between gap-3 py-2 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right break-all">{value || "—"}</span>
    </div>
  );

  return (
    <AppShell items={items} activeKey="__profile__">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="text-2xl">👤</span>
          <div>
            <h1 className="text-2xl font-bold">الملف الشخصي</h1>
            <p className="text-xs text-muted-foreground">بياناتك مقفلة للقراءة فقط — يمكنك تحديث الصورة وكلمة المرور</p>
          </div>
        </div>

        <div className="grid md:grid-cols-[260px_1fr] gap-4">
          {/* Avatar card */}
          <div className="rounded-2xl border bg-card p-4 text-center">
            <div className="relative inline-block">
              <div className="h-32 w-32 rounded-full bg-secondary overflow-hidden ring-4 ring-gold/40 mx-auto grid place-items-center text-4xl">
                {user.Profile_Photo
                  ? <img src={user.Profile_Photo} alt={fullName(user)} className="h-full w-full object-cover" />
                  : <span>{user.First_Name?.[0] || "?"}</span>}
              </div>
              {uploading && (
                <div className="absolute inset-0 grid place-items-center rounded-full bg-black/50">
                  <div className="h-8 w-8 rounded-full border-4 border-white/40 border-t-white animate-spin" />
                </div>
              )}
            </div>
            <div className="mt-3 font-bold">{fullName(user)}</div>
            <div className="text-xs text-muted-foreground">{user.Rank || "—"}</div>
            <label className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90 disabled:opacity-50">
              {uploading ? "جاري الرفع..." : "تحديث الصورة"}
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); }}
                className="hidden"
              />
            </label>
          </div>

          {/* Read-only data */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">بياناتي الأساسية</h2>
              <span className="text-xs rounded-full bg-secondary px-2 py-0.5">🔒 للقراءة فقط</span>
            </div>
            <Row label="الاسم الأول" value={user.First_Name} />
            <Row label="اسم الأب" value={user.Father_Name} />
            <Row label="اسم العائلة" value={user.Last_Name} />
            <Row label="الرقم القومي" value={user.National_ID} />
            <Row label="تاريخ الميلاد" value={user.Birth_Date} />
            <Row label="المرحلة الدراسية" value={user.Education_Stage} />
            <Row label="الفرقة" value={team?.Team_Name} />
            <Row label="الطليعة" value={patrol?.Patrol_Name} />
            <Row label="الرتبة" value={user.Rank} />
            <Row label="الدور" value={user.Role === "Leader" ? "قائد" : "عضو"} />
          </div>
        </div>

        {/* Password */}
        <div className="mt-4 rounded-2xl border bg-card p-4 max-w-md">
          <h2 className="font-bold mb-3">تغيير كلمة المرور</h2>
          <div className="space-y-2">
            <input
              type="password"
              placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="تأكيد كلمة المرور"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={savePassword}
              className="w-full rounded-lg bg-primary py-2 text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              حفظ كلمة المرور الجديدة
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
