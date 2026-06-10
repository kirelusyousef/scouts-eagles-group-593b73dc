import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";

export function PatrolCompetition() {
  const [, force] = useState(0);
  const { user } = useAuth();
  useEffect(() => {
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const ranked = useMemo(() => {
    const userTeamId = user?.Team_ID;
    const rows = db.patrols.all()
      .filter((p) => (userTeamId ? p.Team_ID === userTeamId : true))
      .map((p) => ({
        ...p,
        team: db.teams.get(p.Team_ID)?.Team_Name ?? "—",
      }))
      .sort((a, b) => (b.Total_Points || 0) - (a.Total_Points || 0));
    return rows;
  }, [user?.Team_ID]);

  if (ranked.length === 0) return null;
  const max = Math.max(1, ...ranked.map((r) => r.Total_Points || 0));

  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);

  return (
    <section className="rounded-2xl border bg-gradient-to-br from-card to-secondary/40 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold">مؤشر تنافس الطلائع الحركي</h3>
          <p className="text-xs text-muted-foreground">ترتيب الطلائع وفقاً للنقاط المسجلة</p>
        </div>
        <span className="text-2xl">🏆</span>
      </div>
      <div className="space-y-3">
        {ranked.slice(0, 8).map((p, i) => {
          const pct = Math.round(((p.Total_Points || 0) / max) * 100);
          return (
            <div key={p.Patrol_ID}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{medal(i)}</span>
                  <span className="font-semibold truncate">{p.Patrol_Name}</span>
                  <span className="text-xs text-muted-foreground truncate">· {p.team}</span>
                </div>
                <span className="font-bold text-primary tabular-nums">{p.Total_Points || 0}</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full animate-sms-grow-x ${
                    i === 0
                      ? "bg-gradient-to-l from-gold to-accent"
                      : i === 1
                      ? "bg-gradient-to-l from-primary to-primary/60"
                      : "bg-gradient-to-l from-success to-success/60"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
