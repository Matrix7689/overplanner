// Types shared by the web app and (from phase 2) the Express server.
// Field meanings follow SPEC.md.

export type CategoryKind = "category" | "list";

export type CategoryDef = {
  slug: string; // "food", "shopping-list"
  name: string;
  description: string; // used in the JEV prompt
  kind: CategoryKind;
  parent: string | null; // for subcategories
  color: string;
  icon: string;
  order: number;
};

export type ItemKind = "task" | "list-item" | "note";
export type ItemStatus = "open" | "done" | "deleted";
export type ItemSource = "manual" | "share" | "keep-import" | "whatsapp-import";
export type ClassificationMethod = "manual" | "keyword" | "jev";

export type Item = {
  id: string; // uuid
  title: string;
  notes: string;
  categories: string[]; // category slugs, any number
  kind: ItemKind;
  status: ItemStatus;
  dueDate: string | null; // ISO date
  completedAt: string | null; // set when status becomes "done"
  deletedAt: string | null; // set when status becomes "deleted"
  tags: string[];
  source: ItemSource;
  classification: {
    method: ClassificationMethod;
    scores: Record<string, number>; // category slug -> score
  };
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  autoSelectThreshold: number; // score >= this is pre-selected as a chip
  maybeThreshold: number; // score >= this (and below autoSelect) is a "Maybe" chip
  backupPath: string;
  ui: Record<string, unknown>;
};

export const DEFAULT_SETTINGS: Settings = {
  autoSelectThreshold: 0.8,
  maybeThreshold: 0.4,
  backupPath: "",
  ui: {},
};

// Deleted items are purged this many days after deletedAt.
export const DELETE_HOLD_DAYS = 30;
