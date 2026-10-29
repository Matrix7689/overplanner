import { create } from "zustand";
import { DEFAULT_SETTINGS } from "../../shared/types";
import type {
  CategoryDef,
  CreateItemInput,
  Item,
  ItemStatus,
  Settings,
  SettingsPatch,
  UpdateItemInput,
} from "../../shared/types";
import { api } from "../lib/api";

type LoadStatus = "loading" | "ready" | "error";

type State = {
  status: LoadStatus;
  loadError: string | null;
  // Last failed save, shown as a dismissible banner.
  notice: string | null;

  categories: CategoryDef[];
  items: Item[]; // open and done items, newest first. Deleted items are never loaded.
  settings: Settings;

  load: () => Promise<void>;
  dismissNotice: () => void;

  // Mutations return null when the server rejects them (the notice says why).
  addItem: (input: CreateItemInput) => Promise<Item | null>;
  updateItem: (id: string, patch: UpdateItemInput) => Promise<Item | null>;
  setStatus: (id: string, status: ItemStatus) => Promise<void>;
  setCategories: (id: string, categories: string[]) => Promise<void>;
  updateSettings: (patch: SettingsPatch) => void;
};

const LOAD_ATTEMPTS = 5;
const SETTINGS_SAVE_DELAY_MS = 400;

let pendingSettings: SettingsPatch = {};
let settingsTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<State>()((set, get) => {
  const fail = (action: string, err: unknown) => {
    set({ notice: `Couldn't ${action}: ${err instanceof Error ? err.message : String(err)}` });
  };

  const replaceItem = (item: Item) => set((s) => ({ items: s.items.map((it) => (it.id === item.id ? item : it)) }));

  return {
    status: "loading",
    loadError: null,
    notice: null,
    categories: [],
    items: [],
    settings: DEFAULT_SETTINGS,

    load: async () => {
      set({ status: "loading", loadError: null });
      // The API can start a moment after the web app in dev, so retry briefly.
      for (let attempt = 1; ; attempt++) {
        try {
          const [categories, items, settings] = await Promise.all([api.categories(), api.items(), api.settings()]);
          set({ status: "ready", categories, items, settings });
          return;
        } catch (err) {
          if (attempt >= LOAD_ATTEMPTS) {
            set({ status: "error", loadError: err instanceof Error ? err.message : String(err) });
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
    },

    dismissNotice: () => set({ notice: null }),

    addItem: async (input) => {
      try {
        const item = await api.createItem(input);
        set((s) => ({ items: [item, ...s.items] }));
        return item;
      } catch (err) {
        fail("add the item", err);
        return null;
      }
    },

    updateItem: async (id, patch) => {
      try {
        const item = await api.updateItem(id, patch);
        replaceItem(item);
        return item;
      } catch (err) {
        fail("save the item", err);
        return null;
      }
    },

    setStatus: async (id, status) => {
      if (status === "deleted") {
        try {
          await api.deleteItem(id);
          set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
        } catch (err) {
          fail("delete the item", err);
        }
        return;
      }
      await get().updateItem(id, { status });
    },

    setCategories: async (id, categories) => {
      await get().updateItem(id, { categories });
    },

    // Applied locally at once and saved after a short pause, so dragging a
    // slider doesn't write settings.json on every step.
    updateSettings: (patch) => {
      set((s) => ({ settings: { ...s.settings, ...patch } }));
      pendingSettings = { ...pendingSettings, ...patch };
      clearTimeout(settingsTimer);
      settingsTimer = setTimeout(async () => {
        const toSave = pendingSettings;
        pendingSettings = {};
        try {
          set({ settings: await api.updateSettings(toSave) });
        } catch (err) {
          fail("save settings", err);
          try {
            set({ settings: await api.settings() });
          } catch {
            // Keep the local values; the notice already explains.
          }
        }
      }, SETTINGS_SAVE_DELAY_MS);
    },
  };
});

// Helpers that operate on plain arrays. Components select `items` from the
// store and derive views with useMemo, so selectors never return new arrays.

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
