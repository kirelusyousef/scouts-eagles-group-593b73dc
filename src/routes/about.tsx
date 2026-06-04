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

  // New, fully data-driven social accounts (managed in the admin Social_Accounts screen).
  const dynamicSocial = db.socialAccounts.active().map((s) => {
    let href = s.URL.trim();
    if (s.Platform === "whatsapp") {
      const digits = href.replace(/[^\d]/g, "");
      if (digits) href = `https://wa.me/${digits}`;
    } else if (s.Platform === "phone") {
      const digits = href.replace(/[^\d+]/g, "");
      href = `tel:${digits}`;
    } else if (s.Platform === "email") {
      if (!href.startsWith("mailto:")) href = `mailto:${href}`;
    } else if (href && !/^https?:\/\//i.test(href) && !href.startsWith("mailto:") && !href.startsWith("tel:")) {
      href = `https://${href}`;
    }
    return { id: s.Social_ID, label: s.Label || s.Platform, href, icon: s.Icon || "🔗" };
  });

  // Legacy fallback (Group_Info row) — only shown if no dynamic accounts exist.
  const legacySocial: { id: string; label: string; href: string; icon: string }[] = [];
  if (dynamicSocial.length === 0) {
    const waLink = info?.WhatsApp_Number
      ? `https://wa.me/${info.WhatsApp_Number.replace(/[^\d]/g, "")}`
      : "";
    if (info?.Facebook_Link) legacySocial.push({ id: "fb", label: "فيسبوك", href: info.Facebook_Link, icon: "📘" });
    if (info?.Instagram_Link) legacySocial.push({ id: "ig", label: "إنستجرام", href: info.Instagram_Link, icon: "📸" });
    if (waLink) legacySocial.push({ id: "wa", label: "واتساب", href: waLink, icon: "💬" });
    if (info?.TikTok_Link) legacySocial.push({ id: "tk", label: "تيك توك", href: info.TikTok_Link, icon: "🎵" });
  }

  const social = dynamicSocial.length ? dynamicSocial : legacySocial;

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <section className="rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-8 shadow-sm text-center">
          {group.Logo_URL && (
            <img src={group.Logo_URL} alt="شعار" className="mx-auto h-24 w-24 rounded-full object-cover ring-2 ring-gold mb-4" />
          )}
          <h1 className="text-3xl font-bold text-primary mb-2">{group.Group_Name || "عن المجموعة"}</h1>
          <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90 mt-4">
            مرحباً بكم في {group.Group_Name || "مجموعتنا الكشفية"}. نسعى لبناء جيل من الكشافة المنضبطين، أصحاب القيم والمبادئ، عبر برامج تربوية وأنشطة ميدانية متنوعة.
          </p>
        </section>

        {social.length > 0 && (
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-center">تواصل معنا</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {social.map((s) => (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  className="group flex flex-col items-center justify-center rounded-xl border bg-background py-4 px-2 hover:bg-secondary hover:border-primary transition shadow-sm"
                >
                  <span className="text-3xl mb-1 group-hover:scale-110 transition-transform">{s.icon}</span>
                  <span className="text-xs font-medium text-foreground/80 truncate max-w-full">{s.label}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

