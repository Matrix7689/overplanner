import type { CategoryDef } from "../../shared/types";

// Scores for a keyword hit. One hit is pre-selected at the default 0.80
// threshold; two or more hits are near-certain.
const ONE_HIT = 0.85;
const MANY_HITS = 0.95;

// Runs every category's keyword rules against the text.
export function keywordScores(text: string, categories: CategoryDef[]): Record<string, number> {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};
  for (const c of categories) {
    let hits = 0;
    for (const keyword of c.keywords) if (matches(lower, keyword.toLowerCase())) hits++;
    if (hits > 0) scores[c.slug] = hits > 1 ? MANY_HITS : ONE_HIT;
  }
  return scores;
}

const WORDS_ONLY = /^[\p{L}\p{N}' ]+$/u;
const patternCache = new Map<string, RegExp>();

// Plain words and phrases match whole words, with an optional plural "s" or
// "es" (so "tea" doesn't match "team", but "movie" matches "movies").
// Anything with other punctuation, like "youtube.com" or "$", matches anywhere.
function matches(text: string, keyword: string): boolean {
  if (!WORDS_ONLY.test(keyword)) return text.includes(keyword);

  let pattern = patternCache.get(keyword);
  if (!pattern) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ +/g, "\\s+");
    pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?:s|es)?(?![\\p{L}\\p{N}])`, "u");
    patternCache.set(keyword, pattern);
  }
  return pattern.test(text);
}
