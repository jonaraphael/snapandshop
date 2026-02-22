import { describe, expect, it } from "vitest";
import fixtures from "../../testdata/golden-fixtures.json";
import { parseRawLines } from "../lib/parse/parseLines";
import { parseQuantityAndNotes } from "../lib/parse/parseQuantity";
import { categorizeItemName } from "../lib/categorize/categorize";

describe("golden fixture categorization", () => {
  for (const fixture of fixtures) {
    it(`matches category set for ${fixture.id}`, () => {
      const parsed = parseRawLines(fixture.rawText)
        .map((line) => parseQuantityAndNotes(line).name)
        .filter(Boolean)
        .map((name) => categorizeItemName(name).categoryId);

      const expected = fixture.expected.map((item) => item.category);
      expect(new Set(parsed)).toEqual(new Set(expected));
    });
  }
});
