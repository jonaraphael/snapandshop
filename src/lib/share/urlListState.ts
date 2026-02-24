import type { Session, ShoppingItem } from "../../app/types";
import { createId } from "../id";
import { MAJOR_SECTION_ORDER } from "../order/majorSectionOrder";
import { SECTION_ORDER } from "../order/sectionOrder";

export const SHARE_QUERY_PARAM = "cl";

const SHARE_TOKEN_PREFIX_V1 = "v1.";
const SHARE_TOKEN_PREFIX_V2 = "v2.";

const MAX_SHARE_ITEMS = 600;
const MAX_SHARE_TOKEN_BYTES = 28_000;
const MAX_SHARE_STRING_BYTES = 4_096;
const CONFIDENCE_SCALE = 1_000;
const FALLBACK_CATEGORY_INDEX = Math.max(0, SECTION_ORDER.indexOf("other"));

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

const FLAG_CHECKED = 1 << 0;
const FLAG_CATEGORY_OVERRIDDEN = 1 << 1;
const FLAG_SUGGESTED = 1 << 2;
const FLAG_HAS_QUANTITY = 1 << 3;
const FLAG_HAS_NOTES = 1 << 4;
const FLAG_HAS_SUBCATEGORY = 1 << 5;
const FLAG_HAS_ORDER_HINT = 1 << 6;
const FLAG_HAS_MAJOR_SECTION_ID = 1 << 7;

const FLAG2_HAS_MAJOR_SECTION_LABEL = 1 << 0;
const FLAG2_HAS_MAJOR_SUBSECTION = 1 << 1;
const FLAG2_HAS_MAJOR_SECTION_ORDER = 1 << 2;
const FLAG2_HAS_MAJOR_SECTION_ITEM_ORDER = 1 << 3;
const FLAG2_SOURCE_SHIFT = 6;

interface Cursor {
  offset: number;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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

const normalizeInteger = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.trunc(value);
};

const normalizeNormalizedName = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized || "item";
};

const normalizeConfidenceScaled = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(clamped * CONFIDENCE_SCALE);
};

const encodeZigZag = (value: number): number => {
  return value >= 0 ? value * 2 : -value * 2 - 1;
};

const decodeZigZag = (value: number): number => {
  return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
};

const pushByte = (target: number[], value: number): void => {
  target.push(value & 0xff);
};

const pushVarUint = (target: number[], value: number): void => {
  let remaining = Math.max(0, Math.trunc(value));
  while (remaining > 0x7f) {
    target.push((remaining & 0x7f) | 0x80);
    remaining = Math.floor(remaining / 128);
  }
  target.push(remaining);
};

const pushVarInt = (target: number[], value: number): void => {
  pushVarUint(target, encodeZigZag(Math.trunc(value)));
};

const pushString = (target: number[], value: string): void => {
  const encoded = textEncoder.encode(value);
  pushVarUint(target, encoded.length);
  for (const byte of encoded) {
    target.push(byte);
  }
};

const readByte = (bytes: Uint8Array, cursor: Cursor): number => {
  if (cursor.offset >= bytes.length) {
    throw new Error("Unexpected end of token.");
  }
  const value = bytes[cursor.offset];
  cursor.offset += 1;
  return value;
};

const readVarUint = (bytes: Uint8Array, cursor: Cursor): number => {
  let result = 0;
  let multiplier = 1;

  for (let steps = 0; steps < 6; steps += 1) {
    const value = readByte(bytes, cursor);
    result += (value & 0x7f) * multiplier;
    if ((value & 0x80) === 0) {
      return result;
    }
    multiplier *= 128;
  }

  throw new Error("Invalid varuint in token.");
};

const readVarInt = (bytes: Uint8Array, cursor: Cursor): number => {
  return decodeZigZag(readVarUint(bytes, cursor));
};

const readString = (bytes: Uint8Array, cursor: Cursor): string => {
  const length = readVarUint(bytes, cursor);
  if (length > MAX_SHARE_STRING_BYTES) {
    throw new Error("String exceeds max supported length.");
  }
  const end = cursor.offset + length;
  if (end > bytes.length) {
    throw new Error("Unexpected end while reading string.");
  }
  const slice = bytes.subarray(cursor.offset, end);
  cursor.offset = end;
  return textDecoder.decode(slice);
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

const decodeSharedListStateV1 = (token: string): SharedListState | null => {
  try {
    const encoded = token.slice(SHARE_TOKEN_PREFIX_V1.length);
    const bytes = fromBase64Url(encoded);
    const json = textDecoder.decode(bytes);
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

const decodeSharedListStateV2 = (token: string): SharedListState | null => {
  try {
    const encoded = token.slice(SHARE_TOKEN_PREFIX_V2.length);
    const bytes = fromBase64Url(encoded);
    if (!bytes.length || bytes.length > MAX_SHARE_TOKEN_BYTES) {
      return null;
    }

    const cursor: Cursor = { offset: 0 };
    const hasTitle = readByte(bytes, cursor) === 1;
    const listTitle = hasTitle ? cleanText(readString(bytes, cursor)) : null;

    const itemCount = readVarUint(bytes, cursor);
    if (itemCount > MAX_SHARE_ITEMS) {
      return null;
    }

    const items: ShoppingItem[] = [];
    for (let index = 0; index < itemCount; index += 1) {
      const flags = readByte(bytes, cursor);
      const flags2 = readByte(bytes, cursor);

      const canonicalName = cleanText(readString(bytes, cursor)) ?? "Item";
      const quantity = (flags & FLAG_HAS_QUANTITY) !== 0 ? cleanText(readString(bytes, cursor)) : null;
      const notes = (flags & FLAG_HAS_NOTES) !== 0 ? cleanText(readString(bytes, cursor)) : null;
      const categoryIndex = readByte(bytes, cursor);
      const categoryId = SECTION_ORDER[categoryIndex] ?? "other";
      const subcategoryId = (flags & FLAG_HAS_SUBCATEGORY) !== 0 ? cleanText(readString(bytes, cursor)) : null;
      const orderHint = (flags & FLAG_HAS_ORDER_HINT) !== 0 ? readVarInt(bytes, cursor) : null;

      const confidenceScaled = readVarUint(bytes, cursor);
      const confidence = Math.max(0, Math.min(CONFIDENCE_SCALE, confidenceScaled)) / CONFIDENCE_SCALE;
      const sourceCode = (flags2 >> FLAG2_SOURCE_SHIFT) & 0b11;

      const majorSectionId =
        (flags & FLAG_HAS_MAJOR_SECTION_ID) !== 0
          ? (MAJOR_SECTION_ORDER[readByte(bytes, cursor)] ?? null)
          : null;
      const majorSectionLabel =
        (flags2 & FLAG2_HAS_MAJOR_SECTION_LABEL) !== 0
          ? cleanText(readString(bytes, cursor))
          : null;
      const majorSubsection =
        (flags2 & FLAG2_HAS_MAJOR_SUBSECTION) !== 0 ? cleanText(readString(bytes, cursor)) : null;
      const majorSectionOrder =
        (flags2 & FLAG2_HAS_MAJOR_SECTION_ORDER) !== 0 ? readVarInt(bytes, cursor) : null;
      const majorSectionItemOrder =
        (flags2 & FLAG2_HAS_MAJOR_SECTION_ITEM_ORDER) !== 0 ? readVarInt(bytes, cursor) : null;

      const rawText = quantity ? `${quantity} ${canonicalName}` : canonicalName;

      items.push({
        id: createId(),
        rawText,
        canonicalName,
        normalizedName: normalizeNormalizedName(canonicalName),
        quantity,
        notes,
        categoryId,
        subcategoryId,
        orderHint,
        checked: (flags & FLAG_CHECKED) !== 0,
        confidence,
        source: CODE_TO_SOURCE[sourceCode] ?? "manual",
        categoryOverridden: (flags & FLAG_CATEGORY_OVERRIDDEN) !== 0,
        majorSectionId,
        majorSectionLabel,
        majorSubsection,
        majorSectionOrder,
        majorSectionItemOrder,
        suggested: (flags & FLAG_SUGGESTED) !== 0
      });
    }

    if (!items.length && !listTitle) {
      return null;
    }

    return {
      listTitle,
      items
    };
  } catch {
    return null;
  }
};

export const encodeSharedListState = (session: Session | null): string | null => {
  if (!session) {
    return null;
  }

  const listTitle = cleanText(session.listTitle);
  if (!session.items.length && !listTitle) {
    return null;
  }

  const bytes: number[] = [];

  pushByte(bytes, listTitle ? 1 : 0);
  if (listTitle) {
    pushString(bytes, listTitle);
  }

  pushVarUint(bytes, session.items.length);

  for (const item of session.items) {
    const canonicalName = cleanText(item.canonicalName) ?? cleanText(item.rawText) ?? "Item";
    const quantity = cleanText(item.quantity);
    const notes = cleanText(item.notes);
    const subcategoryId = cleanText(item.subcategoryId);
    const orderHint = normalizeInteger(item.orderHint);

    const majorSectionIndex =
      item.majorSectionId === null || item.majorSectionId === undefined
        ? null
        : (() => {
            const index = MAJOR_SECTION_ORDER.indexOf(item.majorSectionId);
            return index >= 0 ? index : null;
          })();

    const majorSectionLabel = cleanText(item.majorSectionLabel);
    const majorSubsection = cleanText(item.majorSubsection);
    const majorSectionOrder = normalizeInteger(item.majorSectionOrder);
    const majorSectionItemOrder = normalizeInteger(item.majorSectionItemOrder);

    const categoryIndex = SECTION_ORDER.indexOf(item.categoryId);
    const safeCategoryIndex = categoryIndex >= 0 ? categoryIndex : FALLBACK_CATEGORY_INDEX;

    let flags = 0;
    if (item.checked) {
      flags |= FLAG_CHECKED;
    }
    if (item.categoryOverridden) {
      flags |= FLAG_CATEGORY_OVERRIDDEN;
    }
    if (item.suggested) {
      flags |= FLAG_SUGGESTED;
    }
    if (quantity) {
      flags |= FLAG_HAS_QUANTITY;
    }
    if (notes) {
      flags |= FLAG_HAS_NOTES;
    }
    if (subcategoryId) {
      flags |= FLAG_HAS_SUBCATEGORY;
    }
    if (orderHint !== null) {
      flags |= FLAG_HAS_ORDER_HINT;
    }
    if (majorSectionIndex !== null) {
      flags |= FLAG_HAS_MAJOR_SECTION_ID;
    }

    let flags2 = 0;
    if (majorSectionLabel) {
      flags2 |= FLAG2_HAS_MAJOR_SECTION_LABEL;
    }
    if (majorSubsection) {
      flags2 |= FLAG2_HAS_MAJOR_SUBSECTION;
    }
    if (majorSectionOrder !== null) {
      flags2 |= FLAG2_HAS_MAJOR_SECTION_ORDER;
    }
    if (majorSectionItemOrder !== null) {
      flags2 |= FLAG2_HAS_MAJOR_SECTION_ITEM_ORDER;
    }

    const sourceCode = SOURCE_TO_CODE[item.source] ?? 2;
    flags2 |= (sourceCode & 0b11) << FLAG2_SOURCE_SHIFT;

    pushByte(bytes, flags);
    pushByte(bytes, flags2);
    pushString(bytes, canonicalName);
    if (quantity) {
      pushString(bytes, quantity);
    }
    if (notes) {
      pushString(bytes, notes);
    }

    pushByte(bytes, safeCategoryIndex);

    if (subcategoryId) {
      pushString(bytes, subcategoryId);
    }
    if (orderHint !== null) {
      pushVarInt(bytes, orderHint);
    }

    pushVarUint(bytes, normalizeConfidenceScaled(item.confidence));

    if (majorSectionIndex !== null) {
      pushByte(bytes, majorSectionIndex);
    }
    if (majorSectionLabel) {
      pushString(bytes, majorSectionLabel);
    }
    if (majorSubsection) {
      pushString(bytes, majorSubsection);
    }
    if (majorSectionOrder !== null) {
      pushVarInt(bytes, majorSectionOrder);
    }
    if (majorSectionItemOrder !== null) {
      pushVarInt(bytes, majorSectionItemOrder);
    }
  }

  return `${SHARE_TOKEN_PREFIX_V2}${toBase64Url(Uint8Array.from(bytes))}`;
};

export const decodeSharedListState = (token: string | null | undefined): SharedListState | null => {
  if (!token || typeof token !== "string") {
    return null;
  }

  if (token.startsWith(SHARE_TOKEN_PREFIX_V2)) {
    return decodeSharedListStateV2(token);
  }

  if (token.startsWith(SHARE_TOKEN_PREFIX_V1)) {
    return decodeSharedListStateV1(token);
  }

  return null;
};
