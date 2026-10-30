import type { ClassifierStatus, ClassifyResult } from "../../shared/types";
import type { CategoryRepo } from "../categories";
import type { FeedbackRepo } from "../feedback";
import { JevTimeoutError, type JevClient } from "./jev";
import { keywordScores } from "./keywords";

// Keyword rules run first; JEV refines them when it's configured and
// requested. A category's final score is the higher of the two, so JEV can
// add categories but never drops an obvious keyword match. If JEV fails or
// times out, the keyword scores are returned on their own.
export class Classifier {
  constructor(
    private readonly categories: CategoryRepo,
    private readonly jev: JevClient,
    private readonly feedback: FeedbackRepo,
  ) {}

  async classify(text: string, useJev: boolean): Promise<ClassifyResult> {
    // Categories such as Miscellaneous are filed by hand only.
    const candidates = this.categories.all().filter((c) => c.suggest);
    const keyword = keywordScores(text, candidates);

    if (!this.jev.configured) return { scores: keyword, method: "keyword", jev: { status: "off" } };
    if (!useJev) return { scores: keyword, method: "keyword", jev: { status: "skipped" } };

    try {
      const jev = await this.jev.score(text, candidates, this.feedback.examples());
      const scores: Record<string, number> = {};
      for (const slug of new Set([...Object.keys(jev), ...Object.keys(keyword)])) {
        scores[slug] = round2(Math.max(jev[slug] ?? 0, keyword[slug] ?? 0));
      }
      return { scores, method: "jev", jev: { status: "ok" } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`JEV classification failed, using keyword rules: ${message}`);
      return {
        scores: keyword,
        method: "keyword",
        jev: { status: err instanceof JevTimeoutError ? "timeout" : "error", error: message },
      };
    }
  }

  status(): ClassifierStatus {
    return { jev: this.jev.status(), feedbackCount: this.feedback.count() };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
