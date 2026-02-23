import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MagicModeResponse } from "../app/types";
import { requestMagicModeParse } from "../lib/ocr/magicMode";

const mockMagicResponse = (): MagicModeResponse => ({
  list_title: "Taco Tuesday sprint",
  warnings: [],
  items: [
    {
      raw_text: "2 avocados",
      canonical_name: "avocados",
      quantity: "2",
      notes: null,
      category_hint: "produce",
      major_section: "produce",
      subsection: "Conventional produce",
      within_section_order: 2
    }
  ]
});

describe("requestMagicModeParse", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("posts images to the configured Worker endpoint", async () => {
    vi.stubEnv("VITE_VISION_PROXY_URL", "https://worker.example.com/api/vision-parse");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(mockMagicResponse()), { status: 200 }));

    const result = await requestMagicModeParse({
      imageBlob: new Blob(["mock-image"], { type: "image/png" }),
      model: "gpt-5.2"
    });

    expect(result.items).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://worker.example.com/api/vision-parse");

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as {
      imageBase64: string;
      mimeType: string;
      model: string;
    };

    expect(init.method).toBe("POST");
    expect(body.mimeType).toBe("image/png");
    expect(body.imageBase64.length).toBeGreaterThan(0);
    expect(body.model).toBe("gpt-5.2");
  });

  it("uses the default Worker path when no endpoint env var is configured", async () => {
    vi.stubEnv("VITE_VISION_PROXY_URL", "");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(mockMagicResponse()), { status: 200 }));

    await requestMagicModeParse({
      imageBlob: new Blob(["mock-image"], { type: "image/jpeg" })
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/vision-parse");
  });

  it("reports a missing Worker route with a clear error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Not Found", { status: 404 }));

    await expect(
      requestMagicModeParse({
        imageBlob: new Blob(["mock-image"], { type: "image/jpeg" })
      })
    ).rejects.toThrow(/proxy endpoint not found/i);
  });

  it("reports missing OPENAI_API_KEY from the Worker", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("OPENAI_API_KEY missing", { status: 500 }));

    await expect(
      requestMagicModeParse({
        imageBlob: new Blob(["mock-image"], { type: "image/jpeg" })
      })
    ).rejects.toThrow(/missing OPENAI_API_KEY/i);
  });
});
