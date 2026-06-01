import { useEffect, useState } from "react";

const KEY = "sms_theme";

function apply(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (theme === "dark") html.classList.add("dark");
  else html.classList.remove("dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(KEY) as "light" | "dark") || "light";
  });

  useEffect(() => {
    apply(theme);
    try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  return {
    theme,
    isDark: theme === "dark",
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    set: setTheme,
  };
}
