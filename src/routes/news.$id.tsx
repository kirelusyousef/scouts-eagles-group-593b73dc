import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, Newspaper, Share2 } from "lucide-react";
import { db, fullName, syncFromCloud } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";
import { newsImages, relTime, shareNews } from "./news";

export const Route = createFileRoute("/news/$id")({ component: NewsDetailsPage });

function NewsDetailsPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [, force] = useState(0);

  useEffect(() => {
    syncFromCloud().catch(() => {});
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const item = db.news.all().find((n) => n.News_ID === id);

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <main className="mx-auto grid max-w-3xl place-items-center px-4 py-20 text-center">
          <div>
            <Newspaper className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-bold">الخبر غير موجود</p>
            <button
              onClick={() => nav({ to: "/news" })}
              className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground press"
            >
              العودة للأخبار
            </button>
          </div>
        </main>
      </div>
    );
  }

  const imgs = newsImages(item);
  const author = db.users.get(item.Created_By);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => nav({ to: "/news" })}
            aria-label="رجوع"
            className="grid h-10 w-10 place-items-center rounded-xl border bg-card transition press hover:bg-secondary"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => shareNews(item)}
            aria-label="مشاركة الخبر"
            className="grid h-10 w-10 place-items-center rounded-xl border bg-card text-primary transition press hover:bg-secondary"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <article className="overflow-hidden rounded-2xl border bg-card shadow-soft">
          {imgs.length > 0 && <ImageSlider imgs={imgs} />}
          <div className="p-5">
            <h1 className="text-2xl font-extrabold leading-snug">{item.Title}</h1>
            <div className="mb-4 mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(item.Timestamp).toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
              <span className="text-gold">·</span>
              <span>{relTime(item.Timestamp)}</span>
              {author && (
                <>
                  <span className="text-gold">·</span>
                  <span>بواسطة {fullName(author)}</span>
                </>
              )}
            </div>
            <p className="whitespace-pre-wrap leading-8 text-[15px]">{item.Content}</p>
          </div>
        </article>
      </main>
    </div>
  );
}

function ImageSlider({ imgs }: { imgs: string[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: imgs.length > 1, direction: "rtl" });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  return (
    <div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {imgs.map((u, i) => (
            <img
              key={i}
              src={u}
              alt=""
              className="aspect-video w-full shrink-0 grow-0 basis-full object-cover"
            />
          ))}
        </div>
      </div>
      {imgs.length > 1 && (
        <div className="flex justify-center gap-1.5 bg-card py-2">
          {imgs.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === selected ? "w-6 bg-gold" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
