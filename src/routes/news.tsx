import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, fullName, syncFromCloud, isGeneralLeader, uid, type NewsItem } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/news")({ component: NewsPage });

function NewsPage() {
  const { user } = useAuth();
  const [, force] = useState(0);
  const canAdd = isGeneralLeader(user);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    syncFromCloud().catch(() => {});
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const items = [...db.news.all()].sort((a, b) =>
    (b.Timestamp || "").localeCompare(a.Timestamp || "")
  );

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("يرجى إدخال العنوان والمحتوى");
      return;
    }
    setSaving(true);
    const row: NewsItem = {
      News_ID: "N-" + uid(),
      Timestamp: new Date().toISOString(),
      Title: title.trim(),
      Content: content.trim(),
      News_Images: "",
      Created_By: user?.ID || "",
    };
    try {
      db.news.upsert(row);
      toast.success("تمت إضافة الخبر بنجاح");
      setTitle("");
      setContent("");
      setShowForm(false);
    } catch {
      toast.error("تعذر حفظ الخبر");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">أخبار المجموعة</h1>
          {canAdd && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {showForm ? "إلغاء" : "+ إضافة خبر جديد"}
            </button>
          )}
        </div>

        {canAdd && showForm && (
          <div className="rounded-2xl border bg-card p-5 mb-6 space-y-3 shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-1">عنوان الخبر</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="اكتب عنوان الخبر..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تفاصيل الخبر</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="اكتب التفاصيل الكاملة..."
              />
            </div>
            <button
              disabled={saving}
              onClick={submit}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "نشر الخبر"}
            </button>
          </div>
        )}

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
                  <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth" dir="ltr">
                    {imgs.map((u, i) => (
                      <img
                        key={i}
                        src={u}
                        alt=""
                        className="snap-center shrink-0 w-full h-64 object-cover"
                      />
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
