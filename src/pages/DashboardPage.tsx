import { CloudUpload, Loader2, StickyNote } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { isNote, isTask, type CategoryDef, type Item } from "../../shared/types";
import { ItemList } from "../components/ItemRow";
import { PageHeader } from "../components/PageHeader";
import { QuickAdd } from "../components/QuickAdd";
import { backupFailed } from "../lib/backup";
import { formatDateTime } from "../lib/dates";
import { inCategories, useStore, withDescendants } from "../store/useStore";

const LANE_LIMIT = 5;

export function DashboardPage() {
  const categories = useStore((s) => s.categories);
  const items = useStore((s) => s.items);
  const [lastAdded, setLastAdded] = useState<{ title: string; categories: string[] } | null>(null);

  // One card per top-level category shown on the Dashboard; each card also
  // holds its subcategories' open items.
  // Cards list open tasks; notes show only as a count.
  const cards = useMemo(() => {
    const openTasks = items.filter((it) => isTask(it) && it.status === "open");
    const activeNotes = items.filter((it) => isNote(it) && it.status === "active");
    return categories
      .filter((c) => c.parent === null && c.showOnDashboard)
      .map((c) => {
        const family = withDescendants(categories, c.slug);
        return {
          category: c,
          items: inCategories(openTasks, family).sort((a, b) => Number(b.pinned) - Number(a.pinned)),
          noteCount: inCategories(activeNotes, family).length,
        };
      });
  }, [categories, items]);

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
        {/* Masonry like Google Keep: columns fill the width, cards stack down. */}
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
          {cards.map(({ category, items, noteCount }) => (
            <Swimlane key={category.slug} category={category} items={items} noteCount={noteCount} />
          ))}
        </div>
      </section>
    </>
  );
}

function Swimlane({ category, items, noteCount }: { category: CategoryDef; items: Item[]; noteCount: number }) {
  const shown = items.slice(0, LANE_LIMIT);
  const more = items.length - shown.length;

  return (
    <div className="mb-4 flex break-inside-avoid flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
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
      {(more > 0 || noteCount > 0) && (
        <div className="flex items-center gap-3 border-t border-stone-100 px-4 py-2 text-xs text-stone-500">
          {more > 0 && (
            <Link to={`/category/${category.slug}`} className="hover:text-stone-800">
              +{more} more
            </Link>
          )}
          {noteCount > 0 && (
            <Link
              to={`/category/${category.slug}#notes`}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 hover:bg-amber-100"
            >
              <StickyNote className="size-3" />
              {noteCount} note{noteCount === 1 ? "" : "s"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function BackupStatus() {
  const backup = useStore((s) => s.backup);
  const refresh = useStore((s) => s.refreshBackup);
  const forceBackup = useStore((s) => s.forceBackup);

  // Scheduled backups happen in the background; refresh when the page
  // comes back into view.
  useEffect(() => {
    void refresh();
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  if (!backup) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-stone-500">
      {!backup.configured ? (
        <span>
          Backups are off.{" "}
          <Link to="/settings" className="underline hover:text-stone-800">
            Set a folder
          </Link>
        </span>
      ) : backup.running ? (
        <span>Backing up…</span>
      ) : (
        <>
          {backupFailed(backup) && (
            <span className="font-medium text-amber-700" title={backup.lastError ?? undefined}>
              Last backup failed
            </span>
          )}
          <span>
            {backup.lastSuccessAt ? `Last backed up at ${formatDateTime(backup.lastSuccessAt)}` : "Not backed up yet"}
          </span>
        </>
      )}
      <button
        type="button"
        onClick={() => void forceBackup()}
        disabled={!backup.configured || backup.running}
        className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:hover:bg-white"
      >
        {backup.running ? <Loader2 className="size-3.5 animate-spin" /> : <CloudUpload className="size-3.5" />}
        Force Backup
      </button>
    </div>
  );
}
