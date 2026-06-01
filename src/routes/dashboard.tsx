import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth";
import { db, fullName, type Notice } from "@/lib/db";
import { TopBar } from "@/components/TopBar";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"id" | "attendance" | "badges" | "tasks" | "finance">("id");
  const [, force] = useState(0);

  useEffect(() => {
    if (!user) { nav({ to: "/login" }); return; }
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, [user, nav]);

  const [popup, setPopup] = useState<Notice | null>(null);
  useEffect(() => {
    if (!user) return;
    const n = db.notices.all().find((x) =>
      (x.Team_IDs.length === 0 || (user.Team_ID && x.Team_IDs.includes(user.Team_ID))) &&
      !x.Read_By.includes(user.ID)
    );
    if (n) setPopup(n);
  }, [user]);

  if (!user) return null;

  const team = db.teams.get(user.Team_ID);
  const patrol = db.patrols.get(user.Patrol_ID);

  const markRead = (n: Notice) => {
    const all = db.notices.all();
    const i = all.findIndex((x) => x.Notice_ID === n.Notice_ID);
    if (i >= 0) { all[i].Read_By = [...all[i].Read_By, user.ID]; db.notices.save(all); }
    setPopup(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-2 border-b">
          {[
            ["id", "بطاقتي"], ["attendance", "حضوري"], ["badges", "شاراتي"],
            ["tasks", "مهامي"], ["finance", "اشتراكاتي"],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as typeof tab)}
              className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm transition ${
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>{l}</button>
          ))}
        </div>

        {tab === "id" && <DigitalID userId={user.ID} teamName={team?.Team_Name} patrolName={patrol?.Patrol_Name} />}
        {tab === "attendance" && <MyAttendance userId={user.ID} />}
        {tab === "badges" && <MyBadges userId={user.ID} />}
        {tab === "tasks" && <MyTasks userId={user.ID} patrolId={user.Patrol_ID} />}
        {tab === "finance" && <MyFinance userId={user.ID} teamId={user.Team_ID} />}
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
    </div>
  );
}

function DigitalID({ userId, teamName, patrolName }: { userId: string; teamName?: string; patrolName?: string }) {
  const user = db.users.get(userId);
  if (!user) return null;
  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
        <div className="p-5 flex items-center justify-between border-b border-white/20">
          <div className="text-xs opacity-80">{db.settings.get().Group_Name}</div>
          <div className="text-xs font-bold tracking-wider">SCOUT ID</div>
        </div>
        <div className="p-5 flex gap-4">
          <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl">
            {user.First_Name[0]}
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
    // 'عذر' does not lower the score → exclude from denominator
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
  const all = db.finance.all().filter((f) =>
    f.User_ID === userId ||
    (f.Target_Type === "Global" && !f.User_ID) ||
    (f.Target_Type === "Team" && f.Target_ID === teamId && !f.User_ID)
  );
  return (
    <div className="space-y-3">
      {all.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">لا يوجد سجل مالي</div>}
      {all.map((f) => (
        <div key={f.Transaction_ID} className="rounded-xl border bg-card p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">{f.Title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{f.Target_Type === "Global" ? "اشتراك عام" : "اشتراك الفرقة"} · {f.Date}</div>
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
  const map: Record<string, [string, string]> = {
    Paid: ["مدفوع", "bg-success/15 text-success"],
    Partial: ["جزئي", "bg-warning/20 text-warning-foreground"],
    Unpaid: ["غير مدفوع", "bg-destructive/15 text-destructive"],
  };
  const [l, c] = map[status] ?? [status, ""];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c}`}>{l}</span>;
}
