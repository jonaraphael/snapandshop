import { describe, expect, it } from "vitest";
import type { Session } from "../app/types";
import { decodeSharedListState, encodeSharedListState } from "../lib/share/urlListState";
import { MAJOR_SECTION_ORDER } from "../lib/order/majorSectionOrder";
import { SECTION_ORDER } from "../lib/order/sectionOrder";

const SOURCE_TO_CODE = {
  ocr: 0,
  magic: 1,
  manual: 2
} as const;

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const slice = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const encodeLegacyV1Token = (session: Session): string => {
  const payload = {
    v: 1 as const,
    t: session.listTitle,
    i: session.items.map((item) => {
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
        item.confidence,
        SOURCE_TO_CODE[item.source],
        item.categoryOverridden ? 1 : 0,
        majorSectionIndex,
        item.majorSectionLabel ?? null,
        item.majorSubsection ?? null,
        item.majorSectionOrder ?? null,
        item.majorSectionItemOrder ?? null,
        item.suggested ? 1 : 0
      ];
    })
  };

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return `v1.${toBase64Url(bytes)}`;
};

const buildSession = (): Session => ({
  id: "session-1",
  createdAt: "2026-02-23T00:00:00.000Z",
  updatedAt: "2026-02-23T00:00:00.000Z",
  listTitle: "Weekend jalapeño haul",
  imageHash: null,
  thumbnailDataUrl: null,
  rawText: "jalapeños\nmilk",
  ocrConfidence: 0.9,
  ocrMeta: null,
  usedMagicMode: true,
  items: [
    {
      id: "item-1",
      rawText: "2 jalapeños",
      canonicalName: "jalapeños",
      normalizedName: "jalapeños",
      quantity: "2",
      notes: "ripe",
      categoryId: "produce",
      subcategoryId: null,
      orderHint: 10,
      checked: true,
      confidence: 0.95,
      source: "magic",
      categoryOverridden: false,
      majorSectionId: "produce",
      majorSectionLabel: "Produce",
      majorSubsection: "Organic produce",
      majorSectionOrder: 2,
      majorSectionItemOrder: 1,
      suggested: false
    },
    {
      id: "item-2",
      rawText: "oat milk",
      canonicalName: "oat milk",
      normalizedName: "oat milk",
      quantity: null,
      notes: null,
      categoryId: "dairy_eggs",
      subcategoryId: null,
      orderHint: 120,
      checked: false,
      confidence: 0.8,
      source: "manual",
      categoryOverridden: true,
      majorSectionId: null,
      majorSectionLabel: null,
      majorSubsection: null,
      majorSectionOrder: null,
      majorSectionItemOrder: null,
      suggested: true
    }
  ]
});

describe("urlListState", () => {
  it("round-trips list title and items through the URL token", () => {
    const session = buildSession();
    const token = encodeSharedListState(session);
    const decoded = decodeSharedListState(token);

    expect(decoded).not.toBeNull();
    if (!decoded) {
      return;
    }

    expect(decoded.listTitle).toBe(session.listTitle);
    expect(decoded.items).toHaveLength(session.items.length);
    expect(decoded.items.map(({ id, ...rest }) => rest)).toEqual(
      session.items.map(({ id, ...rest }) => rest)
    );
  });

  it("produces a URL-safe token", () => {
    const token = encodeSharedListState(buildSession());
    expect(token).toMatch(/^v2\.[A-Za-z0-9_-]+$/);
  });

  it("produces shorter tokens than legacy v1 JSON encoding", () => {
    const session = buildSession();
    const tokenV2 = encodeSharedListState(session);
    const tokenV1 = encodeLegacyV1Token(session);

    expect(tokenV2).not.toBeNull();
    if (!tokenV2) {
      return;
    }
    expect(tokenV2.length).toBeLessThan(tokenV1.length);
  });

  it("decodes legacy v1 tokens for backward compatibility", () => {
    const session = buildSession();
    const legacyToken = encodeLegacyV1Token(session);
    const decoded = decodeSharedListState(legacyToken);

    expect(decoded).not.toBeNull();
    if (!decoded) {
      return;
    }

    expect(decoded.listTitle).toBe(session.listTitle);
    expect(decoded.items).toHaveLength(session.items.length);
    expect(decoded.items.map(({ id, ...rest }) => rest)).toEqual(
      session.items.map(({ id, ...rest }) => rest)
    );
  });

  it("returns null for empty session payloads", () => {
    const token = encodeSharedListState({
      ...buildSession(),
      listTitle: null,
      items: []
    });
    expect(token).toBeNull();
  });

  it("returns null for invalid tokens", () => {
    expect(decodeSharedListState("v1.not-real-base64")).toBeNull();
    expect(decodeSharedListState("v2.not-real-base64")).toBeNull();
    expect(decodeSharedListState("")).toBeNull();
    expect(decodeSharedListState(null)).toBeNull();
  });
});
