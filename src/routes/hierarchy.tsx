import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, fullName, syncFromCloud, type User } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/hierarchy")({ component: HierarchyPage });

const LEVEL_COLORS = ["bg-primary", "bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-purple-600", "bg-rose-600"];

function LeaderCard({ u, badge }: { u: User; badge?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-3 shadow-sm transition hover:shadow-md">
      <div className="h-12 w-12 shrink-0 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-sm font-bold">
        {u.Profile_Photo
          ? <img src={u.Profile_Photo} className="h-full w-full object-cover" alt="" />
          : (u.First_Name?.[0] || "?")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm truncate">{fullName(u)}</div>
        {badge && <div className="text-xs text-primary mt-0.5">{badge}</div>}
        {u.Rank && <div className="text-[11px] text-muted-foreground truncate">{u.Rank}</div>}
      </div>
    </div>
  );
}

function LevelCard({ n, title, color, children }: {
  n: number; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <span className={`rounded-full ${color} text-white text-xs font-bold px-3 py-1 shadow`}>
          المستوى {n}
        </span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const weightOf = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
};

function HierarchyPage() {
  const [, force] = useState(0);
  useEffect(() => {
    syncFromCloud().catch(() => {});
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const leaders = db.users.all().filter((u) => u.User_Type === "قائد" && u.Status === "Active");
  const tasks = db.leaderRanksTasks.all();
  const teams = db.teams.all();
  const committees = db.committees.all();
  const teamRoles = db.teamRoles.all();
  const committeeRoles = db.committeeRoles.all();
  const levels = [...db.hierarchyLevels.all()].sort(
    (a, b) => Number(a.Level_Number) - Number(b.Level_Number),
  );

  const taskOf = (id?: string) => tasks.find((t) => t.Task_Rank_ID === id);
  const teamRoleOf = (id?: string) => teamRoles.find((r) => r.Team_Role_ID === id);
  const committeeRoleOf = (id?: string) => committeeRoles.find((r) => r.Committee_Role_ID === id);

  // Weight from Leader_Ranks_Tasks.Order_Weight (primary source of truth)
  const leaderWeight = (u: User): number => weightOf(taskOf(u.Leader_Rank_ID)?.Order_Weight);

  const isBaraem = (name?: string) => /برا?عم/.test(name || "");

  // Group leaders for a given level
  const leadersOfLevel = (levelNumber: number) =>
    leaders.filter((u) => Number(taskOf(u.Leader_Rank_ID)?.Structure_Level) === Number(levelNumber));

  const renderFlat = (lvl: number) => {
    const list = leadersOfLevel(lvl).sort((a, b) => leaderWeight(a) - leaderWeight(b));
    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground italic">لا يوجد قادة في هذا المستوى</p>;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((u) => (
          <LeaderCard key={u.ID} u={u} badge={taskOf(u.Leader_Rank_ID)?.Rank_Name} />
        ))}
      </div>
    );
  };

  const renderTeams = (lvl: number) => {
    const list = leadersOfLevel(lvl);
    const sortedTeams = [...teams].sort((a, b) => {
      const ab = isBaraem(a.Team_Name) ? 0 : 1;
      const bb = isBaraem(b.Team_Name) ? 0 : 1;
      return ab - bb || (a.Team_Name || "").localeCompare(b.Team_Name || "", "ar");
    });
    const groups = sortedTeams
      .map((t) => ({
        team: t,
        members: list
          .filter((u) => u.Team_ID === t.Team_ID)
          .sort((a, b) => leaderWeight(a) - leaderWeight(b)),
      }))
      .filter((g) => g.members.length > 0);

    if (groups.length === 0) {
      return <p className="text-sm text-muted-foreground italic">لا توجد فرق مسجلة بقادة</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(({ team, members }) => (
          <div key={team.Team_ID} className="rounded-xl border-2 border-emerald-500/30 bg-background p-4">
            <div className="font-bold mb-3 text-emerald-700 dark:text-emerald-400">📛 {team.Team_Name}</div>
            <div className="space-y-2">
              {members.map((u) => (
                <LeaderCard key={u.ID} u={u} badge={teamRoleOf(u.Team_Role_ID)?.Role_Name || taskOf(u.Leader_Rank_ID)?.Rank_Name} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCommittees = (lvl: number) => {
    const list = leadersOfLevel(lvl);
    const groups = committees
      .map((c) => ({
        committee: c,
        members: list
          .filter((u) => u.Committee_ID === c.Committee_ID)
          .sort((a, b) => leaderWeight(a) - leaderWeight(b)),
      }))
      .filter((g) => g.members.length > 0);

    if (groups.length === 0) {
      return <p className="text-sm text-muted-foreground italic">لا توجد لجان مسجلة بأعضاء</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(({ committee, members }) => (
          <div key={committee.Committee_ID} className="rounded-xl border-2 border-amber-500/30 bg-background p-4">
            <div className="font-bold mb-3 text-amber-700 dark:text-amber-400">🏛️ {committee.Committee_Name}</div>
            <div className="space-y-2">
              {members.map((u) => (
                <LeaderCard key={u.ID} u={u} badge={committeeRoleOf(u.Committee_Role_ID)?.Role_Name || taskOf(u.Leader_Rank_ID)?.Rank_Name} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Decide rendering per level: teams group / committees group / flat.
  const renderLevel = (levelNumber: number, levelName: string) => {
    const name = (levelName || "").trim();
    if (/فرق/.test(name)) return renderTeams(levelNumber);
    if (/لجان|لجنة/.test(name)) return renderCommittees(levelNumber);
    return renderFlat(levelNumber);
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-primary mb-1">🌳 الهيكل التنظيمي للمجموعة</h1>
          <p className="text-sm text-muted-foreground">
            عرض كامل لقادة المجموعة وفقاً للمستويات والأوزان المعرّفة في قاعدة البيانات.
          </p>
        </header>

        {levels.length === 0 && (
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
            لم يتم تعريف أي مستويات هرمية بعد. أضف مستويات من شاشة "إدارة مستويات الهيكل التنظيمي".
          </div>
        )}

        {levels.map((lvl) => {
          const n = Number(lvl.Level_Number);
          const color = LEVEL_COLORS[(n - 1) % LEVEL_COLORS.length] || "bg-primary";
          return (
            <LevelCard key={lvl.Level_ID} n={n} title={`${lvl.Level_Name}`} color={color}>
              {renderLevel(n, lvl.Level_Name)}
            </LevelCard>
          );
        })}
      </main>
    </div>
  );
}
