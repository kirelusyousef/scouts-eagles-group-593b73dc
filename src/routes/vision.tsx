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
  const info = db.groupInfo.getLatest();

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
        <section className="rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-primary mb-3">🎯 الهوية والرؤية</h2>
          <p className="text-lg leading-relaxed whitespace-pre-wrap">
            {vision?.Content || "لم يتم تحديد رؤية المجموعة بعد"}
          </p>
        </section>

        <section className="rounded-2xl border bg-gradient-to-br from-gold/10 to-card p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-gold mb-3">📜 الرسالة الكشفية</h2>
          <p className="text-lg leading-relaxed whitespace-pre-wrap">
            {mission?.Content || "لم يتم تحديد رسالة المجموعة بعد"}
          </p>
        </section>

        {social.length > 0 && (
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-center">تواصل معنا</h3>
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
