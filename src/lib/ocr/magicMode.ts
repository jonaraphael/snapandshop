import type { MagicModeResponse, PipelineState, ShoppingItem } from "../../app/types";
import { categorizeItemName } from "../categorize/categorize";
import { createId } from "../id";
import { parseQuantityAndNotes } from "../parse/parseQuantity";
import { normalizeName } from "../parse/normalizeItem";
import {
  MAJOR_SECTION_LABELS,
  MAJOR_SECTION_RANK,
  MAJOR_SECTION_TO_CATEGORY,
  MAJOR_SECTION_ORDER
} from "../order/majorSectionOrder";

export const MAGIC_SCHEMA_NAME = "shopping_list_extraction_v3";
const DEFAULT_VISION_PROXY_PATH = "/api/vision-parse";

const categoryEnum = [
  "produce",
  "bakery",
  "deli",
  "meat_seafood",
  "dairy_eggs",
  "frozen",
  "pantry",
  "snacks",
  "beverages",
  "household",
  "personal_care",
  "pet",
  "other"
] as const;

export const MAGIC_OUTPUT_FORMAT = {
  type: "json_schema",
  name: MAGIC_SCHEMA_NAME,
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["list_title", "items", "warnings"],
    properties: {
      list_title: {
        type: ["string", "null"]
      },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "raw_text",
            "canonical_name",
            "quantity",
            "notes",
            "category_hint",
            "major_section",
            "subsection",
            "within_section_order"
          ],
          properties: {
            raw_text: { type: "string" },
            canonical_name: { type: "string" },
            quantity: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
            category_hint: {
              type: ["string", "null"],
              enum: [...categoryEnum, null]
            },
            major_section: {
              type: ["string", "null"],
              enum: [...MAJOR_SECTION_ORDER, null]
            },
            subsection: {
              type: ["string", "null"]
            },
            within_section_order: {
              type: ["integer", "null"],
              minimum: 1
            }
          }
        }
      },
      warnings: {
        type: "array",
        items: {
          type: "string"
        }
      }
    }
  }
} as const;

export interface MagicModeDecisionInput {
  userRequested: boolean;
  ocrConfidence: number;
  itemCount: number;
  imageLikelyNonBlank: boolean;
}

export const shouldSuggestMagicMode = ({
  userRequested,
  ocrConfidence,
  itemCount,
  imageLikelyNonBlank
}: MagicModeDecisionInput): boolean => {
  if (userRequested) {
    return true;
  }
  if (!imageLikelyNonBlank) {
    return false;
  }
  if (ocrConfidence < 0.55) {
    return true;
  }
  if (itemCount < 4 && imageLikelyNonBlank) {
    return true;
  }
  return false;
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not encode image"));
        return;
      }
      const [, payload = ""] = reader.result.split(",");
      resolve(payload);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not encode image"));
    reader.readAsDataURL(blob);
  });
};

const extractOutputText = (body: any): string => {
  if (typeof body?.output_text === "string" && body.output_text.trim()) {
    return body.output_text;
  }

  const output = Array.isArray(body?.output) ? body.output : [];
  for (const part of output) {
    const content = Array.isArray(part?.content) ? part.content : [];
    for (const block of content) {
      if (block?.type === "output_text" && typeof block.text === "string") {
        return block.text;
      }
      if (block?.type === "text" && typeof block.text === "string") {
        return block.text;
      }
    }
  }

  throw new Error("Magic Mode proxy returned an unexpected response format");
};

const genericTitlePhrases = new Set([
  "grocery run",
  "grocery and household run",
  "shopping list",
  "shopping run",
  "weekly groceries",
  "weekly grocery run",
  "household run",
  "grocery trip",
  "errands run",
  "weekly essentials",
  "weekly basics"
]);

const genericTitleWords = new Set([
  "grocery",
  "groceries",
  "shopping",
  "household",
  "run",
  "list",
  "weekly",
  "essentials",
  "basic",
  "basics",
  "supplies",
  "restock",
  "errands",
  "trip",
  "adventure",
  "adventures",
  "quest",
  "quests",
  "detour",
  "detours",
  "mission",
  "missions"
]);

const hashString = (value: string): number => {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
};

const tokenize = (value: string): string[] => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
};

const cleanTitle = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || null;
};

const cleanOptionalText = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || null;
};

const errandPatterns: RegExp[] = [
  /\boil change\b/i,
  /\bcar wash\b/i,
  /\btire rotation\b/i,
  /\bvehicle inspection\b/i,
  /\bregistration renewal\b/i,
  /\bappointment\b/i,
  /\bdmv\b/i
];

const looksLikeErrand = (value: string): boolean => {
  return errandPatterns.some((pattern) => pattern.test(value));
};

const getDistinctNames = (names: string[]): string[] => {
  const seen = new Set<string>();
  const distinct: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    distinct.push(trimmed);
  }
  return distinct;
};

const namesFromMagicItems = (items: MagicModeResponse["items"]): string[] => {
  return getDistinctNames(items.map((item) => item.canonical_name));
};

const isGoodTitle = (title: string, itemNames: string[]): boolean => {
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle) {
    return false;
  }
  if (genericTitlePhrases.has(normalizedTitle)) {
    return false;
  }

  const titleTokens = tokenize(title);
  if (titleTokens.length < 2) {
    return false;
  }
  if (titleTokens.some((token) => genericTitleWords.has(token))) {
    return false;
  }

  const itemTokenSet = new Set<string>();
  for (const itemName of itemNames) {
    for (const token of tokenize(itemName)) {
      if (token.length > 1) {
        itemTokenSet.add(token);
      }
    }
  }

  const genericCount = titleTokens.filter((token) => genericTitleWords.has(token)).length;
  const specificCount = titleTokens.filter((token) => itemTokenSet.has(token)).length;

  if (specificCount === 0 && genericCount > 0) {
    return false;
  }
  if (genericCount / titleTokens.length > 0.7) {
    return false;
  }

  return true;
};

const toDisplayItem = (value: string): string => {
  const cleaned = value
    .trim()
    .replace(/[^a-z0-9\s-]/gi, " ")
    .replace(/\s+/g, " ");
  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(" ")
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const pickRandomDistinctItemPair = (itemNames: string[]): { first: string; second: string } => {
  const displayItems = getDistinctNames(itemNames)
    .map(toDisplayItem)
    .filter(Boolean);
  const distinctDisplayItems = getDistinctNames(displayItems);

  if (distinctDisplayItems.length === 0) {
    return { first: "Shopping", second: "List" };
  }
  if (distinctDisplayItems.length === 1) {
    return { first: distinctDisplayItems[0], second: distinctDisplayItems[0] };
  }

  const seed = distinctDisplayItems.join("|").toLowerCase();
  const firstIndex = hashString(seed) % distinctDisplayItems.length;
  const first = distinctDisplayItems[firstIndex];

  const secondPool = distinctDisplayItems.filter((_, index) => index !== firstIndex);
  const second = secondPool[hashString(`${seed}|second`) % secondPool.length];
  return { first, second };
};

const fallbackListTitle = (itemNames: string[]): string => {
  const { first, second } = pickRandomDistinctItemPair(itemNames);
  return `${first} & ${second}`;
};

export const finalizeListTitleForItems = (listTitle: string | null, itemNames: string[]): string => {
  const cleaned = cleanTitle(listTitle);
  const distinctNames = getDistinctNames(itemNames);
  if (cleaned && isGoodTitle(cleaned, distinctNames)) {
    return cleaned;
  }
  return fallbackListTitle(distinctNames);
};

const finalizeListTitle = (listTitle: string | null, items: MagicModeResponse["items"]): string => {
  return finalizeListTitleForItems(listTitle, namesFromMagicItems(items));
};

const resolveVisionProxyUrl = (): string => {
  const configured = import.meta.env.VITE_VISION_PROXY_URL?.trim();
  if (configured) {
    return configured;
  }
  return DEFAULT_VISION_PROXY_PATH;
};

const isMagicModeResponse = (value: unknown): value is MagicModeResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<MagicModeResponse>;
  return Array.isArray(candidate.items) && Array.isArray(candidate.warnings) && "list_title" in candidate;
};

export const requestMagicModeParse = async (input: {
  imageBlob: Blob;
  model?: string;
  signal?: AbortSignal;
}): Promise<MagicModeResponse> => {
  const imageBase64 = await blobToBase64(input.imageBlob);
  const response = await fetch(resolveVisionProxyUrl(), {
    method: "POST",
    signal: input.signal,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      imageBase64,
      mimeType: input.imageBlob.type || "image/jpeg",
      model: input.model ?? "gpt-5.2"
    })
  });

  if (!response.ok) {
    const body = (await response.text()).trim();
    if (response.status === 404) {
      throw new Error(
        "Magic Mode proxy endpoint not found. Configure VITE_VISION_PROXY_URL or route /api/vision-parse to the Worker."
      );
    }
    if (response.status === 500 && /OPENAI_API_KEY missing/i.test(body)) {
      throw new Error("Magic Mode proxy is missing OPENAI_API_KEY. Add it as a Worker secret and redeploy.");
    }
    throw new Error(`Magic Mode request failed: ${response.status} ${body || response.statusText}`);
  }

  const responseText = await response.text();
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(responseText);
  } catch {
    throw new Error("Magic Mode proxy returned malformed JSON.");
  }

  let parsed: MagicModeResponse;
  let outputText: string;
  if (isMagicModeResponse(parsedBody)) {
    parsed = parsedBody;
    outputText = responseText;
  } else {
    const extracted = extractOutputText(parsedBody);
    try {
      parsed = JSON.parse(extracted) as MagicModeResponse;
    } catch {
      throw new Error("Magic Mode proxy returned malformed model output.");
    }
    outputText = extracted;
  }

  return {
    ...parsed,
    list_title: finalizeListTitle(parsed.list_title, parsed.items),
    debug_raw_output: outputText
  };
};

export const mapMagicModeItems = (items: MagicModeResponse["items"]): ShoppingItem[] => {
  return items
    .filter((item) => item.canonical_name.trim() || item.raw_text.trim())
    .map((item) => {
      const parsedCanonical = parseQuantityAndNotes(item.canonical_name);
      const parsedRaw = parseQuantityAndNotes(item.raw_text);
      const displayCanonicalName =
        cleanOptionalText(parsedCanonical.name) ??
        cleanOptionalText(item.canonical_name) ??
        cleanOptionalText(parsedRaw.name) ??
        cleanOptionalText(item.raw_text) ??
        "Item";
      const normalizedFromModel = normalizeName(displayCanonicalName).normalizedName;
      const categorized = categorizeItemName(displayCanonicalName);
      const majorSectionCandidate = item.major_section;
      const scaffoldCategory = majorSectionCandidate
        ? MAJOR_SECTION_TO_CATEGORY[majorSectionCandidate]
        : null;
      const resolvedCategoryId = item.category_hint ?? scaffoldCategory ?? categorized.categoryId;
      const errandText = `${item.raw_text} ${item.canonical_name}`;
      const forceMiscBucket = resolvedCategoryId === "other" || looksLikeErrand(errandText);
      const finalCategoryId = forceMiscBucket ? "other" : resolvedCategoryId;
      const majorSectionId = forceMiscBucket ? null : majorSectionCandidate;
      const sectionOrder =
        majorSectionId && MAJOR_SECTION_RANK[majorSectionId] !== undefined
          ? MAJOR_SECTION_RANK[majorSectionId]
          : null;
      const withinSectionOrder =
        majorSectionId &&
        typeof item.within_section_order === "number" &&
        Number.isFinite(item.within_section_order)
          ? Math.max(1, Math.floor(item.within_section_order))
          : null;
      const sectionOrderHint =
        sectionOrder !== null
          ? sectionOrder * 1000 + (withinSectionOrder ?? 999)
          : null;
      const quantity =
        cleanOptionalText(item.quantity) ??
        cleanOptionalText(parsedCanonical.quantity) ??
        cleanOptionalText(parsedRaw.quantity);
      const notes =
        cleanOptionalText(item.notes) ??
        cleanOptionalText(parsedCanonical.notes) ??
        cleanOptionalText(parsedRaw.notes);
      const subsection = forceMiscBucket ? null : cleanOptionalText(item.subsection);

      return {
        id: createId(),
        rawText: cleanOptionalText(item.raw_text) ?? displayCanonicalName,
        canonicalName: displayCanonicalName,
        normalizedName: normalizedFromModel,
        quantity,
        notes,
        categoryId: finalCategoryId,
        subcategoryId: categorized.subcategoryId,
        orderHint: sectionOrderHint ?? categorized.orderHint,
        checked: false,
        confidence: 0.95,
        source: "magic",
        categoryOverridden: false,
        majorSectionId,
        majorSectionLabel: majorSectionId ? MAJOR_SECTION_LABELS[majorSectionId] : null,
        majorSubsection: subsection,
        majorSectionOrder: sectionOrder,
        majorSectionItemOrder: withinSectionOrder,
        suggested: false
      };
    });
};

export const getMagicModePipelinePatch = (): Partial<PipelineState> => ({
  status: "ocr",
  progress: 0.35,
  label: "Handwriting mode: parsing"
});
