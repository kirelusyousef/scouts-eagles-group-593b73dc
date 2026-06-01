import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, fullName, syncFromCloud, type User, type LeaderStructureRule } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/hierarchy")({ component: HierarchyPage });

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

/** Returns Order_Weight for a leader within a given level, based on Leader_Structure_Rules.
 *  Looks up by Role_Name across (leader rank task name, team role name, committee role name). */
function makeWeightLookup(rules: LeaderStructureRule[], level: number) {
  const lvlRules = rules.filter((r) => r.Level === level);
  const byName = new Map<string, number>();
  for (const r of lvlRules) byName.set((r.Role_Name || "").trim(), r.Order_Weight ?? 99);
  return (name?: string) => (name ? (byName.get(name.trim()) ?? 99) : 99);
}

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
  const rules = db.leaderStructureRules.all();

  const taskOf = (id?: string) => tasks.find((t) => t.Task_Rank_ID === id);
  const teamRoleOf = (id?: string) => teamRoles.find((r) => r.Team_Role_ID === id);
  const committeeRoleOf = (id?: string) => committeeRoles.find((r) => r.Committee_Role_ID === id);

  // Categories per level (from Leader_Structure_Rules — distinct Category for that level).
  const categoryOfLevel = (lvl: number): string | undefined =>
    rules.find((r) => r.Level === lvl)?.Category;

  const lvl1Title = "المستوى 1: راعي النشاط";
  const lvl2Title = "المستوى 2: القيادة العامة";
  const lvl3Title = "المستوى 3: الفرق الكشفية";
  const lvl4Title = "المستوى 4: اللجان الكشفية";

  // Per-level Role_Name → Order_Weight lookups (fallback from Leader_Structure_Rules)
  const w1 = makeWeightLookup(rules, 1);
  const w3 = makeWeightLookup(rules, 3);
  const w4 = makeWeightLookup(rules, 4);

  // Primary weight: Leader_Ranks_Tasks.Order_Weight (strict Number).
  const taskWeight = (u: User): number => {
    const t = taskOf(u.Leader_Rank_ID);
    const n = Number(t?.Order_Weight);
    return Number.isFinite(n) && n > 0 ? n : 99;
  };

  // Level 1 — leaders whose Leader_Ranks_Tasks.Structure_Level === 1
  const lvl1 = leaders
    .filter((u) => taskOf(u.Leader_Rank_ID)?.Structure_Level === 1)
    .sort((a, b) => taskWeight(a) - taskWeight(b) || w1(taskOf(a.Leader_Rank_ID)?.Rank_Name) - w1(taskOf(b.Leader_Rank_ID)?.Rank_Name));

  // Level 2 — Structure_Level === 2, strict ascending Order_Weight
  // (قائد المجموعة Weight=1 يظهر أولاً، ثم النائب Weight=2 …)
  const lvl2 = leaders
    .filter((u) => taskOf(u.Leader_Rank_ID)?.Structure_Level === 2)
    .sort((a, b) => taskWeight(a) - taskWeight(b));

  // Level 3 — Teams. براعم first, then others.
  const isBaraem = (name: string) => /برا?عم/.test(name || "");
  const sortedTeams = [...teams].sort((a, b) => {
    const ab = isBaraem(a.Team_Name) ? 0 : 1;
    const bb = isBaraem(b.Team_Name) ? 0 : 1;
    return ab - bb || (a.Team_Name || "").localeCompare(b.Team_Name || "");
  });
  const teamGroups = sortedTeams.map((t) => {
    const members = leaders
      .filter((u) => u.Team_ID === t.Team_ID && u.Team_Role_ID)
      .sort((a, b) =>
        taskWeight(a) - taskWeight(b) ||
        w3(teamRoleOf(a.Team_Role_ID)?.Role_Name) - w3(teamRoleOf(b.Team_Role_ID)?.Role_Name),
      );
    return { team: t, members };
  }).filter((g) => g.members.length > 0);

  // Level 4 — Committees
  const committeeGroups = committees.map((c) => {
    const members = leaders
      .filter((u) => u.Committee_ID === c.Committee_ID && u.Committee_Role_ID)
      .sort((a, b) =>
        taskWeight(a) - taskWeight(b) ||
        w4(committeeRoleOf(a.Committee_Role_ID)?.Role_Name) - w4(committeeRoleOf(b.Committee_Role_ID)?.Role_Name),
      );
    return { committee: c, members };
  }).filter((g) => g.members.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-primary mb-1">🌳 التقرير الهرمي للمجموعة</h1>
          <p className="text-sm text-muted-foreground">عرض كامل لقادة المجموعة عبر القيادة العامة، الفرق، واللجان.</p>
        </header>

        <LevelCard n={1} title={lvl1Title} color="bg-primary">
          {lvl1.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">لا يوجد قادة في هذا المستوى</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lvl1.map((u) => (
                <LeaderCard key={u.ID} u={u} badge={taskOf(u.Leader_Rank_ID)?.Rank_Name} />
              ))}
            </div>
          )}
        </LevelCard>

        <LevelCard n={2} title={lvl2Title} color="bg-blue-600">
          {lvl2.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">لا يوجد قادة مسجلون</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lvl2.map((u) => (
                <LeaderCard key={u.ID} u={u} badge={taskOf(u.Leader_Rank_ID)?.Rank_Name} />
              ))}
            </div>
          )}
        </LevelCard>

        <LevelCard n={3} title={lvl3Title} color="bg-emerald-600">
          {teamGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">لا توجد فرق مسجلة بقادة</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamGroups.map(({ team, members }) => (
                <div key={team.Team_ID} className="rounded-xl border-2 border-emerald-500/30 bg-background p-4">
                  <div className="font-bold mb-3 text-emerald-700 dark:text-emerald-400">📛 {team.Team_Name}</div>
                  <div className="space-y-2">
                    {members.map((u) => (
                      <LeaderCard key={u.ID} u={u} badge={teamRoleOf(u.Team_Role_ID)?.Role_Name} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </LevelCard>

        <LevelCard n={4} title={lvl4Title} color="bg-amber-600">
          {committeeGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">لا توجد لجان مسجلة بأعضاء</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {committeeGroups.map(({ committee, members }) => (
                <div key={committee.Committee_ID} className="rounded-xl border-2 border-amber-500/30 bg-background p-4">
                  <div className="font-bold mb-3 text-amber-700 dark:text-amber-400">🏛️ {committee.Committee_Name}</div>
                  <div className="space-y-2">
                    {members.map((u) => (
                      <LeaderCard key={u.ID} u={u} badge={committeeRoleOf(u.Committee_Role_ID)?.Role_Name} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </LevelCard>
      </main>
    </div>
  );
}
