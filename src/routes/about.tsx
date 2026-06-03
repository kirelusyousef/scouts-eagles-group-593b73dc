import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, syncFromCloud } from "@/lib/db";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  const [, force] = useState(0);
  useEffect(() => {
    syncFromCloud().catch(() => {});
    const h = () => force((x) => x + 1);
    window.addEventListener("sms-db-change", h);
    return () => window.removeEventListener("sms-db-change", h);
  }, []);

  const info = db.groupInfo.getLatest();
  const group = db.appSettings.latest();

  const waLink = info?.WhatsApp_Number
    ? `https://wa.me/${info.WhatsApp_Number.replace(/[^\d]/g, "")}`
    : "";

  const social: { label: string; href: string; emoji: string; color: string }[] = [];
  if (info?.Facebook_Link) social.push({ label: "فيسبوك", href: info.Facebook_Link, emoji: "📘", color: "bg-[#1877F2] text-white" });
  if (info?.Instagram_Link) social.push({ label: "إنستجرام", href: info.Instagram_Link, emoji: "📸", color: "bg-gradient-to-tr from-pink-500 to-yellow-500 text-white" });
  if (waLink) social.push({ label: "واتساب", href: waLink, emoji: "💬", color: "bg-[#25D366] text-white" });
  if (info?.TikTok_Link) social.push({ label: "تيك توك", href: info.TikTok_Link, emoji: "🎵", color: "bg-black text-white" });

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <section className="rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-8 shadow-sm text-center">
          {group.Logo_URL && (
            <img src={group.Logo_URL} alt="شعار" className="mx-auto h-24 w-24 rounded-full object-cover ring-2 ring-gold mb-4" />
          )}
          <h1 className="text-3xl font-bold text-primary mb-2">{group.Group_Name || "عن المجموعة"}</h1>
          {info?.About && (
            <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90 mt-4">{info.About}</p>
          )}
        </section>

        {(info?.Address || info?.Email || info?.Phone) && (
          <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-2">
            <h3 className="text-xl font-bold mb-3">معلومات التواصل</h3>
            {info?.Address && <div className="text-sm">📍 {info.Address}</div>}
            {info?.Phone && <div className="text-sm">📞 {info.Phone}</div>}
            {info?.Email && <div className="text-sm">✉️ {info.Email}</div>}
          </section>
        )}

        {social.length > 0 && (
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-center">تواصل معنا عبر وسائل التواصل</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${s.color} flex flex-col items-center justify-center rounded-xl py-4 px-2 font-medium hover:opacity-90 transition shadow-sm`}
                >
                  <span className="text-2xl mb-1">{s.emoji}</span>
                  <span className="text-sm">{s.label}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
