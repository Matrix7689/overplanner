import { promises as fs } from "node:fs";
import path from "node:path";
import { CategoriesFileSchema } from "../shared/schemas";
import type { CategoryDef } from "../shared/types";
import { readJsonFile } from "./jsonFile";

// The master list, data/categories.json. Per-category item files are owned
// by ItemRepo, which creates one for every category listed here.
export class CategoryRepo {
  private list: CategoryDef[] = [];
  private bySlug = new Map<string, CategoryDef>();

  constructor(
    private readonly dataDir: string,
    private readonly seedFile: string,
  ) {}

  async load(): Promise<void> {
    const file = path.join(this.dataDir, "categories.json");
    const list = await readJsonFile(file, CategoriesFileSchema, async () =>
      CategoriesFileSchema.parse(JSON.parse(await fs.readFile(this.seedFile, "utf8"))),
    );

    const bySlug = new Map<string, CategoryDef>();
    for (const c of list) {
      if (bySlug.has(c.slug)) throw new Error(`${file}: duplicate slug "${c.slug}"`);
      bySlug.set(c.slug, c);
    }
    for (const c of list) {
      if (c.parent !== null && !bySlug.has(c.parent)) {
        throw new Error(`${file}: "${c.slug}" has unknown parent "${c.parent}"`);
      }
    }

    this.list = [...list].sort((a, b) => a.order - b.order);
    this.bySlug = bySlug;
  }

  all(): CategoryDef[] {
    return this.list;
  }

  get(slug: string): CategoryDef | undefined {
    return this.bySlug.get(slug);
  }

  has(slug: string): boolean {
    return this.bySlug.has(slug);
  }
}
