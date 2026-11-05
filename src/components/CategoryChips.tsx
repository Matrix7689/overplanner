import { Check, Loader2, Plus, Sparkles } from "lucide-react";
import type { JevUiStatus } from "../lib/useSuggestions";
import { useStore } from "../store/useStore";
import { Select } from "../ui/Select";

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
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                selected
                  ? "border-transparent font-medium text-title"
                  : "border-dashed border-faint/50 text-caption hover:border-accent hover:text-title"
              }`}
              style={selected ? { backgroundColor: `${c.color}26`, borderColor: `${c.color}80` } : undefined}
            >
              {selected ? <Check className="size-3" strokeWidth={3} /> : <Plus className="size-3" />}
              <span className="cat-dot size-1.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
              {c.name}
              {!selected && <span className="text-faint">· maybe</span>}
            </button>
          );
        })}

        <Select
          size="xs"
          label="Add a category"
          placeholder="+ Category"
          value=""
          onChange={onAdd}
          options={addable.map((c) => ({ value: c.slug, label: c.name, color: c.color, indent: c.parent !== null }))}
        />
      </div>

      <JevLine status={jevStatus} error={jevError} />
      {!anySelected && emptyHint && <p className="text-xs text-faint">{emptyHint}</p>}
    </div>
  );
}

function JevLine({ status, error }: { status: JevUiStatus; error?: string }) {
  if (status === "pending") {
    return (
      <p className="flex items-center gap-1 text-xs text-faint">
        <Loader2 className="size-3 animate-spin" /> Asking JEV…
      </p>
    );
  }
  if (status === "ok") {
    return (
      <p className="flex items-center gap-1 text-xs text-faint">
        <Sparkles className="size-3" /> Suggested by JEV
      </p>
    );
  }
  if (status === "error" || status === "timeout") {
    return (
      <p className="text-xs text-warn" title={error}>
        JEV {status === "timeout" ? "timed out" : "is unavailable"}; using keyword rules.
      </p>
    );
  }
  return null;
}
