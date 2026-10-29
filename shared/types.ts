// Types shared by the web app and the Express server, inferred from the Zod
// schemas in schemas.ts. Field meanings follow SPEC.md.
import type { z } from "zod";
import type {
  CategoryDefSchema,
  ClassificationSchema,
  CreateItemSchema,
  ItemKindSchema,
  ItemQuerySchema,
  ItemSchema,
  ItemSourceSchema,
  ItemStatusSchema,
  SettingsPatchSchema,
  SettingsSchema,
  UpdateItemSchema,
} from "./schemas";

export type CategoryDef = z.infer<typeof CategoryDefSchema>;
export type CategoryKind = CategoryDef["kind"];

export type Item = z.infer<typeof ItemSchema>;
export type ItemKind = z.infer<typeof ItemKindSchema>;
export type ItemStatus = z.infer<typeof ItemStatusSchema>;
export type ItemSource = z.infer<typeof ItemSourceSchema>;
export type ClassificationMethod = z.infer<typeof ClassificationSchema>["method"];

export type CreateItemInput = z.input<typeof CreateItemSchema>;
export type UpdateItemInput = z.input<typeof UpdateItemSchema>;
export type ItemQuery = z.input<typeof ItemQuerySchema>;

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsPatch = z.input<typeof SettingsPatchSchema>;

export const DEFAULT_SETTINGS: Settings = {
  autoSelectThreshold: 0.8,
  maybeThreshold: 0.4,
  backupPath: "",
  ui: {},
};

// Deleted items are purged this many days after deletedAt.
export const DELETE_HOLD_DAYS = 30;
