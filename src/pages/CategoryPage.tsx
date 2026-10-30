import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { isNote, isTask, type Note } from "../../shared/types";
import { ItemList } from "../components/ItemRow";
import { NoteCard } from "../components/NoteCard";
import { PageHeader } from "../components/PageHeader";
import { QuickAdd } from "../components/QuickAdd";
import { inCategories, useStore, withDescendants } from "../store/useStore";
import { NotFoundPage } from "./NotFoundPage";

export function CategoryPage() {
  const { slug = "" } = useParams();
  const categories = useStore((s) => s.categories);
  const items = useStore((s) => s.items);

  const category = categories.find((c) => c.slug === slug);
  const parent = category?.parent ? categories.find((c) => c.slug === category.parent) : undefined;
  const subcategories = categories.filter((c) => c.parent === slug);

  const [showArchived, setShowArchived] = useState(false);
  const { hash } = useLocation();

  // The Dashboard's "N notes" chip links to #notes.
  useEffect(() => {
    if (hash === "#notes") document.getElementById("notes")?.scrollIntoView({ behavior: "smooth" });
  }, [hash, slug]);

  // A parent's page also lists its subcategories' items; their badges show
  // which subcategory each belongs to. Tasks are a list (open first); notes
  // are a card grid, pinned first, with archived ones behind a toggle.
  const { open, done, notes, archived } = useMemo(() => {
    const all = inCategories(items, withDescendants(categories, slug));
    const tasks = all.filter(isTask);
    const allNotes = all.filter(isNote);
    const byPinThenRecent = (a: Note, b: Note) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt);
    return {
      open: tasks.filter((it) => it.status === "open").sort((a, b) => Number(b.pinned) - Number(a.pinned)),
      done: tasks
        .filter((it) => it.status === "done")
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
      notes: allNotes.filter((n) => n.status === "active").sort(byPinThenRecent),
      archived: allNotes.filter((n) => n.status === "archived").sort(byPinThenRecent),
    };
  }, [categories, items, slug]);

  if (!category) return <NotFoundPage />;

  const isList = category.kind === "list";

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <span aria-hidden>{category.icon}</span>
            {category.name}
          </span>
        }
        subtitle={
          <>
            {parent && (
              <>
                <Link to={`/category/${parent.slug}`} className="underline hover:text-stone-800">
                  {parent.name}
                </Link>
                {" · "}
              </>
            )}
            {category.description}
          </>
        }
      />

      <div className="mb-6 h-1 w-16 rounded-full" style={{ backgroundColor: category.color }} />

      {subcategories.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-stone-500">Subcategories</h2>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((c) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm hover:bg-stone-50"
              >
                {c.icon} {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <QuickAdd
          placeholder={`Add to ${category.name}…`}
          categories={[category.slug]}
          taskKind={isList ? "list-item" : "task"}
        />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white px-4">
        {open.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No open tasks here.</p>
        ) : (
          <ItemList items={open} hideCategory={category.slug} compact={isList} />
        )}
      </section>

      {done.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-stone-500 select-none hover:text-stone-800">
            Done ({done.length})
          </summary>
          <div className="mt-2 rounded-xl border border-stone-200 bg-white px-4">
            <ItemList items={done} hideCategory={category.slug} compact={isList} />
          </div>
        </details>
      )}

      {(notes.length > 0 || archived.length > 0) && (
        <section id="notes" className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-500">Notes ({notes.length})</h2>
            {archived.length > 0 && (
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="text-xs text-stone-500 underline hover:text-stone-800"
              >
                {showArchived ? "Hide archived" : `Show archived (${archived.length})`}
              </button>
            )}
          </div>
          <NoteGrid notes={showArchived ? [...notes, ...archived] : notes} />
        </section>
      )}
    </>
  );
}

function NoteGrid({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return <p className="text-sm text-stone-400">No active notes.</p>;
  return (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} />
      ))}
    </div>
  );
}
