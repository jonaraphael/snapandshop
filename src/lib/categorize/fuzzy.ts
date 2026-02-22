import Fuse from "fuse.js";
import type { CategoryId } from "../../app/types";

export interface VocabEntry {
  canonical: string;
  synonyms: string[];
  category: CategoryId;
  subcategory: string | null;
  orderHint: number | null;
}

export interface FuzzyCandidate {
  normalized: string;
  entry: VocabEntry;
}

let fuse: Fuse<FuzzyCandidate> | null = null;

export const buildFuzzyIndex = (vocab: VocabEntry[]): void => {
  const candidates: FuzzyCandidate[] = [];

  for (const entry of vocab) {
    for (const synonym of entry.synonyms) {
      candidates.push({
        normalized: synonym.toLowerCase(),
        entry
      });
    }
  }

  fuse = new Fuse(candidates, {
    includeScore: true,
    threshold: 0.34,
    keys: ["normalized"]
  });
};

export const fuzzyFind = (term: string): { entry: VocabEntry; score: number } | null => {
  if (!fuse) {
    return null;
  }

  const [best] = fuse.search(term.toLowerCase(), { limit: 1 });
  if (!best || typeof best.score !== "number") {
    return null;
  }

  return {
    entry: best.item.entry,
    score: best.score
  };
};
