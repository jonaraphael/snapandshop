import vocabRaw from "./vocab.json";
import { normalizeName } from "../parse/normalizeItem";
import { buildFuzzyIndex, fuzzyFind, type VocabEntry } from "./fuzzy";
import type { CategoryId } from "../../app/types";

export interface CategorizedName {
  canonicalName: string;
  normalizedName: string;
  categoryId: CategoryId;
  subcategoryId: string | null;
  confidence: number;
  orderHint: number | null;
}

const vocab = vocabRaw as VocabEntry[];
const exactLookup = new Map<string, VocabEntry>();

for (const entry of vocab) {
  exactLookup.set(entry.canonical.toLowerCase(), entry);
  for (const synonym of entry.synonyms) {
    exactLookup.set(synonym.toLowerCase(), entry);
  }
}

buildFuzzyIndex(vocab);

const tokenRules: Array<{ tokens: string[]; categoryId: CategoryId; subcategoryId: string | null }> = [
  { tokens: ["soap", "detergent", "bleach", "paper towels", "toilet paper", "trash"], categoryId: "household", subcategoryId: "cleaning" },
  { tokens: ["shampoo", "toothpaste", "deodorant", "conditioner", "toothbrush"], categoryId: "personal_care", subcategoryId: null },
  { tokens: ["soda", "juice", "water", "coffee", "tea"], categoryId: "beverages", subcategoryId: null },
  { tokens: ["chip", "cracker", "cookie", "granola bar"], categoryId: "snacks", subcategoryId: null },
  { tokens: ["egg", "milk", "yogurt", "cheese", "butter"], categoryId: "dairy_eggs", subcategoryId: null },
  { tokens: ["apple", "banana", "lettuce", "onion", "tomato", "carrot"], categoryId: "produce", subcategoryId: null },
  { tokens: ["chicken", "beef", "pork", "salmon", "shrimp"], categoryId: "meat_seafood", subcategoryId: null },
  { tokens: ["rice", "pasta", "flour", "sugar", "salt", "pepper", "beans"], categoryId: "pantry", subcategoryId: null }
];

const applyTokenRules = (normalized: string): { categoryId: CategoryId; subcategoryId: string | null } | null => {
  for (const rule of tokenRules) {
    if (rule.tokens.some((token) => normalized.includes(token))) {
      return {
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId
      };
    }
  }

  return null;
};

export const categorizeItemName = (name: string): CategorizedName => {
  const { canonicalName, normalizedName } = normalizeName(name);

  const exact = exactLookup.get(normalizedName) ?? exactLookup.get(canonicalName.toLowerCase());
  if (exact) {
    return {
      canonicalName: exact.canonical,
      normalizedName,
      categoryId: exact.category,
      subcategoryId: exact.subcategory,
      confidence: 1,
      orderHint: exact.orderHint
    };
  }

  const tokenMatch = applyTokenRules(normalizedName);
  if (tokenMatch) {
    return {
      canonicalName,
      normalizedName,
      categoryId: tokenMatch.categoryId,
      subcategoryId: tokenMatch.subcategoryId,
      confidence: 0.6,
      orderHint: null
    };
  }

  const fuzzy = fuzzyFind(normalizedName);
  if (fuzzy && fuzzy.score <= 0.34) {
    return {
      canonicalName: fuzzy.entry.canonical,
      normalizedName,
      categoryId: fuzzy.entry.category,
      subcategoryId: fuzzy.entry.subcategory,
      confidence: 0.8,
      orderHint: fuzzy.entry.orderHint
    };
  }

  return {
    canonicalName,
    normalizedName,
    categoryId: "other",
    subcategoryId: null,
    confidence: 0.3,
    orderHint: null
  };
};
