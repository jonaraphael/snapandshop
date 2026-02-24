import { create } from "zustand";
import type {
  OcrMeta,
  PipelineState,
  RecentList,
  RecentListItem,
  Session,
  ShoppingItem,
  UiPrefs
} from "./types";
import { logDebug } from "../lib/debug/logger";
import { createId } from "../lib/id";
import { buildOrderedItems } from "../lib/order/itemOrder";

const PREFS_KEY = "cl:prefs";
const SESSION_KEY = "cl:lastSession";
const RECENT_LISTS_KEY = "cl:recentLists";
const MAX_RECENT_LISTS = 12;

const defaultPrefs = (): UiPrefs => ({
  fontScale: 1,
  reduceMotion:
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  highContrast: false,
  magicModeDefault: true
});

const initialPipeline: PipelineState = {
  status: "idle",
  progress: 0,
  label: "Ready",
  error: null
};

const clampFontScale = (value: number): number => Math.min(1.6, Math.max(0.9, value));

const normalizeListTitle = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, 80);
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(normalized));
};

const readLocal = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeLocal = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore localStorage failures in private mode.
  }
};

const readPrefs = (): UiPrefs => {
  if (typeof window === "undefined") {
    return defaultPrefs();
  }
  const stored = readLocal<UiPrefs>(PREFS_KEY);
  if (!stored) {
    return defaultPrefs();
  }
  return {
    ...defaultPrefs(),
    ...stored,
    fontScale: clampFontScale(stored.fontScale ?? 1),
    // Force frontier-first extraction as the default behavior.
    magicModeDefault: true
  };
};

const readSession = (): Session | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = readLocal<Session>(SESSION_KEY);
  if (!stored) {
    return null;
  }
  return {
    ...stored,
    listTitle: normalizeListTitle(stored.listTitle),
    recentListId: typeof stored.recentListId === "string" ? stored.recentListId : null,
    loadedFromRecentList: stored.loadedFromRecentList === true,
    latestImageItemIds: normalizeStringArray(stored.latestImageItemIds)
  };
};

const readRecentLists = (): RecentList[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = readLocal<RecentList[]>(RECENT_LISTS_KEY);
  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .filter((entry) => entry && typeof entry.id === "string" && Array.isArray(entry.items))
    .map((entry) => ({
      ...entry,
      listTitle: normalizeListTitle(entry.listTitle),
      latestImageNormalizedNames: normalizeStringArray(entry.latestImageNormalizedNames),
      items: entry.items.map((item) => ({
        ...item,
        checked: item.checked === true
      }))
    }))
    .slice(0, MAX_RECENT_LISTS);
};

const toRecentItem = (item: ShoppingItem): RecentListItem => ({
  rawText: item.rawText,
  canonicalName: item.canonicalName,
  normalizedName: item.normalizedName,
  quantity: item.quantity,
  notes: item.notes,
  checked: item.checked,
  categoryId: item.categoryId,
  subcategoryId: item.subcategoryId,
  orderHint: item.orderHint,
  majorSectionId: item.majorSectionId ?? null,
  majorSectionLabel: item.majorSectionLabel ?? null,
  majorSubsection: item.majorSubsection ?? null,
  majorSectionOrder: item.majorSectionOrder ?? null,
  majorSectionItemOrder: item.majorSectionItemOrder ?? null
});

const buildListSignature = (items: RecentListItem[]): string => {
  const normalized = Array.from(
    new Set(
      items
        .map((item) => item.normalizedName.trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort();
  return normalized.join("|");
};

const rememberRecentList = (
  recentLists: RecentList[],
  items: ShoppingItem[],
  listTitle: string | null,
  options?: {
    preferredId?: string | null;
    forceNewId?: boolean;
    latestImageItemIds?: string[];
  }
): { recentLists: RecentList[]; recentListId: string | null } => {
  if (!items.length) {
    return {
      recentLists,
      recentListId: options?.preferredId ?? null
    };
  }

  const snapshotItems = items.map(toRecentItem);
  const signature = buildListSignature(snapshotItems);
  if (!signature) {
    return {
      recentLists,
      recentListId: options?.preferredId ?? null
    };
  }

  const preferredId = options?.preferredId ?? null;
  const preferredExists = preferredId ? recentLists.some((entry) => entry.id === preferredId) : false;
  const existingBySignature = recentLists.find((entry) => entry.signature === signature)?.id ?? null;
  let existingId: string;
  if (options?.forceNewId) {
    existingId = createId();
  } else if (preferredExists && preferredId) {
    existingId = preferredId;
  } else {
    existingId = existingBySignature ?? createId();
  }
  const now = new Date().toISOString();
  const latestImageIdSet = new Set(options?.latestImageItemIds ?? []);
  const latestImageNormalizedNames = Array.from(
    new Set(
      items
        .filter((item) => latestImageIdSet.has(item.id))
        .map((item) => item.normalizedName.trim().toLowerCase())
        .filter(Boolean)
    )
  );
  const nextEntry: RecentList = {
    id: existingId,
    savedAt: now,
    signature,
    listTitle: normalizeListTitle(listTitle),
    itemCount: snapshotItems.length,
    preview: snapshotItems.map((item) => item.canonicalName).filter(Boolean).slice(0, 4),
    items: snapshotItems,
    latestImageNormalizedNames
  };

  const rest = recentLists.filter((entry) => entry.id !== existingId);
  return {
    recentLists: [nextEntry, ...rest].slice(0, MAX_RECENT_LISTS),
    recentListId: existingId
  };
};

const makeSession = (): Session => {
  const now = new Date().toISOString();
  return {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    listTitle: null,
    recentListId: null,
    loadedFromRecentList: false,
    latestImageItemIds: [],
    imageHash: null,
    thumbnailDataUrl: null,
    rawText: "",
    ocrConfidence: 0,
    ocrMeta: null,
    usedMagicMode: false,
    items: []
  };
};

const writeSession = (session: Session | null): void => {
  if (!session) {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // noop
    }
    return;
  }

  writeLocal(SESSION_KEY, session);
};

const touchSession = (session: Session): Session => ({
  ...session,
  updatedAt: new Date().toISOString()
});

interface AppState {
  prefs: UiPrefs;
  session: Session | null;
  recentLists: RecentList[];
  magicDebugOutput: string | null;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  pipeline: PipelineState;
  setPrefs: (patch: Partial<UiPrefs>) => void;
  ensureSession: () => Session;
  setImageInput: (file: File, previewUrl: string) => void;
  clearImageInput: () => void;
  setMagicDebugOutput: (value: string | null) => void;
  loadSharedList: (input: { listTitle: string | null; items: ShoppingItem[] }) => void;
  setPipeline: (patch: Partial<PipelineState>) => void;
  resetPipeline: () => void;
  resetForNewList: () => void;
  setExtractionResult: (input: {
    rawText: string;
    ocrMeta: OcrMeta | null;
    ocrConfidence: number;
    imageHash: string | null;
    thumbnailDataUrl: string | null;
    listTitle: string | null;
    usedMagicMode: boolean;
  }) => void;
  replaceItems: (
    items: ShoppingItem[],
    listTitle?: string | null,
    options?: { forkRecentList?: boolean; latestImageItemIds?: string[] | null }
  ) => void;
  loadRecentList: (recentListId: string) => boolean;
  removeRecentList: (recentListId: string) => void;
  addSuggestedItems: (items: RecentListItem[]) => void;
  dismissSuggestedItem: (id: string) => void;
  addItem: (canonicalName: string) => void;
  updateItem: (id: string, patch: Partial<ShoppingItem>) => void;
  removeItem: (id: string) => void;
  toggleItem: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  prefs: readPrefs(),
  session: readSession(),
  recentLists: readRecentLists(),
  magicDebugOutput: null,
  imageFile: null,
  imagePreviewUrl: null,
  pipeline: initialPipeline,
  setPrefs: (patch) => {
    set((state) => {
      const nextPrefs: UiPrefs = {
        ...state.prefs,
        ...patch,
        fontScale:
          typeof patch.fontScale === "number"
            ? clampFontScale(patch.fontScale)
            : state.prefs.fontScale
      };
      writeLocal(PREFS_KEY, nextPrefs);
      return { prefs: nextPrefs };
    });
  },
  ensureSession: () => {
    const existing = get().session;
    if (existing) {
      return existing;
    }

    const nextSession = makeSession();
    set({ session: nextSession });
    writeSession(nextSession);
    return nextSession;
  },
  setImageInput: (file, previewUrl) => {
    get().ensureSession();
    logDebug("store_set_image_input", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
    set({ imageFile: file, imagePreviewUrl: previewUrl });
  },
  clearImageInput: () => {
    set({ imageFile: null, imagePreviewUrl: null });
  },
  setMagicDebugOutput: (value) => {
    set({ magicDebugOutput: value });
  },
  loadSharedList: ({ listTitle, items }) => {
    const existingSession = get().session ?? makeSession();
    const normalizedTitle = normalizeListTitle(listTitle);
    const normalizedItems = items.map((item) => ({
      ...item,
      canonicalName: item.canonicalName.trim() || item.rawText.trim() || "Item",
      rawText: item.rawText.trim() || item.canonicalName.trim() || "Item",
      normalizedName: item.normalizedName.trim() || item.canonicalName.trim().toLowerCase() || "item"
    }));
    const updated = touchSession({
      ...existingSession,
      listTitle: normalizedTitle,
      recentListId: null,
      loadedFromRecentList: false,
      latestImageItemIds: [],
      rawText: normalizedItems.map((item) => item.rawText).join("\n"),
      ocrMeta: null,
      ocrConfidence: 0,
      usedMagicMode: false,
      items: normalizedItems
    });
    set({
      session: updated,
      magicDebugOutput: null,
      imageFile: null,
      imagePreviewUrl: null,
      pipeline: initialPipeline
    });
    writeSession(updated);
  },
  setPipeline: (patch) => {
    set((state) => ({
      pipeline: {
        ...state.pipeline,
        ...patch
      }
    }));
  },
  resetPipeline: () => {
    set({ pipeline: initialPipeline });
  },
  resetForNewList: () => {
    const session = makeSession();
    set({
      session,
      magicDebugOutput: null,
      imageFile: null,
      imagePreviewUrl: null,
      pipeline: initialPipeline
    });
    writeSession(session);
  },
  setExtractionResult: ({
    rawText,
    ocrMeta,
    ocrConfidence,
    imageHash,
    thumbnailDataUrl,
    listTitle,
    usedMagicMode
  }) => {
    const ensured = get().ensureSession();
    const updated = touchSession({
      ...ensured,
      rawText,
      ocrMeta,
      ocrConfidence,
      imageHash,
      thumbnailDataUrl,
      listTitle: normalizeListTitle(listTitle),
      usedMagicMode
    });
    set({ session: updated });
    writeSession(updated);
  },
  replaceItems: (items, listTitle, options) => {
    const session = get().ensureSession();
    const sessionTitle = normalizeListTitle(session.listTitle);
    const providedTitle = listTitle === undefined ? undefined : normalizeListTitle(listTitle);
    const nextTitle = providedTitle === undefined ? sessionTitle : providedTitle;
    const itemIdSet = new Set(items.map((item) => item.id));
    const nextLatestImageItemIdsSource =
      options?.latestImageItemIds === null
        ? []
        : options?.latestImageItemIds === undefined
          ? session.latestImageItemIds ?? []
          : options.latestImageItemIds;
    const nextLatestImageItemIds = normalizeStringArray(nextLatestImageItemIdsSource).filter((id) =>
      itemIdSet.has(id)
    );
    const shouldForkRecent = options?.forkRecentList === true && session.loadedFromRecentList === true;
    const remembered = rememberRecentList(get().recentLists, items, nextTitle, {
      preferredId: shouldForkRecent ? null : session.recentListId ?? null,
      forceNewId: shouldForkRecent,
      latestImageItemIds: nextLatestImageItemIds
    });
    const updated = touchSession({
      ...session,
      listTitle: nextTitle,
      items,
      latestImageItemIds: nextLatestImageItemIds,
      recentListId: remembered.recentListId ?? session.recentListId ?? null,
      loadedFromRecentList: shouldForkRecent ? false : session.loadedFromRecentList === true
    });
    const recentLists = remembered.recentLists;
    set({ session: updated, recentLists });
    writeSession(updated);
    writeLocal(RECENT_LISTS_KEY, recentLists);
  },
  loadRecentList: (recentListId) => {
    const recent = get().recentLists.find((entry) => entry.id === recentListId);
    if (!recent) {
      return false;
    }

    const session = get().ensureSession();
    const items = buildOrderedItems(
      recent.items.map((item) => ({
        id: createId(),
        rawText: item.rawText || item.canonicalName,
        canonicalName: item.canonicalName,
        normalizedName: item.normalizedName || item.canonicalName.toLowerCase(),
        quantity: item.quantity,
        notes: item.notes,
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId,
        orderHint: item.orderHint,
        checked: item.checked === true,
        confidence: 0.9,
        source: "manual",
        categoryOverridden: false,
        majorSectionId: item.majorSectionId ?? null,
        majorSectionLabel: item.majorSectionLabel ?? null,
        majorSubsection: item.majorSubsection ?? null,
        majorSectionOrder: item.majorSectionOrder ?? null,
        majorSectionItemOrder: item.majorSectionItemOrder ?? null,
        suggested: false
      }))
    );
    const recentLatestNameSet = new Set(
      normalizeStringArray(recent.latestImageNormalizedNames).map((name) => name.toLowerCase())
    );
    const latestImageItemIds =
      recentLatestNameSet.size === 0
        ? []
        : items
            .filter((item) => recentLatestNameSet.has(item.normalizedName.trim().toLowerCase()))
            .map((item) => item.id);

    const updated = touchSession({
      ...session,
      listTitle: normalizeListTitle(recent.listTitle),
      recentListId: recent.id,
      loadedFromRecentList: true,
      latestImageItemIds,
      rawText: items.map((item) => item.rawText).join("\n"),
      usedMagicMode: false,
      items
    });

    set({ session: updated, magicDebugOutput: null });
    writeSession(updated);
    return true;
  },
  removeRecentList: (recentListId) => {
    const currentRecent = get().recentLists;
    const nextRecent = currentRecent.filter((entry) => entry.id !== recentListId);
    if (nextRecent.length === currentRecent.length) {
      return;
    }

    const currentSession = get().session;
    if (currentSession && currentSession.recentListId === recentListId) {
      const updatedSession = touchSession({
        ...currentSession,
        recentListId: null,
        loadedFromRecentList: false
      });
      set({ recentLists: nextRecent, session: updatedSession });
      writeSession(updatedSession);
    } else {
      set({ recentLists: nextRecent });
    }

    writeLocal(RECENT_LISTS_KEY, nextRecent);
  },
  addSuggestedItems: (items) => {
    if (!items.length) {
      return;
    }

    const session = get().ensureSession();
    const existingNormalized = new Set(session.items.map((item) => item.normalizedName));
    const appended: ShoppingItem[] = [];

    for (const item of items) {
      const normalized = item.normalizedName.trim().toLowerCase();
      if (!normalized || existingNormalized.has(normalized)) {
        continue;
      }

      existingNormalized.add(normalized);
      appended.push({
        id: createId(),
        rawText: item.rawText || item.canonicalName,
        canonicalName: item.canonicalName,
        normalizedName: normalized,
        quantity: item.quantity,
        notes: item.notes,
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId,
        orderHint: item.orderHint,
        checked: false,
        confidence: 0.7,
        source: "manual",
        categoryOverridden: false,
        majorSectionId: item.majorSectionId ?? null,
        majorSectionLabel: item.majorSectionLabel ?? null,
        majorSubsection: item.majorSubsection ?? null,
        majorSectionOrder: item.majorSectionOrder ?? null,
        majorSectionItemOrder: item.majorSectionItemOrder ?? null,
        suggested: true
      });
    }

    if (!appended.length) {
      return;
    }

    const merged = buildOrderedItems([...session.items, ...appended]);
    const updated = touchSession({ ...session, items: merged });
    set({ session: updated });
    writeSession(updated);
  },
  dismissSuggestedItem: (id) => {
    const session = get().session;
    if (!session) {
      return;
    }

    const target = session.items.find((item) => item.id === id);
    if (!target || !target.suggested) {
      return;
    }

    const updated = touchSession({
      ...session,
      items: session.items.filter((item) => item.id !== id),
      latestImageItemIds: (session.latestImageItemIds ?? []).filter((itemId) => itemId !== id)
    });
    set({ session: updated });
    writeSession(updated);
  },
  addItem: (canonicalName) => {
    const trimmed = canonicalName.trim();
    if (!trimmed) {
      return;
    }

    const session = get().ensureSession();
    const item: ShoppingItem = {
      id: createId(),
      rawText: trimmed,
      canonicalName: trimmed,
      normalizedName: trimmed.toLowerCase(),
      quantity: null,
      notes: null,
      categoryId: "other",
      subcategoryId: null,
      orderHint: null,
      checked: false,
      confidence: 0.2,
      source: "manual",
      categoryOverridden: false,
      majorSectionId: null,
      majorSectionLabel: null,
      majorSubsection: null,
      majorSectionOrder: null,
      majorSectionItemOrder: null,
      suggested: false
    };
    const updated = touchSession({ ...session, items: [...session.items, item] });
    set({ session: updated });
    writeSession(updated);
  },
  updateItem: (id, patch) => {
    const session = get().session;
    if (!session) {
      return;
    }

    const updated = touchSession({
      ...session,
      items: session.items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    });
    set({ session: updated });
    writeSession(updated);
  },
  removeItem: (id) => {
    const session = get().session;
    if (!session) {
      return;
    }

    const updated = touchSession({
      ...session,
      items: session.items.filter((item) => item.id !== id),
      latestImageItemIds: (session.latestImageItemIds ?? []).filter((itemId) => itemId !== id)
    });
    set({ session: updated });
    writeSession(updated);
  },
  toggleItem: (id) => {
    const session = get().session;
    if (!session) {
      return;
    }

    const updated = touchSession({
      ...session,
      items: session.items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    });
    const remembered = rememberRecentList(get().recentLists, updated.items, updated.listTitle, {
      preferredId: session.recentListId ?? null,
      latestImageItemIds: session.latestImageItemIds ?? []
    });
    const persisted = {
      ...updated,
      recentListId: remembered.recentListId ?? session.recentListId ?? null
    };
    set({ session: persisted, recentLists: remembered.recentLists });
    writeSession(persisted);
    writeLocal(RECENT_LISTS_KEY, remembered.recentLists);
  }
}));

export const storageKeys = {
  prefs: PREFS_KEY,
  session: SESSION_KEY
};
