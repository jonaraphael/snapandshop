import { describe, expect, it } from "vitest";
import { parseQuantityAndNotes } from "../lib/parse/parseQuantity";

describe("parseQuantityAndNotes", () => {
  it("extracts leading quantity", () => {
    expect(parseQuantityAndNotes("2 apples")).toEqual({
      name: "apples",
      quantity: "2",
      notes: null
    });
  });

  it("extracts trailing unit and notes", () => {
    expect(parseQuantityAndNotes("chicken 2 lb (organic)")).toEqual({
      name: "chicken",
      quantity: "2 lb",
      notes: "organic"
    });
  });
});
