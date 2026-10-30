import {
  Archive,
  ArchiveRestore,
  Check,
  CheckSquare,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isNote, type ChecklistEntry, type Item, type UpdateItemInput } from "../../shared/types";
import { newId } from "../lib/id";
import { useStore } from "../store/useStore";
import { LazyMarkdown as Markdown } from "./LazyMarkdown";

// What the editor edits. `text` is a task's notes or a note's Markdown body,
// so switching between Task and Note keeps what was typed.
type Draft = {
  kind: "task" | "list-item" | "note";
  title: string;
  text: string;
  dueDate: string;
  categories: string[];
  tags: string;
  checklist: ChecklistEntry[];
  pinned: boolean;
};

function draftOf(item: Item): Draft {
  return {
    kind: item.kind,
    title: item.title,
    text: isNote(item) ? item.body : item.notes,
    dueDate: isNote(item) ? "" : (item.dueDate ?? ""),
    categories: item.categories,
    tags: item.tags.join(", "),
    checklist: item.checklist,
    pinned: item.pinned,
  };
}

const parseTags = (s: string) => [...new Set(s.split(",").map((t) => t.trim()).filter(Boolean))];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// The PATCH for what changed. Changing kind sends the text under the new
// kind's field; the server converts the rest.
function patchFor(item: Item, d: Draft): UpdateItemInput {
  const before = draftOf(item);
  const patch: UpdateItemInput = {};
  const toNote = d.kind === "note";
  const kindChanged = d.kind !== item.kind;
  if (kindChanged) patch.kind = d.kind;
  if (d.title.trim() !== before.title) patch.title = d.title.trim();
  if (kindChanged || d.text !== before.text) {
    if (toNote) patch.body = d.text;
    else patch.notes = d.text;
  }
  if (!toNote && (kindChanged || d.dueDate !== before.dueDate)) patch.dueDate = d.dueDate || null;
  if (!same(d.categories, before.categories)) patch.categories = d.categories;
  if (!same(parseTags(d.tags), item.tags)) patch.tags = parseTags(d.tags);
  if (!same(d.checklist, before.checklist)) patch.checklist = d.checklist.filter((e) => e.text.trim());
  if (d.pinned !== before.pinned) patch.pinned = d.pinned;
  return patch;
}

export function ItemEditor() {
  const editingId = useStore((s) => s.editingId);
  const item = useStore((s) => s.items.find((it) => it.id === s.editingId));
  const close = useStore((s) => s.closeEditor);

  // The item can disappear (deleted elsewhere); close then.
  useEffect(() => {
    if (editingId && !item) close();
  }, [editingId, item, close]);

  if (!item) return null;
  // Keyed by id so opening another item starts a fresh draft.
  return <EditorPanel key={item.id} item={item} onClose={close} />;
}

function EditorPanel({ item, onClose }: { item: Item; onClose: () => void }) {
  const categories = useStore((s) => s.categories);
  const updateItem = useStore((s) => s.updateItem);
  const setStatus = useStore((s) => s.setStatus);
  const [draft, setDraft] = useState<Draft>(() => draftOf(item));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const patch = useMemo(() => patchFor(item, draft), [item, draft]);
  const dirty = Object.keys(patch).length > 0;
  const note = draft.kind === "note";
  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const requestClose = () => {
    if (!dirty || confirm("Discard your changes?")) onClose();
  };

  const save = async () => {
    if (!dirty) return onClose();
    if (!note && !draft.title.trim()) {
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    const saved = await updateItem(item.id, patch);
    setSaving(false);
    if (saved) onClose();
  };

  // Esc closes, Ctrl/Cmd+Enter saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void save();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const statusAction = async (status: "open" | "done" | "active" | "archived" | "deleted") => {
    if (status === "deleted" && !confirm(`Delete "${item.title || "this note"}"? This can't be undone.`)) return;
    await setStatus(item.id, status);
    onClose();
  };

  const finished = item.status === "done" || item.status === "archived";
  const sameKindFamily = (item.kind === "note") === note;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 md:items-center md:p-6" onClick={requestClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={note ? "Edit note" : "Edit task"}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full flex-col bg-white md:max-h-[90vh] md:max-w-3xl md:rounded-2xl md:shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <div role="radiogroup" aria-label="Type" className="flex rounded-lg border border-stone-200 p-0.5">
            <KindOption active={!note} onClick={() => set({ kind: item.kind === "list-item" ? "list-item" : "task" })} icon={<CheckSquare className="size-3.5" />}>
              Task
            </KindOption>
            <KindOption active={note} onClick={() => set({ kind: "note" })} icon={<StickyNote className="size-3.5" />}>
              Note
            </KindOption>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <HeaderButton label={draft.pinned ? "Unpin" : "Pin"} onClick={() => set({ pinned: !draft.pinned })} active={draft.pinned}>
              {draft.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            </HeaderButton>
            {sameKindFamily &&
              (note ? (
                <HeaderButton label={finished ? "Unarchive" : "Archive"} onClick={() => statusAction(finished ? "active" : "archived")}>
                  {finished ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                </HeaderButton>
              ) : (
                <HeaderButton label={finished ? "Mark as open" : "Mark as done"} onClick={() => statusAction(finished ? "open" : "done")}>
                  {finished ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
                </HeaderButton>
              ))}
            <HeaderButton label="Delete" onClick={() => statusAction("deleted")} danger>
              <Trash2 className="size-4" />
            </HeaderButton>
            <HeaderButton label="Close" onClick={requestClose}>
              <X className="size-4" />
            </HeaderButton>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6">
          <input
            ref={titleRef}
            autoFocus
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder={note ? "Title (optional)" : "Task"}
            aria-label="Title"
            className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-stone-300"
          />

          {note ? (
            <div>
              <div className="mb-1 flex gap-3 text-xs">
                <TabButton active={!preview} onClick={() => setPreview(false)}>Write</TabButton>
                <TabButton active={preview} onClick={() => setPreview(true)}>Preview</TabButton>
                <span className="ml-auto text-stone-400">Markdown</span>
              </div>
              {preview ? (
                <div className="min-h-48 rounded-lg border border-stone-200 p-3">
                  {draft.text.trim() ? <Markdown>{draft.text}</Markdown> : <p className="text-sm text-stone-400">Nothing to preview.</p>}
                </div>
              ) : (
                <textarea
                  value={draft.text}
                  onChange={(e) => set({ text: e.target.value })}
                  placeholder="Write your note… (Markdown: # heading, **bold**, - list, [link](https://…))"
                  aria-label="Body"
                  className="min-h-48 w-full resize-y rounded-lg border border-stone-200 p-3 font-mono text-sm outline-none focus:border-stone-400 md:min-h-72"
                />
              )}
            </div>
          ) : (
            <>
              <textarea
                value={draft.text}
                onChange={(e) => set({ text: e.target.value })}
                placeholder="Details"
                aria-label="Details"
                rows={3}
                className="w-full resize-y rounded-lg border border-stone-200 p-3 text-sm outline-none focus:border-stone-400"
              />
              <Field label="Due date">
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => set({ dueDate: e.target.value })}
                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-sm"
                />
                {draft.dueDate && (
                  <button type="button" onClick={() => set({ dueDate: "" })} className="text-xs text-stone-500 underline">
                    Clear
                  </button>
                )}
              </Field>
            </>
          )}

          <ChecklistEditor entries={draft.checklist} onChange={(checklist) => set({ checklist })} />

          <Field label="Categories">
            <div className="flex flex-wrap items-center gap-1.5">
              {draft.categories.map((slug) => {
                const c = categories.find((x) => x.slug === slug);
                return (
                  <span key={slug} className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2 py-0.5 text-xs">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: c?.color }} />
                    {c?.icon} {c?.name ?? slug}
                    <button
                      type="button"
                      onClick={() => set({ categories: draft.categories.filter((s) => s !== slug) })}
                      aria-label={`Remove ${c?.name ?? slug}`}
                      className="rounded text-stone-400 hover:text-stone-800"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
              <select
                value=""
                onChange={(e) => e.target.value && set({ categories: [...draft.categories, e.target.value] })}
                aria-label="Add a category"
                className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs text-stone-500"
              >
                <option value="">+ Category</option>
                {categories
                  .filter((c) => !draft.categories.includes(c.slug))
                  .map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.parent ? "  " : ""}
                      {c.icon} {c.name}
                    </option>
                  ))}
              </select>
              {draft.categories.length === 0 && <span className="text-xs text-stone-400">None: it stays in the Inbox.</span>}
            </div>
          </Field>

          <Field label="Tags">
            <input
              value={draft.tags}
              onChange={(e) => set({ tags: e.target.value })}
              placeholder="comma, separated"
              className="w-full max-w-sm rounded-md border border-stone-200 bg-white px-2 py-1 text-sm outline-none focus:border-stone-400"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-stone-200 px-4 py-3">
          <span className="text-xs text-stone-400">
            {!sameKindFamily && `Will be saved as a ${note ? "note" : "task"}. `}
            Created {new Date(item.createdAt).toLocaleDateString()}
          </span>
          <button type="button" onClick={requestClose} className="ml-auto rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || (!note && !draft.title.trim())}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
          >
            {dirty ? "Save" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChecklistEditor({ entries, onChange }: { entries: ChecklistEntry[]; onChange: (e: ChecklistEntry[]) => void }) {
  const [newText, setNewText] = useState("");
  const update = (id: string, p: Partial<ChecklistEntry>) => onChange(entries.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const add = () => {
    if (!newText.trim()) return;
    onChange([...entries, { id: newId(), text: newText.trim(), checked: false }]);
    setNewText("");
  };
  const done = entries.filter((e) => e.checked).length;

  return (
    <Field label={entries.length > 0 ? `Checklist (${done}/${entries.length})` : "Checklist"}>
      <ul className="w-full space-y-1">
        {entries.map((entry) => (
          <li key={entry.id} className="group flex items-center gap-2">
            <button
              type="button"
              onClick={() => update(entry.id, { checked: !entry.checked })}
              aria-label={entry.checked ? "Uncheck" : "Check"}
              className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                entry.checked ? "border-stone-400 bg-stone-400 text-white" : "border-stone-300 hover:border-stone-500"
              }`}
            >
              {entry.checked && <Check className="size-3" strokeWidth={3} />}
            </button>
            <input
              value={entry.text}
              onChange={(e) => update(entry.id, { text: e.target.value })}
              aria-label="Checklist item"
              className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${entry.checked ? "text-stone-400 line-through" : ""}`}
            />
            <button
              type="button"
              onClick={() => onChange(entries.filter((e) => e.id !== entry.id))}
              aria-label="Remove checklist item"
              className="rounded p-0.5 text-stone-300 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <Plus className="size-4 shrink-0 text-stone-400" />
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            onBlur={add}
            placeholder="Add a checklist item"
            aria-label="New checklist item"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
          />
        </li>
      </ul>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-stone-500">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function KindOption({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${active ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100"}`}
    >
      {icon}
      {children}
    </button>
  );
}

function HeaderButton({
  label,
  onClick,
  children,
  active = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-md p-1.5 hover:bg-stone-100 ${danger ? "text-stone-500 hover:text-red-600" : active ? "text-stone-900" : "text-stone-500 hover:text-stone-900"}`}
    >
      {children}
    </button>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-0.5 ${active ? "border-stone-900 font-medium text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"}`}
    >
      {children}
    </button>
  );
}
