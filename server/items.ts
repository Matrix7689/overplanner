import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ItemSchema, ItemsFileSchema, type CreateItemSchema, type UpdateItemSchema } from "../shared/schemas";
import { DELETE_HOLD_DAYS, type Item } from "../shared/types";
import type { CategoryRepo } from "./categories";
import { HttpError } from "./errors";
import { applyPatch, createItem, upgradeLegacyItem } from "./itemModel";
import { readJsonFile, withWriteLock, writeJsonFile } from "./jsonFile";

// Files are read loosely first so items saved before notes and checklists
// existed can be upgraded, then each item is validated.
const RawItemsFileSchema = z.array(z.record(z.string(), z.unknown()));

type CreateInput = z.output<typeof CreateItemSchema>;
type UpdateInput = z.output<typeof UpdateItemSchema>;

const DAY_MS = 24 * 60 * 60 * 1000;

// All items live in memory and are persisted to one file per category:
// data/categories/<slug>.json. An item is stored once, in the file of its
// first known category; items with no category live in data/inbox.json.
export class ItemRepo {
  private items = new Map<string, Item>();
  private listeners = new Set<() => void>();

  constructor(
    private readonly dataDir: string,
    private readonly categories: CategoryRepo,
  ) {}

  private get categoryDir(): string {
    return path.join(this.dataDir, "categories");
  }

  private get inboxFile(): string {
    return path.join(this.dataDir, "inbox.json");
  }

  private fileFor(item: Item): string {
    const slug = item.categories.find((s) => this.categories.has(s));
    return slug ? path.join(this.categoryDir, `${slug}.json`) : this.inboxFile;
  }

  async load(): Promise<void> {
    const files = new Set([this.inboxFile, ...this.categories.all().map((c) => path.join(this.categoryDir, `${c.slug}.json`))]);
    // Also read files for categories that were removed from the master list,
    // so their items are kept (they move to another file or the Inbox below).
    try {
      for (const name of await fs.readdir(this.categoryDir)) {
        if (name.endsWith(".json")) files.add(path.join(this.categoryDir, name));
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }

    const items = new Map<string, Item>();
    const sourceFile = new Map<string, string>();
    const misplaced = new Set<string>(); // files to rewrite once loading is done
    let upgradedCount = 0;
    for (const file of files) {
      for (const raw of await readJsonFile(file, RawItemsFileSchema, () => [])) {
        const { item: candidate, upgraded } = upgradeLegacyItem(raw);
        const parsed = ItemSchema.safeParse(candidate);
        if (!parsed.success) {
          throw new Error(`${file}: item ${String(raw.id)} failed validation:\n${z.prettifyError(parsed.error)}`);
        }
        const item = parsed.data;
        if (upgraded) {
          upgradedCount++;
          misplaced.add(file); // rewrite in the new format
        }
        const existing = items.get(item.id);
        if (existing) {
          // Possible after an interrupted move between files. Keep the newest.
          console.warn(`Item ${item.id} is stored twice; keeping the newest copy.`);
          misplaced.add(file).add(sourceFile.get(item.id)!);
          if (existing.updatedAt >= item.updatedAt) continue;
        }
        items.set(item.id, item);
        sourceFile.set(item.id, file);
        const expected = this.fileFor(item);
        if (expected !== file) misplaced.add(file).add(expected);
      }
    }

    this.items = items;
    if (upgradedCount > 0) console.log(`Upgraded ${upgradedCount} item(s) to the notes and checklists format.`);
    if (misplaced.size > 0) await withWriteLock(() => this.persist(misplaced));
    this.emitChange();
  }

  all(): Item[] {
    return [...this.items.values()];
  }

  get(id: string): Item | undefined {
    return this.items.get(id);
  }

  onChange(listener: () => void): void {
    this.listeners.add(listener);
  }

  create(input: CreateInput): Promise<Item> {
    return withWriteLock(async () => {
      // A retried send from an offline client: it's already here.
      const existing = input.id ? this.items.get(input.id) : undefined;
      if (existing) return existing;

      this.assertCategories(input.categories);
      const item = createItem(input, new Date().toISOString());

      this.items.set(item.id, item);
      try {
        await this.persist(new Set([this.fileFor(item)]));
      } catch (err) {
        this.items.delete(item.id);
        throw err;
      }
      this.emitChange();
      return item;
    });
  }

  update(id: string, patch: UpdateInput): Promise<Item> {
    return withWriteLock(async () => {
      const prev = this.items.get(id);
      // Deleted items are hidden everywhere and cannot be edited or restored.
      if (!prev || prev.status === "deleted") throw new HttpError(404, "Item not found");
      if (patch.categories) this.assertCategories(patch.categories);

      const next = applyPatch(prev, patch, new Date().toISOString());

      this.items.set(id, next);
      try {
        await this.persist(new Set([this.fileFor(prev), this.fileFor(next)]));
      } catch (err) {
        this.items.set(id, prev);
        throw err;
      }
      this.emitChange();
      return next;
    });
  }

  // Removes deleted items (tasks and notes) whose 30-day hold has passed.
  // Nothing else is ever touched.
  purgeDeleted(now = Date.now()): Promise<number> {
    return withWriteLock(async () => {
      const cutoff = now - DELETE_HOLD_DAYS * DAY_MS;
      const expired = this.all().filter(
        (it) => it.status === "deleted" && it.deletedAt !== null && Date.parse(it.deletedAt) <= cutoff,
      );
      if (expired.length === 0) return 0;

      const files = new Set(expired.map((it) => this.fileFor(it)));
      for (const it of expired) this.items.delete(it.id);
      try {
        await this.persist(files);
      } catch (err) {
        for (const it of expired) this.items.set(it.id, it);
        throw err;
      }
      this.emitChange();
      return expired.length;
    });
  }

  // Deletes a category without losing anything. Its items lose the category
  // and stay in their others, or move to the Inbox if it was their only one.
  // The order matters: items are written to their new files before the old file
  // is emptied and only then is the category removed, so an interruption at any
  // point leaves every item findable (load() settles any duplicates).
  removeCategory(slug: string): Promise<{ kept: number; toInbox: number }> {
    return withWriteLock(async () => {
      const category = this.categories.get(slug);
      if (!category) throw new HttpError(404, "Category not found");
      if (this.categories.children(slug).length > 0) {
        throw new HttpError(409, `"${category.name}" still has subcategories. Delete or move them first.`);
      }

      const now = new Date().toISOString();
      const affected = this.all().filter((it) => it.categories.includes(slug));
      for (const it of affected) {
        this.items.set(it.id, { ...it, categories: it.categories.filter((s) => s !== slug), updatedAt: now });
      }

      const oldFile = path.join(this.categoryDir, `${slug}.json`);
      const files = new Set(affected.map((it) => this.fileFor(this.items.get(it.id)!)));
      files.delete(oldFile);
      files.add(oldFile); // last: its items are safe elsewhere by then
      try {
        await this.persist(files);
      } catch (err) {
        for (const it of affected) this.items.set(it.id, it);
        throw err;
      }

      await this.categories.removeWhileLocked(slug);
      try {
        await fs.rm(oldFile, { force: true });
      } catch (err) {
        // Only an empty file is left behind, and load() reads it harmlessly.
        console.warn(`Could not remove ${oldFile}:`, err);
      }

      this.emitChange();
      const current = affected.filter((it) => it.status !== "deleted");
      return { kept: current.length, toInbox: current.filter((it) => it.categories.length === 1).length };
    });
  }

  // Search shows category names, so a rename has to refresh it.
  notifyChanged(): void {
    this.emitChange();
  }

  private assertCategories(slugs: string[]): void {
    const unknown = slugs.filter((s) => !this.categories.has(s));
    if (unknown.length > 0) throw new HttpError(400, `Unknown categories: ${unknown.join(", ")}`);
  }

  // Rewrites each given file with the items that belong in it.
  private async persist(files: Set<string>): Promise<void> {
    const byFile = new Map<string, Item[]>([...files].map((f) => [f, []]));
    for (const item of this.items.values()) byFile.get(this.fileFor(item))?.push(item);
    for (const [file, items] of byFile) {
      items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      await writeJsonFile(file, ItemsFileSchema, items);
    }
  }

  private emitChange(): void {
    for (const listener of this.listeners) listener();
  }
}
