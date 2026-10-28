import { create } from "zustand";
import categoriesJson from "../../data/categories.json";
import { DEFAULT_SETTINGS } from "../../shared/types";
import type { CategoryDef, Item, ItemKind, ItemStatus, Settings } from "../../shared/types";
import { newId } from "../lib/id";
import { MOCK_ITEMS, MOCK_LAST_BACKUP_AT } from "../mock/items";

type NewItem = {
  title: string;
  notes?: string;
  categories?: string[];
  kind?: ItemKind;
  dueDate?: string | null;
};

type State = {
  categories: CategoryDef[];
  items: Item[];
  settings: Settings;
  lastBackupAt: string | null;

  addItem: (input: NewItem) => Item;
  setStatus: (id: string, status: ItemStatus) => void;
  setCategories: (id: string, categories: string[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  forceBackup: () => void;
};

const sortedCategories = [...(categoriesJson as CategoryDef[])].sort((a, b) => a.order - b.order);

// In-memory store backed by mock data. Phase 2 swaps these actions for
// calls to the local Express API.
export const useStore = create<State>()((set) => ({
  categories: sortedCategories,
  items: MOCK_ITEMS,
  settings: DEFAULT_SETTINGS,
  lastBackupAt: MOCK_LAST_BACKUP_AT,

  addItem: (input) => {
    const now = new Date().toISOString();
    const item: Item = {
      id: newId(),
      title: input.title.trim(),
      notes: input.notes ?? "",
      categories: input.categories ?? [],
      kind: input.kind ?? "task",
      status: "open",
      dueDate: input.dueDate ?? null,
      completedAt: null,
      deletedAt: null,
      tags: [],
      source: "manual",
      classification: { method: "manual", scores: {} },
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ items: [item, ...s.items] }));
    return item;
  },

  setStatus: (id, status) =>
    set((s) => ({
      items: s.items.map((it) => {
        if (it.id !== id) return it;
        const now = new Date().toISOString();
        return {
          ...it,
          status,
          completedAt: status === "done" ? now : null,
          deletedAt: status === "deleted" ? now : null,
          updatedAt: now,
        };
      }),
    })),

  setCategories: (id, categories) =>
    set((s) => ({
      items: s.items.map((it) =>
        it.id === id
          ? {
              ...it,
              categories,
              classification: { ...it.classification, method: "manual" },
              updatedAt: new Date().toISOString(),
            }
          : it,
      ),
    })),

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  forceBackup: () => set({ lastBackupAt: new Date().toISOString() }),
}));

// Helpers that operate on plain arrays. Components select `items` from the
// store and derive views with useMemo, so selectors never return new arrays.

export function visible(items: Item[]): Item[] {
  return items.filter((it) => it.status !== "deleted");
}

export function inCategory(items: Item[], slug: string): Item[] {
  return items.filter((it) => it.status !== "deleted" && it.categories.includes(slug));
}

export function inboxItems(items: Item[]): Item[] {
  return items.filter((it) => it.status === "open" && it.categories.length === 0);
}

export function openCountBySlug(items: Item[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const it of items) {
    if (it.status !== "open") continue;
    for (const slug of it.categories) counts[slug] = (counts[slug] ?? 0) + 1;
  }
  return counts;
}
