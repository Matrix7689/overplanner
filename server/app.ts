import { existsSync } from "node:fs";
import path from "node:path";
import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import {
  CreateItemSchema,
  ItemQuerySchema,
  SettingsPatchSchema,
  UpdateItemSchema,
} from "../shared/schemas";
import type { CategoryRepo } from "./categories";
import { HttpError } from "./errors";
import type { ItemRepo } from "./items";
import type { SearchIndex } from "./search";
import type { SettingsRepo } from "./settings";

type Deps = {
  categories: CategoryRepo;
  items: ItemRepo;
  settings: SettingsRepo;
  search: SearchIndex;
  distDir: string;
};

export function createApp({ categories, items, settings, search, distDir }: Deps) {
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
    res.status(201).json(await items.create(CreateItemSchema.parse(req.body)));
  });

  api.patch("/items/:id", async (req, res) => {
    res.json(await items.update(req.params.id, UpdateItemSchema.parse(req.body)));
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
