import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, syncFromCloud } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/vision")({ component: VisionPage });

function VisionPage() {
  const [, force] = useState(0);
  useEffect(() => {
    syncFromCloud().catch(() => {});
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const vision = db.visionMission.getLatest("Vision");
  const mission = db.visionMission.getLatest("Mission");

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <section className="rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-primary mb-3">🎯 رؤيتنا</h2>
          <p className="text-lg leading-relaxed whitespace-pre-wrap">
            {vision?.Content || "لم يتم تحديد رؤية المجموعة بعد"}
          </p>
        </section>
        <section className="rounded-2xl border bg-gradient-to-br from-gold/10 to-card p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-gold mb-3">📜 رسالتنا</h2>
          <p className="text-lg leading-relaxed whitespace-pre-wrap">
            {mission?.Content || "لم يتم تحديد رسالة المجموعة بعد"}
          </p>
        </section>
      </main>
    </div>
  );
}
