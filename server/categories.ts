import { promises as fs } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { CategoriesFileSchema, type CreateCategorySchema, type UpdateCategorySchema } from "../shared/schemas";
import type { CategoryDef } from "../shared/types";
import { HttpError } from "./errors";
import { readJsonFile, withWriteLock, writeJsonFile } from "./jsonFile";

// The master list, data/categories.json. Per-category item files are owned
// by ItemRepo, which creates one for every category listed here.
export class CategoryRepo {
  private list: CategoryDef[] = [];
  private bySlug = new Map<string, CategoryDef>();

  constructor(
    private readonly dataDir: string,
    private readonly seedFile: string,
  ) {}

  private get file(): string {
    return path.join(this.dataDir, "categories.json");
  }

  async load(): Promise<void> {
    const file = this.file;
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

    this.setList(list);
  }

  private setList(list: CategoryDef[]): void {
    this.list = [...list].sort((a, b) => a.order - b.order);
    this.bySlug = new Map(list.map((c) => [c.slug, c]));
  }

  private async save(list: CategoryDef[]): Promise<void> {
    await writeJsonFile(this.file, CategoriesFileSchema, list);
    this.setList(list);
  }

  // A slug from the name, unique and safe to use as a file name on Windows.
  private newSlug(name: string): string {
    const words = name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const base = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(words) ? `${words}-category` : words || "category";
    let slug = base;
    for (let n = 2; this.bySlug.has(slug); n++) slug = `${base}-${n}`;
    return slug;
  }

  create(input: z.output<typeof CreateCategorySchema>): Promise<CategoryDef[]> {
    return withWriteLock(async () => {
      const name = input.name.toLowerCase();
      if (this.list.some((c) => c.name.toLowerCase() === name)) {
        throw new HttpError(400, `There is already a category called "${input.name}"`);
      }

      let kind = input.kind;
      if (input.parent !== null) {
        const parent = this.bySlug.get(input.parent);
        if (!parent) throw new HttpError(400, `Unknown parent "${input.parent}"`);
        if (parent.parent !== null) throw new HttpError(400, `"${parent.name}" is a subcategory, so it can't have subcategories`);
        kind = parent.kind;
      }

      const order = Math.max(0, ...this.list.map((c) => c.order)) + 1;
      await this.save([...this.list, { ...input, kind, slug: this.newSlug(input.name), icon: "", order }]);
      return this.list;
    });
  }

  // Subcategories go one level deep and always match their parent's kind.
  update(slug: string, patch: z.output<typeof UpdateCategorySchema>): Promise<CategoryDef[]> {
    return withWriteLock(async () => {
      const current = this.bySlug.get(slug);
      if (!current) throw new HttpError(404, "Category not found");
      const next: CategoryDef = { ...current, ...patch };

      const name = next.name.toLowerCase();
      if (this.list.some((c) => c.slug !== slug && c.name.toLowerCase() === name)) {
        throw new HttpError(400, `There is already a category called "${next.name}"`);
      }

      if (next.parent !== null) {
        const parent = this.bySlug.get(next.parent);
        if (!parent) throw new HttpError(400, `Unknown parent "${next.parent}"`);
        if (parent.slug === slug) throw new HttpError(400, "A category can't be its own parent");
        if (parent.parent !== null) throw new HttpError(400, `"${parent.name}" is a subcategory, so it can't have subcategories`);
        if (this.children(slug).length > 0) throw new HttpError(400, `"${next.name}" has subcategories, so it has to stay top level`);
        next.kind = parent.kind;
      }

      await this.save(this.list.map((c) => (c.slug === slug ? next : c.parent === slug ? { ...c, kind: next.kind } : c)));
      return this.list;
    });
  }

  // For ItemRepo.removeCategory, which holds the write lock and moves the
  // category's items out first.
  async removeWhileLocked(slug: string): Promise<void> {
    await this.save(this.list.filter((c) => c.slug !== slug));
  }

  children(slug: string): CategoryDef[] {
    return this.list.filter((c) => c.parent === slug);
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
