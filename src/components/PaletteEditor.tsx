import { useEffect, useMemo, useState } from "react";
import type { Palette } from "../../shared/types";
import {
  contrastIssues,
  DEFAULT_PALETTE,
  normalizeHex,
  PALETTE_SLOTS,
  paletteVars,
  presetFor,
  PRESETS,
  samePalette,
  type PaletteKey,
} from "../lib/palette";
import { useStore } from "../store/useStore";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";

// Edits a draft of the six theme colours. Nothing changes outside the previews
// until Apply; "Reset to defaults" only fills in the draft, so it can be undone
// by leaving the page.
export function PaletteEditor() {
  const saved = useStore((s) => s.settings.ui.customPalette);
  const updateSettings = useStore((s) => s.updateSettings);
  const current = saved ?? DEFAULT_PALETTE;
  const savedKey = JSON.stringify(current);

  const [draft, setDraft] = useState<Record<PaletteKey, string>>(current);
  useEffect(() => {
    setDraft(JSON.parse(savedKey));
  }, [savedKey]);

  // A slot that doesn't parse (yet) previews with its saved colour.
  const parsed = PALETTE_SLOTS.map(({ key }) => [key, normalizeHex(draft[key])] as const);
  const allValid = parsed.every(([, hex]) => hex !== null);
  const preview = useMemo(
    () => Object.fromEntries(parsed.map(([key, hex]) => [key, hex ?? current[key]])) as Palette,
    // `parsed` is rebuilt every render; these strings are what it depends on.
    [JSON.stringify(parsed), savedKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const issues = useMemo(() => contrastIssues(preview), [preview]);
  const changed = allValid && !samePalette(preview, current);
  const appliedName = presetFor(current)?.name ?? "Custom";
  // With a half-typed colour the draft matches nothing, so no preset is marked.
  const chosen = allValid ? presetFor(preview) : undefined;

  const apply = () => {
    updateSettings({ ui: { customPalette: samePalette(preview, DEFAULT_PALETTE) ? null : preview } });
    setDraft(preview);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-caption">
          Presets <span className="font-normal text-faint">· In use: {appliedName}</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={chosen?.id === p.id}
              onClick={() => setDraft(p.palette)}
              className={`rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                chosen?.id === p.id ? "border-accent bg-soft" : "border-line hover:bg-soft"
              }`}
            >
              <span className="flex overflow-hidden rounded-md" aria-hidden>
                {PALETTE_SLOTS.map(({ key }) => (
                  <span key={key} className="h-5 flex-1" style={{ backgroundColor: p.palette[key] }} />
                ))}
              </span>
              <span className="mt-1.5 block text-sm font-medium text-title">{p.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-faint">Pick one to preview it, then change any color below if you like. Apply saves it.</p>
      </div>

      <div className="grid gap-x-6 gap-y-3 xl:grid-cols-2">
        {PALETTE_SLOTS.map(({ key, label, light, dark }) => {
          const invalid = normalizeHex(draft[key]) === null;
          return (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                aria-label={`${label} color picker`}
                value={preview[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                className="size-9 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-title">{label}</p>
                <p className="text-xs leading-tight text-caption">
                  <span className="font-medium text-body">Light mode:</span> {light}
                </p>
                <p className="text-xs leading-tight text-caption">
                  <span className="font-medium text-body">Dark mode:</span> {dark}
                </p>
              </div>
              <input
                type="text"
                aria-label={`${label} HEX code`}
                aria-invalid={invalid}
                value={draft[key]}
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                onBlur={() => !invalid && setDraft((d) => ({ ...d, [key]: normalizeHex(d[key])! }))}
                className={`w-24 shrink-0 rounded-lg border bg-transparent px-2.5 py-1.5 font-mono text-sm text-title uppercase outline-none ${
                  invalid ? "border-danger" : "border-line focus:border-accent"
                }`}
              />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-faint">The sidebar is dark in both modes, running from Dark to Darkest. In-between shades are blended from these six.</p>

      {!allValid && <p className="text-xs text-danger">Use a HEX code like #A88462 for each color.</p>}

      <div className="grid gap-3 xl:grid-cols-2">
        <Preview palette={preview} mode="light" />
        <Preview palette={preview} mode="dark" />
      </div>

      {issues.length > 0 && (
        <div className="rounded-xl bg-warn-soft p-3 text-xs text-warn">
          <p className="font-medium">Some of these colors may be hard to read together:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={apply} disabled={!changed}>
          Apply
        </Button>
        <Button
          size="sm"
          variant="outlined"
          onClick={() => setDraft(DEFAULT_PALETTE)}
          disabled={allValid && samePalette(preview, DEFAULT_PALETTE)}
        >
          Reset to Mocha
        </Button>
      </div>
    </div>
  );
}

// A small copy of the app in the draft colours, using the real components. The
// surface-* class makes the theme tokens re-resolve against the inline stops.
function Preview({ palette, mode }: { palette: Palette; mode: "light" | "dark" }) {
  return (
    <div
      inert
      data-testid={`preview-${mode}`}
      aria-label={`Preview in ${mode} mode`}
      role="img"
      style={paletteVars(palette)}
      className={`surface-${mode} flex overflow-hidden rounded-xl border border-line bg-page [background-image:var(--page-glow)]`}
    >
      <div className="surface-dark w-24 shrink-0 space-y-1 bg-linear-to-b from-brand-900 to-brand-950 p-2 text-xs sm:w-28">
        <p className="px-2 py-1 font-semibold text-title">Overplanner</p>
        <p className="rounded-lg bg-brand-700/80 px-2 py-1 font-medium text-title">Dashboard</p>
        <p className="px-2 py-1 text-body">Inbox</p>
        <p className="px-2 py-1 text-body">Calendar</p>
      </div>

      <div className="min-w-0 flex-1 space-y-2 p-3">
        <p className="text-[11px] font-semibold tracking-wide text-caption uppercase">{mode} mode</p>
        <p className="text-base font-bold text-title">Good morning</p>
        <div className="card-shadow space-y-2 rounded-xl border border-line bg-surface p-2.5">
          <div className="flex items-center gap-2 text-xs text-body">
            <Checkbox round checked={false} onChange={() => {}} label="Example task" />
            <span className="truncate">Order new beans</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-faint">
            <Checkbox round checked onChange={() => {}} label="Example finished task" />
            <span className="truncate line-through">Clean the grinder</span>
          </div>
          <p className="text-xs text-caption">
            Secondary text and a <span className="text-link underline">link</span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="xs">Add</Button>
            <Button size="xs" variant="outlined">
              Cancel
            </Button>
            <span className="rounded-full bg-soft px-2 py-0.5 text-[11px] text-body">Chip</span>
          </div>
        </div>
      </div>
    </div>
  );
}
