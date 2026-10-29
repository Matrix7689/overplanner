import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ItemKind } from "../../shared/types";
import { useSuggestions } from "../lib/useSuggestions";
import { useStore } from "../store/useStore";
import { CategoryChips } from "./CategoryChips";

type Props = {
  placeholder?: string;
  // Fixed categories (e.g. on a category page). When omitted, the text is
  // classified and the user picks from suggested chips; with nothing
  // selected the item goes to the Inbox.
  categories?: string[];
  kind?: ItemKind;
  onAdded?: (title: string, categories: string[]) => void;
};

export function QuickAdd({ placeholder = "Add a task, note or link…", categories, kind, onAdded }: Props) {
  const addItem = useStore((s) => s.addItem);
  const allCategories = useStore((s) => s.categories);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const suggest = categories === undefined;
  const suggestions = useSuggestions(suggest ? text : "", { autoJev: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const title = text.trim();
    if (!title || saving) return;
    setSaving(true);

    let input;
    if (suggest) {
      // Never waits on JEV: saves with whatever suggestions are ready.
      const { categories: chosen, classification } = await suggestions.resolve();
      const lists = new Set(allCategories.filter((c) => c.kind === "list").map((c) => c.slug));
      const allLists = chosen.length > 0 && chosen.every((s) => lists.has(s));
      input = { title, categories: chosen, classification, kind: kind ?? (allLists ? "list-item" : "task") } as const;
    } else {
      input = { title, categories, kind };
    }

    const item = await addItem(input);
    setSaving(false);
    // On failure the text stays so nothing is lost; the store shows why.
    if (!item) return;
    setText("");
    suggestions.reset();
    onAdded?.(title, item.categories);
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-stone-400 focus:border-stone-400"
        />
        <button
          type="submit"
          disabled={!text.trim() || saving}
          className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
        >
          <Plus className="size-4" />
          Add
        </button>
      </div>

      {suggest && text.trim() && (
        <CategoryChips
          scores={suggestions.scores}
          visible={suggestions.visible}
          isSelected={suggestions.isSelected}
          onToggle={suggestions.toggle}
          onAdd={suggestions.add}
          jevStatus={suggestions.jevStatus}
          jevError={suggestions.jevError}
          emptyHint="No category selected. It will go to the Inbox."
        />
      )}
    </form>
  );
}
