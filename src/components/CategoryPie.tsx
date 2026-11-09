export type CategoryCount = { slug: string; name: string; color: string; count: number };

export function percent(count: number, sum: number) {
  return `${Math.round((count / sum) * 100)}%`;
}

// SVG path for a pie slice; from and to are fractions of the circle, starting at 12 o'clock.
function slicePath(from: number, to: number) {
  const point = (t: number) => {
    const a = 2 * Math.PI * t - Math.PI / 2;
    return `${(100 * Math.cos(a)).toFixed(3)} ${(100 * Math.sin(a)).toFixed(3)}`;
  };
  return `M 0 0 L ${point(from)} A 100 100 0 ${to - from > 0.5 ? 1 : 0} 1 ${point(to)} Z`;
}

// A pie of per-category counts. Decorative for screen readers: each page pairs it
// with a list of the same categories.
export function CategoryPie({
  rows,
  activeSlug,
  onHover,
  onSelect,
}: {
  rows: CategoryCount[];
  activeSlug: string | null;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
}) {
  const sum = rows.reduce((n, r) => n + r.count, 0);
  let start = 0;

  return (
    <svg viewBox="-104 -104 208 208" className="w-full" aria-hidden="true">
      {rows.map((row) => {
        const from = start;
        start += row.count / sum;
        const shared = {
          className: `cursor-pointer stroke-surface transition-opacity ${activeSlug && activeSlug !== row.slug ? "opacity-35" : ""}`,
          strokeWidth: 1.5,
          fill: row.color,
          onMouseEnter: () => onHover(row.slug),
          onMouseLeave: () => onHover(null),
          onClick: () => onSelect(row.slug),
        };
        return rows.length === 1 ? (
          <circle key={row.slug} r={100} {...shared} />
        ) : (
          <path key={row.slug} d={slicePath(from, start)} {...shared} />
        );
      })}
    </svg>
  );
}
