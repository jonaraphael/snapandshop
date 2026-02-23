import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveApiKeyForMagicCall } from "../lib/ocr/apiKeyPolicy";

const SHARED_KEY = "sk-proj-shared_key_abcdefghijklmnopqrstuvwxyz1234567890";
const USER_KEY = "sk-proj-user_key_abcdefghijklmnopqrstuvwxyz0987654321";

describe("resolveApiKeyForMagicCall", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it("falls back to shared key when saved key is invalid", () => {
    vi.stubEnv("VITE_OPENAI_API_KEY", SHARED_KEY);
    const promptSpy = vi.spyOn(window, "prompt");
    const persisted: string[] = [];

    const resolved = resolveApiKeyForMagicCall({
      currentKey: "definitely-not-a-real-key",
      onPersistUserKey: (key) => persisted.push(key)
    });

    expect(resolved).toBe(SHARED_KEY);
    expect(promptSpy).not.toHaveBeenCalled();
    expect(persisted).toEqual([SHARED_KEY]);
  });

  it("keeps a valid user key over shared key", () => {
    vi.stubEnv("VITE_OPENAI_API_KEY", SHARED_KEY);
    const promptSpy = vi.spyOn(window, "prompt");

    const resolved = resolveApiKeyForMagicCall({
      currentKey: USER_KEY
    });

    expect(resolved).toBe(USER_KEY);
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it("prompts when neither saved key nor shared key is valid", () => {
    vi.stubEnv("VITE_OPENAI_API_KEY", "");
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(USER_KEY);

    const resolved = resolveApiKeyForMagicCall({
      currentKey: null
    });

    expect(resolved).toBe(USER_KEY);
    expect(promptSpy).toHaveBeenCalledTimes(1);
  });
});
