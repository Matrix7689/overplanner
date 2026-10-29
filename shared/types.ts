// Types shared by the web app and the Express server, inferred from the Zod
// schemas in schemas.ts. Field meanings follow SPEC.md.
import type { z } from "zod";
import type {
  BackupStateSchema,
  CategoryDefSchema,
  ClassificationSchema,
  ClassifyRequestSchema,
  CreateItemSchema,
  FeedbackEntrySchema,
  ItemKindSchema,
  ItemQuerySchema,
  ItemSchema,
  ItemSourceSchema,
  ItemStatusSchema,
  SettingsPatchSchema,
  SettingsSchema,
  SidebarSectionSchema,
  ThemeSchema,
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

export type Classification = z.infer<typeof ClassificationSchema>;
export type ClassifyRequest = z.input<typeof ClassifyRequestSchema>;
export type FeedbackEntry = z.infer<typeof FeedbackEntrySchema>;

// What happened to the JEV part of a classify call.
// "off": no API key; "skipped": not requested (keyword-only call).
export type JevCallStatus = "ok" | "off" | "skipped" | "error" | "timeout";

// POST /api/classify response. Scores are 0..1 per category slug.
export type ClassifyResult = {
  scores: Record<string, number>;
  method: "keyword" | "jev";
  jev: { status: JevCallStatus; error?: string };
};

// GET /api/classify/status response.
export type ClassifierStatus = {
  jev: {
    configured: boolean;
    model: string;
    lastCall: null | {
      at: string;
      ok: boolean;
      latencyMs: number;
      error?: string;
      model?: string;
      inputTokens?: number;
    };
  };
  feedbackCount: number;
};

export type BackupState = z.infer<typeof BackupStateSchema>;

// GET /api/backup and POST /api/backup response.
export type BackupStatus = BackupState & {
  configured: boolean; // a backup folder is set
  path: string;
  keep: number;
  running: boolean;
  nextRunAt: string | null;
};

export type Theme = z.infer<typeof ThemeSchema>;
export type SidebarSection = z.infer<typeof SidebarSectionSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsPatch = z.input<typeof SettingsPatchSchema>;

export const DEFAULT_SETTINGS: Settings = {
  autoSelectThreshold: 0.8,
  maybeThreshold: 0.4,
  backupPath: "",
  backupKeep: 28, // one week of 6-hourly backups
  ui: { theme: "system", sidebarCollapsed: false, collapsedSections: [] },
};

// Deleted items are purged this many days after deletedAt.
export const DELETE_HOLD_DAYS = 30;
