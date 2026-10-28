import { useMemo } from "react";
import type { Item } from "../../shared/types";
import { ItemRow } from "../components/ItemRow";
import { PageHeader } from "../components/PageHeader";
import { QuickAdd } from "../components/QuickAdd";
import { inboxItems, useStore } from "../store/useStore";

// Uncategorized items and shared captures. Classification chips replace the
// manual "Move to" picker in phase 3.
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
  const categories = useStore((s) => s.categories);
  const setCategories = useStore((s) => s.setCategories);

  return (
    <div className="flex flex-col gap-1 py-1 sm:flex-row sm:items-center sm:gap-3">
      <ul className="min-w-0 flex-1">
        <ItemRow item={item} showCategories={false} />
      </ul>
      <div className="flex items-center gap-2 pb-2 pl-8 sm:pb-0 sm:pl-0">
        {item.source === "share" && <span className="text-xs text-stone-400">Shared</span>}
        <select
          value=""
          onChange={(e) => e.target.value && setCategories(item.id, [e.target.value])}
          className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600"
          aria-label="Move to category"
        >
          <option value="">Move to…</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
