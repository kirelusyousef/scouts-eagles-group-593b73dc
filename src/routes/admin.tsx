import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/lib/auth";
import {
  db, uid, fullName, hasScreen, MASTER_ADMIN_PASSWORD,
  ADMIN_SCREENS, MEMBER_SCREENS, STAGES,
  type AttendanceStatus, type PaymentStatus, type TargetType, type User,
  type ScreenKey, type PublicService, type MemberRank, type LeaderRankTask, type NewsItem,
  type SubGroupType, type GroupEvent, type LedgerScope, type LedgerTxType,
} from "@/lib/db";
import { AppShell, type NavItem } from "@/components/AppShell";
import { QRScanner } from "@/components/QRScanner";
import { Stat, StatusBadge, PaymentBadge } from "./dashboard";
import { toast } from "sonner";
import { uploadImage, uploadImages } from "@/lib/upload";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const { user, loading, isGeneralLeader } = useAuth();
  const nav = useNavigate();
  const [, force] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (user.Role !== "Leader") { nav({ to: "/dashboard" }); return; }
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, [user, loading, nav]);

  const visible = useMemo(
    () => ADMIN_SCREENS.filter((s) => hasScreen(user, s.key)),
    [user]
  );
  const [tab, setTab] = useState<ScreenKey>("admin_overview");
  useEffect(() => {
    if (visible.length && !visible.some((s) => s.key === tab)) setTab(visible[0].key);
  }, [visible, tab]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <div>جاري تحميل لوحة التحكم...</div>
        </div>
      </div>
    );
  }
  const adminName = fullName(user);

  const items: NavItem[] = visible.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.icon,
    onClick: () => setTab(s.key),
  }));

  return (
    <AppShell items={items} activeKey={tab}>
      <div className="mx-auto max-w-6xl">
        {tab === "admin_overview" && <Overview />}
        {tab === "approvals" && <Approvals adminName={adminName} />}
        {tab === "users_manage" && <UsersManageAdmin adminName={adminName} />}
        {tab === "password_requests" && <PasswordRequestsAdmin adminName={adminName} />}
        {tab === "allocation" && <Allocation adminName={adminName} />}
        {tab === "sub_groups_admin" && <SubGroupsAdmin />}
        {tab === "events_admin" && <EventsAdmin adminName={adminName} />}
        {tab === "finance_ledger" && <FinanceLedgerAdmin adminName={adminName} />}
        {tab === "account_type" && <AccountTypeAdmin adminName={adminName} />}
        {tab === "member_ranks_assign" && <MemberRanksAssign adminName={adminName} user={user} />}
        {tab === "leader_ranks_tasks" && <LeaderRanksTasksAdmin />}
        {tab === "scanner" && <QRScanner adminName={adminName} />}
        {tab === "manual" && <ManualAttendance adminName={adminName} />}
        {tab === "reports" && <Reports />}
        {tab === "teams_crud" && <TeamsCrud adminName={adminName} />}
        {tab === "finance_admin" && <Finance />}
        {tab === "public_service" && <PublicServiceAdmin />}
        {tab === "news_admin" && <NewsAdmin adminName={adminName} userId={user.ID} />}
        {tab === "vision_admin" && <VisionAdmin adminName={adminName} />}
        {tab === "badges_admin" && <BadgesAdmin />}
        {tab === "notices" && <Notices />}
        {tab === "tasks_admin" && <TasksAdmin />}
        {tab === "leaderboard" && <Leaderboard />}
        {tab === "permissions" && <PermissionsAdmin />}
        {tab === "notes" && <Notes author={adminName} canEdit={isGeneralLeader} />}
        {tab === "settings" && <SettingsPanel author={adminName} canEdit={isGeneralLeader} />}
      </div>
    </AppShell>
  );
}

// ---------- Overview ----------
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

// ---------- Document preview helper ----------
function DocThumb({ label, url, onOpen }: { label: string; url: string; onOpen: (url: string) => void }) {
  return (
    <div className="rounded-lg border bg-card p-2 text-center text-xs">
      <div className="text-muted-foreground mb-1">{label}</div>
      {url ? (
        <button onClick={() => onOpen(url)} className="block w-full">
          <img src={url} alt={label} className="h-24 w-full object-cover rounded" />
        </button>
      ) : (
        <div className="h-24 flex items-center justify-center text-muted-foreground">لا يوجد</div>
      )}
    </div>
  );
}

// ---------- Approvals ----------
function Approvals({ adminName }: { adminName: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const pending = db.users.all().filter((u) => u.Status === "Pending");

  const approve = (u: User) => {
    u.Status = "Active"; db.users.upsert(u);
    db.history.log(u.ID, "موافقة على العضوية", "بدون توزيع — يمكن توزيعه لاحقاً", adminName);
    toast.success("تمت الموافقة");
  };
  const reject = (u: User) => {
    db.users.remove(u.ID);
    db.history.log(u.ID, "رفض طلب الانضمام", "تم حذف السجل", adminName);
    toast.success("تم الرفض");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">طلبات الانضمام ({pending.length})</h2>
      <div className="space-y-3">
        {pending.length === 0 && <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">لا توجد طلبات</div>}
        {pending.map((u) => (
          <div key={u.ID} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-14 w-14 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-xl">
                {u.Profile_Photo ? <img src={u.Profile_Photo} className="h-full w-full object-cover" alt="" /> : u.First_Name[0]}
              </div>
              <div>
                <div className="font-bold">{fullName(u)}</div>
                <div className="text-xs text-muted-foreground">{u.Email} · {u.Phone}</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
              <div><span className="text-muted-foreground">اسم الجد:</span> {u.Grandfather_Name}</div>
              <div><span className="text-muted-foreground">المرحلة:</span> {u.Education_Stage}</div>
              <div><span className="text-muted-foreground">الرقم القومي:</span> {u.National_ID}</div>
              <div><span className="text-muted-foreground">تاريخ الميلاد:</span> {u.Birth_Date || "—"}</div>
              <div><span className="text-muted-foreground">أب الاعتراف:</span> {u.Confession_Father}</div>
              <div><span className="text-muted-foreground">واتساب:</span> {u.Has_WhatsApp ? "نعم" : "لا"}</div>
              {u.Parent_Phone && <div><span className="text-muted-foreground">ولي الأمر:</span> {u.Parent_Phone}</div>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <DocThumb label="صورة شخصية" url={u.Profile_Photo} onOpen={setPreview} />
              {u.Birth_Certificate
                ? <DocThumb label="شهادة الميلاد" url={u.Birth_Certificate} onOpen={setPreview} />
                : <>
                    <DocThumb label="بطاقة - وجه" url={u.National_ID_Front} onOpen={setPreview} />
                    <DocThumb label="بطاقة - ظهر" url={u.National_ID_Back} onOpen={setPreview} />
                  </>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => approve(u)} className="rounded-lg bg-success px-4 py-1.5 text-success-foreground text-sm font-medium">موافقة</button>
              <button onClick={() => reject(u)} className="rounded-lg bg-destructive px-4 py-1.5 text-destructive-foreground text-sm font-medium">رفض</button>
            </div>
          </div>
        ))}
      </div>
      {preview && (
        <div onClick={() => setPreview(null)} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out">
          <img src={preview} alt="معاينة" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

// ---------- Batch + Individual Allocation ----------
function Allocation({ adminName }: { adminName: string }) {
  const teams = db.teams.all();
  const allMembers = db.users.all().filter((u) => u.Status === "Active");
  const [stageFilter, setStageFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTeam, setBulkTeam] = useState(teams[0]?.Team_ID ?? "");
  const bulkPatrols = db.patrols.byTeam(bulkTeam);
  const [bulkPatrol, setBulkPatrol] = useState(bulkPatrols[0]?.Patrol_ID ?? "");

  useEffect(() => { setBulkPatrol(db.patrols.byTeam(bulkTeam)[0]?.Patrol_ID ?? ""); }, [bulkTeam]);

  const filtered = stageFilter ? allMembers.filter((u) => u.Education_Stage === stageFilter) : allMembers;

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((u) => u.ID)));
  };
  const applyBulk = () => {
    if (!selected.size) return toast.error("اختر أعضاء أولاً");
    let count = 0;
    selected.forEach((id) => {
      const u = db.users.get(id); if (!u) return;
      const oldT = db.teams.get(u.Team_ID)?.Team_Name ?? "—";
      const newT = db.teams.get(bulkTeam)?.Team_Name ?? "—";
      u.Team_ID = bulkTeam; u.Patrol_ID = bulkPatrol;
      db.users.upsert(u);
      db.history.log(u.ID, "توزيع جماعي", `من ${oldT} إلى ${newT}`, adminName);
      count++;
    });
    setSelected(new Set());
    toast.success(`تم توزيع ${count} عضو`);
  };

  const overrideAssign = (u: User, teamId: string, patrolId: string) => {
    const oldT = db.teams.get(u.Team_ID)?.Team_Name ?? "—";
    const newT = db.teams.get(teamId)?.Team_Name ?? "—";
    u.Team_ID = teamId; u.Patrol_ID = patrolId; db.users.upsert(u);
    db.history.log(u.ID, "تعديل فردي", `${oldT} → ${newT}`, adminName);
    toast.success("تم");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">توزيع الأعضاء على الفرق</h2>
      <div className="rounded-xl border bg-card p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div className="md:col-span-2">
          <label className="text-xs block mb-1">تصفية حسب المرحلة</label>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
            className="w-full rounded-lg border bg-background px-2 py-2 text-sm">
            <option value="">كل المراحل</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1">الفرقة</label>
          <select value={bulkTeam} onChange={(e) => setBulkTeam(e.target.value)} className="w-full rounded-lg border bg-background px-2 py-2 text-sm">
            {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1">الطليعة</label>
          <select value={bulkPatrol} onChange={(e) => setBulkPatrol(e.target.value)} className="w-full rounded-lg border bg-background px-2 py-2 text-sm">
            {bulkPatrols.map((p) => <option key={p.Patrol_ID} value={p.Patrol_ID}>{p.Patrol_Name}</option>)}
          </select>
        </div>
        <button onClick={applyBulk} className="rounded-lg bg-primary py-2 text-primary-foreground text-sm font-medium">
          توزيع المحدد ({selected.size})
        </button>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-2"><input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} /></th>
              <th className="p-2 text-right">الاسم</th>
              <th className="p-2">المرحلة</th>
              <th className="p-2">الفرقة الحالية</th>
              <th className="p-2">الطليعة</th>
              <th className="p-2">تعديل فردي</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((u) => <AllocRow key={u.ID} u={u} selected={selected.has(u.ID)} onToggle={() => toggle(u.ID)} onApply={overrideAssign} />)}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا يوجد أعضاء</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function AllocRow({ u, selected, onToggle, onApply }: { u: User; selected: boolean; onToggle: () => void; onApply: (u: User, t: string, p: string) => void }) {
  const teams = db.teams.all();
  const [t, setT] = useState(u.Team_ID || teams[0]?.Team_ID || "");
  const patrols = db.patrols.byTeam(t);
  const [p, setP] = useState(u.Patrol_ID || patrols[0]?.Patrol_ID || "");
  useEffect(() => {
    if (!db.patrols.byTeam(t).find((x) => x.Patrol_ID === p)) setP(db.patrols.byTeam(t)[0]?.Patrol_ID ?? "");
  }, [t]);
  return (
    <tr>
      <td className="p-2 text-center"><input type="checkbox" checked={selected} onChange={onToggle} /></td>
      <td className="p-2 text-right font-medium">{fullName(u)}</td>
      <td className="p-2 text-center text-xs">{u.Education_Stage}</td>
      <td className="p-2 text-center text-xs">{db.teams.get(u.Team_ID)?.Team_Name ?? "—"}</td>
      <td className="p-2 text-center text-xs">{db.patrols.get(u.Patrol_ID)?.Patrol_Name ?? "—"}</td>
      <td className="p-2">
        <div className="flex gap-1 items-center justify-center flex-wrap">
          <select value={t} onChange={(e) => setT(e.target.value)} className="rounded border bg-background px-1 py-0.5 text-xs">
            {teams.map((x) => <option key={x.Team_ID} value={x.Team_ID}>{x.Team_Name}</option>)}
          </select>
          <select value={p} onChange={(e) => setP(e.target.value)} className="rounded border bg-background px-1 py-0.5 text-xs">
            {patrols.map((x) => <option key={x.Patrol_ID} value={x.Patrol_ID}>{x.Patrol_Name}</option>)}
          </select>
          <button onClick={() => onApply(u, t, p)} className="rounded bg-primary px-2 py-0.5 text-primary-foreground text-xs">حفظ</button>
        </div>
      </td>
    </tr>
  );
}

// ---------- Manual attendance & Reports (unchanged logic) ----------
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
      u.Status === "Active" && (!teamId || u.Team_ID === teamId) && (!patrolId || u.Patrol_ID === patrolId)
    );
    return users.map((u) => {
      const recs = db.attendance.all().filter((a) => a.User_ID === u.ID && (!from || a.Date >= from) && (!to || a.Date <= to));
      const considered = recs.filter((r) => r.Status !== "عذر");
      const present = recs.filter((r) => r.Status === "حاضر").length;
      const pct = considered.length ? Math.round((present / considered.length) * 100) : 0;
      return {
        name: fullName(u),
        team: db.teams.get(u.Team_ID)?.Team_Name ?? "—",
        patrol: db.patrols.get(u.Patrol_ID)?.Patrol_Name ?? "—",
        present, excused: recs.filter((r) => r.Status === "عذر").length,
        absent: recs.filter((r) => r.Status === "غائب").length, pct,
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

// ---------- Teams & Patrols CRUD ----------
function TeamsCrud({ adminName }: { adminName: string }) {
  const teams = db.teams.all();
  const patrols = db.patrols.all();
  const users = db.users.all();
  const [newTeam, setNewTeam] = useState({ name: "", leader: "—" });
  const [editTeam, setEditTeam] = useState<{ id: string; name: string; leader: string } | null>(null);
  const [newPatrol, setNewPatrol] = useState({ name: "", teamId: teams[0]?.Team_ID ?? "", leader: "—" });
  const [editPatrol, setEditPatrol] = useState<{ id: string; name: string; teamId: string; leader: string } | null>(null);

  const addTeam = () => {
    if (!newTeam.name.trim()) return;
    db.teams.save([...teams, { Team_ID: "T-" + uid(), Team_Name: newTeam.name, Leader_In_Charge: newTeam.leader || "—" }]);
    setNewTeam({ name: "", leader: "—" }); toast.success("تمت الإضافة");
  };
  const saveEditTeam = () => {
    if (!editTeam) return;
    const all = db.teams.all().map((t) => t.Team_ID === editTeam.id ? { ...t, Team_Name: editTeam.name, Leader_In_Charge: editTeam.leader } : t);
    db.teams.save(all); setEditTeam(null); toast.success("تم الحفظ");
  };
  const removeTeam = (id: string) => {
    if (users.some((u) => u.Team_ID === id)) return toast.error("لا يمكن الحذف — يوجد أعضاء مرتبطون بالفرقة");
    if (patrols.some((p) => p.Team_ID === id)) return toast.error("لا يمكن الحذف — يوجد طلائع مرتبطة بالفرقة");
    db.teams.save(teams.filter((t) => t.Team_ID !== id));
    db.history.log("", "حذف فرقة", `Team_ID=${id}`, adminName);
    toast.success("تم الحذف");
  };

  const addPatrol = () => {
    if (!newPatrol.name.trim() || !newPatrol.teamId) return;
    db.patrols.save([...patrols, {
      Patrol_ID: "P-" + uid(), Patrol_Name: newPatrol.name, Team_ID: newPatrol.teamId,
      Patrol_Leader_Name: newPatrol.leader || "—", Total_Points: 0,
    }]);
    setNewPatrol({ ...newPatrol, name: "" }); toast.success("تمت الإضافة");
  };
  const saveEditPatrol = () => {
    if (!editPatrol) return;
    const all = db.patrols.all().map((p) => p.Patrol_ID === editPatrol.id ? { ...p, Patrol_Name: editPatrol.name, Team_ID: editPatrol.teamId, Patrol_Leader_Name: editPatrol.leader } : p);
    db.patrols.save(all); setEditPatrol(null); toast.success("تم الحفظ");
  };
  const removePatrol = (id: string) => {
    if (users.some((u) => u.Patrol_ID === id)) return toast.error("لا يمكن الحذف — يوجد أعضاء مرتبطون بالطليعة");
    db.patrols.save(patrols.filter((p) => p.Patrol_ID !== id));
    toast.success("تم الحذف");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة الفرق والطلائع</h2>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-bold mb-3">الفرق</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <input placeholder="اسم الفرقة" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
            className="rounded-lg border bg-background px-3 py-2 text-sm flex-1 min-w-[150px]" />
          <input placeholder="القائد المسؤول" value={newTeam.leader} onChange={(e) => setNewTeam({ ...newTeam, leader: e.target.value })}
            className="rounded-lg border bg-background px-3 py-2 text-sm flex-1 min-w-[150px]" />
          <button onClick={addTeam} className="rounded-lg bg-primary px-4 text-primary-foreground text-sm">إضافة فرقة</button>
        </div>
        <div className="divide-y">
          {teams.map((t) => (
            <div key={t.Team_ID} className="py-2 flex flex-wrap gap-2 items-center">
              {editTeam?.id === t.Team_ID ? (
                <>
                  <input value={editTeam.name} onChange={(e) => setEditTeam({ ...editTeam, name: e.target.value })} className="rounded border bg-background px-2 py-1 text-sm flex-1" />
                  <input value={editTeam.leader} onChange={(e) => setEditTeam({ ...editTeam, leader: e.target.value })} className="rounded border bg-background px-2 py-1 text-sm flex-1" />
                  <button onClick={saveEditTeam} className="rounded bg-success px-3 py-1 text-success-foreground text-xs">حفظ</button>
                  <button onClick={() => setEditTeam(null)} className="rounded bg-secondary px-3 py-1 text-xs">إلغاء</button>
                </>
              ) : (
                <>
                  <div className="flex-1 text-sm"><b>{t.Team_Name}</b> <span className="text-xs text-muted-foreground">· {t.Leader_In_Charge} · {patrols.filter((p) => p.Team_ID === t.Team_ID).length} طليعة · {users.filter((u) => u.Team_ID === t.Team_ID).length} عضو</span></div>
                  <button onClick={() => setEditTeam({ id: t.Team_ID, name: t.Team_Name, leader: t.Leader_In_Charge })} className="rounded bg-secondary px-3 py-1 text-xs">تعديل</button>
                  <button onClick={() => removeTeam(t.Team_ID)} className="rounded bg-destructive px-3 py-1 text-destructive-foreground text-xs">حذف</button>
                </>
              )}
            </div>
          ))}
          {teams.length === 0 && <div className="py-3 text-center text-muted-foreground text-sm">لا توجد فرق</div>}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-bold mb-3">الطلائع</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <input placeholder="اسم الطليعة" value={newPatrol.name} onChange={(e) => setNewPatrol({ ...newPatrol, name: e.target.value })}
            className="rounded-lg border bg-background px-3 py-2 text-sm flex-1 min-w-[140px]" />
          <select value={newPatrol.teamId} onChange={(e) => setNewPatrol({ ...newPatrol, teamId: e.target.value })}
            className="rounded-lg border bg-background px-3 py-2 text-sm">
            {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
          </select>
          <input placeholder="قائد الطليعة" value={newPatrol.leader} onChange={(e) => setNewPatrol({ ...newPatrol, leader: e.target.value })}
            className="rounded-lg border bg-background px-3 py-2 text-sm flex-1 min-w-[140px]" />
          <button onClick={addPatrol} className="rounded-lg bg-primary px-4 text-primary-foreground text-sm">إضافة طليعة</button>
        </div>
        <div className="divide-y">
          {patrols.map((p) => (
            <div key={p.Patrol_ID} className="py-2 flex flex-wrap gap-2 items-center">
              {editPatrol?.id === p.Patrol_ID ? (
                <>
                  <input value={editPatrol.name} onChange={(e) => setEditPatrol({ ...editPatrol, name: e.target.value })} className="rounded border bg-background px-2 py-1 text-sm flex-1" />
                  <select value={editPatrol.teamId} onChange={(e) => setEditPatrol({ ...editPatrol, teamId: e.target.value })} className="rounded border bg-background px-2 py-1 text-sm">
                    {teams.map((t) => <option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}
                  </select>
                  <input value={editPatrol.leader} onChange={(e) => setEditPatrol({ ...editPatrol, leader: e.target.value })} className="rounded border bg-background px-2 py-1 text-sm flex-1" />
                  <button onClick={saveEditPatrol} className="rounded bg-success px-3 py-1 text-success-foreground text-xs">حفظ</button>
                  <button onClick={() => setEditPatrol(null)} className="rounded bg-secondary px-3 py-1 text-xs">إلغاء</button>
                </>
              ) : (
                <>
                  <div className="flex-1 text-sm"><b>{p.Patrol_Name}</b> <span className="text-xs text-muted-foreground">· {db.teams.get(p.Team_ID)?.Team_Name ?? "—"} · {p.Patrol_Leader_Name} · {users.filter((u) => u.Patrol_ID === p.Patrol_ID).length} عضو</span></div>
                  <button onClick={() => setEditPatrol({ id: p.Patrol_ID, name: p.Patrol_Name, teamId: p.Team_ID, leader: p.Patrol_Leader_Name })} className="rounded bg-secondary px-3 py-1 text-xs">تعديل</button>
                  <button onClick={() => removePatrol(p.Patrol_ID)} className="rounded bg-destructive px-3 py-1 text-destructive-foreground text-xs">حذف</button>
                </>
              )}
            </div>
          ))}
          {patrols.length === 0 && <div className="py-3 text-center text-muted-foreground text-sm">لا توجد طلائع</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- Finance, Badges, Notices, Tasks, Leaderboard, Notes (kept) ----------
function Finance() {
  const [scope, setScope] = useState<TargetType>("Team");
  const teams = db.teams.all();
  const users = db.users.all().filter((u) => u.Status === "Active");
  const [f, setF] = useState({ title: "", amount: 0, teamId: teams[0]?.Team_ID ?? "", userId: "", status: "Unpaid" as PaymentStatus });
  const recs = db.finance.all().filter((x) => x.Target_Type === scope);
  const totals = useMemo(() => {
    const paid = recs.filter((r) => r.Payment_Status === "Paid").reduce((s, r) => s + r.Amount, 0);
    const unpaid = recs.filter((r) => r.Payment_Status !== "Paid").reduce((s, r) => s + r.Amount, 0);
    return { paid, unpaid, total: paid + unpaid };
  }, [recs]);
  const add = () => {
    if (!f.title) return;
    db.finance.save([...db.finance.all(), {
      Transaction_ID: "TX-" + uid(), Title: f.title, Amount: Number(f.amount),
      Target_Type: scope, Target_ID: scope === "Team" ? f.teamId : "",
      User_ID: f.userId || "", Payment_Status: f.status, Date: new Date().toISOString().slice(0, 10),
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
          <button key={s} onClick={() => setScope(s)} className={`rounded-lg px-4 py-2 text-sm font-medium ${scope === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
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
                <select value={r.Payment_Status} onChange={(e) => setStatus(r.Transaction_ID, e.target.value as PaymentStatus)} className="rounded border bg-background px-2 py-1 text-xs">
                  <option value="Unpaid">غير مدفوع</option><option value="Partial">جزئي</option><option value="Paid">مدفوع</option>
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
    const i = all.findIndex((b) => b.Badge_ID === id); if (i < 0) return;
    all[i].Status = status; db.badges.save(all); toast.success("تم التحديث");
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
    db.notices.save([{ Notice_ID: "N-" + uid(), Title: f.title, Body: f.body, Team_IDs: f.teamIds, Read_By: [], Created_At: new Date().toISOString() }, ...all]);
    setF({ title: "", body: "", teamIds: [] }); toast.success("تم النشر");
  };
  const remove = (id: string) => { db.notices.save(all.filter((n) => n.Notice_ID !== id)); };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">لوحة الإعلانات</h2>
      <div className="rounded-xl border bg-card p-4 mb-4 space-y-2">
        <input placeholder="العنوان" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        <textarea placeholder="نص الإعلان" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">استهداف:</span>
          {teams.map((t) => {
            const on = f.teamIds.includes(t.Team_ID);
            return (
              <button key={t.Team_ID} onClick={() => setF({ ...f, teamIds: on ? f.teamIds.filter((x) => x !== t.Team_ID) : [...f.teamIds, t.Team_ID] })}
                className={`rounded-full px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{t.Team_Name}</button>
            );
          })}
          <span className="text-xs text-muted-foreground self-center">{f.teamIds.length === 0 && "(للجميع)"}</span>
        </div>
        <button onClick={post} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">نشر</button>
      </div>
      <div className="space-y-2">
        {all.map((n) => (
          <div key={n.Notice_ID} className="rounded-xl border bg-card p-3">
            <div className="flex justify-between gap-2"><div className="font-bold">{n.Title}</div><button onClick={() => remove(n.Notice_ID)} className="text-destructive text-xs">حذف</button></div>
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
    db.tasks.save([{ Task_ID: "TK-" + uid(), Title: f.title, Description: f.description, Patrol_ID: f.patrolId, Done_By: [], Created_At: new Date().toISOString() }, ...all]);
    setF({ ...f, title: "", description: "" }); toast.success("تمت إضافة المهمة");
  };
  const remove = (id: string) => { db.tasks.save(all.filter((t) => t.Task_ID !== id)); };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">المهام</h2>
      <div className="rounded-xl border bg-card p-4 mb-4 grid gap-2">
        <input placeholder="عنوان المهمة" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="rounded-lg border bg-background px-3 py-2 text-sm" />
        <textarea placeholder="الوصف" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="rounded-lg border bg-background px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <select value={f.patrolId} onChange={(e) => setF({ ...f, patrolId: e.target.value })} className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm">
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
  const patrols = db.patrols.all();
  const members = db.users.all().filter((u) => u.Status === "Active");
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
          <div key={r.id} className={`rounded-xl border p-4 flex items-center gap-4 ${i === 0 ? "bg-gradient-to-l from-gold/30 to-card border-gold" : "bg-card"}`}>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold ${
              i === 0 ? "bg-gold text-gold-foreground" : i === 1 ? "bg-secondary text-secondary-foreground" : i === 2 ? "bg-accent text-accent-foreground" : "bg-secondary"
            }`}>{i + 1}</div>
            <div className="flex-1"><div className="font-bold">{r.name}</div><div className="text-xs text-muted-foreground">{r.team} · {r.members} عضو</div></div>
            <div className="text-left"><div className="text-2xl font-black text-primary">{r.points}</div><div className="text-xs text-muted-foreground">نقطة</div></div>
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
    db.notes.save([{ Note_ID: "NT-" + uid(), User_ID: userId, Note: text, Author: author, Timestamp: new Date().toISOString() }, ...db.notes.all()]);
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
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
          {users.map((u) => <option key={u.ID} value={u.ID}>{fullName(u)}</option>)}
        </select>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="ملاحظة سلوكية / روحية / نفسية..." className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
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

// ---------- Settings (App_Settings history) ----------
function SettingsPanel({ author, canEdit }: { author: string; canEdit: boolean }) {
  const latest = db.appSettings.latest();
  const [name, setName] = useState(latest.Group_Name);
  const [logo, setLogo] = useState(latest.Logo_URL);
  const [uploading, setUploading] = useState(false);
  const history = [...db.appSettings.all()].sort((a, b) => (b.Timestamp || "").localeCompare(a.Timestamp || ""));

  const onFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) return toast.error("حجم الملف كبير جداً (الحد 8 م.ب)");
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setLogo(url);
      toast.success("تم رفع الشعار بنجاح");
    } catch (e) {
      toast.error("فشل رفع الشعار: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploading(false);
    }
  };
  const save = () => {
    db.appSettings.append(name, logo, author);
    toast.success("تم الحفظ وإضافة سجل في App_Settings");
  };
  if (!canEdit) return (
    <div className="rounded-xl border bg-card p-6 text-center"><div className="text-3xl mb-2">🔒</div><div className="font-medium">متاح فقط للقائد العام</div></div>
  );
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">⚙️ هوية الموقع</h2>
      <div className="rounded-xl border bg-card p-4 max-w-md space-y-3 mb-6">
        <div>
          <label className="text-sm font-medium block mb-1">اسم المجموعة</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">الشعار</label>
          {logo && <img src={logo} alt="معاينة" className="h-20 w-20 rounded-full object-cover ring-2 ring-gold mb-2" />}
          <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} className="block text-sm disabled:opacity-50" />
          {uploading && (
            <div className="mt-1 flex items-center gap-2 text-xs text-primary">
              <span className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              جاري رفع الصورة...
            </div>
          )}
        </div>
        <button onClick={save} disabled={uploading} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium disabled:opacity-50">حفظ كسجل جديد</button>
      </div>


      <h3 className="font-bold mb-2">سجل التعديلات (App_Settings)</h3>
      <div className="rounded-xl border bg-card divide-y max-h-72 overflow-auto">
        {history.length === 0 && <div className="p-4 text-center text-muted-foreground text-sm">لا يوجد سجل بعد</div>}
        {history.map((s) => (
          <div key={s.Setting_ID} className="p-3 flex items-center gap-3">
            {s.Logo_URL ? <img src={s.Logo_URL} className="h-10 w-10 rounded-full object-cover" alt="" /> : <div className="h-10 w-10 rounded-full bg-secondary" />}
            <div className="flex-1">
              <div className="font-medium text-sm">{s.Group_Name}</div>
              <div className="text-xs text-muted-foreground">{new Date(s.Timestamp).toLocaleString("ar-EG")} · {s.Updated_By}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Public Service ----------
function PublicServiceAdmin() {
  const services = [...db.publicService.all()].sort((a, b) => (b.Service_Date || "").localeCompare(a.Service_Date || ""));
  const activeUsers = db.users.all().filter((u) => u.Status === "Active");
  const leaders = activeUsers.filter((u) => u.Role === "Leader");
  const members = activeUsers.filter((u) => u.Role === "Member");

  const [editing, setEditing] = useState<PublicService | null>(null);
  const [evaluating, setEvaluating] = useState<PublicService | null>(null);

  const blank = (): PublicService => ({
    Service_ID: "PS-" + uid(),
    Service_Date: new Date().toISOString().slice(0, 10),
    Leader_Of_Day: "", Assistant_Leader_Of_Day: "",
    Leaders_List: "", Members_List: "",
    Evaluation_Data: "", Reminder_Sent: false,
  });

  const save = (s: PublicService) => {
    db.publicService.upsert(s);
    setEditing(null);
    toast.success("تم الحفظ");
  };
  const remove = (id: string) => {
    if (!confirm("حذف الخدمة؟")) return;
    db.publicService.remove(id); toast.success("تم الحذف");
  };
  const sendReminder = (s: PublicService) => {
    db.publicService.upsert({ ...s, Reminder_Sent: true });
    toast.success("تم إرسال تذكير لجميع المشاركين (محاكاة)");
  };

  const nameOf = (id: string) => { const u = db.users.get(id); return u ? fullName(u) : "—"; };
  const splitIds = (s: string) => s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">الخدمة العامة</h2>
        <button onClick={() => setEditing(blank())} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">+ إضافة خدمة</button>
      </div>

      <div className="space-y-3">
        {services.length === 0 && <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">لا توجد خدمات</div>}
        {services.map((s) => {
          const leadersIds = splitIds(s.Leaders_List);
          const membersIds = splitIds(s.Members_List);
          return (
            <div key={s.Service_ID} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <div className="font-bold">خدمة {s.Service_Date}</div>
                  <div className="text-xs text-muted-foreground">
                    قائد اليوم: {nameOf(s.Leader_Of_Day)} · مساعد: {nameOf(s.Assistant_Leader_Of_Day)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${s.Reminder_Sent ? "bg-success/15 text-success" : "bg-secondary"}`}>
                    {s.Reminder_Sent ? "تم التذكير" : "لم يتم التذكير"}
                  </span>
                  <button onClick={() => sendReminder(s)} className="rounded bg-gold px-2 py-1 text-gold-foreground text-xs">إرسال تذكير</button>
                  <button onClick={() => setEvaluating(s)} className="rounded bg-secondary px-2 py-1 text-xs">تقييم</button>
                  <button onClick={() => setEditing(s)} className="rounded bg-secondary px-2 py-1 text-xs">تعديل</button>
                  <button onClick={() => remove(s.Service_ID)} className="rounded bg-destructive px-2 py-1 text-destructive-foreground text-xs">حذف</button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                القادة المشاركون ({leadersIds.length}): {leadersIds.map(nameOf).join("، ") || "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                الأعضاء المشاركون ({membersIds.length}): {membersIds.map(nameOf).join("، ") || "—"}
              </div>
            </div>
          );
        })}
      </div>

      {editing && <ServiceEditor service={editing} leaders={leaders} members={members} onSave={save} onClose={() => setEditing(null)} />}
      {evaluating && <ServiceEvaluator service={evaluating} onSave={(ev) => { db.publicService.upsert({ ...evaluating, Evaluation_Data: ev }); setEvaluating(null); toast.success("تم حفظ التقييم"); }} onClose={() => setEvaluating(null)} />}
    </div>
  );
}

function ServiceEditor({ service, leaders, members, onSave, onClose }: {
  service: PublicService; leaders: User[]; members: User[];
  onSave: (s: PublicService) => void; onClose: () => void;
}) {
  const [s, setS] = useState(service);
  const toggleList = (field: "Leaders_List" | "Members_List", id: string) => {
    const ids = s[field] ? s[field].split(",").map((x) => x.trim()).filter(Boolean) : [];
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    setS({ ...s, [field]: next.join(",") });
  };
  const isOn = (field: "Leaders_List" | "Members_List", id: string) =>
    s[field].split(",").map((x) => x.trim()).includes(id);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-auto">
      <div className="w-full max-w-2xl bg-card rounded-2xl p-5 shadow-2xl my-8">
        <h3 className="text-xl font-bold mb-4">{service.Leader_Of_Day ? "تعديل" : "إضافة"} خدمة عامة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs block mb-1">التاريخ</label>
            <input type="date" value={s.Service_Date} onChange={(e) => setS({ ...s, Service_Date: e.target.value })} className="w-full rounded-lg border bg-background px-2 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs block mb-1">قائد اليوم</label>
            <select value={s.Leader_Of_Day} onChange={(e) => setS({ ...s, Leader_Of_Day: e.target.value })} className="w-full rounded-lg border bg-background px-2 py-2 text-sm">
              <option value="">—</option>
              {leaders.map((u) => <option key={u.ID} value={u.ID}>{fullName(u)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1">مساعد قائد اليوم</label>
            <select value={s.Assistant_Leader_Of_Day} onChange={(e) => setS({ ...s, Assistant_Leader_Of_Day: e.target.value })} className="w-full rounded-lg border bg-background px-2 py-2 text-sm">
              <option value="">—</option>
              {leaders.map((u) => <option key={u.ID} value={u.ID}>{fullName(u)}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="text-xs block mb-1">القادة المشاركون</label>
          <div className="flex flex-wrap gap-1 p-2 border rounded-lg max-h-40 overflow-auto">
            {leaders.map((u) => (
              <button key={u.ID} onClick={() => toggleList("Leaders_List", u.ID)}
                className={`rounded-full px-2 py-0.5 text-xs ${isOn("Leaders_List", u.ID) ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {fullName(u)}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs block mb-1">الأعضاء المشاركون</label>
          <div className="flex flex-wrap gap-1 p-2 border rounded-lg max-h-48 overflow-auto">
            {members.map((u) => (
              <button key={u.ID} onClick={() => toggleList("Members_List", u.ID)}
                className={`rounded-full px-2 py-0.5 text-xs ${isOn("Members_List", u.ID) ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {fullName(u)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg bg-secondary px-4 py-2 text-sm">إلغاء</button>
          <button onClick={() => onSave(s)} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">حفظ</button>
        </div>
      </div>
    </div>
  );
}

function ServiceEvaluator({ service, onSave, onClose }: {
  service: PublicService; onSave: (json: string) => void; onClose: () => void;
}) {
  const participants = [
    ...(service.Leaders_List ? service.Leaders_List.split(",").map((x) => x.trim()) : []),
    ...(service.Members_List ? service.Members_List.split(",").map((x) => x.trim()) : []),
  ].filter(Boolean);

  let initial: Record<string, { score: number; notes: string }> = {};
  try { initial = service.Evaluation_Data ? JSON.parse(service.Evaluation_Data) : {}; } catch {}
  const [data, setData] = useState(initial);

  const set = (id: string, patch: Partial<{ score: number; notes: string }>) =>
    setData({ ...data, [id]: { ...{ score: 0, notes: "" }, ...data[id], ...patch } });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-auto">
      <div className="w-full max-w-2xl bg-card rounded-2xl p-5 shadow-2xl my-8">
        <h3 className="text-xl font-bold mb-1">تقييم المشاركين</h3>
        <p className="text-xs text-muted-foreground mb-4">خدمة {service.Service_Date} — قائد اليوم: {db.users.get(service.Leader_Of_Day) ? fullName(db.users.get(service.Leader_Of_Day)!) : "—"}</p>
        <div className="space-y-2 max-h-96 overflow-auto">
          {participants.map((id) => {
            const u = db.users.get(id);
            const cur = data[id] || { score: 0, notes: "" };
            return (
              <div key={id} className="rounded-lg border p-2 flex flex-wrap gap-2 items-center">
                <div className="font-medium text-sm flex-1 min-w-[120px]">{u ? fullName(u) : id}</div>
                <select value={cur.score} onChange={(e) => set(id, { score: Number(e.target.value) })}
                  className="rounded border bg-background px-2 py-1 text-sm">
                  {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
                </select>
                <input value={cur.notes} onChange={(e) => set(id, { notes: e.target.value })}
                  placeholder="ملاحظات" className="rounded border bg-background px-2 py-1 text-sm flex-1 min-w-[160px]" />
              </div>
            );
          })}
          {participants.length === 0 && <div className="text-center text-muted-foreground text-sm p-4">لا يوجد مشاركون</div>}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="rounded-lg bg-secondary px-4 py-2 text-sm">إلغاء</button>
          <button onClick={() => onSave(JSON.stringify(data))} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">حفظ التقييم</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Permissions Admin ----------
function PermissionsAdmin() {
  const users = db.users.all().filter((u) => u.Status === "Active");
  const [selectedId, setSelectedId] = useState(users[0]?.ID ?? "");
  const u = db.users.get(selectedId);
  const current = (u?.Visible_Screens || "").split(",").map((s) => s.trim()).filter(Boolean);
  const [picked, setPicked] = useState<string[]>(current);
  useEffect(() => { setPicked((db.users.get(selectedId)?.Visible_Screens || "").split(",").map((s) => s.trim()).filter(Boolean)); }, [selectedId]);

  const allScreens = u?.Role === "Leader" ? ADMIN_SCREENS.map((s) => ({ key: s.key, label: s.label })) : MEMBER_SCREENS;

  const toggle = (k: string) => setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k]);
  const save = () => {
    if (!u) return;
    u.Visible_Screens = picked.join(",");
    db.users.upsert(u);
    toast.success("تم حفظ الصلاحيات");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🛡️ صلاحيات المستخدمين</h2>
      <div className="rounded-xl border bg-card p-4 mb-4">
        <label className="text-sm block mb-1">اختر مستخدماً</label>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
          {users.map((x) => <option key={x.ID} value={x.ID}>{fullName(x)} — {x.Role === "Leader" ? "قائد" : "عضو"}</option>)}
        </select>
      </div>
      {u && (
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-3">
            اترك القائمة فارغة لاستخدام الصلاحيات الافتراضية (القائد يرى كل شيء، العضو يرى الصفحات الأساسية).
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {allScreens.map((s) => (
              <label key={s.key} className="flex items-center gap-2 p-2 rounded border bg-background text-sm">
                <input type="checkbox" checked={picked.includes(s.key)} onChange={() => toggle(s.key)} />
                <span>{s.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">{s.key}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">حفظ الصلاحيات</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Account Type (upgrade Member → Leader scouting classification) ----------
function AccountTypeAdmin({ adminName }: { adminName: string }) {
  const [, force] = useState(0);
  const users = db.users.all().filter((u) => u.Status === "Active");
  const setType = (u: User, type: string) => {
    u.User_Type = type;
    if (type === "قائد") u.Role = "Leader";
    db.users.upsert(u);
    db.history.log(u.ID, "تغيير نوع الحساب", `→ ${type}`, adminName);
    toast.success("تم التحديث");
    force((x) => x + 1);
  };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🔄 تغيير نوع الحساب</h2>
      <div className="rounded-xl border bg-card divide-y">
        {users.map((u) => (
          <div key={u.ID} className="p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium text-sm">{fullName(u)}</div>
              <div className="text-xs text-muted-foreground">{u.Email} · النوع الحالي: {u.User_Type || "—"}</div>
            </div>
            <select value={u.User_Type || "عضو"} onChange={(e) => setType(u, e.target.value)}
              className="rounded-lg border bg-background px-3 py-1.5 text-sm">
              <option value="عضو">عضو</option>
              <option value="قائد">قائد</option>
            </select>
          </div>
        ))}
        {users.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">لا يوجد مستخدمون</div>}
      </div>
    </div>
  );
}

// ---------- Member Ranks Assign (leader picks rank for each of their members) ----------
function MemberRanksAssign({ adminName, user }: { adminName: string; user: User }) {
  const [, force] = useState(0);
  const ranks = [...db.memberRanks.all()].sort((a, b) => (a.Rank_Level || 0) - (b.Rank_Level || 0));
  const [newRank, setNewRank] = useState({ name: "", level: 1 });
  const isMaster = (user.Email || "").toLowerCase() === "admin@admin.com";
  // Leader sees only their patrol/team members; master/general leader sees all
  const all = db.users.all().filter((u) => u.Status === "Active" && u.User_Type !== "قائد");
  const scoped = isMaster
    ? all
    : all.filter((u) => (user.Patrol_ID && u.Patrol_ID === user.Patrol_ID) || (user.Team_ID && u.Team_ID === user.Team_ID));
  const setRank = (u: User, rankName: string) => {
    u.Rank = rankName;
    db.users.upsert(u);
    db.history.log(u.ID, "تحديد رتبة عضو", rankName, adminName);
    toast.success("تم التحديث");
    force((x) => x + 1);
  };
  const addRank = () => {
    if (!newRank.name.trim()) return;
    db.memberRanks.upsert({ Rank_ID: "MR-" + uid(), Rank_Name: newRank.name, Rank_Level: Number(newRank.level) || 1 });
    setNewRank({ name: "", level: 1 });
    toast.success("تمت إضافة الرتبة");
    force((x) => x + 1);
  };
  const removeRank = (id: string) => { db.memberRanks.remove(id); force((x) => x + 1); };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🎖️ تحديد رتب الأعضاء</h2>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-bold mb-3">قائمة الرتب (Member_Ranks)</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <input placeholder="اسم الرتبة" value={newRank.name} onChange={(e) => setNewRank({ ...newRank, name: e.target.value })}
            className="rounded-lg border bg-background px-3 py-2 text-sm flex-1 min-w-[150px]" />
          <input type="number" placeholder="المستوى" value={newRank.level} onChange={(e) => setNewRank({ ...newRank, level: Number(e.target.value) })}
            className="rounded-lg border bg-background px-3 py-2 text-sm w-24" />
          <button onClick={addRank} className="rounded-lg bg-primary px-4 text-primary-foreground text-sm">إضافة</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranks.map((r) => (
            <span key={r.Rank_ID} className="rounded-full bg-secondary px-3 py-1 text-xs flex items-center gap-2">
              {r.Rank_Name} <span className="text-muted-foreground">L{r.Rank_Level}</span>
              <button onClick={() => removeRank(r.Rank_ID)} className="text-destructive">×</button>
            </span>
          ))}
          {ranks.length === 0 && <span className="text-xs text-muted-foreground">أضف رتباً أولاً</span>}
        </div>
      </div>

      <div className="rounded-xl border bg-card divide-y">
        {scoped.map((u) => (
          <div key={u.ID} className="p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium text-sm">{fullName(u)}</div>
              <div className="text-xs text-muted-foreground">
                {db.teams.get(u.Team_ID)?.Team_Name ?? "—"} · {db.patrols.get(u.Patrol_ID)?.Patrol_Name ?? "—"} · رتبة حالية: {u.Rank || "—"}
              </div>
            </div>
            <select value={u.Rank || ""} onChange={(e) => setRank(u, e.target.value)}
              className="rounded-lg border bg-background px-3 py-1.5 text-sm">
              <option value="">—</option>
              {ranks.map((r) => <option key={r.Rank_ID} value={r.Rank_Name}>{r.Rank_Name}</option>)}
            </select>
          </div>
        ))}
        {scoped.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">لا يوجد أعضاء ضمن نطاقك</div>}
      </div>
    </div>
  );
}

// ---------- Leader Ranks & Tasks CRUD ----------
function LeaderRanksTasksAdmin() {
  const [, force] = useState(0);
  const rows = [...db.leaderRanksTasks.all()].sort((a, b) => (a.Structure_Level || 0) - (b.Structure_Level || 0));
  const blank = (): LeaderRankTask => ({ Task_Rank_ID: "LR-" + uid(), Rank_Name: "", Task_Name: "", Structure_Level: 1 });
  const [editing, setEditing] = useState<LeaderRankTask | null>(null);
  const save = (r: LeaderRankTask) => {
    if (!r.Rank_Name.trim()) return toast.error("اسم الرتبة مطلوب");
    db.leaderRanksTasks.upsert({ ...r, Structure_Level: Number(r.Structure_Level) || 1 });
    setEditing(null); toast.success("تم الحفظ"); force((x) => x + 1);
  };
  const remove = (id: string) => {
    if (db.users.all().some((u) => u.Leader_Rank_ID === id))
      return toast.error("لا يمكن الحذف — يوجد قادة مرتبطون بهذه الرتبة");
    db.leaderRanksTasks.remove(id); force((x) => x + 1);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">🏛️ إدارة رتب ومهام القادة</h2>
        <button onClick={() => setEditing(blank())} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">+ إضافة</button>
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="p-2">المستوى</th><th className="p-2 text-right">اسم الرتبة</th>
            <th className="p-2 text-right">المهمة</th><th className="p-2">إجراء</th>
          </tr></thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.Task_Rank_ID}>
                <td className="p-2 text-center font-bold">{r.Structure_Level}</td>
                <td className="p-2 text-right">{r.Rank_Name}</td>
                <td className="p-2 text-right text-xs text-muted-foreground">{r.Task_Name}</td>
                <td className="p-2 text-center">
                  <button onClick={() => setEditing(r)} className="rounded bg-secondary px-2 py-1 text-xs">تعديل</button>
                  <button onClick={() => remove(r.Task_Rank_ID)} className="rounded bg-destructive px-2 py-1 text-destructive-foreground text-xs mr-1">حذف</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">لا توجد رتب</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4">
        <h3 className="font-bold mb-3">ربط القادة برتبهم</h3>
        <div className="divide-y">
          {db.users.all().filter((u) => u.Status === "Active" && u.User_Type === "قائد").map((u) => (
            <div key={u.ID} className="py-2 flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{fullName(u)}</div>
              <select value={u.Leader_Rank_ID || ""} onChange={(e) => { u.Leader_Rank_ID = e.target.value; db.users.upsert(u); force((x) => x + 1); }}
                className="rounded-lg border bg-background px-3 py-1.5 text-sm">
                <option value="">—</option>
                {rows.map((r) => <option key={r.Task_Rank_ID} value={r.Task_Rank_ID}>{r.Rank_Name} (L{r.Structure_Level})</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-auto">
          <div className="w-full max-w-md bg-card rounded-2xl p-5 shadow-2xl my-8">
            <h3 className="text-xl font-bold mb-4">{editing.Rank_Name ? "تعديل" : "إضافة"} رتبة قائد</h3>
            <div className="space-y-3">
              <div><label className="text-xs block mb-1">اسم الرتبة</label>
                <input value={editing.Rank_Name} onChange={(e) => setEditing({ ...editing, Rank_Name: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></div>
              <div><label className="text-xs block mb-1">المهمة</label>
                <input value={editing.Task_Name} onChange={(e) => setEditing({ ...editing, Task_Name: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></div>
              <div><label className="text-xs block mb-1">مستوى الهيكل (1 = الأعلى)</label>
                <input type="number" value={editing.Structure_Level} onChange={(e) => setEditing({ ...editing, Structure_Level: Number(e.target.value) })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setEditing(null)} className="rounded-lg bg-secondary px-4 py-2 text-sm">إلغاء</button>
              <button onClick={() => save(editing)} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- News Admin ----------
function NewsAdmin({ adminName, userId }: { adminName: string; userId: string }) {
  const [, force] = useState(0);
  const [f, setF] = useState({ title: "", content: "" });
  const [imgs, setImgs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const urls = await uploadImages(Array.from(files));
      setImgs((p) => [...p, ...urls]);
      toast.success(`تم رفع ${urls.length} صورة`);
    } catch (e) {
      toast.error("فشل رفع الصور: " + (e instanceof Error ? e.message : String(e)));
    } finally { setUploading(false); }
  };
  const removeImg = (url: string) => setImgs((p) => p.filter((x) => x !== url));

  const publish = () => {
    if (!f.title.trim() || !f.content.trim()) return toast.error("العنوان والمحتوى مطلوبان");
    const item: NewsItem = {
      News_ID: "NW-" + uid(),
      Timestamp: new Date().toISOString(),
      Title: f.title, Content: f.content,
      News_Images: imgs.join(","), Created_By: userId,
    };
    db.news.upsert(item);
    db.history.log(userId, "نشر خبر جديد", f.title, adminName);
    setF({ title: "", content: "" }); setImgs([]);
    toast.success("تم نشر الخبر");
    force((x) => x + 1);
  };
  const remove = (id: string) => { db.news.remove(id); force((x) => x + 1); };

  const all = [...db.news.all()].sort((a, b) => (b.Timestamp || "").localeCompare(a.Timestamp || ""));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📰 إضافة خبر جديد</h2>
      <div className="rounded-xl border bg-card p-4 mb-6 space-y-3">
        <input placeholder="عنوان الخبر" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        <textarea placeholder="محتوى الخبر" rows={5} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        <div>
          <label className="text-sm font-medium block mb-1">صور الخبر (يمكن اختيار أكثر من صورة)</label>
          <input type="file" accept="image/*" multiple disabled={uploading}
            onChange={(e) => onFiles(e.target.files)} className="block text-sm disabled:opacity-50" />
          {uploading && <div className="mt-1 text-xs text-primary flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            جاري رفع الصور...
          </div>}
          {imgs.length > 0 && (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {imgs.map((u) => (
                <div key={u} className="relative">
                  <img src={u} alt="" className="h-20 w-full object-cover rounded" />
                  <button onClick={() => removeImg(u)} className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 text-xs">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={publish} disabled={uploading}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium disabled:opacity-50">نشر الخبر</button>
      </div>

      <h3 className="font-bold mb-2">الأخبار المنشورة</h3>
      <div className="space-y-2">
        {all.map((n) => (
          <div key={n.News_ID} className="rounded-xl border bg-card p-3 flex justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium text-sm">{n.Title}</div>
              <div className="text-xs text-muted-foreground">{new Date(n.Timestamp).toLocaleString("ar-EG")}</div>
            </div>
            <button onClick={() => remove(n.News_ID)} className="text-destructive text-xs self-start">حذف</button>
          </div>
        ))}
        {all.length === 0 && <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">لا توجد أخبار</div>}
      </div>
    </div>
  );
}

// ---------- Vision & Mission Admin ----------
function VisionAdmin({ adminName }: { adminName: string }) {
  const [, force] = useState(0);
  const v = db.visionMission.getLatest("Vision");
  const m = db.visionMission.getLatest("Mission");
  const [vision, setVision] = useState(v?.Content || "");
  const [mission, setMission] = useState(m?.Content || "");
  const save = (type: "Vision" | "Mission", text: string) => {
    db.visionMission.setText(type, text, adminName);
    toast.success("تم الحفظ");
    force((x) => x + 1);
  };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🎯 الرؤية والرسالة</h2>
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-bold mb-2">الرؤية (الرؤية)</h3>
        <textarea rows={5} value={vision} onChange={(e) => setVision(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm mb-2" />
        <button onClick={() => save("Vision", vision)} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">حفظ الرؤية</button>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-bold mb-2">الرسالة (الرسالة)</h3>
        <textarea rows={5} value={mission} onChange={(e) => setMission(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm mb-2" />
        <button onClick={() => save("Mission", mission)} className="rounded-lg bg-gold px-4 py-2 text-gold-foreground text-sm font-medium">حفظ الرسالة</button>
      </div>
    </div>
  );
}
