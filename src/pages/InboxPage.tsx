import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { itemText, type Item } from "../../shared/types";
import { CategoryChips } from "../components/CategoryChips";
import { ItemRow } from "../components/ItemRow";
import { PageHeader } from "../components/PageHeader";
import { QuickAdd } from "../components/QuickAdd";
import { useSuggestions } from "../lib/useSuggestions";
import { inboxItems, useStore } from "../store/useStore";
import { Button } from "../ui/Button";

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
        <p className="py-10 text-center text-sm text-faint">Inbox zero.</p>
      ) : (
        <div className="divide-y divide-line card-shadow rounded-2xl border border-line bg-surface px-4">
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
  const text = itemText(item);
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
          <Button size="xs" onClick={file} disabled={!anySelected || saving}>
            File
          </Button>
          {suggestions.jevConfigured && (
            <Button
              variant="outlined"
              size="xs"
              onClick={suggestions.requestJev}
              disabled={suggestions.jevStatus === "pending" || suggestions.jevStatus === "ok"}
            >
              <Sparkles className="size-3" />
              Ask JEV
            </Button>
          )}
          {item.source === "share" && <span className="text-xs text-faint">Shared</span>}
        </div>
      </div>
    </div>
  );
}
