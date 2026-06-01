import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, fullName, syncFromCloud } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/news")({ component: NewsPage });

function NewsPage() {
  const [, force] = useState(0);
  useEffect(() => {
    syncFromCloud().catch(() => {});
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const items = [...db.news.all()].sort((a, b) =>
    (b.Timestamp || "").localeCompare(a.Timestamp || "")
  );

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">أخبار المجموعة</h1>

        {items.length === 0 && (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            لا توجد أخبار بعد
          </div>
        )}

        <div className="space-y-5">
          {items.map((n) => {
            const imgs = (n.News_Images || "").split(",").map((x) => x.trim()).filter(Boolean);
            const author = db.users.get(n.Created_By);
            return (
              <article key={n.News_ID} className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                {imgs.length > 0 && (
                  <div className={`grid gap-1 ${imgs.length === 1 ? "" : "grid-cols-2"}`}>
                    {imgs.map((u, i) => (
                      <img key={i} src={u} alt="" className="w-full h-56 object-cover" />
                    ))}
                  </div>
                )}
                <div className="p-5">
                  <h2 className="text-xl font-bold mb-2">{n.Title}</h2>
                  <div className="text-xs text-muted-foreground mb-3">
                    {new Date(n.Timestamp).toLocaleString("ar-EG")}
                    {author && <> · بواسطة {fullName(author)}</>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.Content}</p>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
