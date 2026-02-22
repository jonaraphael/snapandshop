import { describe, expect, it } from "vitest";
import type { ShoppingItem } from "../app/types";
import { buildOrderedItems } from "../lib/order/itemOrder";
import { buildSections } from "../lib/order/sectionOrder";

const item = (overrides: Partial<ShoppingItem>): ShoppingItem => ({
  id: crypto.randomUUID(),
  rawText: "",
  canonicalName: "",
  normalizedName: "",
  quantity: null,
  notes: null,
  categoryId: "other",
  subcategoryId: null,
  orderHint: null,
  checked: false,
  confidence: 0.3,
  source: "ocr",
  categoryOverridden: false,
  ...overrides
});

describe("ordering", () => {
  it("orders sections by adjacency order", () => {
    const sections = buildSections([
      item({ canonicalName: "soap", categoryId: "household" }),
      item({ canonicalName: "apple", categoryId: "produce" }),
      item({ canonicalName: "milk", categoryId: "dairy_eggs" })
    ]);

    expect(sections.map((section) => section.id)).toEqual([
      "produce",
      "dairy_eggs",
      "household"
    ]);
  });

  it("sorts items by category then orderHint", () => {
    const ordered = buildOrderedItems([
      item({ canonicalName: "chips", categoryId: "snacks", orderHint: 12 }),
      item({ canonicalName: "bananas", categoryId: "produce", orderHint: 10 }),
      item({ canonicalName: "apples", categoryId: "produce", orderHint: 11 })
    ]);

    expect(ordered.map((entry) => entry.canonicalName)).toEqual([
      "bananas",
      "apples",
      "chips"
    ]);
  });

  it("prefers scaffold major-section order when present", () => {
    const ordered = buildOrderedItems([
      item({
        canonicalName: "paper towels",
        categoryId: "household",
        majorSectionId: "household_and_cleaning",
        majorSectionLabel: "Household and cleaning",
        majorSectionOrder: 17,
        majorSectionItemOrder: 3
      }),
      item({
        canonicalName: "baguette",
        categoryId: "bakery",
        majorSectionId: "bakery",
        majorSectionLabel: "Bakery",
        majorSectionOrder: 2,
        majorSectionItemOrder: 2
      }),
      item({
        canonicalName: "apples",
        categoryId: "produce",
        majorSectionId: "produce",
        majorSectionLabel: "Produce",
        majorSectionOrder: 1,
        majorSectionItemOrder: 1
      })
    ]);

    expect(ordered.map((entry) => entry.canonicalName)).toEqual([
      "apples",
      "baguette",
      "paper towels"
    ]);

    const sections = buildSections(ordered);
    expect(sections.map((section) => section.id)).toEqual([
      "produce",
      "bakery",
      "household_and_cleaning"
    ]);
  });
});
