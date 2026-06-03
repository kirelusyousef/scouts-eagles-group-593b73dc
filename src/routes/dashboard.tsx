import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth";
import { db, fullName, hasScreen, type Notice, type User } from "@/lib/db";
import { AppShell, type NavItem } from "@/components/AppShell";
import { PatrolCompetition } from "@/components/PatrolCompetition";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

type Tab = "id" | "attendance" | "badges_my" | "tasks_my" | "finance_my";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "id", label: "بطاقتي", icon: "🪪" },
  { key: "attendance", label: "حضوري", icon: "📅" },
  { key: "badges_my", label: "شاراتي", icon: "🏅" },
  { key: "tasks_my", label: "مهامي", icon: "✔️" },
  { key: "finance_my", label: "اشتراكاتي", icon: "💰" },
];

function Dashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [, force] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, [user, loading, nav]);

  const visibleTabs = useMemo(() => TABS.filter((t) => hasScreen(user, t.key)), [user]);
  const [tab, setTab] = useState<Tab>("id");
  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.some((t) => t.key === tab)) setTab(visibleTabs[0].key);
  }, [visibleTabs, tab]);

  const [popup, setPopup] = useState<Notice | null>(null);
  useEffect(() => {
    if (!user) return;
    const n = db.notices.all().find((x) =>
      (x.Team_IDs.length === 0 || (user.Team_ID && x.Team_IDs.includes(user.Team_ID))) &&
      !x.Read_By.includes(user.ID)
    );
    if (n) setPopup(n);
  }, [user]);

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

  const markRead = (n: Notice) => {
    const all = db.notices.all();
    const i = all.findIndex((x) => x.Notice_ID === n.Notice_ID);
    if (i >= 0) { all[i].Read_By = [...all[i].Read_By, user.ID]; db.notices.save(all); }
    setPopup(null);
  };

  const items: NavItem[] = visibleTabs.map((t) => ({
    key: t.key,
    label: t.label,
    icon: t.icon,
    onClick: () => setTab(t.key),
  }));

  return (
    <AppShell items={items} activeKey={tab}>
      <div className="mx-auto max-w-5xl space-y-5">
        <PatrolCompetition />

        {tab === "id" && <DigitalID userId={user.ID} teamName={team?.Team_Name} patrolName={patrol?.Patrol_Name} />}
        {tab === "attendance" && <MyAttendance userId={user.ID} />}
        {tab === "badges_my" && <MyBadges userId={user.ID} />}
        {tab === "tasks_my" && <MyTasks userId={user.ID} patrolId={user.Patrol_ID} />}
        {tab === "finance_my" && <MyFinance userId={user.ID} teamId={user.Team_ID} />}
      </div>

      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
            <div className="inline-block rounded-full bg-gold/20 px-3 py-1 text-xs text-gold-foreground mb-3">📢 إعلان</div>
            <h3 className="text-xl font-bold mb-2">{popup.Title}</h3>
            <p className="text-muted-foreground mb-6 whitespace-pre-wrap">{popup.Body}</p>
            <button onClick={() => markRead(popup)} className="w-full rounded-lg bg-primary py-2.5 text-primary-foreground font-medium">
              تم القراءة
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}


function DigitalID({ userId, teamName, patrolName }: { userId: string; teamName?: string; patrolName?: string }) {
  const user = db.users.get(userId);
  if (!user) return null;
  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
        <div className="p-5 flex items-center justify-between border-b border-white/20">
          <div className="text-xs opacity-80">{db.appSettings.latest().Group_Name}</div>
          <div className="text-xs font-bold tracking-wider">SCOUT ID</div>
        </div>
        <div className="p-5 flex gap-4">
          <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl overflow-hidden">
            {user.Profile_Photo ? <img src={user.Profile_Photo} alt="" className="h-full w-full object-cover" /> : user.First_Name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate">{fullName(user)}</div>
            <div className="text-sm opacity-90 mt-1">{user.Rank}</div>
            {teamName && <div className="text-xs opacity-75 mt-2">الفرقة: {teamName}</div>}
            {patrolName && <div className="text-xs opacity-75">الطليعة: {patrolName}</div>}
          </div>
        </div>
        <div className="bg-white p-5 flex flex-col items-center">
          <QRCodeSVG value={user.ID} size={180} level="H" />
          <div className="mt-3 text-xs text-gray-600 font-mono">{user.ID}</div>
        </div>
      </div>
    </div>
  );
}

function MyAttendance({ userId }: { userId: string }) {
  const records = db.attendance.all().filter((r) => r.User_ID === userId).sort((a, b) => b.Date.localeCompare(a.Date));
  const stats = useMemo(() => {
    const considered = records.filter((r) => r.Status !== "عذر");
    const present = records.filter((r) => r.Status === "حاضر").length;
    return { total: considered.length, present, pct: considered.length ? Math.round((present / considered.length) * 100) : 0 };
  }, [records]);
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="نسبة الالتزام" value={`${stats.pct}%`} tone={stats.pct >= 85 ? "success" : stats.pct >= 60 ? "warning" : "destructive"} />
        <Stat label="أيام الحضور" value={stats.present} />
        <Stat label="إجمالي" value={records.length} />
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {records.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">لا يوجد سجل حضور بعد</div>}
        {records.map((r) => (
          <div key={r.Attendance_ID} className="flex items-center justify-between p-3">
            <div className="text-sm">
              <div>{r.Date}</div>
              <div className="text-xs text-muted-foreground">{r.Activity_Type}</div>
            </div>
            <StatusBadge status={r.Status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MyBadges({ userId }: { userId: string }) {
  const badges = db.badges.all().filter((b) => b.User_ID === userId);
  const [name, setName] = useState("");
  const request = () => {
    if (!name.trim()) return;
    db.badges.save([...db.badges.all(), {
      Badge_ID: crypto.randomUUID(), User_ID: userId, Name: name,
      Status: "Requested", Date: new Date().toISOString(),
    }]);
    setName(""); toast.success("تم إرسال طلب الاختبار");
  };
  return (
    <div>
      <div className="rounded-xl border bg-card p-4 mb-4">
        <div className="text-sm font-medium mb-2">طلب اختبار شارة جديدة</div>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: الإسعافات الأولية"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
          <button onClick={request} className="rounded-lg bg-primary px-4 text-primary-foreground text-sm font-medium">طلب</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {badges.length === 0 && <div className="col-span-full text-center text-muted-foreground text-sm py-8">لا توجد شارات بعد</div>}
        {badges.map((b) => (
          <div key={b.Badge_ID} className={`rounded-xl border p-4 text-center ${b.Status === "Granted" ? "bg-gold/10 border-gold" : "bg-card"}`}>
            <div className={`text-4xl mb-2 ${b.Status === "Granted" ? "" : "grayscale opacity-40"}`}>🏅</div>
            <div className="text-sm font-medium">{b.Name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {b.Status === "Granted" ? "تم المنح" : b.Status === "Requested" ? "بانتظار الاختبار" : "مرفوض"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyTasks({ userId, patrolId }: { userId: string; patrolId?: string }) {
  const tasks = db.tasks.all().filter((t) => t.Patrol_ID === patrolId);
  const toggle = (id: string) => {
    const all = db.tasks.all();
    const i = all.findIndex((t) => t.Task_ID === id);
    if (i < 0) return;
    const done = all[i].Done_By.includes(userId);
    all[i].Done_By = done ? all[i].Done_By.filter((x) => x !== userId) : [...all[i].Done_By, userId];
    db.tasks.save(all);
  };
  return (
    <div className="space-y-3">
      {tasks.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">لا توجد مهام لطليعتك</div>}
      {tasks.map((t) => {
        const done = t.Done_By.includes(userId);
        return (
          <div key={t.Task_ID} className="rounded-xl border bg-card p-4 flex items-start gap-3">
            <button onClick={() => toggle(t.Task_ID)}
              className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center ${done ? "bg-success border-success text-success-foreground" : "border-border"}`}>
              {done && "✓"}
            </button>
            <div className="flex-1">
              <div className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{t.Title}</div>
              {t.Description && <div className="text-sm text-muted-foreground mt-1">{t.Description}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MyFinance({ userId, teamId }: { userId: string; teamId?: string }) {
  const user = db.users.get(userId);
  const patrolId = user?.Patrol_ID || "";
  const all = db.finance.all().filter((f) =>
    (f.Target_Type === "User" && f.User_ID === userId) ||
    (f.Target_Type === "Team" && f.Target_ID === teamId && (!f.User_ID || f.User_ID === userId)) ||
    (f.Target_Type === "Patrol" && f.Target_ID === patrolId && (!f.User_ID || f.User_ID === userId))
  );
  const label = (t: string) => t === "Team" ? "اشتراك الفرقة" : t === "Patrol" ? "اشتراك الطليعة" : "اشتراك فردي";
  return (
    <div className="space-y-3">
      {all.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">لا يوجد سجل مالي</div>}
      {all.map((f) => (
        <div key={f.Transaction_ID} className="rounded-xl border bg-card p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">{f.Title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label(f.Target_Type)} · {f.Date}</div>
          </div>
          <div className="text-left">
            <div className="font-bold">{f.Amount} ج</div>
            <PaymentBadge status={f.Payment_Status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MyProfile({ user }: { user: User }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  const team = db.teams.get(user.Team_ID);
  const patrol = db.patrols.get(user.Patrol_ID);

  const savePw = () => {
    if (pw.current !== user.Password) return toast.error("كلمة المرور الحالية غير صحيحة");
    if (pw.next.length < 6) return toast.error("كلمة المرور الجديدة قصيرة (6 أحرف على الأقل)");
    if (pw.next !== pw.confirm) return toast.error("تأكيد كلمة المرور غير مطابق");
    const fresh = db.users.get(user.ID); if (!fresh) return;
    fresh.Password = pw.next;
    db.users.upsert(fresh);
    setPw({ current: "", next: "", confirm: "" });
    toast.success("تم تحديث كلمة المرور");
  };

  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between gap-3 py-1.5 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right break-all">{value || "—"}</span>
    </div>
  );

  const Doc = ({ label, url }: { label: string; url: string }) => (
    <div className="rounded-lg border bg-card p-2 text-center">
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      {url ? (
        <button onClick={() => setPreview(url)} className="block w-full">
          <img src={url} alt={label} className="h-28 w-full object-cover rounded" />
        </button>
      ) : (
        <div className="h-28 flex items-center justify-center text-xs text-muted-foreground">لا يوجد</div>
      )}
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-bold mb-3">بياناتي</h3>
        <Row label="الاسم" value={fullName(user)} />
        <Row label="اسم الجد" value={user.Grandfather_Name} />
        <Row label="البريد" value={user.Email} />
        <Row label="الهاتف" value={`${user.Phone} ${user.Has_WhatsApp ? "· واتساب" : ""}`} />
        <Row label="الرقم القومي" value={user.National_ID} />
        <Row label="تاريخ الميلاد" value={user.Birth_Date} />
        <Row label="أب الاعتراف" value={user.Confession_Father} />
        <Row label="المرحلة" value={user.Education_Stage} />
        <Row label="ولي الأمر" value={user.Parent_Phone} />
        <Row label="الفرقة" value={team?.Team_Name} />
        <Row label="الطليعة" value={patrol?.Patrol_Name} />
        <Row label="الرتبة" value={user.Rank} />
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-bold mb-3">المستندات</h3>
          <div className="grid grid-cols-2 gap-2">
            <Doc label="صورة شخصية" url={user.Profile_Photo} />
            {user.Birth_Certificate
              ? <Doc label="شهادة الميلاد" url={user.Birth_Certificate} />
              : <>
                  <Doc label="البطاقة (الوجه)" url={user.National_ID_Front} />
                  <Doc label="البطاقة (الظهر)" url={user.National_ID_Back} />
                </>}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-bold mb-3">تغيير كلمة المرور</h3>
          <div className="space-y-2">
            <input type="password" placeholder="كلمة المرور الحالية" value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            <input type="password" placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)" value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            <input type="password" placeholder="تأكيد كلمة المرور" value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            <button onClick={savePw} className="w-full rounded-lg bg-primary py-2 text-primary-foreground text-sm font-medium">حفظ</button>
          </div>
        </div>
      </div>

      {preview && (
        <div onClick={() => setPreview(null)} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out">
          <img src={preview} alt="معاينة" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: any; tone?: "success" | "warning" | "destructive" }) {
  const c = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${c}`}>{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "حاضر": "bg-success/15 text-success",
    "عذر": "bg-warning/20 text-warning-foreground",
    "غائب": "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>{status}</span>;
}

export function PaymentBadge({ status }: { status: string }) {
  const paid = status === "تم الدفع";
  const c = paid ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c}`}>{status || "غير مدفوع"}</span>;
}
