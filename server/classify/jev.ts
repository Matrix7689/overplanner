import { z } from "zod";
import type { CategoryDef, ClassifierStatus } from "../../shared/types";

// JEV (TypeSafe AI) via POST /v1/systemone. Each category is one named
// "score" question on a 3-level rubric; the expected level (0..2) is scaled
// to 0..1 so it lines up with the chip thresholds.
// Docs: https://docs.typesafe.ai/api/system-one

const LEVELS = [
  "The item has nothing to do with this category.",
  "The item is loosely related and could reasonably be filed here.",
  "The item clearly belongs in this category.",
];

const ResponseSchema = z.object({
  model: z.string(),
  answers: z.record(
    z.string(),
    z.object({
      type: z.literal("score"),
      score: z.number(),
      confidence: z.number().optional(),
    }),
  ),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).optional(),
});

export type JevExamples = { positive: string[]; negative: string[] };

type Config = { apiKey?: string; baseUrl: string; model: string; timeoutMs: number };

export class JevTimeoutError extends Error {}

export class JevClient {
  private lastCall: ClassifierStatus["jev"]["lastCall"] = null;

  constructor(private readonly config: Config) {}

  get configured(): boolean {
    return Boolean(this.config.apiKey);
  }

  status(): ClassifierStatus["jev"] {
    return { configured: this.configured, model: this.config.model, lastCall: this.lastCall };
  }

  // Returns a 0..1 score for every category. Throws on any failure; callers
  // fall back to keyword scores.
  async score(
    text: string,
    categories: CategoryDef[],
    examples: Map<string, JevExamples>,
  ): Promise<Record<string, number>> {
    if (!this.config.apiKey) throw new Error("JEV_API_KEY is not set");

    const questions = Object.fromEntries(
      categories.map((c) => [c.slug, { type: "score", instructions: instructions(c, examples.get(c.slug)), criteria: LEVELS }]),
    );

    const started = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/systemone`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.config.model, state: text, questions }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
      if (!res.ok) {
        const body = (await res.text()).slice(0, 300);
        throw new Error(`JEV returned ${res.status}${body ? `: ${body}` : ""}`);
      }

      const parsed = ResponseSchema.safeParse(await res.json());
      if (!parsed.success) throw new Error(`Unexpected JEV response: ${z.prettifyError(parsed.error)}`);

      const scores: Record<string, number> = {};
      for (const c of categories) {
        const answer = parsed.data.answers[c.slug];
        if (answer) scores[c.slug] = clamp01(answer.score / (LEVELS.length - 1));
      }

      this.lastCall = {
        at: new Date().toISOString(),
        ok: true,
        latencyMs: Date.now() - started,
        model: parsed.data.model,
        inputTokens: parsed.data.usage?.input_tokens,
      };
      return scores;
    } catch (err) {
      const timedOut = err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
      const error = timedOut
        ? new JevTimeoutError(`JEV timed out after ${this.config.timeoutMs}ms`)
        : err instanceof Error
          ? err
          : new Error(String(err));
      this.lastCall = { at: new Date().toISOString(), ok: false, latencyMs: Date.now() - started, error: error.message };
      throw error;
    }
  }
}

// The question for one category: its name and description from
// categories.json, plus a few of the user's own corrections as examples.
function instructions(category: CategoryDef, examples?: JevExamples): string {
  const parts = [
    `The content is a note, task or link captured in a personal planner. How well does it fit the "${category.name}" category?`,
    `${category.name}: ${category.description}`,
  ];
  if (examples?.positive.length) parts.push(`Items the user filed here: ${examples.positive.map(quote).join("; ")}.`);
  if (examples?.negative.length) parts.push(`Items the user said do not belong here: ${examples.negative.map(quote).join("; ")}.`);
  return parts.join("\n");
}

function quote(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return `"${oneLine.length > 80 ? `${oneLine.slice(0, 77)}...` : oneLine}"`;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
