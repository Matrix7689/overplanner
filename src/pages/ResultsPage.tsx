import { useMemo, useState } from "react";
import { isTask } from "../../shared/types";
import { CategoryPie, percent, type CategoryCount } from "../components/CategoryPie";
import { PageHeader } from "../components/PageHeader";
import { addDays, startOfWeek, toLocalISODate } from "../lib/dates";
import { useStore } from "../store/useStore";

const DAYS = 14;

// Progress from completed tasks.
export function ResultsPage() {
  const items = useStore((s) => s.items);
  const categories = useStore((s) => s.categories);

  const stats = useMemo(() => {
    // Completed tasks only; notes are never "done".
    const done = items.filter(isTask).filter((it) => it.status === "done" && it.completedAt);
    const weekStart = startOfWeek().toISOString();
    const thisWeek = done.filter((it) => it.completedAt! >= weekStart).length;

    const perDay = new Map<string, number>();
    for (const it of done) {
      const day = toLocalISODate(new Date(it.completedAt!));
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    const today = new Date();
    const days = Array.from({ length: DAYS }, (_, i) => {
      const d = addDays(today, i - DAYS + 1);
      const key = toLocalISODate(d);
      return { key, label: d.toLocaleDateString(undefined, { weekday: "narrow" }), count: perDay.get(key) ?? 0 };
    });

    const byCategory: CategoryCount[] = categories
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        color: c.color,
        count: done.filter((it) => it.categories.includes(c.slug)).length,
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);

    return { total: done.length, thisWeek, days, byCategory };
  }, [items, categories]);

  const maxDay = Math.max(1, ...stats.days.map((d) => d.count));

  return (
    <>
      <PageHeader title="Results" subtitle="Progress from completed tasks." />

      <div className="mb-8 grid grid-cols-2 gap-3">
        <Stat label="Completed this week" value={stats.thisWeek} />
        <Stat label="Completed all time" value={stats.total} />
      </div>

      <section className="mb-8 card-shadow rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-title">Last {DAYS} days</h2>
        <div className="flex h-32 gap-1.5">
          {stats.days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1" title={`${d.key}: ${d.count}`}>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-accent"
                  style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 4 : 0 }}
                />
              </div>
              <span className="text-[10px] text-faint">{d.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card-shadow rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-title">Completed tasks by category</h2>
        {stats.byCategory.length === 0 ? (
          <p className="text-sm text-faint">Nothing completed yet.</p>
        ) : (
          <CategoryCharts rows={stats.byCategory} />
        )}
      </section>
    </>
  );
}

// A pie and a bar chart that share one selection: hover to preview, click to keep it.
function CategoryCharts({ rows }: { rows: CategoryCount[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const activeSlug = hovered ?? pinned;
  const active = rows.find((r) => r.slug === activeSlug);
  const sum = rows.reduce((n, r) => n + r.count, 0);
  const max = rows[0].count;
  const toggle = (slug: string) => setPinned((p) => (p === slug ? null : slug));
  const dim = (slug: string) => (activeSlug && activeSlug !== slug ? "opacity-35" : "");

  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-[260px]">
        <CategoryPie rows={rows} activeSlug={activeSlug} onHover={setHovered} onSelect={toggle} />
        <p className="mt-3 text-center text-sm text-caption" aria-live="polite">
          {active ? (
            <>
              <span className="font-semibold text-title">{active.name}</span>: {active.count} (
              {percent(active.count, sum)})
            </>
          ) : (
            "Hover or tap a category"
          )}
        </p>
      </div>

      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.slug}>
            <button
              type="button"
              aria-pressed={pinned === r.slug}
              aria-label={`${r.name}: ${r.count} completed, ${percent(r.count, sum)}`}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1 text-left text-sm transition-opacity hover:bg-soft ${dim(r.slug)}`}
              onMouseEnter={() => setHovered(r.slug)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(r.slug)}
              onBlur={() => setHovered(null)}
              onClick={() => toggle(r.slug)}
            >
              <span className="w-28 shrink-0 truncate sm:w-40">{r.name}</span>
              <span className="h-3 min-w-0 flex-1 rounded-full bg-soft">
                <span
                  className="block h-3 rounded-full"
                  style={{ width: `${(r.count / max) * 100}%`, backgroundColor: r.color }}
                />
              </span>
              <span className="w-8 text-right tabular-nums text-caption">{r.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card-shadow rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-caption">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-title">{value}</p>
    </div>
  );
}
