import { randomUUID } from "node:crypto";
import path from "node:path";
import { FeedbackFileSchema } from "../shared/schemas";
import { itemText, type FeedbackEntry, type Item, type Settings } from "../shared/types";
import type { JevExamples } from "./classify/jev";
import { readJsonFile, withWriteLock, writeJsonFile } from "./jsonFile";

const POSITIVE_EXAMPLES = 3;
const NEGATIVE_EXAMPLES = 2;

// data/feedback.json: every user correction to a category suggestion, kept
// as a labeled example. Recent ones are fed back to JEV as examples.
export class FeedbackRepo {
  private entries: FeedbackEntry[] = [];

  constructor(private readonly dataDir: string) {}

  private get file(): string {
    return path.join(this.dataDir, "feedback.json");
  }

  async load(): Promise<void> {
    this.entries = await readJsonFile(this.file, FeedbackFileSchema, () => []);
  }

  count(): number {
    return this.entries.length;
  }

  // A new item saved after suggestions were shown. Logged only when the
  // saved categories differ from the pre-selected ones.
  recordCreate(item: Item, settings: Settings): Promise<void> {
    if (item.classification.method === "manual") return Promise.resolve();
    const suggested = preselected(item.classification.scores, settings);
    return this.recordIfChanged("create", item, suggested);
  }

  // An existing item's categories changed. If fresh suggestions came with
  // the change (filing from the Inbox), those are what's being corrected;
  // otherwise it's the item's previous categories.
  recordRecategorize(prev: Item, next: Item, freshSuggestions: boolean, settings: Settings): Promise<void> {
    const suggested = freshSuggestions ? preselected(next.classification.scores, settings) : prev.categories;
    return this.recordIfChanged("recategorize", next, suggested);
  }

  // Per category: recent items the user put there, and recent ones they
  // took out of it.
  examples(): Map<string, JevExamples> {
    const map = new Map<string, JevExamples>();
    const get = (slug: string) => {
      let ex = map.get(slug);
      if (!ex) map.set(slug, (ex = { positive: [], negative: [] }));
      return ex;
    };
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      for (const slug of entry.chosen) {
        const ex = get(slug);
        if (ex.positive.length < POSITIVE_EXAMPLES && !ex.positive.includes(entry.text)) ex.positive.push(entry.text);
      }
      for (const slug of entry.removed) {
        const ex = get(slug);
        if (ex.negative.length < NEGATIVE_EXAMPLES && !ex.negative.includes(entry.text)) ex.negative.push(entry.text);
      }
    }
    return map;
  }

  private recordIfChanged(event: FeedbackEntry["event"], item: Item, suggested: string[]): Promise<void> {
    const chosen = item.categories;
    const added = chosen.filter((s) => !suggested.includes(s));
    const removed = suggested.filter((s) => !chosen.includes(s));
    if (added.length === 0 && removed.length === 0) return Promise.resolve();

    const entry: FeedbackEntry = {
      id: randomUUID(),
      at: new Date().toISOString(),
      event,
      itemId: item.id,
      text: itemText(item),
      method: item.classification.method,
      scores: item.classification.scores,
      suggested,
      chosen,
      added,
      removed,
    };

    return withWriteLock(async () => {
      const next = [...this.entries, entry];
      await writeJsonFile(this.file, FeedbackFileSchema, next);
      this.entries = next;
    });
  }
}

export function preselected(scores: Record<string, number>, settings: Settings): string[] {
  return Object.entries(scores)
    .filter(([, score]) => score >= settings.autoSelectThreshold)
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);
}
