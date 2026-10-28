import { Link } from "react-router";
import type { CategoryDef } from "../../shared/types";

export function CategoryBadge({ category }: { category: CategoryDef }) {
  return (
    <Link
      to={`/category/${category.slug}`}
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-50"
      style={{ borderColor: `${category.color}55` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: category.color }} aria-hidden />
      {category.name}
    </Link>
  );
}
