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
});

export const CategoriesFileSchema = z.array(CategoryDefSchema);

// ---- Items ----

export const ItemKindSchema = z.enum(["task", "list-item", "note"]);
export const ItemStatusSchema = z.enum(["open", "done", "deleted"]);
export const ItemSourceSchema = z.enum(["manual", "share", "keep-import", "whatsapp-import"]);

export const ClassificationSchema = z.object({
  method: z.enum(["manual", "keyword", "jev"]),
  scores: z.record(z.string(), z.number().min(0).max(1)),
});

export const ItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  notes: z.string(),
  categories: z.array(slug),
  kind: ItemKindSchema,
  status: ItemStatusSchema,
  dueDate: isoDate.nullable(),
  completedAt: isoDateTime.nullable(),
  deletedAt: isoDateTime.nullable(),
  tags: z.array(z.string()),
  source: ItemSourceSchema,
  classification: ClassificationSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const ItemsFileSchema = z.array(ItemSchema);

// POST /api/items
export const CreateItemSchema = z.strictObject({
  title: z.string().trim().min(1, "Title is required"),
  notes: z.string().default(""),
  categories: z.array(slug).default([]),
  kind: ItemKindSchema.default("task"),
  dueDate: isoDate.nullable().default(null),
  tags: z.array(z.string()).default([]),
  source: ItemSourceSchema.default("manual"),
  classification: ClassificationSchema.default({ method: "manual", scores: {} }),
});

// PATCH /api/items/:id
export const UpdateItemSchema = z
  .strictObject({
    title: z.string().trim().min(1, "Title is required"),
    notes: z.string(),
    categories: z.array(slug),
    kind: ItemKindSchema,
    status: ItemStatusSchema,
    dueDate: isoDate.nullable(),
    tags: z.array(z.string()),
  })
  .partial();

// GET /api/items. Filters run before text matching; deleted items never match.
export const ItemQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["open", "done"]).optional(),
  category: slug.optional(),
  source: ItemSourceSchema.optional(),
  dueFrom: isoDate.optional(),
  dueTo: isoDate.optional(),
});

// ---- Settings ----

const SettingsBaseSchema = z.object({
  autoSelectThreshold: z.number().min(0).max(1),
  maybeThreshold: z.number().min(0).max(1),
  backupPath: z.string(),
  ui: z.record(z.string(), z.unknown()),
});

export const SettingsSchema = SettingsBaseSchema.refine((s) => s.maybeThreshold <= s.autoSelectThreshold, {
  message: "maybeThreshold must not be above autoSelectThreshold",
  path: ["maybeThreshold"],
});

// settings.json may predate newer fields; missing ones fall back to defaults.
export const SettingsFileSchema = SettingsBaseSchema.partial();

// PATCH /api/settings
export const SettingsPatchSchema = SettingsBaseSchema.strict().partial();
