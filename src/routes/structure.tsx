import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, fullName, type User, type LeaderRankTask } from "@/lib/db";
import { syncFromCloud } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/structure")({ component: StructurePage });

function StructurePage() {
  const [, force] = useState(0);
  useEffect(() => {
    syncFromCloud().catch(() => {});
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const tasks = db.leaderRanksTasks.all();
  const leaders = db.users.all().filter((u) => u.Status === "Active" && u.User_Type === "قائد");

  // Group by Structure_Level
  const byLevel = new Map<number, { task: LeaderRankTask; leaders: User[] }[]>();
  for (const t of tasks) {
    const lvl = Number(t.Structure_Level) || 0;
    const item = { task: t, leaders: leaders.filter((u) => u.Leader_Rank_ID === t.Task_Rank_ID) };
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(item);
  }
  const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);
  const orphans = leaders.filter((u) => !tasks.some((t) => t.Task_Rank_ID === u.Leader_Rank_ID));

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">الهيكل التنظيمي للمجموعة</h1>

        {levels.length === 0 && (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            لا توجد بيانات للهيكل التنظيمي بعد
          </div>
        )}

        <div className="space-y-6">
          {levels.map((lvl) => (
            <section key={lvl} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="rounded-full bg-primary text-primary-foreground text-xs font-bold px-3 py-1">
                  المستوى {lvl}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {byLevel.get(lvl)!.map(({ task, leaders: ls }) => (
                  <div key={task.Task_Rank_ID} className="rounded-xl border bg-background p-4">
                    <div className="font-bold text-lg">{task.Rank_Name}</div>
                    <div className="text-xs text-muted-foreground mb-3">{task.Task_Name}</div>
                    {ls.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic">شاغر</div>
                    ) : (
                      <ul className="space-y-1.5">
                        {ls.map((u) => (
                          <li key={u.ID} className="flex items-center gap-2 text-sm">
                            <div className="h-8 w-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-xs">
                              {u.Profile_Photo
                                ? <img src={u.Profile_Photo} className="h-full w-full object-cover" alt="" />
                                : u.First_Name[0]}
                            </div>
                            <span className="font-medium">{fullName(u)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {orphans.length > 0 && (
          <section className="mt-6 rounded-2xl border bg-card p-5">
            <h3 className="font-bold mb-3">قادة بدون رتبة محددة</h3>
            <div className="flex flex-wrap gap-2">
              {orphans.map((u) => (
                <span key={u.ID} className="rounded-full bg-secondary px-3 py-1 text-sm">{fullName(u)}</span>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
