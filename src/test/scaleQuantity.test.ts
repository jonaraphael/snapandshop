import { describe, expect, it } from "vitest";
import { scaleQuantityString } from "../lib/parse/scaleQuantity";

describe("scaleQuantityString", () => {
  it("scales integers", () => {
    expect(scaleQuantityString("2", 3)).toBe("6");
  });

  it("scales simple fractions", () => {
    expect(scaleQuantityString("1/2", 3)).toBe("1.5");
  });

  it("scales mixed fractions", () => {
    expect(scaleQuantityString("1 1/2", 2)).toBe("3");
  });

  it("keeps units while scaling numeric portions", () => {
    expect(scaleQuantityString("2 lb", 1.5)).toBe("3 lb");
  });

  it("scales numeric ranges", () => {
    expect(scaleQuantityString("2-3", 2)).toBe("4-6");
  });

  it("returns original text when no numeric quantity exists", () => {
    expect(scaleQuantityString("pinch", 2)).toBe("pinch");
  });
});
