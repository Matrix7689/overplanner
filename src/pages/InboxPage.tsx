import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { Item } from "../../shared/types";
import { CategoryChips } from "../components/CategoryChips";
import { ItemRow } from "../components/ItemRow";
import { PageHeader } from "../components/PageHeader";
import { QuickAdd } from "../components/QuickAdd";
import { useSuggestions } from "../lib/useSuggestions";
import { inboxItems, useStore } from "../store/useStore";

// Uncategorized items and shared captures. Each item gets keyword
// suggestions right away; "Ask JEV" refines them on demand.
export function InboxPage() {
  const items = useStore((s) => s.items);
  const inbox = useMemo(() => inboxItems(items), [items]);

  return (
    <>
      <PageHeader title="Inbox" subtitle="Uncategorized items and shared captures." />

      <section className="mb-6">
        <QuickAdd placeholder="Capture something…" />
      </section>

      {inbox.length === 0 ? (
        <p className="py-10 text-center text-sm text-stone-400">Inbox zero.</p>
      ) : (
        <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white px-4">
          {inbox.map((it) => (
            <InboxRow key={it.id} item={it} />
          ))}
        </div>
      )}
    </>
  );
}

function InboxRow({ item }: { item: Item }) {
  const updateItem = useStore((s) => s.updateItem);
  const text = item.notes ? `${item.title}\n${item.notes}` : item.title;
  const suggestions = useSuggestions(text, { autoJev: false });
  const [saving, setSaving] = useState(false);

  const anySelected = suggestions.visible.some((slug) => suggestions.isSelected(slug));

  const file = async () => {
    setSaving(true);
    const { categories, classification } = await suggestions.resolve();
    // Leaves the Inbox on success, which unmounts this row.
    const saved = await updateItem(item.id, { categories, classification });
    if (!saved) setSaving(false);
  };

  return (
    <div className="py-1">
      <ul>
        <ItemRow item={item} showCategories={false} />
      </ul>
      <div className="space-y-2 pb-3 pl-8">
        <CategoryChips
          scores={suggestions.scores}
          visible={suggestions.visible}
          isSelected={suggestions.isSelected}
          onToggle={suggestions.toggle}
          onAdd={suggestions.add}
          jevStatus={suggestions.jevStatus}
          jevError={suggestions.jevError}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={file}
            disabled={!anySelected || saving}
            className="rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-40"
          >
            File
          </button>
          {suggestions.jevConfigured && (
            <button
              type="button"
              onClick={suggestions.requestJev}
              disabled={suggestions.jevStatus === "pending" || suggestions.jevStatus === "ok"}
              className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            >
              <Sparkles className="size-3" />
              Ask JEV
            </button>
          )}
          {item.source === "share" && <span className="text-xs text-stone-400">Shared</span>}
        </div>
      </div>
    </div>
  );
}
