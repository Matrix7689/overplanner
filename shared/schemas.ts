// Zod schemas for everything stored in data/ and every API payload.
// The server validates every read and write against these. The web app only
// imports the inferred types (see types.ts), so Zod stays out of the bundle.
import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a lowercase-hyphenated slug");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const isoDateTime = z.iso.datetime();

// ---- Categories ----

export const CategoryDefSchema = z.object({
  slug,
  name: z.string().min(1),
  description: z.string(),
  kind: z.enum(["category", "list"]),
  parent: slug.nullable(),
  color: z.string(),
  icon: z.string(),
  order: z.number(),
  // Keyword rules: plain words match whole words (plurals too); entries with
  // punctuation, such as "youtube.com" or "$", match anywhere in the text.
  keywords: z.array(z.string().min(1)).default([]),
  // false: no Dashboard card (still in the sidebar and search).
  showOnDashboard: z.boolean().default(true),
  // false: never suggested by keyword rules or JEV; only filed by hand.
  suggest: z.boolean().default(true),
});

export const CategoriesFileSchema = z.array(CategoryDefSchema);

// ---- Items ----

// An item is a task (or a list item, a task in a list) or a note. They share
// a base; tasks get notes, a due date and open/done, notes get a Markdown body,
// extracted links and active/archived. A note is never "done".
export const TaskKindSchema = z.enum(["task", "list-item"]);
export const ItemKindSchema = z.enum(["task", "list-item", "note"]);
export const TaskStatusSchema = z.enum(["open", "done", "deleted"]);
export const NoteStatusSchema = z.enum(["active", "archived", "deleted"]);
export const ItemStatusSchema = z.enum(["open", "done", "active", "archived", "deleted"]);
export const ItemSourceSchema = z.enum(["manual", "share", "keep-import", "whatsapp-import"]);

export const ChecklistEntrySchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  checked: z.boolean(),
});

export const ClassificationMethodSchema = z.enum(["manual", "keyword", "jev"]);

export const ClassificationSchema = z.object({
  method: ClassificationMethodSchema,
  scores: z.record(z.string(), z.number().min(0).max(1)),
});

const itemBase = {
  id: z.string().min(1),
  title: z.string(),
  categories: z.array(slug),
  tags: z.array(z.string()),
  pinned: z.boolean(),
  checklist: z.array(ChecklistEntrySchema),
  source: ItemSourceSchema,
  classification: ClassificationSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.nullable(),
};

export const TaskSchema = z.object({
  ...itemBase,
  kind: TaskKindSchema,
  notes: z.string(),
  status: TaskStatusSchema,
  dueDate: isoDate.nullable(),
  completedAt: isoDateTime.nullable(),
});

export const NoteSchema = z.object({
  ...itemBase,
  kind: z.literal("note"),
  body: z.string(), // Markdown
  links: z.array(z.string()), // URLs found in the title and body
  status: NoteStatusSchema,
  archivedAt: isoDateTime.nullable(),
});

export const ItemSchema = z.discriminatedUnion("kind", [TaskSchema, NoteSchema]);

export const ItemsFileSchema = z.array(ItemSchema);

// POST /api/items. `kind` defaults to "task". A note may have an empty title
// as long as it has a body or a checklist (checked by the server).
const createBase = {
  categories: z.array(slug).default([]),
  tags: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
  checklist: z.array(ChecklistEntrySchema).default([]),
  source: ItemSourceSchema.default("manual"),
  classification: ClassificationSchema.default({ method: "manual", scores: {} }),
};

export const CreateItemUnion = z.discriminatedUnion("kind", [
  z.strictObject({
    ...createBase,
    kind: TaskKindSchema,
    title: z.string().trim().min(1, "Title is required"),
    notes: z.string().default(""),
    dueDate: isoDate.nullable().default(null),
  }),
  z.strictObject({
    ...createBase,
    kind: z.literal("note"),
    title: z.string().trim().default(""),
    body: z.string().default(""),
  }),
]);

export const CreateItemSchema = z.preprocess(
  (v) => (v && typeof v === "object" && !("kind" in v) ? { ...v, kind: "task" } : v),
  CreateItemUnion,
);

// PATCH /api/items/:id. Any subset of fields; the server applies them, converts
// between task and note when `kind` changes, then validates the result as a
// whole (so `body` on a task, or `done` on a note, is rejected).
export const UpdateItemSchema = z
  .strictObject({
    title: z.string().trim(),
    notes: z.string(),
    body: z.string(),
    categories: z.array(slug),
    kind: ItemKindSchema,
    status: ItemStatusSchema,
    dueDate: isoDate.nullable(),
    tags: z.array(z.string()),
    pinned: z.boolean(),
    checklist: z.array(ChecklistEntrySchema),
    // Sent with categories when filing from the Inbox with fresh suggestions.
    classification: ClassificationSchema,
  })
  .partial();

// GET /api/items. Filters run before text matching; deleted items never match.
export const ItemQuerySchema = z.object({
  q: z.string().trim().optional(),
  kind: z.enum(["task", "note"]).optional(), // "task" includes list items
  status: z.enum(["open", "done", "active", "archived"]).optional(),
  category: slug.optional(),
  source: ItemSourceSchema.optional(),
  dueFrom: isoDate.optional(),
  dueTo: isoDate.optional(),
});

// ---- Classification ----

// POST /api/classify. `jev: false` returns keyword scores only (instant).
export const ClassifyRequestSchema = z.strictObject({
  text: z.string().trim().min(1, "Text is required").max(5000),
  jev: z.boolean().default(true),
});

// data/feedback.json: one labeled example per user correction.
export const FeedbackEntrySchema = z.object({
  id: z.string().min(1),
  at: isoDateTime,
  event: z.enum(["create", "recategorize"]),
  itemId: z.string().min(1),
  text: z.string(),
  method: ClassificationMethodSchema, // how the suggestion was made
  scores: z.record(z.string(), z.number()),
  suggested: z.array(slug), // categories that were pre-selected (or the item's old categories)
  chosen: z.array(slug), // what the user saved
  added: z.array(slug),
  removed: z.array(slug),
});

export const FeedbackFileSchema = z.array(FeedbackEntrySchema);

// ---- Backup ----

// data/backup.json: outcome of the last backup runs, kept across restarts.
export const BackupStateSchema = z.object({
  lastSuccessAt: isoDateTime.nullable(),
  lastSuccessFolder: z.string().nullable(),
  lastAttemptAt: isoDateTime.nullable(),
  lastError: z.string().nullable(),
});

// ---- Settings ----

export const ThemeSchema = z.enum(["system", "light", "dark"]);

// UI preferences stored in settings.json. Unknown keys are kept.
export const SidebarSectionSchema = z.enum(["categories", "lists"]);

const UiSchema = z.looseObject({
  theme: ThemeSchema.default("system"),
  sidebarCollapsed: z.boolean().default(false), // icons only
  collapsedSections: z.array(SidebarSectionSchema).default([]), // folded sidebar sections
});

const SettingsBaseSchema = z.object({
  autoSelectThreshold: z.number().min(0).max(1),
  maybeThreshold: z.number().min(0).max(1),
  backupPath: z.string(),
  backupKeep: z.number().int().min(1).max(1000), // snapshots to keep in the backup folder
  ui: UiSchema,
});

export const SettingsSchema = SettingsBaseSchema.refine((s) => s.maybeThreshold <= s.autoSelectThreshold, {
  message: "maybeThreshold must not be above autoSelectThreshold",
  path: ["maybeThreshold"],
});

// settings.json may predate newer fields; missing ones fall back to defaults.
export const SettingsFileSchema = SettingsBaseSchema.partial();

// PATCH /api/settings
// A patch must not fill in defaults for keys it leaves out (that would reset
// them), so `ui` here has plain optional keys instead of UiSchema.
const UiPatchSchema = z.looseObject({
  theme: ThemeSchema.optional(),
  sidebarCollapsed: z.boolean().optional(),
  collapsedSections: z.array(SidebarSectionSchema).optional(),
});

export const SettingsPatchSchema = SettingsBaseSchema.omit({ ui: true }).extend({ ui: UiPatchSchema }).strict().partial();
