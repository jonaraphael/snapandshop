import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../app/store";

const resetStore = (): void => {
  localStorage.clear();
  useAppStore.setState({
    session: null,
    recentLists: [],
    magicDebugOutput: null,
    imageFile: null,
    imagePreviewUrl: null,
    imagePreviewUrls: [],
    pipeline: {
      status: "idle",
      progress: 0,
      label: "Ready",
      error: null
    }
  });
};

describe("image preview state", () => {
  beforeEach(() => {
    resetStore();
  });

  it("tracks all captured preview URLs after adding photos", () => {
    const first = new File(["a"], "first.jpg", { type: "image/jpeg" });
    useAppStore.getState().setImageInput(first, "blob:first");
    useAppStore.getState().addImagePreviewUrl("blob:second");

    const state = useAppStore.getState();
    expect(state.imagePreviewUrls).toEqual(["blob:first", "blob:second"]);
    expect(state.imagePreviewUrl).toBe("blob:second");
  });

  it("clears preview URL history when starting a new list", () => {
    const first = new File(["a"], "first.jpg", { type: "image/jpeg" });
    useAppStore.getState().setImageInput(first, "blob:first");
    useAppStore.getState().addImagePreviewUrl("blob:second");

    useAppStore.getState().resetForNewList();

    const state = useAppStore.getState();
    expect(state.imagePreviewUrl).toBeNull();
    expect(state.imagePreviewUrls).toEqual([]);
  });
});
