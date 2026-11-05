import { CalendarClock, Inbox, ListTodo, StickyNote } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { isNote, isTask, type CategoryDef, type Item } from "../../shared/types";
import { ItemList } from "../components/ItemRow";
import { PageHeader } from "../components/PageHeader";
import { QuickAdd } from "../components/QuickAdd";
import { SortableCardGrid } from "../components/SortableCardGrid";
import { todayISO } from "../lib/dates";
import { inboxItems, inCategories, useStore, withDescendants } from "../store/useStore";

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

  // Your saved order first; categories it doesn't mention (new ones) follow
  // in their default order.
  const savedOrder = useStore((s) => s.settings.ui.dashboardOrder);
  const setDashboardOrder = useStore((s) => s.setDashboardOrder);
  const orderedCards = useMemo(() => {
    const rank = new Map(savedOrder.map((slug, i) => [slug, i]));
    return cards
      .map((card, i) => ({ card, key: rank.get(card.category.slug) ?? savedOrder.length + i }))
      .sort((a, b) => a.key - b.key)
      .map(({ card }) => card);
  }, [cards, savedOrder]);
  const cardsBySlug = useMemo(() => new Map(cards.map((c) => [c.category.slug, c])), [cards]);

  const now = new Date();
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const stats = useMemo(() => {
    const today = todayISO();
    const open = items.filter(isTask).filter((it) => it.status === "open");
    return {
      open: open.length,
      dueToday: open.filter((it) => it.dueDate === today).length,
      overdue: open.filter((it) => it.dueDate !== null && it.dueDate < today).length,
      inbox: inboxItems(items).length,
    };
  }, [items]);

  return (
    <>
      <PageHeader eyebrow={date} title={greeting} />

      <section className="mb-6 grid grid-cols-3 gap-3">
        <Stat to="/search?kind=task&status=open" icon={<ListTodo className="size-4" />} label="Open tasks" value={stats.open} />
        <Stat
          to="/calendar"
          icon={<CalendarClock className="size-4" />}
          label={stats.overdue > 0 ? `Due today · ${stats.overdue} overdue` : "Due today"}
          value={stats.dueToday}
          alert={stats.overdue > 0}
        />
        <Stat to="/inbox" icon={<Inbox className="size-4" />} label="In the Inbox" value={stats.inbox} />
      </section>

      <section className="mb-8">
        <QuickAdd onAdded={(title, slugs) => setLastAdded({ title, categories: slugs })} />
        {lastAdded && (
          <p className="mt-2 px-1 text-xs text-caption">
            Added “{lastAdded.title}” to{" "}
            {lastAdded.categories.length === 0 ? (
              <Link to="/inbox" className="underline hover:text-title">
                the Inbox
              </Link>
            ) : (
              lastAdded.categories.map((slug, i) => (
                <span key={slug}>
                  {i > 0 && ", "}
                  <Link to={`/category/${slug}`} className="underline hover:text-title">
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
        <div className="mb-3 flex items-baseline gap-3 px-1">
          <h2 className="text-sm font-semibold text-title">Categories</h2>
          <span className="hidden text-xs text-faint sm:inline">Drag cards to reorder</span>
          {savedOrder.length > 0 && (
            <button
              type="button"
              onClick={() => setDashboardOrder([])}
              className="ml-auto text-xs text-caption underline hover:text-title"
            >
              Reset order
            </button>
          )}
        </div>
        <SortableCardGrid
          ids={orderedCards.map((c) => c.category.slug)}
          onReorder={setDashboardOrder}
          renderCard={(slug) => {
            const card = cardsBySlug.get(slug)!;
            return <Swimlane category={card.category} items={card.items} noteCount={card.noteCount} />;
          }}
        />
      </section>
    </>
  );
}

function Stat({ to, icon, label, value, alert }: { to: string; icon: ReactNode; label: string; value: number; alert?: boolean }) {
  return (
    <Link
      to={to}
      className="card-shadow group flex min-w-0 flex-col justify-between gap-1 rounded-2xl border border-line bg-surface px-3 py-3 sm:px-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/50"
    >
      <span className={`flex items-center gap-1.5 text-xs font-medium ${alert ? "text-danger" : "text-caption"}`}>
        <span className="hidden shrink-0 sm:inline">{icon}</span>
        <span className="min-w-0 leading-tight">{label}</span>
      </span>
      <span className="text-2xl font-bold tracking-tight text-title">{value}</span>
    </Link>
  );
}

function Swimlane({ category, items, noteCount }: { category: CategoryDef; items: Item[]; noteCount: number }) {
  const shown = items.slice(0, LANE_LIMIT);
  const more = items.length - shown.length;

  return (
    <div className="card-shadow flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/50">
      {/* draggable={false}: links would otherwise start the browser's own
          link drag instead of moving the card. The wash of the category's
          colour is where a background photo can go later. */}
      <Link
        to={`/category/${category.slug}`}
        draggable={false}
        className="flex items-center gap-2.5 px-4 py-3.5"
        style={{ backgroundImage: `linear-gradient(115deg, ${category.color}24, transparent 72%)` }}
      >
        <span className="cat-dot size-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} aria-hidden />
        <span className="flex-1 truncate text-sm font-semibold text-title">{category.name}</span>
        {items.length > 0 && (
          <span className="rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-body tabular-nums">{items.length}</span>
        )}
      </Link>
      <div className="flex-1 px-4 pb-1.5">
        {shown.length === 0 ? (
          <p className="py-2 text-sm text-faint">Nothing open</p>
        ) : (
          <ItemList items={shown} hideCategory={category.slug} compact />
        )}
      </div>
      {(more > 0 || noteCount > 0) && (
        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-xs text-caption">
          {more > 0 && (
            <Link to={`/category/${category.slug}`} draggable={false} className="hover:text-title">
              +{more} more
            </Link>
          )}
          {noteCount > 0 && (
            <Link
              to={`/category/${category.slug}#notes`}
              draggable={false}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-soft px-2 py-0.5 font-medium text-body hover:text-title"
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

