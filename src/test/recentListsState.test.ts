import { beforeEach, describe, expect, it } from "vitest";
import type { ShoppingItem } from "../app/types";
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

const buildItem = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: "item-default",
  rawText: "milk",
  canonicalName: "milk",
  normalizedName: "milk",
  quantity: null,
  notes: null,
  categoryId: "dairy_eggs",
  subcategoryId: null,
  orderHint: 120,
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

describe("recent list checked-state restore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("keeps checked values when opening a saved recent list", () => {
    const now = new Date().toISOString();
    useAppStore.setState({
      recentLists: [
        {
          id: "recent-1",
          savedAt: now,
          signature: "eggs|milk",
          listTitle: "Weekend run",
          itemCount: 2,
          preview: ["milk", "eggs"],
          items: [
            {
              rawText: "milk",
              canonicalName: "milk",
              normalizedName: "milk",
              quantity: null,
              notes: null,
              checked: true,
              categoryId: "dairy_eggs",
              subcategoryId: null,
              orderHint: 120,
              majorSectionId: null,
              majorSectionLabel: null,
              majorSubsection: null,
              majorSectionOrder: null,
              majorSectionItemOrder: null
            },
            {
              rawText: "eggs",
              canonicalName: "eggs",
              normalizedName: "eggs",
              quantity: null,
              notes: null,
              checked: false,
              categoryId: "dairy_eggs",
              subcategoryId: null,
              orderHint: 121,
              majorSectionId: null,
              majorSectionLabel: null,
              majorSubsection: null,
              majorSectionOrder: null,
              majorSectionItemOrder: null
            }
          ]
        }
      ]
    });

    const loaded = useAppStore.getState().loadRecentList("recent-1");
    expect(loaded).toBe(true);

    const items = useAppStore.getState().session?.items ?? [];
    const byName = new Map(items.map((item) => [item.normalizedName, item]));
    expect(byName.get("milk")?.checked).toBe(true);
    expect(byName.get("eggs")?.checked).toBe(false);
  });

  it("updates saved recent snapshot after toggling checklist items", () => {
    const milk = buildItem({ id: "milk-id", rawText: "milk", canonicalName: "milk", normalizedName: "milk" });
    const eggs = buildItem({ id: "eggs-id", rawText: "eggs", canonicalName: "eggs", normalizedName: "eggs", orderHint: 121 });

    useAppStore.getState().replaceItems([milk, eggs], "My list");
    const recentId = useAppStore.getState().recentLists[0]?.id;
    expect(recentId).toBeTruthy();
    if (!recentId) {
      return;
    }

    useAppStore.getState().toggleItem("milk-id");

    const recent = useAppStore.getState().recentLists.find((entry) => entry.id === recentId);
    expect(recent).toBeDefined();
    const recentMilk = recent?.items.find((item) => item.normalizedName === "milk");
    expect(recentMilk?.checked).toBe(true);

    const loaded = useAppStore.getState().loadRecentList(recentId);
    expect(loaded).toBe(true);
    const loadedMilk = useAppStore
      .getState()
      .session?.items.find((item) => item.normalizedName === "milk");
    expect(loadedMilk?.checked).toBe(true);
  });

  it("removes a recent list and clears session linkage when it was active", () => {
    useAppStore.getState().replaceItems([buildItem({ canonicalName: "tea", normalizedName: "tea", rawText: "tea" })], "Tea run");
    const recentId = useAppStore.getState().recentLists[0]?.id;
    expect(recentId).toBeTruthy();
    if (!recentId) {
      return;
    }

    const loaded = useAppStore.getState().loadRecentList(recentId);
    expect(loaded).toBe(true);
    expect(useAppStore.getState().session?.recentListId).toBe(recentId);

    useAppStore.getState().removeRecentList(recentId);

    expect(useAppStore.getState().recentLists).toHaveLength(0);
    expect(useAppStore.getState().session?.recentListId).toBeNull();
    expect(useAppStore.getState().session?.loadedFromRecentList).toBe(false);

    const persisted = localStorage.getItem("cl:recentLists");
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted ?? "[]")).toEqual([]);
  });

  it("tracks and restores latest image item IDs for scaling actions", () => {
    const milk = buildItem({ id: "milk-id", rawText: "milk", canonicalName: "milk", normalizedName: "milk" });
    const eggs = buildItem({ id: "eggs-id", rawText: "eggs", canonicalName: "eggs", normalizedName: "eggs", orderHint: 121 });
    const tea = buildItem({ id: "tea-id", rawText: "tea", canonicalName: "tea", normalizedName: "tea", orderHint: 122 });

    useAppStore
      .getState()
      .replaceItems([milk, eggs, tea], "Scale test", { latestImageItemIds: ["milk-id", "eggs-id"] });

    expect(useAppStore.getState().session?.latestImageItemIds).toEqual(["milk-id", "eggs-id"]);

    const recentId = useAppStore.getState().recentLists[0]?.id;
    expect(recentId).toBeTruthy();
    if (!recentId) {
      return;
    }

    const remembered = useAppStore.getState().recentLists[0];
    expect(remembered.latestImageNormalizedNames).toEqual(["milk", "eggs"]);

    const loaded = useAppStore.getState().loadRecentList(recentId);
    expect(loaded).toBe(true);

    const session = useAppStore.getState().session;
    const latestIdSet = new Set(session?.latestImageItemIds ?? []);
    const latestNames = (session?.items ?? [])
      .filter((item) => latestIdSet.has(item.id))
      .map((item) => item.normalizedName)
      .sort();
    expect(latestNames).toEqual(["eggs", "milk"]);
  });
});
