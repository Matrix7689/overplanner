import { CheckSquare, Plus, StickyNote } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { CreateItemInput } from "../../shared/types";
import { useSuggestions } from "../lib/useSuggestions";
import { useStore } from "../store/useStore";
import { Button } from "../ui/Button";
import { Segmented } from "../ui/Segmented";
import { CategoryChips } from "./CategoryChips";

type Props = {
  placeholder?: string;
  // Fixed categories (e.g. on a category page). When omitted, the text is
  // classified and the user picks from suggested chips; with nothing
  // selected the item goes to the Inbox.
  categories?: string[];
  // What a task becomes here: "list-item" on a list's page.
  taskKind?: "task" | "list-item";
  onAdded?: (title: string, categories: string[]) => void;
};

type Mode = "task" | "note";

const LONG_TEXT = 140;
const SINGLE_LINE_TITLE = 100;

// Note is suggested for text that reads like a note: several lines, long, or
// a link. The user's own choice always wins.
function looksLikeNote(text: string): boolean {
  return text.includes("\n") || text.length > LONG_TEXT || /https?:\/\//.test(text);
}

// Splits note text into a title and a Markdown body: the first line is the
// title when there are several lines; one short line is just a title; one
// long line is just a body.
function splitNote(text: string): { title: string; body: string } {
  const [first, ...rest] = text.split("\n");
  if (rest.length > 0) return { title: first.trim(), body: rest.join("\n").trim() };
  return text.length <= SINGLE_LINE_TITLE ? { title: text, body: "" } : { title: "", body: text };
}

export function QuickAdd({ placeholder = "Add a task, note or link…", categories, taskKind, onAdded }: Props) {
  const addItem = useStore((s) => s.addItem);
  const allCategories = useStore((s) => s.categories);
  const [text, setText] = useState("");
  const [chosenMode, setChosenMode] = useState<Mode | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmed = text.trim();
  const mode: Mode = chosenMode ?? (looksLikeNote(trimmed) ? "note" : "task");
  const suggest = categories === undefined;
  const suggestions = useSuggestions(suggest ? text : "", { autoJev: true });

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!trimmed || saving) return;
    setSaving(true);

    let chosen = categories ?? [];
    let classification: CreateItemInput["classification"];
    if (suggest) {
      // Never waits on JEV: saves with whatever suggestions are ready.
      ({ categories: chosen, classification } = await suggestions.resolve());
    }

    let input: CreateItemInput;
    if (mode === "note") {
      input = { kind: "note", ...splitNote(trimmed), categories: chosen, classification };
    } else {
      const lists = new Set(allCategories.filter((c) => c.kind === "list").map((c) => c.slug));
      const allLists = chosen.length > 0 && chosen.every((s) => lists.has(s));
      const kind = taskKind ?? (allLists ? "list-item" : "task");
      const [first, ...rest] = trimmed.split("\n");
      input = { kind, title: first.trim(), notes: rest.join("\n").trim(), categories: chosen, classification };
    }

    const item = await addItem(input);
    setSaving(false);
    // On failure the text stays so nothing is lost; the store shows why.
    if (!item) return;
    setText("");
    setChosenMode(null);
    suggestions.reset();
    onAdded?.(item.title || "note", item.categories);
  };

  // Enter saves; Shift+Enter adds a line.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form
      onSubmit={submit}
      className="card-shadow space-y-2.5 rounded-2xl border border-line bg-surface p-2.5 transition-colors focus-within:border-accent/60"
    >
      <div className="flex items-start gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          className="field-sizing-content max-h-60 min-h-9.5 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-title outline-none placeholder:text-faint"
        />
        <Segmented
          label="Type"
          value={mode}
          onChange={setChosenMode}
          compactLabels
          className="shrink-0"
          options={[
            { value: "task", label: "Task", icon: <CheckSquare className="size-3.5" /> },
            { value: "note", label: "Note", icon: <StickyNote className="size-3.5" /> },
          ]}
        />
        <Button type="submit" disabled={!trimmed || saving}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {suggest && trimmed && (
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
