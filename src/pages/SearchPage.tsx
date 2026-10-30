import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import type { Item, ItemQuery } from "../../shared/types";
import { ItemList } from "../components/ItemRow";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { useStore } from "../store/useStore";

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
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-stone-400 focus:border-stone-400"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Select label="Type" value={params.get("kind") ?? ""} onChange={(v) => update("kind", v)}>
          <option value="">Tasks and notes</option>
          <option value="task">Tasks</option>
          <option value="note">Notes</option>
        </Select>
        <Select label="Status" value={params.get("status") ?? ""} onChange={(v) => update("status", v)}>
          <option value="">Any status</option>
          <option value="open">Open tasks</option>
          <option value="done">Done tasks</option>
          <option value="active">Active notes</option>
          <option value="archived">Archived notes</option>
        </Select>
        <Select label="Category" value={params.get("category") ?? ""} onChange={(v) => update("category", v)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>
        <Select label="Source" value={params.get("source") ?? ""} onChange={(v) => update("source", v)}>
          <option value="">Any source</option>
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-stone-500">
          Due
          <input
            type="date"
            value={params.get("dueFrom") ?? ""}
            onChange={(e) => update("dueFrom", e.target.value)}
            className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700"
            aria-label="Due from"
          />
          to
          <input
            type="date"
            value={params.get("dueTo") ?? ""}
            onChange={(e) => update("dueTo", e.target.value)}
            className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700"
            aria-label="Due to"
          />
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={() => setParams(q ? { q } : {}, { replace: true })}
            className="text-xs text-stone-500 underline hover:text-stone-800"
          >
            Clear filters
          </button>
        )}
      </div>

      <section className="mt-6">
        {error ? (
          <p className="text-sm text-red-600">Search failed: {error}</p>
        ) : !active ? (
          <p className="py-10 text-center text-sm text-stone-400">Type to search, or pick a filter.</p>
        ) : results === null ? (
          <p className="py-10 text-center text-sm text-stone-400">Searching…</p>
        ) : results.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-400">No matches.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-stone-500">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
            <div className="rounded-xl border border-stone-200 bg-white px-4">
              <ItemList items={results} />
            </div>
          </>
        )}
      </section>
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700"
    >
      {children}
    </select>
  );
}
