import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Newspaper, Search } from "lucide-react";
import { db, syncFromCloud, type NewsItem } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";
import { NewsCard } from "./news";

export const Route = createFileRoute("/news/all")({ component: AllNewsPage });

const PAGE = 10;

function monthLabel(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "أخرى";
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long" });
}

function AllNewsPage() {
  const nav = useNavigate();
  const [, force] = useState(0);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    syncFromCloud().catch(() => {});
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const items = useMemo(() => {
    const all = [...db.news.all()].sort((a, b) => (b.Timestamp || "").localeCompare(a.Timestamp || ""));
    const query = q.trim();
    if (!query) return all;
    return all.filter((n) => (n.Title || "").includes(query) || (n.Content || "").includes(query));
  }, [q, force as unknown as number]);

  const visible = items.slice(0, limit);

  const groups = useMemo(() => {
    const out: { label: string; rows: NewsItem[] }[] = [];
    for (const n of visible) {
      const label = monthLabel(n.Timestamp);
      const last = out[out.length - 1];
      if (last && last.label === label) last.rows.push(n);
      else out.push({ label, rows: [n] });
    }
    return out;
  }, [visible]);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => nav({ to: "/news" })}
            aria-label="رجوع"
            className="grid h-10 w-10 place-items-center rounded-xl border bg-card transition press hover:bg-secondary"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">كل الأخبار</h1>
        </div>

        <div className="relative mb-5">
          <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }}
            placeholder="ابحث في الأخبار..."
            className="w-full rounded-2xl border bg-card py-3 pe-10 ps-4 text-sm outline-none shadow-soft focus:ring-2 focus:ring-ring"
          />
        </div>

        {items.length === 0 && (
          <div className="grid place-items-center rounded-2xl border bg-card p-10 text-center">
            <Newspaper className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium">لا توجد أخبار مطابقة</p>
            <p className="mt-1 text-sm text-muted-foreground">جرّب كلمة بحث مختلفة</p>
          </div>
        )}

        {groups.map((g) => (
          <section key={g.label} className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-gold" />
              {g.label}
            </h2>
            <div className="space-y-3">
              {g.rows.map((n) => (
                <NewsCard key={n.News_ID} item={n} onOpen={() => nav({ to: "/news/$id", params: { id: n.News_ID } })} />
              ))}
            </div>
          </section>
        ))}

        {items.length > limit && (
          <button
            onClick={() => setLimit((v) => v + PAGE)}
            className="w-full rounded-2xl border border-gold/40 bg-accent py-3 text-sm font-bold text-primary transition press hover:bg-accent/80"
          >
            تحميل المزيد ({items.length - limit} متبقي)
          </button>
        )}
      </main>
    </div>
  );
}
