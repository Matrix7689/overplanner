import { Archive, ArchiveRestore, Check, Link2, Pin, PinOff } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import type { Note } from "../../shared/types";
import { useStore } from "../store/useStore";
import { LazyMarkdown as Markdown } from "./LazyMarkdown";

const CHECKLIST_PREVIEW = 8;

// A Keep-style note card. Clicking it opens the editor; checklist boxes, pin
// and archive work in place.
export function NoteCard({ note }: { note: Note }) {
  const openEditor = useStore((s) => s.openEditor);
  const updateItem = useStore((s) => s.updateItem);
  const archived = note.status === "archived";

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const toggleEntry = (id: string) =>
    updateItem(note.id, { checklist: note.checklist.map((e) => (e.id === id ? { ...e, checked: !e.checked } : e)) });

  const shown = note.checklist.slice(0, CHECKLIST_PREVIEW);
  const more = note.checklist.length - shown.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openEditor(note.id)}
      onKeyDown={(e) => e.key === "Enter" && openEditor(note.id)}
      className={`group mb-4 break-inside-avoid cursor-pointer rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md ${
        archived ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {note.title && <h3 className="min-w-0 flex-1 text-sm font-semibold break-words text-stone-900">{note.title}</h3>}
        <div className={`ml-auto flex shrink-0 gap-0.5 ${note.pinned ? "" : "md:opacity-0 md:group-hover:opacity-100"}`}>
          <IconButton
            label={note.pinned ? "Unpin" : "Pin"}
            onClick={stop(() => updateItem(note.id, { pinned: !note.pinned }))}
          >
            {note.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </IconButton>
          <IconButton
            label={archived ? "Unarchive" : "Archive"}
            onClick={stop(() => updateItem(note.id, { status: archived ? "active" : "archived" }))}
          >
            {archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          </IconButton>
        </div>
      </div>

      {note.body && (
        <div className="mt-1 max-h-60 overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
          <Markdown>{note.body}</Markdown>
        </div>
      )}

      {shown.length > 0 && (
        <ul className="mt-2 space-y-1">
          {shown.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2 text-sm">
              <button
                type="button"
                onClick={stop(() => toggleEntry(entry.id))}
                aria-label={entry.checked ? "Uncheck" : "Check"}
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
                  entry.checked ? "border-stone-400 bg-stone-400 text-white" : "border-stone-300 hover:border-stone-500"
                }`}
              >
                {entry.checked && <Check className="size-3" strokeWidth={3} />}
              </button>
              <span className={entry.checked ? "text-stone-400 line-through" : "text-stone-700"}>{entry.text}</span>
            </li>
          ))}
          {more > 0 && <li className="pl-6 text-xs text-stone-400">+{more} more</li>}
        </ul>
      )}

      {note.links.length > 0 && (
        <p className="mt-2 flex items-center gap-1 text-xs text-stone-400">
          <Link2 className="size-3" /> {note.links.length} link{note.links.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: (e: MouseEvent) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
    >
      {children}
    </button>
  );
}
