import type { Session, ShoppingItem } from "../../app/types";
import { createId } from "../id";
import { MAJOR_SECTION_ORDER } from "../order/majorSectionOrder";
import { SECTION_ORDER } from "../order/sectionOrder";

export const SHARE_QUERY_PARAM = "cl";

const SHARE_TOKEN_PREFIX = "v1.";

interface SharedListPayloadV1 {
  v: 1;
  t: string | null;
  i: EncodedItemV1[];
}

type EncodedItemV1 = [
  id: string,
  rawText: string,
  canonicalName: string,
  normalizedName: string,
  quantity: string | null,
  notes: string | null,
  categoryIndex: number,
  subcategoryId: string | null,
  orderHint: number | null,
  checkedFlag: 0 | 1,
  confidence: number,
  sourceCode: 0 | 1 | 2,
  categoryOverriddenFlag: 0 | 1,
  majorSectionIndex: number | null,
  majorSectionLabel: string | null,
  majorSubsection: string | null,
  majorSectionOrder: number | null,
  majorSectionItemOrder: number | null,
  suggestedFlag: 0 | 1
];

export interface SharedListState {
  listTitle: string | null;
  items: ShoppingItem[];
}

const SOURCE_TO_CODE: Record<ShoppingItem["source"], 0 | 1 | 2> = {
  ocr: 0,
  magic: 1,
  manual: 2
};

const CODE_TO_SOURCE: Record<number, ShoppingItem["source"]> = {
  0: "ocr",
  1: "magic",
  2: "manual"
};

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const slice = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = normalized.length % 4;
  const padded = normalized + (remainder ? "=".repeat(4 - remainder) : "");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const cleanText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || null;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
};

const toEncodedItem = (item: ShoppingItem): EncodedItemV1 => {
  const categoryIndex = Math.max(0, SECTION_ORDER.indexOf(item.categoryId));
  const majorSectionIndex =
    item.majorSectionId === null || item.majorSectionId === undefined
      ? null
      : (() => {
          const index = MAJOR_SECTION_ORDER.indexOf(item.majorSectionId);
          return index >= 0 ? index : null;
        })();

  return [
    item.id,
    item.rawText,
    item.canonicalName,
    item.normalizedName,
    item.quantity,
    item.notes,
    categoryIndex,
    item.subcategoryId,
    item.orderHint,
    item.checked ? 1 : 0,
    Number.isFinite(item.confidence) ? item.confidence : 0,
    SOURCE_TO_CODE[item.source] ?? 2,
    item.categoryOverridden ? 1 : 0,
    majorSectionIndex,
    item.majorSectionLabel ?? null,
    item.majorSubsection ?? null,
    item.majorSectionOrder ?? null,
    item.majorSectionItemOrder ?? null,
    item.suggested ? 1 : 0
  ];
};

const toDecodedItem = (encoded: unknown): ShoppingItem | null => {
  if (!Array.isArray(encoded) || encoded.length < 19) {
    return null;
  }

  const [
    maybeId,
    maybeRawText,
    maybeCanonicalName,
    maybeNormalizedName,
    maybeQuantity,
    maybeNotes,
    maybeCategoryIndex,
    maybeSubcategoryId,
    maybeOrderHint,
    maybeChecked,
    maybeConfidence,
    maybeSourceCode,
    maybeCategoryOverridden,
    maybeMajorSectionIndex,
    maybeMajorSectionLabel,
    maybeMajorSubsection,
    maybeMajorSectionOrder,
    maybeMajorSectionItemOrder,
    maybeSuggested
  ] = encoded;

  const canonicalName = cleanText(maybeCanonicalName) ?? cleanText(maybeRawText) ?? "Item";
  const rawText = cleanText(maybeRawText) ?? canonicalName;
  const normalizedName = cleanText(maybeNormalizedName) ?? canonicalName.toLowerCase();
  const categoryIndex =
    typeof maybeCategoryIndex === "number" && Number.isFinite(maybeCategoryIndex)
      ? Math.floor(maybeCategoryIndex)
      : -1;
  const categoryId = SECTION_ORDER[categoryIndex] ?? "other";
  const majorSectionIndex =
    typeof maybeMajorSectionIndex === "number" && Number.isFinite(maybeMajorSectionIndex)
      ? Math.floor(maybeMajorSectionIndex)
      : -1;
  const majorSectionId = MAJOR_SECTION_ORDER[majorSectionIndex] ?? null;

  return {
    id: cleanText(maybeId) ?? createId(),
    rawText,
    canonicalName,
    normalizedName,
    quantity: cleanText(maybeQuantity),
    notes: cleanText(maybeNotes),
    categoryId,
    subcategoryId: cleanText(maybeSubcategoryId),
    orderHint: normalizeNumber(maybeOrderHint),
    checked: maybeChecked === 1,
    confidence: normalizeNumber(maybeConfidence) ?? 0,
    source: CODE_TO_SOURCE[Number(maybeSourceCode)] ?? "manual",
    categoryOverridden: maybeCategoryOverridden === 1,
    majorSectionId,
    majorSectionLabel: cleanText(maybeMajorSectionLabel),
    majorSubsection: cleanText(maybeMajorSubsection),
    majorSectionOrder: normalizeNumber(maybeMajorSectionOrder),
    majorSectionItemOrder: normalizeNumber(maybeMajorSectionItemOrder),
    suggested: maybeSuggested === 1
  };
};

export const encodeSharedListState = (session: Session | null): string | null => {
  if (!session) {
    return null;
  }

  const listTitle = cleanText(session.listTitle);
  if (!session.items.length && !listTitle) {
    return null;
  }

  const payload: SharedListPayloadV1 = {
    v: 1,
    t: listTitle,
    i: session.items.map(toEncodedItem)
  };

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return `${SHARE_TOKEN_PREFIX}${toBase64Url(bytes)}`;
};

export const decodeSharedListState = (token: string | null | undefined): SharedListState | null => {
  if (!token || typeof token !== "string") {
    return null;
  }
  if (!token.startsWith(SHARE_TOKEN_PREFIX)) {
    return null;
  }

  try {
    const encoded = token.slice(SHARE_TOKEN_PREFIX.length);
    const bytes = fromBase64Url(encoded);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<SharedListPayloadV1>;
    if (parsed.v !== 1 || !Array.isArray(parsed.i)) {
      return null;
    }

    const items = parsed.i.map(toDecodedItem).filter((item): item is ShoppingItem => item !== null);
    if (!items.length && !cleanText(parsed.t)) {
      return null;
    }

    return {
      listTitle: cleanText(parsed.t),
      items
    };
  } catch {
    return null;
  }
};
