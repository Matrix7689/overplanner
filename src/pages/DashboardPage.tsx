import { CloudUpload } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { CategoryDef, Item } from "../../shared/types";
import { ItemList } from "../components/ItemRow";
import { PageHeader } from "../components/PageHeader";
import { QuickAdd } from "../components/QuickAdd";
import { useStore } from "../store/useStore";

const LANE_LIMIT = 5;

export function DashboardPage() {
  const categories = useStore((s) => s.categories);
  const items = useStore((s) => s.items);
  const [lastAdded, setLastAdded] = useState<{ title: string; categories: string[] } | null>(null);

  const openBySlug = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const it of items) {
      if (it.status !== "open") continue;
      for (const slug of it.categories) (map[slug] ??= []).push(it);
    }
    return map;
  }, [items]);

  const greeting = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <PageHeader title="Dashboard" subtitle={greeting} actions={<BackupStatus />} />

      <section className="mb-8">
        <QuickAdd onAdded={(title, slugs) => setLastAdded({ title, categories: slugs })} />
        {lastAdded && (
          <p className="mt-2 text-xs text-stone-500">
            Added “{lastAdded.title}” to{" "}
            {lastAdded.categories.length === 0 ? (
              <Link to="/inbox" className="underline hover:text-stone-800">
                the Inbox
              </Link>
            ) : (
              lastAdded.categories.map((slug, i) => (
                <span key={slug}>
                  {i > 0 && ", "}
                  <Link to={`/category/${slug}`} className="underline hover:text-stone-800">
                    {categories.find((c) => c.slug === slug)?.name ?? slug}
                  </Link>
                </span>
              ))
            )}
            .
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-stone-500">Categories</h2>
        <div className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:scroll-px-8 md:px-8">
          {categories
            .filter((c) => c.parent === null)
            .map((c) => (
              <Swimlane key={c.slug} category={c} items={openBySlug[c.slug] ?? []} />
            ))}
        </div>
      </section>
    </>
  );
}

function Swimlane({ category, items }: { category: CategoryDef; items: Item[] }) {
  const shown = items.slice(0, LANE_LIMIT);
  const more = items.length - shown.length;

  return (
    <div className="flex w-72 shrink-0 snap-start flex-col rounded-xl border border-stone-200 bg-white">
      <Link
        to={`/category/${category.slug}`}
        className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 hover:bg-stone-50"
        style={{ boxShadow: `inset 0 3px 0 ${category.color}` }}
      >
        <span aria-hidden>{category.icon}</span>
        <span className="flex-1 truncate text-sm font-medium">{category.name}</span>
        <span className="text-xs tabular-nums text-stone-400">{items.length}</span>
      </Link>
      <div className="flex-1 px-4 py-1">
        {shown.length === 0 ? (
          <p className="py-3 text-sm text-stone-400">Nothing open</p>
        ) : (
          <ItemList items={shown} hideCategory={category.slug} compact />
        )}
      </div>
      {more > 0 && (
        <Link
          to={`/category/${category.slug}`}
          className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500 hover:text-stone-800"
        >
          +{more} more
        </Link>
      )}
    </div>
  );
}

// Backups arrive in phase 4; until then this only shows that none exist.
function BackupStatus() {
  return (
    <div className="flex items-center gap-3 text-xs text-stone-500">
      <span>Not backed up yet</span>
      <button
        type="button"
        disabled
        title="Backups are not set up yet"
        className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:hover:bg-white"
      >
        <CloudUpload className="size-3.5" />
        Force Backup
      </button>
    </div>
  );
}
