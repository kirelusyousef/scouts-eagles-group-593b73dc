import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, syncFromCloud, type GroupAward } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/honor")({
  component: HonorPage,
  head: () => ({
    meta: [
      { title: "لوحة شرف المجموعة" },
      { name: "description", content: "شهادات وجوائز المجموعة الكشفية مرتبة من الأحدث للأقدم." },
    ],
  }),
});

function HonorPage() {
  const [, force] = useState(0);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    syncFromCloud().catch(() => {});
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const items: GroupAward[] = [...db.groupAwards.all()].sort((a, b) => {
    const ya = Number(a.Year) || 0;
    const yb = Number(b.Year) || 0;
    if (yb !== ya) return yb - ya;
    return (b.Created_At || "").localeCompare(a.Created_At || "");
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-primary">🏆 لوحة شرف المجموعة</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            جوائز وشهادات المجموعة بالمراكز التي حصلنا عليها
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
            لا توجد جوائز مسجلة بعد
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <article
                key={a.Award_ID}
                className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition"
              >
                {a.Trophy_Image ? (
                  <button
                    onClick={() => setZoom(a.Trophy_Image)}
                    className="block w-full h-48 bg-secondary/30"
                  >
                    <img
                      src={a.Trophy_Image}
                      alt={a.Team_Or_Committee}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ) : (
                  <div className="h-48 grid place-items-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 text-7xl">
                    {a.Award_Type === "كأس" ? "🏆" : "🛡️"}
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {a.Award_Type || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">{a.Year}</span>
                  </div>
                  <h2 className="font-bold text-base leading-snug">{a.Team_Or_Committee}</h2>
                  {a.Certificate_Image && (
                    <button
                      onClick={() => setZoom(a.Certificate_Image)}
                      className="block w-full rounded-lg border overflow-hidden hover:opacity-90 transition"
                    >
                      <img
                        src={a.Certificate_Image}
                        alt="الشهادة"
                        className="h-32 w-full object-cover"
                      />
                      <div className="bg-secondary/50 py-1 text-[11px] font-medium">
                        عرض الشهادة
                      </div>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 cursor-zoom-out"
        >
          <img src={zoom} alt="" className="max-h-[90vh] max-w-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
