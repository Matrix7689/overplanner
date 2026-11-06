import { useEffect, useRef, useState } from "react";

const FEEDBACK_MS = 1500;

type Copyable = {
  title: string;
  text: string; // a task's details or a note's body
  checklist: { text: string; checked: boolean }[];
};

// An item as plain text: title, then details, then its checklist. Empty parts
// are left out. The checklist format pastes cleanly into most notes apps.
export function itemAsText({ title, text, checklist }: Copyable): string {
  const lines = checklist.filter((e) => e.text.trim()).map((e) => `- [${e.checked ? "x" : " "}] ${e.text.trim()}`);
  return [title.trim(), text.trim(), lines.join("\n")].filter(Boolean).join("\n\n");
}

export type CopyState = "idle" | "copied" | "failed";

// Copies text and briefly reports how it went, for a button to show.
export function useCopy(): { state: CopyState; copy: (text: string) => Promise<void> } {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (text: string) => {
    let next: CopyState = "copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Blocked by the browser, or a plain http address, where it's unavailable.
      next = "failed";
    }
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), FEEDBACK_MS);
  };

  return { state, copy };
}

export const COPY_LABELS: Record<CopyState, string> = {
  idle: "Copy to clipboard",
  copied: "Copied",
  failed: "Couldn't copy",
};
