import type { FontId } from "../../shared/types";

const FALLBACK = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const DEFAULT_FONT: FontId = "plus-jakarta-sans";

export const FONTS: { id: FontId; label: string; stack: string }[] = [
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans", stack: `"Plus Jakarta Sans Variable", ${FALLBACK}` },
  { id: "inter", label: "Inter", stack: `"Inter Variable", ${FALLBACK}` },
  { id: "dm-sans", label: "DM Sans", stack: `"DM Sans Variable", ${FALLBACK}` },
  { id: "nunito", label: "Nunito", stack: `"Nunito Variable", ${FALLBACK}` },
  { id: "lora", label: "Lora (serif)", stack: `"Lora Variable", ui-serif, Georgia, serif` },
  { id: "jetbrains-mono", label: "JetBrains Mono", stack: `"JetBrains Mono Variable", ui-monospace, Consolas, monospace` },
  { id: "system", label: "System default", stack: FALLBACK },
];

// CSS variables for a font. The default is what index.css already sets. Its
// alternate letterforms ("cv11", "ss01") mean other things in other fonts, so
// they're turned off for the rest.
export function fontVars(id: FontId): Record<string, string> {
  if (id === DEFAULT_FONT) return {};
  const font = FONTS.find((f) => f.id === id);
  return font ? { "--font-sans": font.stack, "--font-features": "normal" } : {};
}
