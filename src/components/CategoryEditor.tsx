import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { CategoryDef } from "../../shared/types";
import { normalizeHex } from "../lib/palette";
import { useStore } from "../store/useStore";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { confirmDialog } from "../ui/Confirm";
import { Segmented } from "../ui/Segmented";
import { Select } from "../ui/Select";

const splitKeywords = (text: string) => [...new Set(text.split(",").map((k) => k.trim()).filter(Boolean))];

// Edits one entry of data/categories.json. The ID isn't editable: it names the
// category's data file and every item refers to it.
export function CategoryEditor({ category, onClose }: { category: CategoryDef; onClose: () => void }) {
  const categories = useStore((s) => s.categories);
  const updateCategory = useStore((s) => s.updateCategory);

  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description);
  const [color, setColor] = useState(category.color);
  const [kind, setKind] = useState(category.kind);
  const [parent, setParent] = useState(category.parent ?? "");
  const [keywords, setKeywords] = useState(category.keywords.join(", "));
  const [showOnDashboard, setShowOnDashboard] = useState(category.showOnDashboard);
  const [suggest, setSuggest] = useState(category.suggest);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasChildren = categories.some((c) => c.parent === category.slug);
  const parents = categories.filter((c) => c.parent === null && c.slug !== category.slug);
  const hex = normalizeHex(color);

  const patch = {
    name: name.trim(),
    description: description.trim(),
    color: hex ?? category.color,
    kind,
    parent: parent || null,
    keywords: splitKeywords(keywords),
    showOnDashboard,
    suggest,
  };
  const dirty =
    patch.name !== category.name ||
    patch.description !== category.description.trim() ||
    (hex ?? "") !== category.color.toLowerCase() ||
    (!patch.parent && kind !== category.kind) ||
    patch.parent !== category.parent ||
    patch.keywords.join("\n") !== category.keywords.join("\n") ||
    showOnDashboard !== category.showOnDashboard ||
    suggest !== category.suggest;

  const requestClose = async () => {
    if (dirty && !(await confirmDialog({ title: "Discard your changes?", confirmLabel: "Discard", danger: true }))) return;
    onClose();
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!dirty) return onClose();
    if (!patch.name) return setError("A category needs a name.");
    if (!hex) return setError("Use a HEX color like #A88462.");
    setSaving(true);
    const refused = await updateCategory(category.slug, patch);
    setSaving(false);
    if (refused) setError(refused);
    else onClose();
  };

  const input = "w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-title outline-none placeholder:text-faint focus:border-accent";

  return (
    <Dialog.Root open onOpenChange={(open) => !open && void requestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-overlay-show fixed inset-0 z-50 bg-(--overlay-bg) backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="pop-shadow data-[state=open]:animate-content-show fixed inset-0 z-50 flex flex-col bg-surface md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[90vh] md:w-[calc(100vw-3rem)] md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-line"
        >
          <form onSubmit={(e) => void save(e)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <Dialog.Title className="text-base font-semibold text-title">Edit {category.name}</Dialog.Title>
              <button
                type="button"
                aria-label="Close"
                onClick={() => void requestClose()}
                className="rounded-lg bg-line p-2 text-title transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:brightness-125"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <Field label="Name">
                <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={input} />
              </Field>

              <Field label="ID" hint="Fixed, because item files and links use it.">
                <p className="font-mono text-sm text-caption">{category.slug}</p>
              </Field>

              <Field label="Description" hint="JEV reads this when suggesting categories.">
                <textarea value={description} rows={3} onChange={(e) => setDescription(e.target.value)} className={`${input} resize-y`} />
              </Field>

              <Field label="Color">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Color picker"
                    value={hex ?? category.color}
                    onChange={(e) => setColor(e.target.value)}
                    className="size-9 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
                  />
                  <input
                    aria-label="Color HEX code"
                    aria-invalid={!hex}
                    value={color}
                    maxLength={7}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) => setColor(e.target.value)}
                    onBlur={() => hex && setColor(hex)}
                    className={`w-28 rounded-lg border bg-transparent px-2.5 py-1.5 font-mono text-sm text-title uppercase outline-none ${
                      hex ? "border-line focus:border-accent" : "border-danger"
                    }`}
                  />
                </div>
              </Field>

              <Field label="Parent" hint={hasChildren ? "It has subcategories, so it stays top level." : undefined}>
                {hasChildren ? (
                  <p className="text-sm text-caption">None (top level)</p>
                ) : (
                  <Select
                    label="Parent"
                    value={parent}
                    onChange={setParent}
                    options={[{ value: "", label: "None (top level)" }, ...parents.map((c) => ({ value: c.slug, label: c.name, color: c.color }))]}
                  />
                )}
              </Field>

              {!parent && (
                <Field label="Shows under">
                  <Segmented
                    label="Shows under"
                    value={kind}
                    onChange={setKind}
                    options={[
                      { value: "category", label: "Categories" },
                      { value: "list", label: "Lists" },
                    ]}
                  />
                </Field>
              )}

              <Field label="Keywords" hint="Separate with commas. Text containing one suggests this category.">
                <textarea value={keywords} rows={2} onChange={(e) => setKeywords(e.target.value)} className={`${input} resize-y`} />
              </Field>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-body">
                  <Checkbox checked={showOnDashboard} onChange={setShowOnDashboard} label="Show on the Dashboard" />
                  Show on the Dashboard
                </label>
                <label className="flex items-center gap-2 text-sm text-body">
                  <Checkbox checked={suggest} onChange={setSuggest} label="Suggest automatically" />
                  Suggest automatically (off means you only file to it by hand)
                </label>
              </div>
            </div>

            <div className="border-t border-line px-5 py-3">
              {error && (
                <p role="alert" className="mb-2 text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => void requestClose()}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {dirty ? "Save" : "Done"}
                </Button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-caption">{label}</p>
      {children}
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}
