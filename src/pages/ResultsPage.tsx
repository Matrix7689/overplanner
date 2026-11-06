import { useMemo } from "react";
import { isTask } from "../../shared/types";
import { PageHeader } from "../components/PageHeader";
import { addDays, startOfWeek, toLocalISODate } from "../lib/dates";
import { useStore } from "../store/useStore";

const DAYS = 14;

// Progress from done items. The definition of a streak and the final weekly
// chart are still to be decided.
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

    const byCategory = categories
      .map((c) => ({ category: c, count: done.filter((it) => it.categories.includes(c.slug)).length }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);

    return { total: done.length, thisWeek, days, byCategory };
  }, [items, categories]);

  const maxDay = Math.max(1, ...stats.days.map((d) => d.count));
  const maxCat = Math.max(1, ...stats.byCategory.map((r) => r.count));

  return (
    <>
      <PageHeader title="Results" subtitle="Progress from completed items." />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Completed this week" value={stats.thisWeek} />
        <Stat label="Completed all time" value={stats.total} />
        <Stat label="Streak" value="—" hint="Definition pending" />
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
        <h2 className="mb-3 text-sm font-semibold text-title">By category</h2>
        {stats.byCategory.length === 0 ? (
          <p className="text-sm text-faint">Nothing completed yet.</p>
        ) : (
          <ul className="space-y-2">
            {stats.byCategory.map(({ category, count }) => (
              <li key={category.slug} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate">
                  {category.name}
                </span>
                <div className="h-2 flex-1 rounded-full bg-soft">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${(count / maxCat) * 100}%`, backgroundColor: category.color }}
                  />
                </div>
                <span className="w-6 text-right tabular-nums text-caption">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="card-shadow rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-caption">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-title">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
    </div>
  );
}
