import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { ItemList } from "../components/ItemRow";
import { PageHeader } from "../components/PageHeader";
import { QuickAdd } from "../components/QuickAdd";
import { inCategory, useStore } from "../store/useStore";
import { NotFoundPage } from "./NotFoundPage";

export function CategoryPage() {
  const { slug = "" } = useParams();
  const categories = useStore((s) => s.categories);
  const items = useStore((s) => s.items);

  const category = categories.find((c) => c.slug === slug);
  const parent = category?.parent ? categories.find((c) => c.slug === category.parent) : undefined;
  const subcategories = categories.filter((c) => c.parent === slug);

  const { open, done } = useMemo(() => {
    const all = inCategory(items, slug);
    return {
      open: all.filter((it) => it.status === "open"),
      done: all
        .filter((it) => it.status === "done")
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    };
  }, [items, slug]);

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
          kind={isList ? "list-item" : "task"}
        />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white px-4">
        {open.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">Nothing open here.</p>
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
    </>
  );
}
