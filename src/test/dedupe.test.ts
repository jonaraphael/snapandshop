import { describe, expect, it } from "vitest";
import { dedupeItems } from "../lib/parse/dedupe";
import type { ShoppingItem } from "../app/types";

const baseItem = (overrides: Partial<ShoppingItem>): ShoppingItem => ({
  id: crypto.randomUUID(),
  rawText: "milk",
  canonicalName: "milk",
  normalizedName: "milk",
  quantity: null,
  notes: null,
  categoryId: "dairy_eggs",
  subcategoryId: "milk",
  orderHint: 10,
  checked: false,
  confidence: 0.6,
  source: "ocr",
  categoryOverridden: false,
  ...overrides
});

describe("dedupeItems", () => {
  it("merges duplicate names with quantity and notes", () => {
    const output = dedupeItems([
      baseItem({ quantity: "1", notes: "organic" }),
      baseItem({ quantity: "2", notes: "whole" })
    ]);

    expect(output).toHaveLength(1);
    expect(output[0].quantity).toBe("1 + 2");
    expect(output[0].notes).toContain("organic");
    expect(output[0].notes).toContain("whole");
  });
});
