import Fuse from "fuse.js";
import type { z } from "zod";
import type { ItemQuerySchema } from "../shared/schemas";
import type { Item } from "../shared/types";
import type { CategoryRepo } from "./categories";
import type { ItemRepo } from "./items";

type Query = z.output<typeof ItemQuerySchema>;
type Doc = { item: Item; categoryNames: string[] };

// Local search with Fuse.js. The index covers every non-deleted item and is
// rebuilt whenever the item store changes. No model calls.
export class SearchIndex {
  private fuse: Fuse<Doc>;

  constructor(
    private readonly items: ItemRepo,
    private readonly categories: CategoryRepo,
  ) {
    this.fuse = this.build();
    items.onChange(() => {
      this.fuse = this.build();
    });
  }

  query(query: Query): Item[] {
    const matchesFilters = filterFor(query);

    if (!query.q) {
      return this.items
        .all()
        .filter((it) => it.status !== "deleted" && matchesFilters(it))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // Fuse scores each item on its own, so dropping filtered-out items from
    // the ranked results is the same as filtering before matching.
    return this.fuse
      .search(query.q)
      .map((r) => r.item.item)
      .filter(matchesFilters);
  }

  private build(): Fuse<Doc> {
    const docs = this.items
      .all()
      .filter((it) => it.status !== "deleted")
      .map((item) => ({
        item,
        categoryNames: item.categories.map((slug) => this.categories.get(slug)?.name ?? slug),
      }));

    return new Fuse(docs, {
      keys: [
        { name: "item.title", weight: 3 },
        { name: "item.tags", weight: 2 },
        { name: "item.notes", weight: 1 },
        { name: "categoryNames", weight: 1 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }
}

function filterFor(query: Query): (item: Item) => boolean {
  return (item) => {
    if (query.status && item.status !== query.status) return false;
    if (query.category && !item.categories.includes(query.category)) return false;
    if (query.source && item.source !== query.source) return false;
    if (query.dueFrom || query.dueTo) {
      if (!item.dueDate) return false;
      if (query.dueFrom && item.dueDate < query.dueFrom) return false;
      if (query.dueTo && item.dueDate > query.dueTo) return false;
    }
    return true;
  };
}
