import { useEffect } from "react";
import type { Theme } from "../../shared/types";
import { useStore } from "../store/useStore";

// settings.json (ui.theme) is the source of truth. The last value is also
// cached in localStorage so index.html can apply it before the first paint.
export const THEME_CACHE_KEY = "overplanner-theme";

const dark = () => window.matchMedia("(prefers-color-scheme: dark)");

export function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? (dark().matches ? "dark" : "light") : theme;
}

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? "#0c0a09" : "#fafaf9");
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    // Storage can be blocked; the saved setting still applies after load.
  }
}

// Keeps the page in step with the saved theme, and with the OS when the
// theme is "system".
export function useThemeSync(): void {
  const theme = useStore((s) => s.settings.ui.theme);
  const status = useStore((s) => s.status);

  useEffect(() => {
    // Until settings load, keep whatever index.html applied from the cache.
    if (status !== "ready") return;
    applyTheme(theme);
    if (theme !== "system") return;
    const query = dark();
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme, status]);
}
