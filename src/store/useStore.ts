import { create } from "zustand";
import { DEFAULT_SETTINGS } from "../../shared/types";
import type {
  BackupStatus,
  CategoryDef,
  ClassifierStatus,
  CreateItemInput,
  Item,
  ItemStatus,
  Settings,
  SettingsPatch,
  SidebarSection,
  Theme,
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
  classifier: ClassifierStatus | null; // null until loaded or if unavailable
  backup: BackupStatus | null;

  load: () => Promise<void>;
  refreshClassifier: () => Promise<void>;
  refreshBackup: () => Promise<void>;
  forceBackup: () => Promise<void>;
  dismissNotice: () => void;

  // Mutations return null when the server rejects them (the notice says why).
  addItem: (input: CreateItemInput) => Promise<Item | null>;
  updateItem: (id: string, patch: UpdateItemInput) => Promise<Item | null>;
  setStatus: (id: string, status: ItemStatus) => Promise<void>;
  setCategories: (id: string, categories: string[]) => Promise<void>;
  updateSettings: (patch: SettingsPatch) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  toggleSection: (section: SidebarSection) => void;
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
    classifier: null,
    backup: null,

    load: async () => {
      set({ status: "loading", loadError: null });
      // The API can start a moment after the web app in dev, so retry briefly.
      for (let attempt = 1; ; attempt++) {
        try {
          const [categories, items, settings] = await Promise.all([api.categories(), api.items(), api.settings()]);
          set({ status: "ready", categories, items, settings });
          void get().refreshClassifier();
          void get().refreshBackup();
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

    // Optional: without it the app works with keyword suggestions only.
    refreshClassifier: async () => {
      try {
        set({ classifier: await api.classifierStatus() });
      } catch {
        // Leave the previous status in place.
      }
    },

    // Applies at once (useThemeSync reacts to the store) and saves to
    // settings.json under ui.theme.
    setTheme: (theme) => get().updateSettings({ ui: { theme } }),

    // Sidebar layout is saved with the other UI preferences.
    toggleSidebar: () => get().updateSettings({ ui: { sidebarCollapsed: !get().settings.ui.sidebarCollapsed } }),

    toggleSection: (section) => {
      const folded = get().settings.ui.collapsedSections;
      get().updateSettings({
        ui: { collapsedSections: folded.includes(section) ? folded.filter((s) => s !== section) : [...folded, section] },
      });
    },

    refreshBackup: async () => {
      try {
        set({ backup: await api.backupStatus() });
      } catch {
        // Leave the previous status in place.
      }
    },

    // Shows the run as in progress, then the result. A failed backup comes
    // back as a status with lastError, which the backup widgets display.
    forceBackup: async () => {
      set((s) => ({ backup: s.backup && { ...s.backup, running: true } }));
      try {
        set({ backup: await api.runBackup() });
      } catch (err) {
        fail("back up", err);
        await get().refreshBackup();
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
      set((s) => ({ settings: { ...s.settings, ...patch, ui: { ...s.settings.ui, ...patch.ui } } }));
      // Merge `ui` key by key so two quick changes (say, fold a section then
      // collapse the sidebar) are saved together.
      pendingSettings = { ...pendingSettings, ...patch, ui: patch.ui ? { ...pendingSettings.ui, ...patch.ui } : pendingSettings.ui };
      if (!pendingSettings.ui) delete pendingSettings.ui;
      clearTimeout(settingsTimer);
      settingsTimer = setTimeout(async () => {
        const toSave = pendingSettings;
        pendingSettings = {};
        try {
          set({ settings: await api.updateSettings(toSave) });
          // The backup folder and retention live in settings.
          if ("backupPath" in toSave || "backupKeep" in toSave) void get().refreshBackup();
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
