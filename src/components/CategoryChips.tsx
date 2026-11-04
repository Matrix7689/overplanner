import { Check, Loader2, Plus, Sparkles } from "lucide-react";
import type { JevUiStatus } from "../lib/useSuggestions";
import { useStore } from "../store/useStore";

type Props = {
  scores: Record<string, number>;
  visible: string[];
  isSelected: (slug: string) => boolean;
  onToggle: (slug: string) => void;
  onAdd: (slug: string) => void;
  jevStatus: JevUiStatus;
  jevError?: string;
  // Shown when nothing is selected, e.g. "It will go to the Inbox."
  emptyHint?: string;
};

// Suggested categories as toggleable chips. Selected chips are filled;
// "Maybe" chips are dashed and unselected until tapped.
export function CategoryChips({ scores, visible, isSelected, onToggle, onAdd, jevStatus, jevError, emptyHint }: Props) {
  const categories = useStore((s) => s.categories);
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const addable = categories.filter((c) => !visible.includes(c.slug));
  const anySelected = visible.some((slug) => isSelected(slug));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map((slug) => {
          const c = bySlug.get(slug);
          if (!c) return null;
          const selected = isSelected(slug);
          const score = scores[slug];
          return (
            <button
              key={slug}
              type="button"
              onClick={() => onToggle(slug)}
              aria-pressed={selected}
              title={score !== undefined ? `Score ${Math.round(score * 100)}%` : "Added by you"}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                selected
                  ? "border-transparent font-medium text-stone-900"
                  : "border-dashed border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700"
              }`}
              style={selected ? { backgroundColor: `${c.color}26`, borderColor: `${c.color}80` } : undefined}
            >
              {selected ? <Check className="size-3" strokeWidth={3} /> : <Plus className="size-3" />}
              <span className="size-1.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
              {c.name}
              {!selected && <span className="text-stone-400">· maybe</span>}
            </button>
          );
        })}

        <select
          value=""
          onChange={(e) => e.target.value && onAdd(e.target.value)}
          aria-label="Add a category"
          className="rounded-full border border-stone-200 bg-white px-2 py-1 text-xs text-stone-500"
        >
          <option value="">+ Category</option>
          {addable.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <JevLine status={jevStatus} error={jevError} />
      {!anySelected && emptyHint && <p className="text-xs text-stone-400">{emptyHint}</p>}
    </div>
  );
}

function JevLine({ status, error }: { status: JevUiStatus; error?: string }) {
  if (status === "pending") {
    return (
      <p className="flex items-center gap-1 text-xs text-stone-400">
        <Loader2 className="size-3 animate-spin" /> Asking JEV…
      </p>
    );
  }
  if (status === "ok") {
    return (
      <p className="flex items-center gap-1 text-xs text-stone-400">
        <Sparkles className="size-3" /> Suggested by JEV
      </p>
    );
  }
  if (status === "error" || status === "timeout") {
    return (
      <p className="text-xs text-amber-700" title={error}>
        JEV {status === "timeout" ? "timed out" : "is unavailable"}; using keyword rules.
      </p>
    );
  }
  return null;
}
