import { describe, expect, it } from "vitest";
import { parseRawLines } from "../lib/parse/parseLines";

describe("parseRawLines", () => {
  it("strips bullets and checkboxes", () => {
    const input = "• milk\n[ ] eggs\n2) bread";
    expect(parseRawLines(input)).toEqual(["milk", "eggs", "bread"]);
  });

  it("splits comma separated lines", () => {
    const input = "apples, bananas; pears";
    expect(parseRawLines(input)).toEqual(["apples", "bananas", "pears"]);
  });
});
