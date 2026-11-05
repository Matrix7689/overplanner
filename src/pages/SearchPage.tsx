import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { Item, ItemQuery } from "../../shared/types";
import { ItemList } from "../components/ItemRow";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { useStore } from "../store/useStore";
import { Select } from "../ui/Select";

const FILTER_KEYS = ["kind", "status", "category", "source", "dueFrom", "dueTo"] as const;

const SOURCES: { value: string; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "share", label: "Shared" },
  { value: "keep-import", label: "Google Keep" },
  { value: "whatsapp-import", label: "WhatsApp" },
];

// Local search on the server (Fuse.js). Filters narrow the set before the
// text match. The URL holds the query so results can be bookmarked.
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const categories = useStore((s) => s.categories);
  // Re-run the search when items change (for example, one is marked done).
  const items = useStore((s) => s.items);

  const [results, setResults] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const q = params.get("q") ?? "";
  const hasFilters = FILTER_KEYS.some((k) => params.get(k));
  const active = q.trim() !== "" || hasFilters;
  const key = params.toString();

  useEffect(() => {
    if (!active) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const query = Object.fromEntries(new URLSearchParams(key)) as ItemQuery;
      api
        .items(query, controller.signal)
        .then((found) => {
          setResults(found);
          setError(null);
        })
        .catch((err) => {
          if (!controller.signal.aborted) setError(err instanceof Error ? err.message : String(err));
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, active, items]);

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader title="Search" />

      <input
        type="search"
        autoFocus
        value={q}
        onChange={(e) => update("q", e.target.value)}
        placeholder="Search titles, notes, tags and categories"
        className="w-full card-shadow rounded-xl border border-line bg-surface px-3 py-2 text-sm text-title outline-none placeholder:text-faint focus:border-accent"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Select
          label="Type"
          value={params.get("kind") ?? ""}
          onChange={(v) => update("kind", v)}
          options={[
            { value: "", label: "Tasks and notes" },
            { value: "task", label: "Tasks" },
            { value: "note", label: "Notes" },
          ]}
        />
        <Select
          label="Status"
          value={params.get("status") ?? ""}
          onChange={(v) => update("status", v)}
          options={[
            { value: "", label: "Any status" },
            { value: "open", label: "Open tasks" },
            { value: "done", label: "Done tasks" },
            { value: "active", label: "Active notes" },
            { value: "archived", label: "Archived notes" },
          ]}
        />
        <Select
          label="Category"
          value={params.get("category") ?? ""}
          onChange={(v) => update("category", v)}
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c.slug, label: c.name, color: c.color, indent: c.parent !== null })),
          ]}
        />
        <Select
          label="Source"
          value={params.get("source") ?? ""}
          onChange={(v) => update("source", v)}
          options={[{ value: "", label: "Any source" }, ...SOURCES]}
        />
        <label className="flex items-center gap-1.5 text-xs text-caption">
          Due
          <input
            type="date"
            value={params.get("dueFrom") ?? ""}
            onChange={(e) => update("dueFrom", e.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-body outline-none focus:border-accent"
            aria-label="Due from"
          />
          to
          <input
            type="date"
            value={params.get("dueTo") ?? ""}
            onChange={(e) => update("dueTo", e.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-body outline-none focus:border-accent"
            aria-label="Due to"
          />
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={() => setParams(q ? { q } : {}, { replace: true })}
            className="text-xs text-caption underline hover:text-title"
          >
            Clear filters
          </button>
        )}
      </div>

      <section className="mt-6">
        {error ? (
          <p className="text-sm text-danger">Search failed: {error}</p>
        ) : !active ? (
          <p className="py-10 text-center text-sm text-faint">Type to search, or pick a filter.</p>
        ) : results === null ? (
          <p className="py-10 text-center text-sm text-faint">Searching…</p>
        ) : results.length === 0 ? (
          <p className="py-10 text-center text-sm text-faint">No matches.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-caption">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
            <div className="card-shadow rounded-2xl border border-line bg-surface px-4">
              <ItemList items={results} />
            </div>
          </>
        )}
      </section>
    </>
  );
}
