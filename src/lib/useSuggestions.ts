import { useEffect, useMemo, useState } from "react";
import type { Classification, ClassifyResult, JevCallStatus } from "../../shared/types";
import { useStore } from "../store/useStore";
import { api } from "./api";

const KEYWORD_DELAY_MS = 250;
const JEV_DELAY_MS = 900;

type Result = { text: string; scores: Record<string, number>; method: ClassifyResult["method"] };
type JevState = { text: string; status: "pending" | JevCallStatus; error?: string; result?: Result };

export type JevUiStatus = "idle" | "pending" | JevCallStatus;

// Category suggestions for a piece of text, following the spec's flow:
// keyword rules come back almost at once, then JEV refines them (after a
// pause in typing when `autoJev` is on, or when requestJev() is called).
// Chips are pre-selected at the auto-select threshold and shown from the
// "Maybe" threshold; the user's toggles survive later score updates.
export function useSuggestions(text: string, { autoJev }: { autoJev: boolean }) {
  const trimmed = text.trim();
  const settings = useStore((s) => s.settings);
  const jevConfigured = useStore((s) => s.classifier?.jev.configured ?? false);

  const [keyword, setKeyword] = useState<Result | null>(null);
  const [jev, setJev] = useState<JevState | null>(null);
  const [jevRequestedFor, setJevRequestedFor] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // Keyword pass.
  useEffect(() => {
    if (!trimmed) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .classify({ text: trimmed, jev: false }, controller.signal)
        .then((r) => setKeyword({ text: trimmed, scores: r.scores, method: r.method }))
        .catch(() => undefined); // No chips is an acceptable failure mode.
    }, KEYWORD_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // JEV pass. Never blocks saving: callers save with whatever is ready.
  const wantJev = jevConfigured && trimmed !== "" && (autoJev || jevRequestedFor === trimmed);
  useEffect(() => {
    if (!wantJev) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        setJev({ text: trimmed, status: "pending" });
        api
          .classify({ text: trimmed, jev: true }, controller.signal)
          .then((r) =>
            setJev({
              text: trimmed,
              status: r.jev.status,
              error: r.jev.error,
              result: { text: trimmed, scores: r.scores, method: r.method },
            }),
          )
          .catch((err) => {
            if (!controller.signal.aborted) {
              setJev({ text: trimmed, status: "error", error: err instanceof Error ? err.message : String(err) });
            }
          });
      },
      autoJev ? JEV_DELAY_MS : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, wantJev, autoJev]);

  // Prefer JEV for the current text, then keywords for it. While typing,
  // the previous keyword chips stay up to avoid flicker.
  const current =
    jev?.text === trimmed && jev.result ? jev.result : keyword?.text === trimmed ? keyword : null;
  const shown = trimmed ? (current ?? keyword) : null;
  const scores = useMemo(() => shown?.scores ?? {}, [shown]);

  const selectedIn = (slug: string, from: Record<string, number>) =>
    overrides[slug] ?? (from[slug] ?? 0) >= settings.autoSelectThreshold;
  const isSelected = (slug: string) => selectedIn(slug, scores);

  // Chips to show: anything at or above "Maybe", plus categories the user
  // added by hand. Highest score first.
  const visible = useMemo(() => {
    const slugs = new Set(Object.keys(scores).filter((s) => scores[s] >= settings.maybeThreshold));
    for (const [slug, on] of Object.entries(overrides)) if (on) slugs.add(slug);
    return [...slugs].sort((a, b) => (scores[b] ?? 1) - (scores[a] ?? 1));
  }, [scores, overrides, settings.maybeThreshold]);

  return {
    scores,
    visible,
    isSelected,
    jevStatus: (jev?.text === trimmed ? jev.status : "idle") as JevUiStatus,
    jevError: jev?.text === trimmed ? jev.error : undefined,
    jevConfigured,

    toggle: (slug: string) => setOverrides((o) => ({ ...o, [slug]: !isSelected(slug) })),
    add: (slug: string) => setOverrides((o) => ({ ...o, [slug]: true })),
    requestJev: () => setJevRequestedFor(trimmed),
    reset: () => {
      setOverrides({});
      setJevRequestedFor(null);
    },

    // What to save: the selected categories and the scores behind them. If
    // the keyword pass for this exact text hasn't landed yet, run it now
    // (fast and local); JEV is never awaited.
    resolve: async (): Promise<{ categories: string[]; classification: Classification }> => {
      let result = current;
      if (!result && trimmed) {
        try {
          const r = await api.classify({ text: trimmed, jev: false });
          result = { text: trimmed, scores: r.scores, method: r.method };
        } catch {
          result = null;
        }
      }
      const from = result?.scores ?? {};
      const slugs = new Set(Object.keys(from).filter((s) => from[s] >= settings.maybeThreshold));
      for (const [slug, on] of Object.entries(overrides)) if (on) slugs.add(slug);
      return {
        categories: [...slugs].filter((s) => selectedIn(s, from)),
        classification: result ? { method: result.method, scores: from } : { method: "manual", scores: {} },
      };
    },
  };
}
