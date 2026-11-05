import * as Dialog from "@radix-ui/react-dialog";
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
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { confirmDialog } from "../ui/Confirm";
import { Segmented } from "../ui/Segmented";
import { Select } from "../ui/Select";
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

  const requestClose = async () => {
    if (dirty && !(await confirmDialog({ title: "Discard your changes?", confirmLabel: "Discard", danger: true }))) return;
    onClose();
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

  const statusAction = async (status: "open" | "done" | "active" | "archived" | "deleted") => {
    if (status === "deleted") {
      const ok = await confirmDialog({
        title: `Delete "${item.title || "this note"}"?`,
        description: "This can't be undone.",
        confirmLabel: "Delete",
        danger: true,
      });
      if (!ok) return;
    }
    await setStatus(item.id, status);
    onClose();
  };

  const finished = item.status === "done" || item.status === "archived";
  const sameKindFamily = (item.kind === "note") === note;

  return (
    // Radix handles Esc and clicks outside (through onOpenChange), traps focus
    // and stacks correctly with the confirm dialog. Ctrl/Cmd+Enter saves.
    <Dialog.Root open onOpenChange={(open) => !open && void requestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-overlay-show fixed inset-0 z-50 bg-(--overlay-bg) backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            titleRef.current?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void save();
          }}
          className="pop-shadow data-[state=open]:animate-content-show fixed inset-0 z-50 flex flex-col bg-surface md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[90vh] md:w-[calc(100vw-3rem)] md:max-w-3xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-line"
        >
        <Dialog.Title className="sr-only">{note ? "Edit note" : "Edit task"}</Dialog.Title>
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Segmented
            label="Type"
            value={note ? "note" : "task"}
            onChange={(v) => set({ kind: v === "note" ? "note" : item.kind === "list-item" ? "list-item" : "task" })}
            options={[
              { value: "task", label: "Task", icon: <CheckSquare className="size-3.5" /> },
              { value: "note", label: "Note", icon: <StickyNote className="size-3.5" /> },
            ]}
          />
          <div className="ml-auto flex items-center gap-1.5">
            <HeaderButton label={draft.pinned ? "Unpin" : "Pin"} onClick={() => set({ pinned: !draft.pinned })} tone={draft.pinned ? "pinned" : "pin"}>
              {draft.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            </HeaderButton>
            {sameKindFamily &&
              (note ? (
                <HeaderButton label={finished ? "Unarchive" : "Archive"} onClick={() => statusAction(finished ? "active" : "archived")} tone="done">
                  {finished ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                </HeaderButton>
              ) : (
                <HeaderButton label={finished ? "Mark as open" : "Mark as done"} onClick={() => statusAction(finished ? "open" : "done")} tone="done">
                  {finished ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
                </HeaderButton>
              ))}
            <HeaderButton label="Delete" onClick={() => statusAction("deleted")} tone="delete">
              <Trash2 className="size-4" />
            </HeaderButton>
            <HeaderButton label="Close" onClick={() => void requestClose()} tone="close">
              <X className="size-4" />
            </HeaderButton>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6">
          <input
            ref={titleRef}
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder={note ? "Title (optional)" : "Task"}
            aria-label="Title"
            className="w-full bg-transparent text-xl font-bold tracking-tight text-title outline-none placeholder:text-faint"
          />

          {note ? (
            <div>
              <div className="mb-1 flex gap-3 text-xs">
                <TabButton active={!preview} onClick={() => setPreview(false)}>Write</TabButton>
                <TabButton active={preview} onClick={() => setPreview(true)}>Preview</TabButton>
                <span className="ml-auto text-faint">Markdown</span>
              </div>
              {preview ? (
                <div className="min-h-48 rounded-xl border border-line p-3">
                  {draft.text.trim() ? <Markdown>{draft.text}</Markdown> : <p className="text-sm text-faint">Nothing to preview.</p>}
                </div>
              ) : (
                <textarea
                  value={draft.text}
                  onChange={(e) => set({ text: e.target.value })}
                  placeholder="Write your note… (Markdown: # heading, **bold**, - list, [link](https://…))"
                  aria-label="Body"
                  className="min-h-48 w-full resize-y rounded-xl border border-line bg-transparent p-3 font-mono text-sm text-title outline-none placeholder:text-faint focus:border-accent md:min-h-72"
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
                className="w-full resize-y rounded-xl border border-line bg-transparent p-3 text-sm text-title outline-none placeholder:text-faint focus:border-accent"
              />
              <Field label="Due date">
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => set({ dueDate: e.target.value })}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-title outline-none focus:border-accent"
                />
                {draft.dueDate && (
                  <button type="button" onClick={() => set({ dueDate: "" })} className="text-xs text-caption underline">
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
                  <span key={slug} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-soft px-2.5 text-xs font-medium text-title">
                    <span className="cat-dot size-1.5 rounded-full" style={{ backgroundColor: c?.color }} />
                    {c?.name ?? slug}
                    <button
                      type="button"
                      onClick={() => set({ categories: draft.categories.filter((s) => s !== slug) })}
                      aria-label={`Remove ${c?.name ?? slug}`}
                      className="rounded text-faint hover:text-title"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
              <Select
                size="xs"
                label="Add a category"
                placeholder="+ Category"
                value=""
                onChange={(slug) => set({ categories: [...draft.categories, slug] })}
                options={categories
                  .filter((c) => !draft.categories.includes(c.slug))
                  .map((c) => ({ value: c.slug, label: c.name, color: c.color, indent: c.parent !== null }))}
              />
              {draft.categories.length === 0 && <span className="text-xs text-faint">None: it stays in the Inbox.</span>}
            </div>
          </Field>

          <Field label="Tags">
            <input
              value={draft.tags}
              onChange={(e) => set({ tags: e.target.value })}
              placeholder="comma, separated"
              className="w-full max-w-sm rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-title outline-none placeholder:text-faint focus:border-accent"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <span className="text-xs text-faint">
            {!sameKindFamily && `Will be saved as a ${note ? "note" : "task"}. `}
            Created {new Date(item.createdAt).toLocaleDateString()}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void requestClose()}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving || (!note && !draft.title.trim())}>
            {dirty ? "Save" : "Done"}
          </Button>
        </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
            <Checkbox
              checked={entry.checked}
              onChange={(checked) => update(entry.id, { checked })}
              label={entry.checked ? "Uncheck" : "Check"}
            />
            <input
              value={entry.text}
              onChange={(e) => update(entry.id, { text: e.target.value })}
              aria-label="Checklist item"
              className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${entry.checked ? "text-faint line-through" : "text-title"}`}
            />
            <button
              type="button"
              onClick={() => onChange(entries.filter((e) => e.id !== entry.id))}
              aria-label="Remove checklist item"
              className="rounded p-0.5 text-faint hover:text-danger md:opacity-0 md:group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <Plus className="size-4 shrink-0 text-faint" />
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
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </li>
      </ul>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-caption">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const HEADER_TONES = {
  pin: "bg-warn-soft text-warn",
  pinned: "bg-warn text-surface",
  done: "bg-ok-soft text-ok",
  delete: "bg-danger-soft text-danger",
  close: "bg-line text-title",
};

function HeaderButton({
  label,
  onClick,
  children,
  tone,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone: keyof typeof HEADER_TONES;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:brightness-125 ${HEADER_TONES[tone]}`}
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
      className={`border-b-2 pb-0.5 ${active ? "border-accent font-medium text-title" : "border-transparent text-caption hover:text-title"}`}
    >
      {children}
    </button>
  );
}
