import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ItemKind } from "../../shared/types";
import { useStore } from "../store/useStore";

type Props = {
  placeholder?: string;
  // Categories to assign. Empty means the item lands in the Inbox
  // (classification chips arrive in phase 3).
  categories?: string[];
  kind?: ItemKind;
  onAdded?: (title: string) => void;
};

export function QuickAdd({ placeholder = "Add a task, note or link…", categories = [], kind, onAdded }: Props) {
  const addItem = useStore((s) => s.addItem);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const title = text.trim();
    if (!title || saving) return;
    setSaving(true);
    const item = await addItem({ title, categories, kind });
    setSaving(false);
    // On failure the text stays so nothing is lost; the store shows why.
    if (!item) return;
    setText("");
    onAdded?.(title);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-stone-400 focus:border-stone-400"
      />
      <button
        type="submit"
        disabled={!text.trim() || saving}
        className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
      >
        <Plus className="size-4" />
        Add
      </button>
    </form>
  );
}
