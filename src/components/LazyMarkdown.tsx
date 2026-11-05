import { lazy, Suspense } from "react";

// The Markdown renderer is loaded on first use, so pages without notes don't
// pay for it. Until it arrives, the raw text is shown.
const Markdown = lazy(() => import("./Markdown").then((m) => ({ default: m.Markdown })));

export function LazyMarkdown({ children, className }: { children: string; className?: string }) {
  return (
    <Suspense fallback={<div className={`text-sm whitespace-pre-wrap text-body ${className ?? ""}`}>{children}</div>}>
      <Markdown className={className}>{children}</Markdown>
    </Suspense>
  );
}
