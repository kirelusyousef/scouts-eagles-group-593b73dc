import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/lib/auth";
import {
  db, uid, fullName,
  type AttendanceStatus, type PaymentStatus, type TargetType, type User,
} from "@/lib/db";
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
  const { user, isGeneralLeader } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [, force] = useState(0);

  useEffect(() => {
    if (!user) { nav({ to: "/login" }); return; }
    if (user.Role !== "Leader") nav({ to: "/dashboard" });
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, [user, nav]);

  if (!user) return null;
  const adminName = fullName(user);

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
          {tab === "scanner" && <QRScanner adminName={adminName} />}
          {tab === "manual" && <ManualAttendance adminName={adminName} />}
          {tab === "reports" && <Reports />}
          {tab === "teams" && <Teams adminName={adminName} />}
          {tab === "finance" && <Finance />}
          {tab === "badges" && <BadgesAdmin />}
          {tab === "notices" && <Notices />}
          {tab === "tasks" && <TasksAdmin />}
          {tab === "leaderboard" && <Leaderboard />}
          {tab === "notes" && <Notes author={adminName} canEdit={isGeneralLeader} />}
          {tab === "settings" && <SettingsPanel canEdit={isGeneralLeader} />}
        </main>
      </div>
    </div>
  );
}

// ---------- Sections ----------

function Overview() {
  const users = db.users.all();
  const pending = users.filter((u) => u.Status === "Pending").length;
  const today = new Date().toISOString().slice(0, 10);
  const present = db.attendance.all().filter((a) => a.Date === today && a.Status === "حاضر").length;
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">لوحة التحكم</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="إجمالي الأعضاء" value={users.filter((u) => u.Status === "Active").length} />
        <Stat label="طلبات الانضمام" value={pending} tone={pending > 0 ? "warning" : undefined} />
        <Stat label="الحضور اليوم" value={present} tone="success" />
        <Stat label="الفرق" value={db.teams.all().length} />
      </div>
      <div className="mt-6 rounded-xl border bg-card p-4">
        <h3 className="font-medium mb-3">آخر الأنشطة (History_Log)</h3>
        <div className="space-y-2 text-sm">
          {db.history.all().slice(0, 10).map((h) => {
            const u = db.users.get(h.User_ID);
            return (
              <div key={h.Log_ID} className="flex justify-between border-b py-2 last:border-0 gap-2">
                <span className="min-w-0 truncate">{u ? fullName(u) : "—"} · {h.Action_Type} — {h.Details}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(h.Timestamp).toLocaleString("ar-EG")} · {h.Admin_Name}</span>
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
  const pending = db.users.all().filter((u) => u.Status === "Pending");
  const teams = db.teams.all();
  const approve = (u: User, teamId: string, patrolId: string, role: "Member" | "Leader") => {
    u.Status = "Active"; u.Team_ID = teamId; u.Patrol_ID = patrolId; u.Role = role;
    db.users.upsert(u);
    db.history.log(u.ID, "موافقة على العضوية", `${role} في ${db.teams.get(teamId)?.Team_Name ?? ""}`, "النظام");
    toast.success("تمت الموافقة");
  };
  const reject = (u: User) => {
    db.users.remove(u.ID);
    db.history.log(u.ID, "رفض طلب الانضمام", "تم حذف السجل", "النظام");
    toast.success("تم الرفض");
  };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">طلبات الانضمام ({pending.length})</h2>
      <div className="space-y-3">
        {pending.length === 0 && <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">لا توجد طلبات</div>}
        {pending.map((u) => <PendingCard key={u.ID} u={u} teams={teams} onApprove={approve} onReject={reject} />)}
      </div>
    </div>
  );
}

function PendingCard({ u, teams, onApprove, onReject }: {
  u: User; teams: ReturnType<typeof db.teams.all>;
  onApprove: (u: User, t: string, p: string, r: "Member" | "Leader") => void;
  onReject: (u: User) => void;
}) {
  const [team, setTeam] = useState(teams[0]?.Team_ID ?? "");
  const patrols = db.patrols.byTeam(team);
  const [patrol, setPatrol] = useState(patrols[0]?.Patrol_ID ?? "");
  const [role, setRole] = useState<"Member" | "Leader">("Member");
  useEffect(() => { setPatrol(db.patrols.byTeam(team)[0]?.Patrol_ID ?? ""); }, [team]);
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3">
        <div className="font-bold">{fullName(u)}</div>
        <div className="text-xs text-muted-foreground mt-1">{u.Email} · {u.Phone} · {u.Education_Stage}</div>
        <div className="text-xs text-muted-foreground">رقم قومي: {u.National_ID} · أب اعتراف: {u.Confession_Father}</div>
        {u.Parent_Phone && <div className="text-xs text-muted-foreground">ولي الأمر: {u.Parent_Phone}</div>}
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs block mb-1">الفرقة</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className="rounded-lg border bg-background px-2 py-1.5 text-sm">
            {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1">الطليعة</label>
          <select value={patrol} onChange={(e) => setPatrol(e.target.value)} className="rounded-lg border bg-background px-2 py-1.5 text-sm">
            {patrols.map((p) => <option key={p.Patrol_ID} value={p.Patrol_ID}>{p.Patrol_Name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1">الدور</label>
          <select value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-lg border bg-background px-2 py-1.5 text-sm">
            <option value="Member">عضو</option>
            <option value="Leader">قائد</option>
          </select>
        </div>
        <button onClick={() => onApprove(u, team, patrol, role)} className="rounded-lg bg-success px-3 py-1.5 text-success-foreground text-sm font-medium">موافقة</button>
        <button onClick={() => onReject(u)} className="rounded-lg bg-destructive px-3 py-1.5 text-destructive-foreground text-sm font-medium">رفض</button>
      </div>
    </div>
  );
}

function ManualAttendance({ adminName }: { adminName: string }) {
  const teams = db.teams.all();
  const [teamId, setTeamId] = useState(teams[0]?.Team_ID ?? "");
  const patrols = db.patrols.byTeam(teamId);
  const [patrolId, setPatrolId] = useState(patrols[0]?.Patrol_ID ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [activity, setActivity] = useState("اجتماع أسبوعي");
  useEffect(() => { setPatrolId(db.patrols.byTeam(teamId)[0]?.Patrol_ID ?? ""); }, [teamId]);
  const members = db.users.all().filter((u) => u.Status === "Active" && u.Patrol_ID === patrolId);
  const att = db.attendance.all();
  const set = (userId: string, status: AttendanceStatus) => {
    db.attendance.mark(userId, date, status, activity);
    db.history.log(userId, "تسجيل حضور يدوي", `${status} — ${activity} — ${date}`, adminName);
    toast.success("تم التحديث");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">الحضور اليدوي</h2>
      <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
        </select>
        <select value={patrolId} onChange={(e) => setPatrolId(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          {patrols.map((p) => <option key={p.Patrol_ID} value={p.Patrol_ID}>{p.Patrol_Name}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm" />
        <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="نوع النشاط" className="rounded-lg border bg-background px-3 py-2 text-sm" />
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {members.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">لا يوجد أعضاء</div>}
        {members.map((m) => {
          const cur = att.find((a) => a.User_ID === m.ID && a.Date === date)?.Status;
          return (
            <div key={m.ID} className="flex items-center justify-between p-3 gap-2">
              <div className="font-medium text-sm">{fullName(m)}</div>
              <div className="flex gap-1">
                {(["حاضر", "عذر", "غائب"] as AttendanceStatus[]).map((s) => (
                  <button key={s} onClick={() => set(m.ID, s)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      cur === s
                        ? s === "حاضر" ? "bg-success text-success-foreground"
                          : s === "عذر" ? "bg-warning text-warning-foreground"
                          : "bg-destructive text-destructive-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}>{s}</button>
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
      u.Status === "Active" &&
      (!teamId || u.Team_ID === teamId) &&
      (!patrolId || u.Patrol_ID === patrolId)
    );
    return users.map((u) => {
      const recs = db.attendance.all().filter((a) =>
        a.User_ID === u.ID && (!from || a.Date >= from) && (!to || a.Date <= to)
      );
      // 'عذر' does not count against the score
      const considered = recs.filter((r) => r.Status !== "عذر");
      const present = recs.filter((r) => r.Status === "حاضر").length;
      const pct = considered.length ? Math.round((present / considered.length) * 100) : 0;
      return {
        name: fullName(u),
        team: db.teams.get(u.Team_ID)?.Team_Name ?? "—",
        patrol: db.patrols.get(u.Patrol_ID)?.Patrol_Name ?? "—",
        present,
        excused: recs.filter((r) => r.Status === "عذر").length,
        absent: recs.filter((r) => r.Status === "غائب").length,
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
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border bg-background px-2 py-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border bg-background px-2 py-2 text-sm" />
        <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setPatrolId(""); }} className="rounded-lg border bg-background px-2 py-2 text-sm">
          <option value="">كل الفرق</option>{teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
        </select>
        <select value={patrolId} onChange={(e) => setPatrolId(e.target.value)} className="rounded-lg border bg-background px-2 py-2 text-sm">
          <option value="">كل الطلائع</option>{patrols.map((p) => <option key={p.Patrol_ID} value={p.Patrol_ID}>{p.Patrol_Name}</option>)}
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
  const members = db.users.all().filter((u) => u.Status === "Active");
  const [newTeam, setNewTeam] = useState("");
  const [newPatrol, setNewPatrol] = useState({ name: "", teamId: teams[0]?.Team_ID ?? "" });

  const addTeam = () => {
    if (!newTeam.trim()) return;
    db.teams.save([...teams, { Team_ID: "T-" + uid(), Team_Name: newTeam, Leader_In_Charge: "—" }]);
    setNewTeam(""); toast.success("تمت إضافة الفرقة");
  };
  const addPatrol = () => {
    if (!newPatrol.name.trim()) return;
    db.patrols.save([...patrols, {
      Patrol_ID: "P-" + uid(), Patrol_Name: newPatrol.name, Team_ID: newPatrol.teamId,
      Patrol_Leader_Name: "—", Total_Points: 0,
    }]);
    setNewPatrol({ name: "", teamId: newPatrol.teamId }); toast.success("تمت إضافة الطليعة");
  };
  const move = (u: User, teamId: string, patrolId: string) => {
    // Changing Team resets Patrol to avoid stale links
    const sameTeam = u.Team_ID === teamId;
    const oldT = db.teams.get(u.Team_ID)?.Team_Name ?? "—";
    const oldP = db.patrols.get(u.Patrol_ID)?.Patrol_Name ?? "—";
    const newT = db.teams.get(teamId)?.Team_Name ?? "—";
    const finalPatrol = sameTeam ? patrolId : (db.patrols.byTeam(teamId)[0]?.Patrol_ID ?? "");
    const newP = db.patrols.get(finalPatrol)?.Patrol_Name ?? "—";
    u.Team_ID = teamId; u.Patrol_ID = finalPatrol; db.users.upsert(u);
    db.history.log(u.ID, "نقل", `من ${oldT}/${oldP} إلى ${newT}/${newP}`, adminName);
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
            {teams.map((t) => <div key={t.Team_ID} className="rounded bg-secondary p-2 text-sm flex justify-between">
              <span>{t.Team_Name}</span>
              <span className="text-xs text-muted-foreground">{patrols.filter((p) => p.Team_ID === t.Team_ID).length} طليعة</span>
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
              {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
            </select>
            <button onClick={addPatrol} className="rounded-lg bg-primary px-4 text-primary-foreground text-sm">إضافة</button>
          </div>
        </div>
      </div>
      <h3 className="font-bold mb-2">الأعضاء</h3>
      <div className="rounded-xl border bg-card divide-y">
        {members.map((u) => <MemberRow key={u.ID} u={u} onMove={move} />)}
      </div>
      <h3 className="font-bold mt-6 mb-2">سجل النقل (History_Log)</h3>
      <div className="rounded-xl border bg-card divide-y max-h-64 overflow-auto">
        {db.history.all().slice(0, 50).map((h) => {
          const u = db.users.get(h.User_ID);
          return (
            <div key={h.Log_ID} className="p-2 text-xs flex justify-between gap-2">
              <span className="min-w-0 truncate">{u ? fullName(u) : "—"}: {h.Action_Type} — {h.Details}</span>
              <span className="text-muted-foreground whitespace-nowrap">{new Date(h.Timestamp).toLocaleString("ar-EG")} · {h.Admin_Name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberRow({ u, onMove }: { u: User; onMove: (u: User, t: string, p: string) => void }) {
  const teams = db.teams.all();
  const [t, setT] = useState(u.Team_ID || teams[0]?.Team_ID || "");
  const patrols = db.patrols.byTeam(t);
  const [p, setP] = useState(u.Patrol_ID || patrols[0]?.Patrol_ID || "");
  useEffect(() => {
    if (!db.patrols.byTeam(t).find((x) => x.Patrol_ID === p)) setP(db.patrols.byTeam(t)[0]?.Patrol_ID ?? "");
  }, [t]);
  return (
    <div className="p-3 flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm font-medium">{fullName(u)} <span className="text-xs text-muted-foreground">— {u.Rank}</span></div>
      <div className="flex gap-2 items-center">
        <select value={t} onChange={(e) => setT(e.target.value)} className="rounded border bg-background px-2 py-1 text-xs">
          {teams.map((x) => <option key={x.Team_ID} value={x.Team_ID}>{x.Team_Name}</option>)}
        </select>
        <select value={p} onChange={(e) => setP(e.target.value)} className="rounded border bg-background px-2 py-1 text-xs">
          {patrols.map((x) => <option key={x.Patrol_ID} value={x.Patrol_ID}>{x.Patrol_Name}</option>)}
        </select>
        <button onClick={() => onMove(u, t, p)} className="rounded bg-primary px-2 py-1 text-primary-foreground text-xs">نقل</button>
      </div>
    </div>
  );
}

function Finance() {
  const [scope, setScope] = useState<TargetType>("Team");
  const teams = db.teams.all();
  const users = db.users.all().filter((u) => u.Status === "Active");
  const [f, setF] = useState({
    title: "", amount: 0, teamId: teams[0]?.Team_ID ?? "",
    userId: "", status: "Unpaid" as PaymentStatus,
  });
  const recs = db.finance.all().filter((x) => x.Target_Type === scope);
  const totals = useMemo(() => {
    const paid = recs.filter((r) => r.Payment_Status === "Paid").reduce((s, r) => s + r.Amount, 0);
    const unpaid = recs.filter((r) => r.Payment_Status !== "Paid").reduce((s, r) => s + r.Amount, 0);
    return { paid, unpaid, total: paid + unpaid };
  }, [recs]);

  const add = () => {
    if (!f.title) return;
    db.finance.save([...db.finance.all(), {
      Transaction_ID: "TX-" + uid(),
      Title: f.title,
      Amount: Number(f.amount),
      Target_Type: scope,
      Target_ID: scope === "Team" ? f.teamId : "",
      User_ID: f.userId || "",
      Payment_Status: f.status,
      Date: new Date().toISOString().slice(0, 10),
    }]);
    setF({ ...f, title: "", amount: 0 }); toast.success("تمت الإضافة");
  };
  const setStatus = (id: string, status: PaymentStatus) => {
    const all = db.finance.all();
    const i = all.findIndex((r) => r.Transaction_ID === id); if (i < 0) return;
    all[i].Payment_Status = status; db.finance.save(all);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">الإدارة المالية</h2>
      <div className="flex gap-2 mb-4">
        {(["Team", "Global"] as TargetType[]).map((s) => (
          <button key={s} onClick={() => setScope(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${scope === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            {s === "Team" ? "ميزانية الفرق" : "الميزانية العامة"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="إجمالي مدفوع" value={`${totals.paid} ج`} tone="success" />
        <Stat label="مستحق" value={`${totals.unpaid} ج`} tone="warning" />
        <Stat label="الإجمالي" value={`${totals.total} ج`} />
      </div>
      <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-2 md:grid-cols-6 gap-2">
        <input placeholder="العنوان" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="rounded-lg border bg-background px-2 py-2 text-sm md:col-span-2" />
        <input placeholder="المبلغ" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} className="rounded-lg border bg-background px-2 py-2 text-sm" />
        {scope === "Team" && (
          <select value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })} className="rounded-lg border bg-background px-2 py-2 text-sm">
            {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
          </select>
        )}
        <select value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} className="rounded-lg border bg-background px-2 py-2 text-sm">
          <option value="">(عام لكل الأعضاء)</option>
          {users.map((u) => <option key={u.ID} value={u.ID}>{fullName(u)}</option>)}
        </select>
        <button onClick={add} className="rounded-lg bg-primary text-primary-foreground text-sm font-medium">إضافة</button>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {recs.map((r) => {
          const u = r.User_ID ? db.users.get(r.User_ID) : null;
          const t = r.Target_ID ? db.teams.get(r.Target_ID) : null;
          return (
            <div key={r.Transaction_ID} className="p-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{r.Title}</div>
                <div className="text-xs text-muted-foreground">{u ? fullName(u) : "عام"}{t ? ` · ${t.Team_Name}` : ""} · {r.Date}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-bold text-sm">{r.Amount} ج</div>
                <select value={r.Payment_Status} onChange={(e) => setStatus(r.Transaction_ID, e.target.value as PaymentStatus)}
                  className="rounded border bg-background px-2 py-1 text-xs">
                  <option value="Unpaid">غير مدفوع</option>
                  <option value="Partial">جزئي</option>
                  <option value="Paid">مدفوع</option>
                </select>
                <PaymentBadge status={r.Payment_Status} />
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
  const setStatus = (id: string, status: "Granted" | "Rejected") => {
    const all = db.badges.all();
    const i = all.findIndex((b) => b.Badge_ID === id);
    if (i < 0) return; all[i].Status = status; db.badges.save(all);
    toast.success("تم التحديث");
  };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">الشارات</h2>
      <div className="rounded-xl border bg-card divide-y">
        {badges.map((b) => {
          const u = db.users.get(b.User_ID);
          return (
            <div key={b.Badge_ID} className="p-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{u ? fullName(u) : "—"}</div>
                <div className="text-xs text-muted-foreground">🏅 {b.Name}</div>
              </div>
              <div className="flex gap-1 items-center">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  b.Status === "Granted" ? "bg-success/15 text-success" :
                  b.Status === "Rejected" ? "bg-destructive/15 text-destructive" :
                  "bg-warning/15 text-warning-foreground"
                }`}>
                  {b.Status === "Granted" ? "ممنوحة" : b.Status === "Rejected" ? "مرفوضة" : "بانتظار"}
                </span>
                {b.Status === "Requested" && <>
                  <button onClick={() => setStatus(b.Badge_ID, "Granted")} className="rounded bg-success px-2 py-1 text-success-foreground text-xs">منح</button>
                  <button onClick={() => setStatus(b.Badge_ID, "Rejected")} className="rounded bg-destructive px-2 py-1 text-destructive-foreground text-xs">رفض</button>
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
    db.notices.save([{
      Notice_ID: "N-" + uid(), Title: f.title, Body: f.body,
      Team_IDs: f.teamIds, Read_By: [], Created_At: new Date().toISOString(),
    }, ...all]);
    setF({ title: "", body: "", teamIds: [] }); toast.success("تم النشر");
  };
  const remove = (id: string) => { db.notices.save(all.filter((n) => n.Notice_ID !== id)); };
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
            const on = f.teamIds.includes(t.Team_ID);
            return (
              <button key={t.Team_ID} onClick={() =>
                setF({ ...f, teamIds: on ? f.teamIds.filter((x) => x !== t.Team_ID) : [...f.teamIds, t.Team_ID] })}
                className={`rounded-full px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {t.Team_Name}
              </button>
            );
          })}
          <span className="text-xs text-muted-foreground self-center">{f.teamIds.length === 0 && "(للجميع)"}</span>
        </div>
        <button onClick={post} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">نشر</button>
      </div>
      <div className="space-y-2">
        {all.map((n) => (
          <div key={n.Notice_ID} className="rounded-xl border bg-card p-3">
            <div className="flex justify-between gap-2">
              <div className="font-bold">{n.Title}</div>
              <button onClick={() => remove(n.Notice_ID)} className="text-destructive text-xs">حذف</button>
            </div>
            <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.Body}</div>
            <div className="text-xs text-muted-foreground mt-2">قرأها {n.Read_By.length} عضو</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksAdmin() {
  const patrols = db.patrols.all();
  const [f, setF] = useState({ title: "", description: "", patrolId: patrols[0]?.Patrol_ID ?? "" });
  const all = db.tasks.all();
  const add = () => {
    if (!f.title) return;
    db.tasks.save([{
      Task_ID: "TK-" + uid(), Title: f.title, Description: f.description,
      Patrol_ID: f.patrolId, Done_By: [], Created_At: new Date().toISOString(),
    }, ...all]);
    setF({ ...f, title: "", description: "" }); toast.success("تمت إضافة المهمة");
  };
  const remove = (id: string) => { db.tasks.save(all.filter((t) => t.Task_ID !== id)); };
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
            {patrols.map((p) => <option key={p.Patrol_ID} value={p.Patrol_ID}>{p.Patrol_Name}</option>)}
          </select>
          <button onClick={add} className="rounded-lg bg-primary px-4 text-primary-foreground text-sm">إضافة</button>
        </div>
      </div>
      <div className="space-y-2">
        {all.map((t) => {
          const p = patrols.find((x) => x.Patrol_ID === t.Patrol_ID);
          const total = db.users.all().filter((u) => u.Patrol_ID === t.Patrol_ID && u.Status === "Active").length;
          return (
            <div key={t.Task_ID} className="rounded-xl border bg-card p-3">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-bold">{t.Title}</div>
                  <div className="text-xs text-muted-foreground">{p?.Patrol_Name} · {t.Done_By.length}/{total} منجزة</div>
                  {t.Description && <div className="text-sm mt-1">{t.Description}</div>}
                </div>
                <button onClick={() => remove(t.Task_ID)} className="text-destructive text-xs self-start">حذف</button>
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
  // Read Total_Points from the Patrols sheet (live ranking board).
  const patrols = db.patrols.all();
  const members = db.users.all().filter((u) => u.Status === "Active");
  // Auto-derive points from attendance + granted badges (so demo data shows)
  const attendance = db.attendance.all();
  const badges = db.badges.all();

  const rows = patrols.map((p) => {
    const ids = members.filter((u) => u.Patrol_ID === p.Patrol_ID).map((u) => u.ID);
    const pres = attendance.filter((a) => ids.includes(a.User_ID) && a.Status === "حاضر").length;
    const grb = badges.filter((b) => ids.includes(b.User_ID) && b.Status === "Granted").length;
    const points = p.Total_Points + pres * 5 + grb * 20;
    const team = db.teams.get(p.Team_ID)?.Team_Name ?? "";
    return { id: p.Patrol_ID, name: p.Patrol_Name, team, members: ids.length, points };
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
  const users = db.users.all().filter((u) => u.Status === "Active");
  const [userId, setUserId] = useState(users[0]?.ID ?? "");
  const [text, setText] = useState("");
  const list = db.notes.all().filter((n) => n.User_ID === userId);
  const add = () => {
    if (!text.trim()) return;
    db.notes.save([{
      Note_ID: "NT-" + uid(), User_ID: userId, Note: text,
      Author: author, Timestamp: new Date().toISOString(),
    }, ...db.notes.all()]);
    setText(""); toast.success("تم الحفظ");
  };
  if (!canEdit) return (
    <div className="rounded-xl border bg-card p-6 text-center">
      <div className="text-3xl mb-2">🔒</div>
      <div className="font-medium">قسم سري — متاح فقط للقائد العام</div>
    </div>
  );
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🔒 ملاحظات سرية للمربي</h2>
      <div className="rounded-xl border bg-card p-4 mb-4 space-y-2">
        <select value={userId} onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
          {users.map((u) => <option key={u.ID} value={u.ID}>{fullName(u)}</option>)}
        </select>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder="ملاحظة سلوكية / روحية / نفسية..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        <button onClick={add} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">حفظ</button>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {list.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">لا توجد ملاحظات</div>}
        {list.map((n) => (
          <div key={n.Note_ID} className="p-3">
            <div className="text-sm whitespace-pre-wrap">{n.Note}</div>
            <div className="text-xs text-muted-foreground mt-1">{n.Author} · {new Date(n.Timestamp).toLocaleString("ar-EG")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ canEdit }: { canEdit: boolean }) {
  const s = db.settings.get();
  const [name, setName] = useState(s.Group_Name);
  const [logo, setLogo] = useState(s.Logo);

  const onFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => setLogo(String(r.result));
    r.readAsDataURL(file);
  };
  const save = () => {
    db.settings.save({ Group_Name: name, Logo: logo });
    toast.success("تم الحفظ");
  };
  if (!canEdit) return (
    <div className="rounded-xl border bg-card p-6 text-center">
      <div className="text-3xl mb-2">🔒</div>
      <div className="font-medium">متاح فقط للقائد العام</div>
    </div>
  );
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">⚙️ هوية الموقع</h2>
      <div className="rounded-xl border bg-card p-4 max-w-md space-y-3">
        <div>
          <label className="text-sm font-medium block mb-1">اسم المجموعة</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">الشعار</label>
          {logo && <img src={logo} alt="معاينة" className="h-20 w-20 rounded-full object-cover ring-2 ring-gold mb-2" />}
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            className="block text-sm" />
        </div>
        <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">حفظ</button>
      </div>
    </div>
  );
}
