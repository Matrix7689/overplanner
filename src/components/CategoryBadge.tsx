import { Link } from "react-router";
import type { CategoryDef } from "../../shared/types";

export function CategoryBadge({ category }: { category: CategoryDef }) {
  return (
    <Link
      to={`/category/${category.slug}`}
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 rounded-full bg-soft px-2 py-0.5 text-xs font-medium text-body transition-colors hover:text-title"
    >
      <span className="cat-dot size-1.5 rounded-full" style={{ backgroundColor: category.color }} aria-hidden />
      {category.name}
    </Link>
  );
}
