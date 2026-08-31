import { useEffect } from "react";
import { db } from "./db";

export interface ThemeColors {
  primary: string;
  gold: string;
  background: string;
  foreground: string;
  card: string;
}

/** Fallback values matching the default design tokens in styles.css. */
export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: "#1f6b45",
  gold: "#d6a52b",
  background: "#f8faf6",
  foreground: "#16261f",
  card: "#ffffff",
};

export const THEME_COLOR_LABELS: Record<keyof ThemeColors, string> = {
  primary: "اللون الأساسي",
  gold: "اللون الذهبي (التمييز)",
  background: "خلفية الصفحة",
  foreground: "لون النص",
  card: "خلفية البطاقات",
};

export const THEME_PRESETS: { name: string; colors: ThemeColors }[] = [
  { name: "كشفي أخضر", colors: DEFAULT_THEME_COLORS },
  { name: "أزرق بحري", colors: { primary: "#1d4f8c", gold: "#e0a92b", background: "#f6f9fd", foreground: "#152234", card: "#ffffff" } },
  { name: "نبيذي", colors: { primary: "#7b2340", gold: "#c9963f", background: "#fdf7f8", foreground: "#2a1119", card: "#ffffff" } },
  { name: "ليلي داكن", colors: { primary: "#3ea87a", gold: "#c9a04a", background: "#14201b", foreground: "#eef4f0", card: "#1c2b25" } },
];

export function parseThemeColors(raw: string | undefined | null): ThemeColors | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<ThemeColors>;
    if (!o || typeof o !== "object") return null;
    return { ...DEFAULT_THEME_COLORS, ...o };
  } catch {
    return null;
  }
}

function mix(hex: string, withHex: string, amount: number) {
  const p = (h: string) => {
    const s = h.replace("#", "");
    const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
    return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = p(hex);
  const [r2, g2, b2] = p(withHex);
  const c = (a: number, b: number) => Math.round(a + (b - a) * amount).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

function luminance(hex: string) {
  const s = hex.replace("#", "");
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function readable(hex: string) {
  return luminance(hex) > 0.55 ? "#141414" : "#ffffff";
}

/** Apply colors as inline CSS variables on <html>. Pass null to clear. */
export function applyThemeColors(c: ThemeColors | null) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  const vars: Record<string, string> = {};
  if (c) {
    vars["--primary"] = c.primary;
    vars["--primary-glow"] = mix(c.primary, "#ffffff", 0.3);
    vars["--primary-foreground"] = readable(c.primary);
    vars["--ring"] = c.primary;
    vars["--accent"] = c.gold;
    vars["--accent-foreground"] = readable(c.gold);
    vars["--gold"] = c.gold;
    vars["--gold-foreground"] = readable(c.gold);
    vars["--gold-glow"] = mix(c.gold, "#ffffff", 0.3);
    vars["--background"] = c.background;
    vars["--foreground"] = c.foreground;
    vars["--card"] = c.card;
    vars["--card-foreground"] = c.foreground;
    vars["--popover"] = c.card;
    vars["--popover-foreground"] = c.foreground;
    vars["--secondary"] = mix(c.background, c.primary, 0.1);
    vars["--secondary-foreground"] = c.foreground;
    vars["--muted"] = mix(c.background, c.primary, 0.07);
    vars["--muted-foreground"] = mix(c.foreground, c.background, 0.4);
    vars["--border"] = mix(c.background, c.foreground, 0.15);
    vars["--input"] = mix(c.background, c.foreground, 0.18);
    vars["--sidebar"] = mix(c.primary, "#000000", 0.25);
    vars["--sidebar-foreground"] = "#f4f7f3";
    vars["--sidebar-primary"] = c.gold;
    vars["--sidebar-accent"] = mix(c.primary, "#000000", 0.1);
    vars["--sidebar-border"] = mix(c.primary, "#ffffff", 0.15);
    vars["--sidebar-ring"] = c.gold;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  } else {
    const keys = [
      "--primary", "--primary-glow", "--primary-foreground", "--ring", "--accent", "--accent-foreground",
      "--gold", "--gold-foreground", "--gold-glow", "--background", "--foreground", "--card",
      "--card-foreground", "--popover", "--popover-foreground", "--secondary", "--secondary-foreground",
      "--muted", "--muted-foreground", "--border", "--input", "--sidebar", "--sidebar-foreground",
      "--sidebar-primary", "--sidebar-accent", "--sidebar-border", "--sidebar-ring",
    ];
    for (const k of keys) el.style.removeProperty(k);
  }
}

/** Keeps the document in sync with the latest saved App_Settings colors. */
export function useThemeColorsSync() {
  useEffect(() => {
    const sync = () => applyThemeColors(parseThemeColors(db.appSettings.latest().Theme_Colors));
    sync();
    window.addEventListener("sms-db-change", sync);
    return () => window.removeEventListener("sms-db-change", sync);
  }, []);
}
