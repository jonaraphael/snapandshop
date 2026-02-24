import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../app/types";
import {
  SHARE_ID_QUERY_PARAM,
  buildLegacyShareUrl,
  createServerShareId,
  createServerShareUrl,
  fetchSharedTokenById
} from "../lib/share/shareApi";

const buildSession = (): Session => ({
  id: "session-1",
  createdAt: "2026-02-24T00:00:00.000Z",
  updatedAt: "2026-02-24T00:00:00.000Z",
  listTitle: "Weeknight list",
  imageHash: null,
  thumbnailDataUrl: null,
  rawText: "avocado\nlime",
  ocrConfidence: 0.88,
  ocrMeta: null,
  usedMagicMode: true,
  items: [
    {
      id: "item-1",
      rawText: "2 avocado",
      canonicalName: "avocado",
      normalizedName: "avocado",
      quantity: "2",
      notes: null,
      categoryId: "produce",
      subcategoryId: null,
      orderHint: 5,
      checked: false,
      confidence: 0.9,
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
      rawText: "lime",
      canonicalName: "lime",
      normalizedName: "lime",
      quantity: null,
      notes: null,
      categoryId: "produce",
      subcategoryId: null,
      orderHint: 6,
      checked: true,
      confidence: 0.87,
      source: "manual",
      categoryOverridden: false,
      majorSectionId: "produce",
      majorSectionLabel: "Produce",
      majorSubsection: "Conventional produce",
      majorSectionOrder: 2,
      majorSectionItemOrder: 2,
      suggested: false
    }
  ]
});

describe("shareApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("creates a short share URL and removes legacy token params", async () => {
    vi.stubEnv("VITE_SHARE_PROXY_URL", "");
    vi.stubEnv("VITE_VISION_PROXY_URL", "");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "AbCdEfGhIjKlMnOpQrStUv" }), { status: 201 }));

    const shareUrl = await createServerShareUrl(
      buildSession(),
      "https://snapand.shop/list?cl=v2.legacy-token#top"
    );
    const parsed = new URL(shareUrl);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/share");
    expect(parsed.searchParams.get(SHARE_ID_QUERY_PARAM)).toBe("AbCdEfGhIjKlMnOpQrStUv");
    expect(parsed.searchParams.get("cl")).toBeNull();

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as { token?: string };
    expect(body.token).toMatch(/^v2\./);
  });

  it("derives share endpoint from VISION proxy URL when SHARE proxy URL is not set", async () => {
    vi.stubEnv("VITE_SHARE_PROXY_URL", "");
    vi.stubEnv("VITE_VISION_PROXY_URL", "https://worker.example.com/api/vision-parse");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "AbCdEfGhIjKlMnOpQrStUv" }), { status: 201 }));

    await createServerShareId(buildSession());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://worker.example.com/api/share");
  });

  it("rewrites SHARE proxy URL when it is mistakenly set to vision endpoint", async () => {
    vi.stubEnv("VITE_SHARE_PROXY_URL", "https://worker.example.com/api/vision-parse");
    vi.stubEnv("VITE_VISION_PROXY_URL", "");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "AbCdEfGhIjKlMnOpQrStUv" }), { status: 201 }));

    await createServerShareId(buildSession());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://worker.example.com/api/share");
  });

  it("fetches a shared token by short ID", async () => {
    vi.stubEnv("VITE_SHARE_PROXY_URL", "");
    vi.stubEnv("VITE_VISION_PROXY_URL", "");

    const token = "v2.abc123";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ token }), { status: 200 }));

    const result = await fetchSharedTokenById("AbCdEfGhIjKlMnOpQrStUv");
    expect(result).toBe(token);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/share/AbCdEfGhIjKlMnOpQrStUv");
  });

  it("builds a legacy URL token link as fallback", () => {
    const url = buildLegacyShareUrl(
      "v2.short-token",
      "https://snapand.shop/list?s=AbCdEfGhIjKlMnOpQrStUv"
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get("cl")).toBe("v2.short-token");
    expect(parsed.searchParams.get(SHARE_ID_QUERY_PARAM)).toBeNull();
  });
});
