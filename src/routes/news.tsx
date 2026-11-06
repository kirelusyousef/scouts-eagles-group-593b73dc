import { createFileRoute, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, Newspaper, Plus, X } from "lucide-react";
import { db, syncFromCloud, isGeneralLeader, uid, type NewsItem } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";
import { useAuth } from "@/lib/auth";
import { uploadImages } from "@/lib/upload";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { toast } from "sonner";

export const Route = createFileRoute("/news")({ component: NewsPage });

export function newsImages(n: NewsItem): string[] {
  return (n.News_Images || "").split(",").map((x) => x.trim()).filter(Boolean);
}

export function relTime(ts: string): string {
  const t = new Date(ts).getTime();
  if (!t) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "منذ ساعة" : hours === 2 ? "منذ ساعتين" : `منذ ${hours} ساعات`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  if (days < 30) return `منذ ${days} أيام`;
  return new Date(ts).toLocaleDateString("ar-EG");
}

function NewsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChildRoute = pathname !== "/news" && pathname.startsWith("/news/");
  const [, force] = useState(0);
  const canAdd = isGeneralLeader(user);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    syncFromCloud().catch(() => {});
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const items = [...db.news.all()].sort((a, b) =>
    (b.Timestamp || "").localeCompare(a.Timestamp || "")
  );

  if (isChildRoute) return <Outlet />;

  const slides = items.slice(0, 3);
  const rest = items.slice(3, 8);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6">
        {items.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border bg-card p-10 text-center">
            <Newspaper className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium">لا توجد أخبار بعد</p>
            <p className="mt-1 text-sm text-muted-foreground">تابعنا قريباً لمعرفة آخر أخبار المجموعة</p>
          </div>
        ) : (
          <>
            <NewsSlider slides={slides} onOpen={(id) => nav({ to: "/news/$id", params: { id } })} />

            <div className="mb-3 mt-6 flex items-center justify-between">
              <h2 className="text-lg font-bold">آخر الأخبار</h2>
              <button
                onClick={() => nav({ to: "/news/all" })}
                className="flex items-center gap-1 text-sm font-medium text-gold transition press hover:opacity-80"
              >
                المزيد <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {rest.map((n) => (
                <NewsCard key={n.News_ID} item={n} onOpen={() => nav({ to: "/news/$id", params: { id: n.News_ID } })} />
              ))}
              {rest.length === 0 && slides.length > 0 && (
                <p className="rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground">
                  هذه كل الأخبار المتاحة حالياً
                </p>
              )}
            </div>

            {items.length > 3 && (
              <button
                onClick={() => nav({ to: "/news/all" })}
                className="mt-5 w-full rounded-2xl border border-gold/40 bg-accent py-3 text-sm font-bold text-primary transition press hover:bg-accent/80"
              >
                عرض كل الأخبار
              </button>
            )}
          </>
        )}
      </main>

      {canAdd && (
        <button
          onClick={() => setFormOpen(true)}
          aria-label="خبر جديد"
          className="fixed bottom-6 left-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-gold text-gold-foreground shadow-gold transition press hover:scale-105"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>
      )}

      <NewsFormDrawer open={formOpen} onClose={() => setFormOpen(false)} userId={user?.ID || ""} />
    </div>
  );
}

function NewsSlider({ slides, onOpen }: { slides: NewsItem[]; onOpen: (id: string) => void }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: slides.length > 1, direction: "rtl" });
  const [selected, setSelected] = useState(0);
  const timer = useRef<number | null>(null);

  const stopAuto = useCallback(() => {
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
  }, []);
  const startAuto = useCallback(() => {
    stopAuto();
    if (slides.length < 2) return;
    timer.current = window.setInterval(() => emblaApi?.scrollNext(), 5000);
  }, [emblaApi, slides.length, stopAuto]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("pointerDown", stopAuto);
    startAuto();
    return () => { stopAuto(); emblaApi.off("select", onSelect); };
  }, [emblaApi, startAuto, stopAuto]);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl shadow-soft" ref={emblaRef}>
        <div className="flex">
          {slides.map((n) => {
            const imgs = newsImages(n);
            return (
              <button
                key={n.News_ID}
                onClick={() => onOpen(n.News_ID)}
                className="relative aspect-video w-full shrink-0 grow-0 basis-full overflow-hidden text-right"
              >
                {imgs[0] ? (
                  <img src={imgs[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 gradient-hero">
                    <Newspaper className="absolute inset-0 m-auto h-24 w-24 text-white/15" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent" />
                <span className="absolute end-3 top-3 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-gold-foreground shadow-gold">
                  جديد
                </span>
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-white">{n.Title}</h3>
                  <p className="mt-1 text-xs text-white/70">{relTime(n.Timestamp)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === selected ? "w-6 bg-gold" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NewsCard({ item, onOpen }: { item: NewsItem; onOpen: () => void }) {
  const imgs = newsImages(item);
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border bg-card p-2.5 text-right shadow-soft transition press hover:bg-secondary/40"
    >
      {imgs[0] ? (
        <img src={imgs[0]} alt="" className="h-[88px] w-[88px] shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-xl gradient-hero">
          <Newspaper className="h-8 w-8 text-white/40" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug">{item.Title}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.Content}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">{relTime(item.Timestamp)}</p>
      </div>
    </button>
  );
}

function NewsFormDrawer({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickImages = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const urls = await uploadImages(Array.from(files));
      setImages((prev) => [...prev, ...urls]);
    } catch {
      toast.error("تعذر رفع الصور");
    }
  };

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
      News_Images: images.join(","),
      Created_By: userId,
    };
    try {
      db.news.upsert(row);
      toast.success("تمت إضافة الخبر بنجاح");
      setTitle(""); setContent(""); setImages([]);
      onClose();
    } catch {
      toast.error("تعذر حفظ الخبر");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-right">
          <DrawerTitle>خبر جديد</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto px-4 pb-8">
          <div>
            <label className="mb-1.5 block text-sm font-medium">عنوان الخبر</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="اكتب عنوان الخبر..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">تفاصيل الخبر</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="اكتب التفاصيل الكاملة..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">صور الخبر (اختياري)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { pickImages(e.target.files); e.target.value = ""; }}
            />
            <div className="flex flex-wrap gap-2">
              {images.map((u, i) => (
                <div key={i} className="relative">
                  <img src={u} alt="" className="h-20 w-20 rounded-xl object-cover" />
                  <button
                    onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                    className="absolute -end-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="grid h-20 w-20 place-items-center rounded-xl border-2 border-dashed text-muted-foreground transition press hover:bg-secondary"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </div>
          <button
            disabled={saving}
            onClick={submit}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition press disabled:opacity-50"
          >
            {saving ? "جاري النشر..." : "نشر الخبر"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function shareNews(n: NewsItem) {
  const url = `${window.location.origin}/news/${n.News_ID}`;
  if (navigator.share) {
    navigator.share({ title: n.Title, text: n.Title, url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url).then(
      () => toast.success("تم نسخ رابط الخبر"),
      () => toast.error("تعذر نسخ الرابط"),
    );
  }
}
