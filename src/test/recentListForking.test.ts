import { beforeEach, describe, expect, it } from "vitest";
import type { RecentList, ShoppingItem } from "../app/types";
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

const buildItem = (name: string, overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: `${name}-id`,
  rawText: name,
  canonicalName: name,
  normalizedName: name.toLowerCase(),
  quantity: null,
  notes: null,
  categoryId: "pantry",
  subcategoryId: null,
  orderHint: null,
  checked: false,
  confidence: 0.9,
  source: "manual",
  categoryOverridden: false,
  majorSectionId: null,
  majorSectionLabel: null,
  majorSubsection: null,
  majorSectionOrder: null,
  majorSectionItemOrder: null,
  suggested: false,
  ...overrides
});

const buildRecent = (id: string, title: string, items: string[]): RecentList => ({
  id,
  savedAt: new Date().toISOString(),
  signature: items.map((name) => name.toLowerCase()).sort().join("|"),
  listTitle: title,
  itemCount: items.length,
  preview: items.slice(0, 4),
  items: items.map((name, index) => ({
    rawText: name,
    canonicalName: name,
    normalizedName: name.toLowerCase(),
    quantity: null,
    notes: null,
    checked: false,
    categoryId: "pantry",
    subcategoryId: null,
    orderHint: index + 1,
    majorSectionId: null,
    majorSectionLabel: null,
    majorSubsection: null,
    majorSectionOrder: null,
    majorSectionItemOrder: null
  }))
});

describe("recent list forking behavior", () => {
  beforeEach(() => {
    resetStore();
  });

  it("keeps a single recent entry when adding another photo to a brand-new list", () => {
    useAppStore.getState().replaceItems([buildItem("apples")], "First title");
    const firstRecentId = useAppStore.getState().recentLists[0]?.id;
    expect(firstRecentId).toBeTruthy();
    if (!firstRecentId) {
      return;
    }

    useAppStore.getState().replaceItems(
      [buildItem("apples"), buildItem("olive oil")],
      "Merged title",
      { forkRecentList: true }
    );

    const state = useAppStore.getState();
    expect(state.recentLists).toHaveLength(1);
    expect(state.recentLists[0].id).toBe(firstRecentId);
    expect(state.recentLists[0].listTitle).toBe("Merged title");
  });

  it("forks to a new recent entry when adding photo after opening an existing saved list", () => {
    const existingRecentId = "recent-existing";
    useAppStore.setState({
      recentLists: [buildRecent(existingRecentId, "Old title", ["milk", "eggs"])]
    });

    const loaded = useAppStore.getState().loadRecentList(existingRecentId);
    expect(loaded).toBe(true);
    expect(useAppStore.getState().session?.loadedFromRecentList).toBe(true);

    useAppStore.getState().replaceItems(
      [buildItem("milk"), buildItem("eggs"), buildItem("cumin")],
      "Combined title",
      { forkRecentList: true }
    );

    const state = useAppStore.getState();
    expect(state.recentLists).toHaveLength(2);
    expect(state.recentLists[0].id).not.toBe(existingRecentId);
    expect(state.recentLists[0].listTitle).toBe("Combined title");
    expect(state.recentLists[1].id).toBe(existingRecentId);
    expect(state.session?.recentListId).toBe(state.recentLists[0].id);
    expect(state.session?.loadedFromRecentList).toBe(false);
  });
});
