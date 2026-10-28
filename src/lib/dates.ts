// Date helpers. Due dates are local calendar dates ("YYYY-MM-DD"),
// timestamps are full ISO strings.

export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toLocalISODate(new Date());
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

// Parse "YYYY-MM-DD" as a local date (new Date("YYYY-MM-DD") would be UTC).
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Monday 00:00 of the current week.
export function startOfWeek(d: Date = new Date()): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

export function formatDueLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === toLocalISODate(addDays(new Date(), 1))) return "Tomorrow";
  if (iso === toLocalISODate(addDays(new Date(), -1))) return "Yesterday";
  return parseLocalDate(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isOverdue(dueDate: string): boolean {
  return dueDate < todayISO();
}
