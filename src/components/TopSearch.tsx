import Fuse from "fuse.js";
import { Loader2, Search, StickyNote, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { displayTitle, isNote, type CategoryDef, type Item } from "../../shared/types";
import { api } from "../lib/api";
import { formatDueLabel } from "../lib/dates";
import { useStore } from "../store/useStore";

const PER_GROUP = 5;

type Group = "Categories" | "Tasks" | "Notes" | "Settings" | "Pages";
type Result = {
  key: string;
  group: Group;
  title: string;
  subtitle?: string;
  color?: string;
  dim?: boolean;
  run: () => void;
};

type Destination = { title: string; subtitle: string; keywords: string[]; to: string };

// Settings sections link to their anchors on the Settings page.
const SETTINGS: Destination[] = [
  { title: "Appearance", subtitle: "Theme: system, light or dark", keywords: ["dark mode", "light mode", "theme"], to: "/settings#appearance" },
  { title: "Classification thresholds", subtitle: "When suggestion chips are pre-selected or shown as Maybe", keywords: ["chips", "threshold", "maybe", "auto-select", "suggestions"], to: "/settings#classification-thresholds" },
  { title: "Backup", subtitle: "Google Drive folder, backups to keep, back up now", keywords: ["drive", "google drive", "restore", "force backup", "snapshot"], to: "/settings#backup" },
  { title: "JEV", subtitle: "Classifier connection, last call, test", keywords: ["typesafe", "api key", "classifier", "ai"], to: "/settings#jev" },
  { title: "Integrations", subtitle: "Web Share Target, Keep and WhatsApp imports", keywords: ["share", "keep", "whatsapp", "import"], to: "/settings#integrations" },
  { title: "Categories list", subtitle: "Every category with its description and keywords", keywords: ["keywords", "descriptions", "categories.json"], to: "/settings#categories" },
];

const PAGES: Destination[] = [
  { title: "Dashboard", subtitle: "Category cards and Quick Add", keywords: ["home"], to: "/" },
  { title: "Inbox", subtitle: "Items without a category", keywords: ["uncategorized", "captures"], to: "/inbox" },
  { title: "Calendar", subtitle: "Tasks by due date", keywords: ["due", "agenda", "schedule"], to: "/calendar" },
  { title: "Results", subtitle: "Completed tasks and progress", keywords: ["progress", "stats", "done"], to: "/results" },
  { title: "Dev", subtitle: "Scratchpad and code notes", keywords: ["scratchpad", "code"], to: "/dev" },
  { title: "Settings", subtitle: "All settings", keywords: ["preferences", "options"], to: "/settings" },
  { title: "Advanced search", subtitle: "Search with filters", keywords: ["filter", "find"], to: "/search" },
];

// Stricter than the item search: these lists are short labels, where loose
// matching mostly adds noise. One typo still matches ("portflio").
const fuseOptions = { threshold: 0.2, ignoreLocation: true };

// The search bar in the top navigation. It searches only when you press
// Enter (or the search button), then shows everything that matched in a
// dropdown: categories, tasks, notes, settings and pages.
export function TopSearch() {
  const navigate = useNavigate();
  const categories = useStore((s) => s.categories);
  const openEditor = useStore((s) => s.openEditor);

  const [text, setText] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categoryFuse = useMemo(
    () =>
      new Fuse(categories, {
        ...fuseOptions,
        // Not descriptions: they name other categories ("Career and job
        // applications go in Career"), which would make those match too.
        keys: [
          { name: "name", weight: 3 },
          { name: "keywords", weight: 1 },
        ],
      }),
    [categories],
  );
  const settingsFuse = useMemo(() => new Fuse(SETTINGS, { ...fuseOptions, keys: ["title", "keywords"] }), []);
  const pagesFuse = useMemo(() => new Fuse(PAGES, { ...fuseOptions, keys: ["title", "keywords"] }), []);

  const open = query !== null;
  const close = () => {
    setQuery(null);
    setItems(null);
    setError(null);
  };

  const search = async () => {
    const q = text.trim();
    if (!q) return;
    setQuery(q);
    setActive(0);
    setItems(null);
    setError(null);
    setLoading(true);
    try {
      setItems(await api.items({ q }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Everything that matched, grouped, in display order.
  const results = useMemo<Result[]>(() => {
    if (!query) return [];
    const go = (to: string) => () => {
      navigate(to);
      close();
    };
    const byName = new Map(categories.map((c) => [c.slug, c]));
    const itemResult = (item: Item): Result => ({
      key: `item:${item.id}`,
      group: isNote(item) ? "Notes" : "Tasks",
      title: displayTitle(item),
      subtitle: itemSubtitle(item, byName),
      color: byName.get(item.categories[0])?.color,
      dim: item.status === "done" || item.status === "archived",
      run: () => {
        openEditor(item.id);
        close();
      },
    });
    const all = items ?? [];
    return [
      ...categoryFuse.search(query, { limit: PER_GROUP }).map(({ item: c }): Result => ({
        key: `cat:${c.slug}`,
        group: "Categories",
        title: c.name,
        subtitle: c.parent ? `in ${byName.get(c.parent)?.name ?? c.parent}` : c.kind === "list" ? "List" : "Category",
        color: c.color,
        run: go(`/category/${c.slug}`),
      })),
      ...all.filter((it) => !isNote(it)).slice(0, PER_GROUP).map(itemResult),
      ...all.filter(isNote).slice(0, PER_GROUP).map(itemResult),
      ...settingsFuse.search(query, { limit: PER_GROUP }).map(({ item: s }): Result => ({
        key: `set:${s.to}`,
        group: "Settings",
        title: s.title,
        subtitle: s.subtitle,
        run: go(s.to),
      })),
      ...pagesFuse.search(query, { limit: PER_GROUP }).map(({ item: p }): Result => ({
        key: `page:${p.to}`,
        group: "Pages",
        title: p.title,
        subtitle: p.subtitle,
        run: go(p.to),
      })),
    ];
  }, [query, items, categories, categoryFuse, settingsFuse, pagesFuse, navigate, openEditor]);

  const taskCount = items?.filter((it) => !isNote(it)).length ?? 0;
  const noteCount = items?.filter(isNote).length ?? 0;
  const hiddenItems = Math.max(0, taskCount - PER_GROUP) + Math.max(0, noteCount - PER_GROUP);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Enter on a fresh query searches; on a shown result it opens it.
      if (open && text.trim() === query && results[active]) results[active].run();
      else void search();
    } else if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      if (open) close();
      else inputRef.current?.blur();
    }
  };

  // Close on a click outside; Ctrl/Cmd+K focuses the search from anywhere.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Keep the highlighted result in view while moving with the arrow keys.
  useEffect(() => {
    boxRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let lastGroup: Group | null = null;

  return (
    <div ref={boxRef} className="relative w-full max-w-2xl">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
        className="flex items-center rounded-lg border border-stone-200 bg-stone-50 focus-within:border-stone-400 focus-within:bg-white"
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // Results belong to the last search; typing a new query hides them
            // until Enter is pressed again.
            if (open) close();
          }}
          onKeyDown={onKeyDown}
          placeholder="Search categories, tasks, notes, settings…"
          aria-label="Search everything"
          aria-expanded={open}
          aria-controls="top-search-results"
          className="min-w-0 flex-1 bg-transparent py-1.5 pl-3 text-sm outline-none placeholder:text-stone-400"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText("");
              close();
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="rounded p-1 text-stone-400 hover:text-stone-700"
          >
            <X className="size-4" />
          </button>
        )}
        <kbd className="mr-1 hidden rounded border border-stone-200 px-1.5 text-[10px] text-stone-400 lg:inline">Ctrl K</kbd>
        <button
          type="submit"
          aria-label="Search"
          className="flex items-center gap-1 rounded-r-lg border-l border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </button>
      </form>

      {open && (
        <div
          id="top-search-results"
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-stone-200 bg-white py-2 shadow-xl"
        >
          {loading && results.length === 0 && <p className="px-4 py-3 text-sm text-stone-400">Searching…</p>}
          {error && <p className="px-4 py-2 text-sm text-red-600">Couldn't search tasks and notes: {error}</p>}
          {!loading && results.length === 0 && !error && (
            <p className="px-4 py-3 text-sm text-stone-400">Nothing matches “{query}”.</p>
          )}

          {results.map((r, i) => {
            const header = r.group !== lastGroup;
            lastGroup = r.group;
            return (
              <div key={r.key}>
                {header && (
                  <p className="px-4 pt-3 pb-1 text-[11px] font-medium tracking-wide text-stone-400 uppercase first:pt-1">
                    {r.group}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={r.run}
                  className={`flex w-full items-start gap-3 px-4 py-2 text-left ${i === active ? "bg-stone-100" : ""}`}
                >
                  {r.group === "Notes" ? (
                    <StickyNote className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: r.color ?? "var(--color-stone-300)" }}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${r.dim ? "text-stone-400 line-through" : "text-stone-800"}`}>
                      {r.title}
                    </span>
                    {r.subtitle && <span className="block truncate text-xs text-stone-500">{r.subtitle}</span>}
                  </span>
                </button>
              </div>
            );
          })}

          {hiddenItems > 0 && (
            <button
              type="button"
              onClick={() => {
                navigate(`/search?${new URLSearchParams({ q: query! })}`);
                close();
              }}
              className="mt-1 w-full border-t border-stone-100 px-4 pt-2 text-left text-xs text-stone-500 hover:text-stone-800"
            >
              See all {taskCount + noteCount} tasks and notes in Advanced search
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function itemSubtitle(item: Item, categories: Map<string, CategoryDef>): string {
  const parts = item.categories.map((s) => categories.get(s)?.name ?? s);
  if (parts.length === 0) parts.push("Inbox");
  if (item.status === "done") parts.push("Done");
  if (item.status === "archived") parts.push("Archived");
  if (!isNote(item) && item.dueDate) parts.push(`Due ${formatDueLabel(item.dueDate)}`);
  return parts.join(" · ");
}
