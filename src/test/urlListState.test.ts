import { describe, expect, it } from "vitest";
import type { Session } from "../app/types";
import { decodeSharedListState, encodeSharedListState } from "../lib/share/urlListState";

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

    expect(decoded).toEqual({
      listTitle: session.listTitle,
      items: session.items
    });
  });

  it("produces a URL-safe token", () => {
    const token = encodeSharedListState(buildSession());
    expect(token).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
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
    expect(decodeSharedListState("")).toBeNull();
    expect(decodeSharedListState(null)).toBeNull();
  });
});
