import type { Palette } from "../../shared/types";

export type PaletteKey = keyof Palette;

export const DEFAULT_PALETTE: Palette = {
  darkest: "#1a120e",
  dark: "#3a2418",
  mid: "#6b4a2e",
  accent: "#a88462",
  light: "#d5c4ae",
  neutral: "#4a4a46",
};

export const PALETTE_SLOTS: { key: PaletteKey; label: string; hint: string }[] = [
  { key: "darkest", label: "Darkest", hint: "Dark mode page, light mode headings" },
  { key: "dark", label: "Dark", hint: "Sidebar, dark mode cards, light mode text" },
  { key: "mid", label: "Mid", hint: "Light mode buttons and links" },
  { key: "accent", label: "Accent", hint: "Dark mode sliders and checkboxes" },
  { key: "light", label: "Light", hint: "Light mode borders, dark mode text" },
  { key: "neutral", label: "Neutral", hint: "Light mode secondary text" },
];

// Accepts "A88462", "#a88462" or "#a84"; returns "#a88462", or null if invalid.
export function normalizeHex(input: string): string | null {
  const hex = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`;
  if (/^[0-9a-f]{3}$/.test(hex)) return `#${[...hex].map((c) => c + c).join("")}`;
  return null;
}

export function samePalette(a: Palette, b: Palette): boolean {
  return PALETTE_SLOTS.every(({ key }) => a[key].toLowerCase() === b[key].toLowerCase());
}

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// `amount` of a, the rest b.
function mix(a: string, b: string, amount: number): string {
  const [ca, cb] = [toRgb(a), toRgb(b)];
  const parts = ca.map((v, i) => Math.round(v * amount + cb[i] * (1 - amount)));
  return `#${parts.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Every CSS variable a palette sets. The mixes match the defaults in index.css.
export function paletteVars(p: Palette): Record<string, string> {
  return {
    "--color-brand-50": mix(p.light, "#ffffff", 0.2),
    "--color-brand-100": mix(p.light, "#ffffff", 0.45),
    "--color-brand-200": mix(p.light, "#ffffff", 0.6),
    "--color-brand-300": p.light,
    "--color-brand-400": mix(p.light, p.accent, 0.5),
    "--color-brand-500": p.accent,
    "--color-brand-600": mix(p.accent, p.mid, 0.5),
    "--color-brand-700": p.mid,
    "--color-brand-800": mix(p.mid, p.dark, 0.5),
    "--color-brand-900": p.dark,
    "--color-brand-950": p.darkest,
    "--color-brand-neutral": p.neutral,
    "--brand-soft-dark": mix(p.dark, p.mid, 0.75),
    "--brand-caption-dark": mix(p.light, p.dark, 0.88),
    "--brand-faint-dark": mix(p.light, p.dark, 0.82),
    "--brand-faint-light": mix(p.neutral, p.mid, 0.7),
  };
}

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The pairs that matter most for reading, below the WCAG AA target (3:1 for the
// accent, which marks icons and controls rather than text).
export function contrastIssues(p: Palette): string[] {
  const v = paletteVars(p);
  const brand = (stop: number) => v[`--color-brand-${stop}`];
  const pairs: [string, string, string, number][] = [
    ["Light mode: headings on cards", brand(950), brand(50), 4.5],
    ["Light mode: text on the page", brand(900), brand(200), 4.5],
    ["Light mode: secondary text on cards", p.neutral, brand(50), 4.5],
    ["Light mode: button text", brand(50), p.mid, 4.5],
    ["Light mode: accent on cards", brand(600), brand(50), 3],
    ["Dark mode: headings on the page", brand(100), p.darkest, 4.5],
    ["Dark mode: text on cards", p.light, p.dark, 4.5],
    ["Dark mode: secondary text on cards", v["--brand-caption-dark"], p.dark, 4.5],
    ["Dark mode: button text", p.darkest, p.accent, 4.5],
    ["Dark mode: accent on cards", p.accent, p.dark, 3],
  ];
  return pairs.flatMap(([label, a, b, target]) => {
    const ratio = contrast(a, b);
    return ratio < target ? [`${label} (${ratio.toFixed(1)}:1, aim for ${target}:1)`] : [];
  });
}
