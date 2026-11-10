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

// Ready-made themes. Mocha is the default, so choosing it clears the saved
// palette. The four colour designs were given as roles or as a plain dark to
// light list, so each was fitted to the six slots below: a role with no slot
// of its own (Orange's Secondary, say) isn't a separate colour here, and where
// a design had too few dark shades, the missing one is a nearby blend. Each is
// checked with contrastIssues, which reports none for any of them.
export const PRESETS: { id: string; name: string; palette: Palette }[] = [
  { id: "mocha", name: "Mocha", palette: DEFAULT_PALETTE },
  {
    id: "orange",
    name: "Orange",
    palette: { darkest: "#1f1d2b", dark: "#2e2b40", mid: "#b34f00", accent: "#ff7a00", light: "#ffe4c7", neutral: "#5a5670" },
  },
  {
    id: "teal",
    name: "Teal",
    palette: { darkest: "#0b3d3b", dark: "#124f4c", mid: "#0f766e", accent: "#14b8a6", light: "#e6fffb", neutral: "#3f5f5d" },
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    palette: { darkest: "#05161a", dark: "#072e33", mid: "#0c7075", accent: "#0f969c", light: "#6da5c0", neutral: "#294d61" },
  },
  {
    id: "forest",
    name: "Forest",
    palette: { darkest: "#051f20", dark: "#0b2b26", mid: "#235347", accent: "#8eb69b", light: "#daf1de", neutral: "#163832" },
  },
];

// The preset whose six colours match, if any; otherwise the palette is custom.
export function presetFor(palette: Palette) {
  return PRESETS.find((p) => samePalette(p.palette, palette));
}

// What each colour does in each mode. The names describe how dark a colour is,
// not its job, and most colours swap jobs between the two modes. The sidebar
// is dark in both: it runs from Dark to Darkest.
export const PALETTE_SLOTS: { key: PaletteKey; label: string; light: string; dark: string }[] = [
  { key: "darkest", label: "Darkest", light: "Headings and titles", dark: "Page background" },
  { key: "dark", label: "Dark", light: "Body text, button edges", dark: "Card background" },
  { key: "mid", label: "Mid", light: "Links and buttons", dark: "Card borders" },
  { key: "accent", label: "Accent", light: "Icons and highlights", dark: "Buttons, checkboxes, sliders" },
  { key: "light", label: "Light", light: "Borders, page and card backgrounds", dark: "Text, links and buttons" },
  { key: "neutral", label: "Neutral", light: "Secondary text", dark: "Not used" },
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
