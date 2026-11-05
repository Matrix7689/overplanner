import { useEffect } from "react";
import type { FontId, Palette, Theme } from "../../shared/types";
import { useStore } from "../store/useStore";
import { fontVars } from "./fonts";
import { DEFAULT_PALETTE, paletteVars } from "./palette";

// settings.json (ui.theme, ui.customPalette, ui.font) is the source of truth. The last
// values are also cached in localStorage so index.html can apply them before
// the first paint.
export const THEME_CACHE_KEY = "overplanner-theme";
export const PALETTE_CACHE_KEY = "overplanner-palette";
export const FONT_CACHE_KEY = "overplanner-font";

const dark = () => window.matchMedia("(prefers-color-scheme: dark)");

export function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? (dark().matches ? "dark" : "light") : theme;
}

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  const pageColor = getComputedStyle(document.documentElement).getPropertyValue("--page-bg").trim();
  if (pageColor) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", pageColor);
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    // Storage can be blocked; the saved setting still applies after load.
  }
}

// null goes back to the built-in colours in index.css.
export function applyPalette(palette: Palette | null): void {
  const root = document.documentElement.style;
  for (const name of Object.keys(paletteVars(DEFAULT_PALETTE))) root.removeProperty(name);
  const vars = palette ? paletteVars(palette) : null;
  if (vars) for (const [name, value] of Object.entries(vars)) root.setProperty(name, value);
  try {
    if (vars) localStorage.setItem(PALETTE_CACHE_KEY, JSON.stringify(vars));
    else localStorage.removeItem(PALETTE_CACHE_KEY);
  } catch {
    // Storage can be blocked; the saved setting still applies after load.
  }
}

export function applyFont(font: FontId): void {
  const root = document.documentElement.style;
  const vars = fontVars(font);
  root.removeProperty("--font-sans");
  root.removeProperty("--font-features");
  for (const [name, value] of Object.entries(vars)) root.setProperty(name, value);
  try {
    if (Object.keys(vars).length > 0) localStorage.setItem(FONT_CACHE_KEY, JSON.stringify(vars));
    else localStorage.removeItem(FONT_CACHE_KEY);
  } catch {
    // Storage can be blocked; the saved setting still applies after load.
  }
}

// Keeps the page in step with the saved theme, and with the OS when the
// theme is "system".
export function useThemeSync(): void {
  const theme = useStore((s) => s.settings.ui.theme);
  const palette = useStore((s) => s.settings.ui.customPalette);
  const font = useStore((s) => s.settings.ui.font);
  const status = useStore((s) => s.status);

  useEffect(() => {
    if (status === "ready") applyFont(font);
  }, [font, status]);

  useEffect(() => {
    // Until settings load, keep whatever index.html applied from the cache.
    if (status !== "ready") return;
    applyPalette(palette);
    applyTheme(theme); // after the palette: it reads the page colour
    if (theme !== "system") return;
    const query = dark();
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme, palette, status]);
}
