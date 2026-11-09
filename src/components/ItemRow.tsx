import { ClipboardCheck, Copy, ListChecks, Pin, StickyNote, Trash2, X } from "lucide-react";
import { useMemo } from "react";
import { displayTitle, isNote, type Item } from "../../shared/types";
import { COPY_LABELS, itemAsText, useCopy } from "../lib/clipboard";
import { formatDueLabel, isOverdue } from "../lib/dates";
import { useStore } from "../store/useStore";
import { Checkbox } from "../ui/Checkbox";
import { confirmDialog } from "../ui/Confirm";
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
  const updateItem = useStore((s) => s.updateItem);

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

  const { state: copyState, copy } = useCopy();

  const toggle = () => setStatus(item.id, done ? "open" : "done");
  const remove = async () => {
    const ok = await confirmDialog({
      title: `Delete "${title}"?`,
      description: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) void setStatus(item.id, "deleted");
  };

  return (
    <li className={`group flex items-start gap-3 ${compact ? "py-1.5" : "py-2.5"}`}>
      {note ? (
        <StickyNote className="mt-0.5 size-5 shrink-0 p-0.5 text-accent" aria-label="Note" />
      ) : (
        <Checkbox round className="mt-0.5" checked={done} onChange={toggle} label={done ? "Mark as open" : "Mark as done"} />
      )}

      <button type="button" onClick={() => openEditor(item.id)} className="min-w-0 flex-1 text-left" title="Edit">
        <p className={`text-sm break-words ${done ? "text-faint line-through" : "text-title"}`}>{title}</p>
        {!compact && snippet && item.title && <p className="mt-0.5 truncate text-xs text-caption">{snippet}</p>}
        {!compact && (dueDate || badges.length > 0 || item.checklist.length > 0) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {dueDate && (
              <span className={`text-xs ${overdue ? "font-medium text-danger" : "text-caption"}`}>
                {formatDueLabel(dueDate)}
              </span>
            )}
            {item.checklist.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-caption">
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

      <div className="flex shrink-0 gap-0.5">
        {/* Stays visible on a pinned row, where it marks the pin and unpins on click. */}
        {(!done || item.pinned) && (
          <button
            type="button"
            onClick={() => void updateItem(item.id, { pinned: !item.pinned })}
            className={`rounded-lg p-1 transition-opacity hover:bg-soft hover:text-title ${
              item.pinned
                ? "text-caption"
                : "text-faint opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            }`}
            aria-label={item.pinned ? "Unpin" : "Pin"}
            aria-pressed={item.pinned}
            title={item.pinned ? "Unpin" : "Pin"}
          >
            <Pin className={`size-4 ${item.pinned ? "rotate-45 fill-current" : ""}`} />
          </button>
        )}
        <button
          type="button"
          onClick={() => void copy(itemAsText({ title: item.title, text: snippet, checklist: item.checklist }))}
          className={`rounded-lg p-1 transition-opacity hover:bg-soft md:group-hover:opacity-100 md:focus-visible:opacity-100 ${
            copyState === "copied"
              ? "text-ok"
              : copyState === "failed"
                ? "text-danger"
                : "text-faint opacity-100 hover:text-title md:opacity-0"
          }`}
          aria-label={COPY_LABELS[copyState]}
          title={COPY_LABELS[copyState]}
        >
          {copyState === "copied" ? <ClipboardCheck className="size-4" /> : copyState === "failed" ? <X className="size-4" /> : <Copy className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => void remove()}
          className="rounded-lg p-1 text-faint opacity-100 transition-opacity hover:bg-soft hover:text-danger md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}

export function ItemList({ items, ...rowProps }: { items: Item[] } & Omit<Props, "item">) {
  return (
    <ul className="divide-y divide-line">
      {items.map((it) => (
        <ItemRow key={it.id} item={it} {...rowProps} />
      ))}
    </ul>
  );
}
