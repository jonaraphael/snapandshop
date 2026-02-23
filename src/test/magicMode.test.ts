import { describe, expect, it } from "vitest";
import type { MagicModeResponse } from "../app/types";
import { mapMagicModeItems } from "../lib/ocr/magicMode";

const itemFromMagic = (
  overrides: Partial<MagicModeResponse["items"][number]>
): MagicModeResponse["items"][number] => ({
  raw_text: "",
  canonical_name: "",
  quantity: null,
  notes: null,
  category_hint: null,
  major_section: null,
  subsection: null,
  within_section_order: null,
  ...overrides
});

describe("mapMagicModeItems", () => {
  it("extracts quantity and notes when model leaves them blank", () => {
    const [item] = mapMagicModeItems([
      itemFromMagic({
        raw_text: "2 avocados (ripe)",
        canonical_name: "2 avocados (ripe)",
        category_hint: "produce",
        major_section: "produce",
        subsection: "Organic produce",
        within_section_order: 2
      })
    ]);

    expect(item.quantity).toBe("2");
    expect(item.notes).toBe("ripe");
    expect(item.canonicalName.toLowerCase()).not.toContain("2");
  });

  it("keeps quantity empty when no explicit amount exists", () => {
    const [item] = mapMagicModeItems([
      itemFromMagic({
        raw_text: "bananas",
        canonical_name: "bananas",
        category_hint: "produce",
        major_section: "produce",
        subsection: "Conventional produce",
        within_section_order: 4
      })
    ]);

    expect(item.quantity).toBeNull();
    expect(item.notes).toBeNull();
  });

  it("forces the misc bucket when model marks the item as other", () => {
    const [item] = mapMagicModeItems([
      itemFromMagic({
        raw_text: "car oil change",
        canonical_name: "car oil change",
        quantity: "1",
        category_hint: "other",
        major_section: "automotive",
        subsection: "Motor oil and fluids",
        within_section_order: 1
      })
    ]);

    expect(item.categoryId).toBe("other");
    expect(item.majorSectionId).toBeNull();
    expect(item.majorSectionLabel).toBeNull();
    expect(item.majorSectionOrder).toBeNull();
    expect(item.majorSectionItemOrder).toBeNull();
  });

  it("forces the misc bucket for errand-style tasks", () => {
    const [item] = mapMagicModeItems([
      itemFromMagic({
        raw_text: "car oil change",
        canonical_name: "car oil change",
        quantity: "1",
        category_hint: "household",
        major_section: "automotive",
        subsection: "Motor oil and fluids",
        within_section_order: 1
      })
    ]);

    expect(item.categoryId).toBe("other");
    expect(item.majorSectionId).toBeNull();
    expect(item.majorSectionLabel).toBeNull();
    expect(item.majorSectionOrder).toBeNull();
    expect(item.majorSectionItemOrder).toBeNull();
  });
});
