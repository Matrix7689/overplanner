import { existsSync } from "node:fs";
import path from "node:path";
import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import {
  ClassifyRequestSchema,
  CreateItemSchema,
  ItemQuerySchema,
  SettingsPatchSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  UpdateItemSchema,
} from "../shared/schemas";
import type { BackupService } from "./backup";
import type { CategoryRepo } from "./categories";
import type { Classifier } from "./classify/classifier";
import { HttpError } from "./errors";
import type { FeedbackRepo } from "./feedback";
import type { ItemRepo } from "./items";
import type { SearchIndex } from "./search";
import type { SettingsRepo } from "./settings";

type Deps = {
  categories: CategoryRepo;
  items: ItemRepo;
  settings: SettingsRepo;
  search: SearchIndex;
  classifier: Classifier;
  feedback: FeedbackRepo;
  backup: BackupService;
  distDir: string;
};

// Feedback is a side log: a failure to write it never fails the request.
async function logFeedback(write: Promise<void>): Promise<void> {
  try {
    await write;
  } catch (err) {
    console.error("Could not write feedback.json:", err);
  }
}

export function createApp({ categories, items, settings, search, classifier, feedback, backup, distDir }: Deps) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  const api = express.Router();

  api.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  api.get("/categories", (_req, res) => {
    res.json(categories.all());
  });

  api.post("/categories", async (req, res) => {
    const list = await categories.create(CreateCategorySchema.parse(req.body));
    items.notifyChanged();
    res.status(201).json(list);
  });

  api.patch("/categories/:slug", async (req, res) => {
    const list = await categories.update(req.params.slug, UpdateCategorySchema.parse(req.body));
    items.notifyChanged();
    res.json(list);
  });

  // Never deletes items: they stay in their other categories or go to the Inbox.
  api.delete("/categories/:slug", async (req, res) => {
    const moved = await items.removeCategory(req.params.slug);
    res.json({ categories: categories.all(), ...moved });
  });

  // List and search. Deleted items are never returned.
  api.get("/items", (req, res) => {
    res.json(search.query(ItemQuerySchema.parse(req.query)));
  });

  api.get("/items/:id", (req, res) => {
    const item = items.get(req.params.id);
    if (!item || item.status === "deleted") throw new HttpError(404, "Item not found");
    res.json(item);
  });

  api.post("/items", async (req, res) => {
    const input = CreateItemSchema.parse(req.body);
    // A retried send from an offline client gets the item it already created.
    const isRetry = input.id !== undefined && items.get(input.id) !== undefined;
    const item = await items.create(input);
    if (!isRetry) await logFeedback(feedback.recordCreate(item, settings.get()));
    res.status(isRetry ? 200 : 201).json(item);
  });

  api.patch("/items/:id", async (req, res) => {
    const patch = UpdateItemSchema.parse(req.body);
    const prev = items.get(req.params.id);
    const next = await items.update(req.params.id, patch);
    if (prev && patch.categories && !sameSet(prev.categories, next.categories)) {
      await logFeedback(feedback.recordRecategorize(prev, next, patch.classification !== undefined, settings.get()));
    }
    res.json(next);
  });

  // Soft delete: the item is hidden now and purged after the 30-day hold.
  api.delete("/items/:id", async (req, res) => {
    await items.update(req.params.id, { status: "deleted" });
    res.status(204).end();
  });

  api.get("/settings", (_req, res) => {
    res.json(settings.get());
  });

  api.patch("/settings", async (req, res) => {
    res.json(await settings.update(SettingsPatchSchema.parse(req.body)));
  });

  // Category suggestions for Quick Add and the Inbox. Keyword rules always
  // run; JEV runs when requested and configured. Never blocks saving.
  api.post("/classify", async (req, res) => {
    const { text, jev } = ClassifyRequestSchema.parse(req.body);
    res.json(await classifier.classify(text, jev));
  });

  api.get("/classify/status", (_req, res) => {
    res.json(classifier.status());
  });

  api.get("/backup", (_req, res) => {
    res.json(backup.status());
  });

  // Force Backup. Waits for the run (or joins one in progress) and returns
  // the resulting status; a failed run shows up in lastError.
  api.post("/backup", async (_req, res) => {
    res.json(await backup.run("manual"));
  });

  api.use(() => {
    throw new HttpError(404, "Not found");
  });

  app.use("/api", api);

  // Serve the built web app (npm run build) with a fallback for client routes.
  const indexHtml = path.join(distDir, "index.html");
  if (existsSync(indexHtml)) {
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  return app;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", issues: err.issues });
  } else if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
  } else if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Request body is not valid JSON" });
  } else {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
