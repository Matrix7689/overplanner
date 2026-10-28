import { useMemo } from "react";
import type { Item } from "../../shared/types";
import { ItemList } from "../components/ItemRow";
import { PageHeader } from "../components/PageHeader";
import { formatDueLabel, todayISO } from "../lib/dates";
import { useStore } from "../store/useStore";

type Group = { key: string; label: string; overdue: boolean; items: Item[] };

// Agenda view of open tasks by due date. Month/week layout and where undated
// tasks belong are still open questions in SPEC.md.
export function CalendarPage() {
  const items = useStore((s) => s.items);

  const { groups, undatedCount } = useMemo(() => {
    const open = items.filter((it) => it.status === "open");
    const dated = open
      .filter((it): it is Item & { dueDate: string } => it.dueDate !== null)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const today = todayISO();
    const groups: Group[] = [];
    const overdue = dated.filter((it) => it.dueDate < today);
    if (overdue.length > 0) groups.push({ key: "overdue", label: "Overdue", overdue: true, items: overdue });

    for (const it of dated) {
      if (it.dueDate < today) continue;
      const last = groups[groups.length - 1];
      if (last && last.key === it.dueDate) last.items.push(it);
      else groups.push({ key: it.dueDate, label: formatDueLabel(it.dueDate), overdue: false, items: [it] });
    }

    return { groups, undatedCount: open.length - dated.length };
  }, [items]);

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={`${undatedCount} open item${undatedCount === 1 ? "" : "s"} without a due date are not shown.`}
      />

      {groups.length === 0 ? (
        <p className="text-sm text-stone-400">No upcoming due dates.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className={`mb-1 text-sm font-medium ${g.overdue ? "text-red-600" : "text-stone-500"}`}>
                {g.label}
                {g.key !== "overdue" && <span className="ml-2 font-normal text-stone-400">{g.key}</span>}
              </h2>
              <div className="rounded-xl border border-stone-200 bg-white px-4">
                <ItemList items={g.items} />
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
