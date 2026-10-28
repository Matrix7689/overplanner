import { Check, Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { Item } from "../../shared/types";
import { formatDueLabel, isOverdue } from "../lib/dates";
import { useStore } from "../store/useStore";
import { CategoryBadge } from "./CategoryBadge";

type Props = {
  item: Item;
  showCategories?: boolean;
  // Hide the badge for the category the list is already showing.
  hideCategory?: string;
  compact?: boolean;
};

export function ItemRow({ item, showCategories = true, hideCategory, compact = false }: Props) {
  const categories = useStore((s) => s.categories);
  const setStatus = useStore((s) => s.setStatus);

  const badges = useMemo(
    () =>
      showCategories
        ? item.categories
            .filter((slug) => slug !== hideCategory)
            .map((slug) => categories.find((c) => c.slug === slug))
            .filter((c) => c !== undefined)
        : [],
    [showCategories, item.categories, hideCategory, categories],
  );

  const done = item.status === "done";
  const overdue = !done && item.dueDate !== null && isOverdue(item.dueDate);

  const toggle = () => setStatus(item.id, done ? "open" : "done");
  const remove = () => {
    if (confirm(`Delete "${item.title}"? This can't be undone.`)) setStatus(item.id, "deleted");
  };

  return (
    <li className={`group flex items-start gap-3 ${compact ? "py-1.5" : "py-2.5"}`}>
      <button
        type="button"
        onClick={toggle}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          done ? "border-stone-400 bg-stone-400 text-white" : "border-stone-300 hover:border-stone-500"
        }`}
        aria-label={done ? "Mark as open" : "Mark as done"}
      >
        {done && <Check className="size-3" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-sm break-words ${done ? "text-stone-400 line-through" : "text-stone-800"}`}>
          {item.title}
        </p>
        {!compact && item.notes && <p className="mt-0.5 truncate text-xs text-stone-500">{item.notes}</p>}
        {!compact && (item.dueDate || badges.length > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.dueDate && (
              <span className={`text-xs ${overdue ? "font-medium text-red-600" : "text-stone-500"}`}>
                {formatDueLabel(item.dueDate)}
              </span>
            )}
            {badges.map((c) => (
              <CategoryBadge key={c.slug} category={c} />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={remove}
        className="rounded p-1 text-stone-300 opacity-100 hover:bg-stone-100 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
        aria-label="Delete"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

export function ItemList({ items, ...rowProps }: { items: Item[] } & Omit<Props, "item">) {
  return (
    <ul className="divide-y divide-stone-100">
      {items.map((it) => (
        <ItemRow key={it.id} item={it} {...rowProps} />
      ))}
    </ul>
  );
}
