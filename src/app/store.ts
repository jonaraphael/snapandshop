import { create } from "zustand";
import type { OcrMeta, PipelineState, Session, ShoppingItem, UiPrefs } from "./types";
import { logDebug } from "../lib/debug/logger";
import { createId } from "../lib/id";

const PREFS_KEY = "cl:prefs";
const SESSION_KEY = "cl:lastSession";
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
  return stored;
};

const makeSession = (): Session => {
  const now = new Date().toISOString();
  return {
    id: createId(),
    createdAt: now,
    updatedAt: now,
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
  imageFile: File | null;
  imagePreviewUrl: string | null;
  pipeline: PipelineState;
  setPrefs: (patch: Partial<UiPrefs>) => void;
  ensureSession: () => Session;
  setImageInput: (file: File, previewUrl: string) => void;
  clearImageInput: () => void;
  setPipeline: (patch: Partial<PipelineState>) => void;
  resetPipeline: () => void;
  resetForNewList: () => void;
  setExtractionResult: (input: {
    rawText: string;
    ocrMeta: OcrMeta | null;
    ocrConfidence: number;
    imageHash: string | null;
    thumbnailDataUrl: string | null;
    usedMagicMode: boolean;
  }) => void;
  replaceItems: (items: ShoppingItem[]) => void;
  addItem: (canonicalName: string) => void;
  updateItem: (id: string, patch: Partial<ShoppingItem>) => void;
  removeItem: (id: string) => void;
  toggleItem: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  prefs: readPrefs(),
  session: readSession(),
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
      imageFile: null,
      imagePreviewUrl: null,
      pipeline: initialPipeline
    });
    writeSession(session);
  },
  setExtractionResult: ({ rawText, ocrMeta, ocrConfidence, imageHash, thumbnailDataUrl, usedMagicMode }) => {
    const ensured = get().ensureSession();
    const updated = touchSession({
      ...ensured,
      rawText,
      ocrMeta,
      ocrConfidence,
      imageHash,
      thumbnailDataUrl,
      usedMagicMode
    });
    set({ session: updated });
    writeSession(updated);
  },
  replaceItems: (items) => {
    const session = get().ensureSession();
    const updated = touchSession({ ...session, items });
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
      majorSectionItemOrder: null
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
