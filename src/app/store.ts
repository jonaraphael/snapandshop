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
const defaultByoOpenAiKey = import.meta.env.VITE_OPENAI_API_KEY?.trim() || null;

const defaultPrefs = (): UiPrefs => ({
  fontScale: 1,
  reduceMotion:
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  highContrast: false,
  magicModeDefault: true,
  byoOpenAiKey: defaultByoOpenAiKey
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
    byoOpenAiKey:
      typeof stored.byoOpenAiKey === "string" && stored.byoOpenAiKey.trim()
        ? stored.byoOpenAiKey
        : defaultByoOpenAiKey,
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
    listTitle: normalizeListTitle(stored.listTitle)
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
      listTitle: normalizeListTitle(entry.listTitle)
    }))
    .slice(0, MAX_RECENT_LISTS);
};

const toRecentItem = (item: ShoppingItem): RecentListItem => ({
  rawText: item.rawText,
  canonicalName: item.canonicalName,
  normalizedName: item.normalizedName,
  quantity: item.quantity,
  notes: item.notes,
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
  listTitle: string | null
): RecentList[] => {
  if (!items.length) {
    return recentLists;
  }

  const snapshotItems = items.map(toRecentItem);
  const signature = buildListSignature(snapshotItems);
  if (!signature) {
    return recentLists;
  }

  const existingIndex = recentLists.findIndex((entry) => entry.signature === signature);
  const existingId = existingIndex >= 0 ? recentLists[existingIndex].id : createId();
  const now = new Date().toISOString();
  const nextEntry: RecentList = {
    id: existingId,
    savedAt: now,
    signature,
    listTitle: normalizeListTitle(listTitle),
    itemCount: snapshotItems.length,
    preview: snapshotItems.map((item) => item.canonicalName).filter(Boolean).slice(0, 4),
    items: snapshotItems
  };

  const rest = recentLists.filter((entry) => entry.id !== existingId);
  return [nextEntry, ...rest].slice(0, MAX_RECENT_LISTS);
};

const makeSession = (): Session => {
  const now = new Date().toISOString();
  return {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    listTitle: null,
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
  replaceItems: (items: ShoppingItem[], listTitle?: string | null) => void;
  loadRecentList: (recentListId: string) => boolean;
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
  replaceItems: (items, listTitle) => {
    const session = get().ensureSession();
    const sessionTitle = normalizeListTitle(session.listTitle);
    const providedTitle = listTitle === undefined ? undefined : normalizeListTitle(listTitle);
    const nextTitle = providedTitle === undefined ? sessionTitle : providedTitle;
    const updated = touchSession({ ...session, listTitle: nextTitle, items });
    const recentLists = rememberRecentList(get().recentLists, items, nextTitle);
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
        checked: false,
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

    const updated = touchSession({
      ...session,
      listTitle: normalizeListTitle(recent.listTitle),
      rawText: items.map((item) => item.rawText).join("\n"),
      usedMagicMode: false,
      items
    });

    set({ session: updated, magicDebugOutput: null });
    writeSession(updated);
    return true;
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
      items: session.items.filter((item) => item.id !== id)
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
      items: session.items.filter((item) => item.id !== id)
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
    set({ session: updated });
    writeSession(updated);
  }
}));

export const storageKeys = {
  prefs: PREFS_KEY,
  session: SESSION_KEY
};
