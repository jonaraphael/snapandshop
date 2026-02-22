import { describe, expect, it } from "vitest";
import { categorizeItemName } from "../lib/categorize/categorize";

describe("categorizeItemName", () => {
  it("maps exact dictionary hits", () => {
    const result = categorizeItemName("bananas");
    expect(result.categoryId).toBe("produce");
    expect(result.subcategoryId).toBe("fruit");
    expect(result.confidence).toBe(1);
  });

  it("maps rule-based tokens", () => {
    const result = categorizeItemName("laundry detergent pods");
    expect(result.categoryId).toBe("household");
    expect(result.confidence).toBe(0.6);
  });

  it("maps fuzzy OCR typo", () => {
    const result = categorizeItemName("miik");
    expect(result.categoryId).toBe("dairy_eggs");
    expect(result.canonicalName).toBe("milk");
  });
});
