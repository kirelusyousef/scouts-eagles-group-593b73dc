import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/lib/auth";
import { db, uid, type AttendanceStatus, type PaymentStatus, type User } from "@/lib/db";
import { TopBar } from "@/components/TopBar";
import { QRScanner } from "@/components/QRScanner";
import { Stat, StatusBadge, PaymentBadge } from "./dashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: Admin });

type Tab =
  | "overview" | "approvals" | "scanner" | "manual" | "reports"
  | "teams" | "finance" | "badges" | "notices" | "tasks"
  | "leaderboard" | "notes" | "settings";

const TABS: [Tab, string, string][] = [
  ["overview", "نظرة عامة", "📊"],
  ["approvals", "طلبات الانضمام", "✅"],
  ["scanner", "ماسح QR", "📷"],
  ["manual", "حضور يدوي", "📝"],
  ["reports", "تقارير الحضور", "📈"],
  ["teams", "الفرق والطلائع", "👥"],
  ["finance", "الإدارة المالية", "💰"],
  ["badges", "الشارات", "🏅"],
  ["notices", "لوحة الإعلانات", "📢"],
  ["tasks", "المهام", "✔️"],
  ["leaderboard", "ترتيب الطلائع", "🏆"],
  ["notes", "ملاحظات سرية", "🔒"],
  ["settings", "الإعدادات", "⚙️"],
];

function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [, force] = useState(0);

  useEffect(() => {
    if (!user) { nav({ to: "/login" }); return; }
    if (user.role !== "admin" && user.role !== "leader") nav({ to: "/dashboard" });
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, [user, nav]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-7xl px-4 py-6 grid md:grid-cols-[240px_1fr] gap-6">
        <aside className="md:sticky md:top-20 md:self-start">
          <div className="rounded-xl border bg-card p-2 space-y-0.5 md:max-h-[calc(100vh-7rem)] overflow-auto">
            {TABS.map(([k, l, ic]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`w-full text-right rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 transition ${
                  tab === k ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}>
                <span>{ic}</span>{l}
              </button>
            ))}
          </div>
        </aside>
        <main className="min-w-0">
          {tab === "overview" && <Overview />}
          {tab === "approvals" && <Approvals />}
          {tab === "scanner" && <QRScanner adminName={`${user.firstName} ${user.lastName}`} />}
          {tab === "manual" && <ManualAttendance />}
          {tab === "reports" && <Reports />}
          {tab === "teams" && <Teams adminName={`${user.firstName} ${user.lastName}`} />}
          {tab === "finance" && <Finance />}
          {tab === "badges" && <BadgesAdmin />}
          {tab === "notices" && <Notices />}
          {tab === "tasks" && <TasksAdmin />}
          {tab === "leaderboard" && <Leaderboard />}
          {tab === "notes" && <Notes author={`${user.firstName} ${user.lastName}`} canEdit={user.role === "admin"} />}
          {tab === "settings" && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}

// ---------- Sections ----------

function Overview() {
  const users = db.users.all();
  const pending = users.filter((u) => u.status === "pending").length;
  const today = new Date().toISOString().slice(0, 10);
  const present = db.attendance.all().filter((a) => a.date === today && a.status === "present").length;
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">لوحة التحكم</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="إجمالي الأعضاء" value={users.filter((u) => u.status === "approved").length} />
        <Stat label="طلبات الانضمام" value={pending} tone={pending > 0 ? "warning" : undefined} />
        <Stat label="الحضور اليوم" value={present} tone="success" />
        <Stat label="الفرق" value={db.teams.all().length} />
      </div>
      <div className="mt-6 rounded-xl border bg-card p-4">
        <h3 className="font-medium mb-3">آخر الأنشطة</h3>
        <div className="space-y-2 text-sm">
          {db.history.all().slice(0, 8).map((h) => {
            const u = db.users.get(h.userId);
            return (
              <div key={h.id} className="flex justify-between border-b py-2 last:border-0">
                <span>{u?.firstName} {u?.lastName} — {h.action}</span>
                <span className="text-xs text-muted-foreground">بواسطة {h.by}</span>
              </div>
            );
          })}
          {db.history.all().length === 0 && <div className="text-muted-foreground">لا يوجد سجل بعد</div>}
        </div>
      </div>
    </div>
  );
}

function Approvals() {
  const pending = db.users.all().filter((u) => u.status === "pending");
  const teams = db.teams.all();
  const approve = (u: User, teamId: string, patrolId: string) => {
    u.status = "approved"; u.teamId = teamId; u.patrolId = patrolId;
    db.users.upsert(u);
    db.history.log(u.id, "تمت الموافقة على العضوية", "النظام");
    toast.success("تمت الموافقة");
  };
  const reject = (u: User) => { u.status = "rejected"; db.users.upsert(u); toast.success("تم الرفض"); };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">طلبات الانضمام ({pending.length})</h2>
      <div className="space-y-3">
        {pending.length === 0 && <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">لا توجد طلبات</div>}
        {pending.map((u) => <PendingCard key={u.id} u={u} teams={teams} onApprove={approve} onReject={reject} />)}
      </div>
    </div>
  );
}
function PendingCard({ u, teams, onApprove, onReject }: any) {
  const [team, setTeam] = useState(teams[0]?.id ?? "");
  const patrols = db.patrols.byTeam(team);
  const [patrol, setPatrol] = useState(patrols[0]?.id ?? "");
  useEffect(() => { setPatrol(db.patrols.byTeam(team)[0]?.id ?? ""); }, [team]);
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex justify-between flex-wrap gap-3 mb-3">
        <div>
          <div className="font-bold">{u.firstName} {u.fatherName} {u.lastName}</div>
          <div className="text-xs text-muted-foreground mt-1">{u.email} · {u.phone} · {u.educationStage}</div>
          <div className="text-xs text-muted-foreground">رقم قومي: {u.nationalId} · أب اعتراف: {u.confessionFather}</div>
          {u.parentPhone && <div className="text-xs text-muted-foreground">ولي الأمر: {u.parentPhone}</div>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs block mb-1">الفرقة</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className="rounded-lg border bg-background px-2 py-1.5 text-sm">
            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1">الطليعة</label>
          <select value={patrol} onChange={(e) => setPatrol(e.target.value)} className="rounded-lg border bg-background px-2 py-1.5 text-sm">
            {patrols.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={() => onApprove(u, team, patrol)} className="rounded-lg bg-success px-3 py-1.5 text-success-foreground text-sm font-medium">موافقة</button>
        <button onClick={() => onReject(u)} className="rounded-lg bg-destructive px-3 py-1.5 text-destructive-foreground text-sm font-medium">رفض</button>
      </div>
    </div>
  );
}

function ManualAttendance() {
  const teams = db.teams.all();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const patrols = db.patrols.byTeam(teamId);
  const [patrolId, setPatrolId] = useState(patrols[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  useEffect(() => { setPatrolId(db.patrols.byTeam(teamId)[0]?.id ?? ""); }, [teamId]);
  const members = db.users.all().filter((u) => u.status === "approved" && u.patrolId === patrolId);
  const att = db.attendance.all();
  const set = (uid: string, status: AttendanceStatus) => { db.attendance.mark(uid, date, status); toast.success("تم التحديث"); };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">الحضور اليدوي</h2>
      <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={patrolId} onChange={(e) => setPatrolId(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          {patrols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm" />
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {members.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">لا يوجد أعضاء</div>}
        {members.map((m) => {
          const cur = att.find((a) => a.userId === m.id && a.date === date)?.status;
          return (
            <div key={m.id} className="flex items-center justify-between p-3 gap-2">
              <div className="font-medium text-sm">{m.firstName} {m.lastName}</div>
              <div className="flex gap-1">
                {(["present", "excused", "absent"] as AttendanceStatus[]).map((s) => (
                  <button key={s} onClick={() => set(m.id, s)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      cur === s
                        ? s === "present" ? "bg-success text-success-foreground"
                          : s === "excused" ? "bg-warning text-warning-foreground"
                          : "bg-destructive text-destructive-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                    {s === "present" ? "حاضر" : s === "excused" ? "عذر" : "غائب"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Reports() {
  const teams = db.teams.all();
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [teamId, setTeamId] = useState(""); const [patrolId, setPatrolId] = useState("");
  const patrols = teamId ? db.patrols.byTeam(teamId) : [];

  const rows = useMemo(() => {
    const users = db.users.all().filter((u) =>
      u.status === "approved" &&
      (!teamId || u.teamId === teamId) &&
      (!patrolId || u.patrolId === patrolId)
    );
    return users.map((u) => {
      const recs = db.attendance.all().filter((a) =>
        a.userId === u.id && (!from || a.date >= from) && (!to || a.date <= to)
      );
      const considered = recs.filter((r) => r.status !== "excused");
      const present = recs.filter((r) => r.status === "present").length;
      const pct = considered.length ? Math.round((present / considered.length) * 100) : 0;
      return {
        name: `${u.firstName} ${u.lastName}`,
        team: db.teams.all().find((t) => t.id === u.teamId)?.name ?? "—",
        patrol: db.patrols.all().find((p) => p.id === u.patrolId)?.name ?? "—",
        present, excused: recs.filter((r) => r.status === "excused").length,
        absent: recs.filter((r) => r.status === "absent").length,
        pct,
      };
    });
  }, [from, to, teamId, patrolId]);

  const exportXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      الاسم: r.name, الفرقة: r.team, الطليعة: r.patrol,
      حضور: r.present, عذر: r.excused, غياب: r.absent, "النسبة%": r.pct,
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance-report.xlsx");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">تقارير الحضور</h2>
      <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border bg-background px-2 py-2 text-sm" placeholder="من" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border bg-background px-2 py-2 text-sm" />
        <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setPatrolId(""); }} className="rounded-lg border bg-background px-2 py-2 text-sm">
          <option value="">كل الفرق</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={patrolId} onChange={(e) => setPatrolId(e.target.value)} className="rounded-lg border bg-background px-2 py-2 text-sm">
          <option value="">كل الطلائع</option>{patrols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={exportXlsx} className="flex-1 rounded-lg bg-gold px-3 py-2 text-gold-foreground text-sm font-medium">تصدير Excel</button>
          <button onClick={() => window.print()} className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium">طباعة</button>
        </div>
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr><th className="p-2 text-right">الاسم</th><th className="p-2">الفرقة</th><th className="p-2">الطليعة</th>
              <th className="p-2">حضور</th><th className="p-2">عذر</th><th className="p-2">غياب</th><th className="p-2">النسبة</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="p-2 text-right font-medium">{r.name}</td>
                <td className="p-2 text-center">{r.team}</td>
                <td className="p-2 text-center">{r.patrol}</td>
                <td className="p-2 text-center text-success">{r.present}</td>
                <td className="p-2 text-center text-warning">{r.excused}</td>
                <td className="p-2 text-center text-destructive">{r.absent}</td>
                <td className="p-2 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    r.pct >= 85 ? "bg-success/20 text-success" :
                    r.pct >= 60 ? "bg-warning/20 text-warning-foreground" :
                    "bg-destructive/20 text-destructive"
                  }`}>{r.pct}%</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد بيانات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Teams({ adminName }: { adminName: string }) {
  const teams = db.teams.all();
  const patrols = db.patrols.all();
  const members = db.users.all().filter((u) => u.status === "approved");
  const [newTeam, setNewTeam] = useState("");
  const [newPatrol, setNewPatrol] = useState({ name: "", teamId: teams[0]?.id ?? "" });

  const addTeam = () => {
    if (!newTeam.trim()) return;
    db.teams.save([...teams, { id: uid(), name: newTeam }]);
    setNewTeam(""); toast.success("تمت إضافة الفرقة");
  };
  const addPatrol = () => {
    if (!newPatrol.name.trim()) return;
    db.patrols.save([...patrols, { id: uid(), name: newPatrol.name, teamId: newPatrol.teamId }]);
    setNewPatrol({ name: "", teamId: newPatrol.teamId }); toast.success("تمت إضافة الطليعة");
  };
  const move = (u: User, teamId: string, patrolId: string) => {
    const old = `${db.teams.all().find((t) => t.id === u.teamId)?.name ?? "—"}/${db.patrols.all().find((p) => p.id === u.patrolId)?.name ?? "—"}`;
    const nw = `${db.teams.all().find((t) => t.id === teamId)?.name}/${db.patrols.all().find((p) => p.id === patrolId)?.name}`;
    u.teamId = teamId; u.patrolId = patrolId; db.users.upsert(u);
    db.history.log(u.id, `نقل من ${old} إلى ${nw}`, adminName);
    toast.success("تم النقل");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">الفرق والطلائع</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm font-medium mb-2">إضافة فرقة جديدة</div>
          <div className="flex gap-2">
            <input value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="اسم الفرقة"
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
            <button onClick={addTeam} className="rounded-lg bg-primary px-4 text-primary-foreground text-sm">إضافة</button>
          </div>
          <div className="mt-3 space-y-1">
            {teams.map((t) => <div key={t.id} className="rounded bg-secondary p-2 text-sm flex justify-between">
              <span>{t.name}</span>
              <span className="text-xs text-muted-foreground">{patrols.filter((p) => p.teamId === t.id).length} طليعة</span>
            </div>)}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm font-medium mb-2">إضافة طليعة</div>
          <div className="flex gap-2">
            <input value={newPatrol.name} onChange={(e) => setNewPatrol({ ...newPatrol, name: e.target.value })} placeholder="اسم الطليعة"
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
            <select value={newPatrol.teamId} onChange={(e) => setNewPatrol({ ...newPatrol, teamId: e.target.value })}
              className="rounded-lg border bg-background px-2 text-sm">
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button onClick={addPatrol} className="rounded-lg bg-primary px-4 text-primary-foreground text-sm">إضافة</button>
          </div>
        </div>
      </div>
      <h3 className="font-bold mb-2">الأعضاء</h3>
      <div className="rounded-xl border bg-card divide-y">
        {members.map((u) => <MemberRow key={u.id} u={u} onMove={move} />)}
      </div>
      <h3 className="font-bold mt-6 mb-2">سجل النقل</h3>
      <div className="rounded-xl border bg-card divide-y max-h-64 overflow-auto">
        {db.history.all().slice(0, 30).map((h) => {
          const u = db.users.get(h.userId);
          return (
            <div key={h.id} className="p-2 text-xs flex justify-between gap-2">
              <span>{u?.firstName} {u?.lastName}: {h.action}</span>
              <span className="text-muted-foreground whitespace-nowrap">{new Date(h.timestamp).toLocaleString("ar-EG")} · {h.by}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function MemberRow({ u, onMove }: { u: User; onMove: (u: User, t: string, p: string) => void }) {
  const teams = db.teams.all();
  const [t, setT] = useState(u.teamId ?? teams[0]?.id ?? "");
  const patrols = db.patrols.byTeam(t);
  const [p, setP] = useState(u.patrolId ?? patrols[0]?.id ?? "");
  useEffect(() => { if (!db.patrols.byTeam(t).find((x) => x.id === p)) setP(db.patrols.byTeam(t)[0]?.id ?? ""); }, [t]);
  return (
    <div className="p-3 flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm font-medium">{u.firstName} {u.lastName} <span className="text-xs text-muted-foreground">— {u.rank}</span></div>
      <div className="flex gap-2 items-center">
        <select value={t} onChange={(e) => setT(e.target.value)} className="rounded border bg-background px-2 py-1 text-xs">
          {teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <select value={p} onChange={(e) => setP(e.target.value)} className="rounded border bg-background px-2 py-1 text-xs">
          {patrols.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <button onClick={() => onMove(u, t, p)} className="rounded bg-primary px-2 py-1 text-primary-foreground text-xs">نقل</button>
      </div>
    </div>
  );
}

function Finance() {
  const [scope, setScope] = useState<"team" | "global">("team");
  const teams = db.teams.all();
  const users = db.users.all().filter((u) => u.status === "approved");
  const [f, setF] = useState({ title: "", amount: 0, teamId: teams[0]?.id ?? "", userId: "", status: "unpaid" as PaymentStatus });
  const recs = db.finance.all().filter((x) => x.scope === scope);

  const add = () => {
    if (!f.title) return;
    db.finance.save([...db.finance.all(), {
      id: uid(), scope, title: f.title, amount: Number(f.amount), status: f.status,
      date: new Date().toISOString().slice(0, 10),
      teamId: scope === "team" ? f.teamId : undefined,
      userId: f.userId || "",
    }]);
    setF({ ...f, title: "", amount: 0 }); toast.success("تمت الإضافة");
  };
  const setStatus = (id: string, status: PaymentStatus) => {
    const all = db.finance.all();
    const i = all.findIndex((r) => r.id === id); if (i < 0) return;
    all[i].status = status; db.finance.save(all);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">الإدارة المالية</h2>
      <div className="flex gap-2 mb-4">
        {(["team", "global"] as const).map((s) => (
          <button key={s} onClick={() => setScope(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${scope === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            {s === "team" ? "ميزانية الفرق" : "الميزانية العامة"}
          </button>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-2 md:grid-cols-6 gap-2">
        <input placeholder="العنوان" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="rounded-lg border bg-background px-2 py-2 text-sm md:col-span-2" />
        <input placeholder="المبلغ" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} className="rounded-lg border bg-background px-2 py-2 text-sm" />
        {scope === "team" && (
          <select value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })} className="rounded-lg border bg-background px-2 py-2 text-sm">
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        <select value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} className="rounded-lg border bg-background px-2 py-2 text-sm">
          <option value="">(عام لكل الأعضاء)</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
        </select>
        <button onClick={add} className="rounded-lg bg-primary text-primary-foreground text-sm font-medium">إضافة</button>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {recs.map((r) => {
          const u = r.userId ? db.users.get(r.userId) : null;
          const t = r.teamId ? db.teams.all().find((x) => x.id === r.teamId) : null;
          return (
            <div key={r.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{r.title}</div>
                <div className="text-xs text-muted-foreground">{u ? `${u.firstName} ${u.lastName}` : "عام"}{t ? ` · ${t.name}` : ""} · {r.date}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-bold text-sm">{r.amount} ج</div>
                <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value as PaymentStatus)}
                  className="rounded border bg-background px-2 py-1 text-xs">
                  <option value="unpaid">غير مدفوع</option>
                  <option value="partial">جزئي</option>
                  <option value="paid">مدفوع</option>
                </select>
                <PaymentBadge status={r.status} />
              </div>
            </div>
          );
        })}
        {recs.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">لا توجد سجلات</div>}
      </div>
    </div>
  );
}

function BadgesAdmin() {
  const badges = db.badges.all();
  const setStatus = (id: string, status: "granted" | "rejected") => {
    const all = db.badges.all();
    const i = all.findIndex((b) => b.id === id);
    if (i < 0) return; all[i].status = status; db.badges.save(all);
    toast.success("تم التحديث");
  };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">الشارات</h2>
      <div className="rounded-xl border bg-card divide-y">
        {badges.map((b) => {
          const u = db.users.get(b.userId);
          return (
            <div key={b.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{u?.firstName} {u?.lastName}</div>
                <div className="text-xs text-muted-foreground">🏅 {b.name}</div>
              </div>
              <div className="flex gap-1 items-center">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  b.status === "granted" ? "bg-success/15 text-success" :
                  b.status === "rejected" ? "bg-destructive/15 text-destructive" :
                  "bg-warning/15 text-warning-foreground"
                }`}>
                  {b.status === "granted" ? "ممنوحة" : b.status === "rejected" ? "مرفوضة" : "بانتظار"}
                </span>
                {b.status === "requested" && <>
                  <button onClick={() => setStatus(b.id, "granted")} className="rounded bg-success px-2 py-1 text-success-foreground text-xs">منح</button>
                  <button onClick={() => setStatus(b.id, "rejected")} className="rounded bg-destructive px-2 py-1 text-destructive-foreground text-xs">رفض</button>
                </>}
              </div>
            </div>
          );
        })}
        {badges.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">لا توجد شارات</div>}
      </div>
    </div>
  );
}

function Notices() {
  const teams = db.teams.all();
  const [f, setF] = useState({ title: "", body: "", teamIds: [] as string[] });
  const all = db.notices.all();
  const post = () => {
    if (!f.title || !f.body) return;
    db.notices.save([{ id: uid(), ...f, readBy: [], createdAt: new Date().toISOString() }, ...all]);
    setF({ title: "", body: "", teamIds: [] }); toast.success("تم النشر");
  };
  const remove = (id: string) => { db.notices.save(all.filter((n) => n.id !== id)); };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">لوحة الإعلانات</h2>
      <div className="rounded-xl border bg-card p-4 mb-4 space-y-2">
        <input placeholder="العنوان" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        <textarea placeholder="نص الإعلان" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })}
          rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">استهداف:</span>
          {teams.map((t) => {
            const on = f.teamIds.includes(t.id);
            return (
              <button key={t.id} onClick={() =>
                setF({ ...f, teamIds: on ? f.teamIds.filter((x) => x !== t.id) : [...f.teamIds, t.id] })}
                className={`rounded-full px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {t.name}
              </button>
            );
          })}
          <span className="text-xs text-muted-foreground self-center">{f.teamIds.length === 0 && "(للجميع)"}</span>
        </div>
        <button onClick={post} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">نشر</button>
      </div>
      <div className="space-y-2">
        {all.map((n) => (
          <div key={n.id} className="rounded-xl border bg-card p-3">
            <div className="flex justify-between gap-2">
              <div className="font-bold">{n.title}</div>
              <button onClick={() => remove(n.id)} className="text-destructive text-xs">حذف</button>
            </div>
            <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</div>
            <div className="text-xs text-muted-foreground mt-2">قرأها {n.readBy.length} عضو</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksAdmin() {
  const patrols = db.patrols.all();
  const [f, setF] = useState({ title: "", description: "", patrolId: patrols[0]?.id ?? "" });
  const all = db.tasks.all();
  const add = () => {
    if (!f.title) return;
    db.tasks.save([{ id: uid(), ...f, doneBy: [], createdAt: new Date().toISOString() }, ...all]);
    setF({ ...f, title: "", description: "" }); toast.success("تمت إضافة المهمة");
  };
  const remove = (id: string) => { db.tasks.save(all.filter((t) => t.id !== id)); };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">المهام</h2>
      <div className="rounded-xl border bg-card p-4 mb-4 grid gap-2">
        <input placeholder="عنوان المهمة" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
          className="rounded-lg border bg-background px-3 py-2 text-sm" />
        <textarea placeholder="الوصف" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}
          className="rounded-lg border bg-background px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <select value={f.patrolId} onChange={(e) => setF({ ...f, patrolId: e.target.value })}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm">
            {patrols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={add} className="rounded-lg bg-primary px-4 text-primary-foreground text-sm">إضافة</button>
        </div>
      </div>
      <div className="space-y-2">
        {all.map((t) => {
          const p = patrols.find((x) => x.id === t.patrolId);
          const total = db.users.all().filter((u) => u.patrolId === t.patrolId && u.status === "approved").length;
          return (
            <div key={t.id} className="rounded-xl border bg-card p-3">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-bold">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{p?.name} · {t.doneBy.length}/{total} منجزة</div>
                  {t.description && <div className="text-sm mt-1">{t.description}</div>}
                </div>
                <button onClick={() => remove(t.id)} className="text-destructive text-xs self-start">حذف</button>
              </div>
            </div>
          );
        })}
        {all.length === 0 && <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">لا توجد مهام</div>}
      </div>
    </div>
  );
}

function Leaderboard() {
  const patrols = db.patrols.all();
  const users = db.users.all().filter((u) => u.status === "approved");
  const attendance = db.attendance.all();
  const badges = db.badges.all();
  const rows = patrols.map((p) => {
    const ids = users.filter((u) => u.patrolId === p.id).map((u) => u.id);
    const pres = attendance.filter((a) => ids.includes(a.userId) && a.status === "present").length;
    const grb = badges.filter((b) => ids.includes(b.userId) && b.status === "granted").length;
    const team = db.teams.all().find((t) => t.id === p.teamId)?.name ?? "";
    return { id: p.id, name: p.name, team, members: ids.length, points: pres * 5 + grb * 20 };
  }).sort((a, b) => b.points - a.points);
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">ترتيب الطلائع 🏆</h2>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className={`rounded-xl border p-4 flex items-center gap-4 ${
            i === 0 ? "bg-gradient-to-l from-gold/30 to-card border-gold" : "bg-card"
          }`}>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold ${
              i === 0 ? "bg-gold text-gold-foreground" : i === 1 ? "bg-secondary text-secondary-foreground" : i === 2 ? "bg-accent text-accent-foreground" : "bg-secondary"
            }`}>{i + 1}</div>
            <div className="flex-1">
              <div className="font-bold">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.team} · {r.members} عضو</div>
            </div>
            <div className="text-left">
              <div className="text-2xl font-black text-primary">{r.points}</div>
              <div className="text-xs text-muted-foreground">نقطة</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notes({ author, canEdit }: { author: string; canEdit: boolean }) {
  const users = db.users.all().filter((u) => u.status === "approved");
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [text, setText] = useState("");
  const list = db.notes.all().filter((n) => n.userId === userId);
  const add = () => {
    if (!text.trim()) return;
    db.notes.save([{ id: uid(), userId, note: text, author, timestamp: new Date().toISOString() }, ...db.notes.all()]);
    setText(""); toast.success("تم الحفظ");
  };
  if (!canEdit) return (
    <div className="rounded-xl border bg-card p-6 text-center">
      <div className="text-3xl mb-2">🔒</div>
      <div className="font-medium">قسم سري - متاح فقط للقائد العام</div>
    </div>
  );
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🔒 ملاحظات سرية للمربي</h2>
      <div className="rounded-xl border bg-card p-4 mb-4 space-y-2">
        <select value={userId} onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
          {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
        </select>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder="ملاحظة سلوكية / روحية / نفسية..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        <button onClick={add} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">حفظ</button>
      </div>
      <div className="space-y-2">
        {list.map((n) => (
          <div key={n.id} className="rounded-xl border bg-card p-3">
            <div className="text-sm whitespace-pre-wrap">{n.note}</div>
            <div className="text-xs text-muted-foreground mt-2">— {n.author} · {new Date(n.timestamp).toLocaleString("ar-EG")}</div>
          </div>
        ))}
        {list.length === 0 && <div className="text-center text-muted-foreground text-sm py-4">لا توجد ملاحظات</div>}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const s = db.settings.get();
  const [name, setName] = useState(s.groupName);
  const [logo, setLogo] = useState(s.logo);
  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setLogo(r.result as string);
    r.readAsDataURL(f);
  };
  const save = () => { db.settings.save({ groupName: name, logo }); toast.success("تم الحفظ"); };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">إعدادات المجموعة</h2>
      <div className="rounded-xl border bg-card p-4 max-w-lg space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">اسم المجموعة</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">شعار المجموعة</label>
          <div className="flex items-center gap-3">
            {logo ? <img src={logo} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-gold" /> :
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-2xl">⚜️</div>}
            <input type="file" accept="image/*" onChange={onLogo} className="text-sm" />
            {logo && <button onClick={() => setLogo("")} className="text-destructive text-xs">إزالة</button>}
          </div>
        </div>
        <button onClick={save} className="rounded-lg bg-primary px-6 py-2 text-primary-foreground font-medium">حفظ الإعدادات</button>
      </div>
    </div>
  );
}
