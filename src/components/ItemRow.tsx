import { Check, ListChecks, Pin, StickyNote, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { displayTitle, isNote, type Item } from "../../shared/types";
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

// One row for a task or a note. Tasks get a done checkbox; notes get a note
// icon. Clicking the text opens the editor.
export function ItemRow({ item, showCategories = true, hideCategory, compact = false }: Props) {
  const categories = useStore((s) => s.categories);
  const setStatus = useStore((s) => s.setStatus);
  const openEditor = useStore((s) => s.openEditor);

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

  const note = isNote(item);
  const done = item.status === "done" || item.status === "archived";
  const dueDate = note ? null : item.dueDate;
  const overdue = !done && dueDate !== null && isOverdue(dueDate);
  const snippet = note ? item.body : item.notes;
  const title = displayTitle(item);
  const checked = item.checklist.filter((e) => e.checked).length;

  const toggle = () => setStatus(item.id, done ? "open" : "done");
  const remove = () => {
    if (confirm(`Delete "${title}"? This can't be undone.`)) setStatus(item.id, "deleted");
  };

  return (
    <li className={`group flex items-start gap-3 ${compact ? "py-1.5" : "py-2.5"}`}>
      {note ? (
        <StickyNote className="mt-0.5 size-5 shrink-0 p-0.5 text-amber-500" aria-label="Note" />
      ) : (
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
      )}

      <button type="button" onClick={() => openEditor(item.id)} className="min-w-0 flex-1 text-left" title="Edit">
        <p className={`text-sm break-words ${done ? "text-stone-400 line-through" : "text-stone-800"}`}>{title}</p>
        {!compact && snippet && item.title && <p className="mt-0.5 truncate text-xs text-stone-500">{snippet}</p>}
        {!compact && (dueDate || badges.length > 0 || item.checklist.length > 0) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {dueDate && (
              <span className={`text-xs ${overdue ? "font-medium text-red-600" : "text-stone-500"}`}>
                {formatDueLabel(dueDate)}
              </span>
            )}
            {item.checklist.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                <ListChecks className="size-3" />
                {checked}/{item.checklist.length}
              </span>
            )}
            {badges.map((c) => (
              <CategoryBadge key={c.slug} category={c} />
            ))}
          </span>
        )}
      </button>

      {/* Pinned marker sits at the row's edge, level with the first line, so
          titles stay aligned with the rows around them. */}
      {item.pinned && <Pin className="mt-1 size-3.5 shrink-0 rotate-45 text-stone-400" aria-label="Pinned" />}

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
