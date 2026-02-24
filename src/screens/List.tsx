import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useAppStore } from "../app/store";
import { TopBar } from "../components/TopBar";
import { SectionCard } from "../components/SectionCard";
import { BottomSheet } from "../components/BottomSheet";
import { TextSizeControl } from "../components/TextSizeControl";
import { buildOrderedItems } from "../lib/order/itemOrder";
import { buildSections } from "../lib/order/sectionOrder";
import {
  finalizeListTitleForItems,
  mapMagicModeItems,
  requestMagicModeParse
} from "../lib/ocr/magicMode";
import type { RecentListItem, ShoppingItem } from "../app/types";

const SHAKE_DELTA_THRESHOLD = 13;
const SHAKE_COOLDOWN_MS = 1500;
const ADD_PHOTO_ERROR_TEXT = "Could not add this image. Try another photo.";

const mergeQuantity = (left: string | null, right: string | null): string | null => {
  if (left && right) {
    return left === right ? left : `${left} + ${right}`;
  }
  return left ?? right;
};

const mergeNotes = (left: string | null, right: string | null): string | null => {
  if (!left && !right) {
    return null;
  }
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  if (left === right) {
    return left;
  }
  return Array.from(new Set([left, right])).join("; ");
};

const normalizeDebugName = (value: string): string => {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
};

interface ModelDebugComparison {
  modelItemCount: number;
  checklistItemCount: number;
  missingInChecklist: string[];
  parseError: string | null;
}

const shouldShowModelDebugPanel = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  if (import.meta.env.DEV) {
    return true;
  }

  const { hostname } = window.location;
  const lowerHost = hostname.toLowerCase();
  if (
    lowerHost === "localhost" ||
    lowerHost === "127.0.0.1" ||
    lowerHost === "0.0.0.0" ||
    lowerHost === "::1" ||
    lowerHost === "[::1]"
  ) {
    return true;
  }
  if (lowerHost.endsWith(".localhost") || lowerHost.endsWith(".local")) {
    return true;
  }

  const isPrivateIpv4 =
    /^10\./.test(lowerHost) ||
    /^192\.168\./.test(lowerHost) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lowerHost);
  if (isPrivateIpv4) {
    return true;
  }

  return false;
};

const buildModelDebugComparison = (
  rawOutput: string | null,
  checklistItems: ShoppingItem[]
): ModelDebugComparison | null => {
  if (!rawOutput) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawOutput) as {
      items?: Array<{ canonical_name?: string | null; raw_text?: string | null }>;
    };
    const modelItems = Array.isArray(parsed.items) ? parsed.items : [];
    const modelNames = modelItems
      .map((item) => item.canonical_name ?? item.raw_text ?? "")
      .map((name) => name.trim())
      .filter(Boolean);

    const checklistNames = new Set(checklistItems.map((item) => normalizeDebugName(item.canonicalName)));
    const missingInChecklist = Array.from(
      new Set(
        modelNames.filter((name) => !checklistNames.has(normalizeDebugName(name)))
      )
    );

    return {
      modelItemCount: modelItems.length,
      checklistItemCount: checklistItems.length,
      missingInChecklist,
      parseError: null
    };
  } catch (error) {
    return {
      modelItemCount: 0,
      checklistItemCount: checklistItems.length,
      missingInChecklist: [],
      parseError: error instanceof Error ? error.message : "Could not parse model debug output."
    };
  }
};

const collateItems = (existingItems: ShoppingItem[], incomingItems: ShoppingItem[]): ShoppingItem[] => {
  const byNormalized = new Map<string, ShoppingItem>();

  for (const item of existingItems) {
    const normalized = item.normalizedName.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    byNormalized.set(normalized, {
      ...item,
      normalizedName: normalized
    });
  }

  for (const incoming of incomingItems) {
    const normalized = incoming.normalizedName.trim().toLowerCase();
    if (!normalized) {
      continue;
    }

    const existing = byNormalized.get(normalized);
    if (!existing) {
      byNormalized.set(normalized, {
        ...incoming,
        normalizedName: normalized,
        checked: false,
        suggested: false
      });
      continue;
    }

    const useIncomingClassification = !existing.categoryOverridden;
    byNormalized.set(normalized, {
      ...existing,
      quantity: mergeQuantity(existing.quantity, incoming.quantity),
      notes: mergeNotes(existing.notes, incoming.notes),
      checked: false,
      confidence: Math.max(existing.confidence, incoming.confidence),
      categoryId: useIncomingClassification ? incoming.categoryId : existing.categoryId,
      subcategoryId: useIncomingClassification ? incoming.subcategoryId : existing.subcategoryId,
      orderHint: useIncomingClassification ? incoming.orderHint : existing.orderHint,
      majorSectionId: useIncomingClassification ? incoming.majorSectionId ?? null : existing.majorSectionId ?? null,
      majorSectionLabel: useIncomingClassification ? incoming.majorSectionLabel ?? null : existing.majorSectionLabel ?? null,
      majorSubsection: useIncomingClassification ? incoming.majorSubsection ?? null : existing.majorSubsection ?? null,
      majorSectionOrder: useIncomingClassification ? incoming.majorSectionOrder ?? null : existing.majorSectionOrder ?? null,
      majorSectionItemOrder: useIncomingClassification
        ? incoming.majorSectionItemOrder ?? null
        : existing.majorSectionItemOrder ?? null
    });
  }

  return buildOrderedItems(Array.from(byNormalized.values()));
};

const ImageIcon = (): JSX.Element => (
  <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M7 15l3-3 2.5 2.2L16 10l3 5" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const EditIcon = (): JSX.Element => (
  <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M4.5 16.6l-.8 3.1 3.1-.8L16.5 9l-2.3-2.3z" />
    <path d="M14.8 6.7l2.3 2.3 1.7-1.7a1.6 1.6 0 0 0 0-2.3l-.1-.1a1.6 1.6 0 0 0-2.3 0z" />
  </svg>
);

const ShareIcon = (): JSX.Element => (
  <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <circle cx="18" cy="5.5" r="2.4" />
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="18" cy="18.5" r="2.4" />
    <path d="M8.1 10.9l7.7-4.1" />
    <path d="M8.1 13.1l7.7 4.1" />
  </svg>
);

const MenuIcon = (): JSX.Element => (
  <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M4 6.5h16" />
    <path d="M4 12h16" />
    <path d="M4 17.5h16" />
  </svg>
);

export const List = (): JSX.Element => {
  const navigate = useNavigate();
  const session = useAppStore((state) => state.session);
  const imagePreviewUrl = useAppStore((state) => state.imagePreviewUrl);
  const recentLists = useAppStore((state) => state.recentLists);
  const magicDebugOutput = useAppStore((state) => state.magicDebugOutput);
  const setMagicDebugOutput = useAppStore((state) => state.setMagicDebugOutput);
  const toggleItem = useAppStore((state) => state.toggleItem);
  const addSuggestedItems = useAppStore((state) => state.addSuggestedItems);
  const dismissSuggestedItem = useAppStore((state) => state.dismissSuggestedItem);
  const removeItem = useAppStore((state) => state.removeItem);
  const replaceItems = useAppStore((state) => state.replaceItems);
  const resetForNewList = useAppStore((state) => state.resetForNewList);
  const [showTextSize, setShowTextSize] = useState(false);
  const [showImageSheet, setShowImageSheet] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [lastRemovedItem, setLastRemovedItem] = useState<ShoppingItem | null>(null);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [addPhotoError, setAddPhotoError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const lastRemovedRef = useRef<ShoppingItem | null>(null);
  const lastMagnitudeRef = useRef<number | null>(null);
  const lastShakeAtRef = useRef(0);
  const addPhotoAbortRef = useRef<AbortController | null>(null);
  const shareStatusTimerRef = useRef<number | null>(null);
  const sourceImageUrl = imagePreviewUrl ?? session?.thumbnailDataUrl ?? null;
  const activeListTitle = session?.listTitle?.trim() || "Shopping list";

  const sections = useMemo(() => buildSections(session?.items ?? []), [session?.items]);
  const showModelDebugPanel = useMemo(() => shouldShowModelDebugPanel(), []);
  const debugComparison = useMemo(
    () => buildModelDebugComparison(magicDebugOutput, session?.items ?? []),
    [magicDebugOutput, session?.items]
  );
  const itemsLeft = useMemo(
    () => (session?.items ?? []).filter((item) => !item.checked).length,
    [session?.items]
  );
  const suggestionsBySection = useMemo(() => {
    const currentItems = session?.items ?? [];
    const currentNames = new Set(currentItems.map((item) => item.normalizedName));
    const sectionToSuggestions = new Map<string, Map<string, RecentListItem & { count: number }>>();

    for (const recent of recentLists) {
      const seenThisList = new Set<string>();
      for (const item of recent.items) {
        if (!item.normalizedName || currentNames.has(item.normalizedName)) {
          continue;
        }

        const sectionId = item.majorSectionId ?? item.categoryId;
        const uniqueKey = `${sectionId}:${item.normalizedName}`;
        if (seenThisList.has(uniqueKey)) {
          continue;
        }
        seenThisList.add(uniqueKey);

        const sectionMap = sectionToSuggestions.get(sectionId) ?? new Map<string, RecentListItem & { count: number }>();
        const existing = sectionMap.get(item.normalizedName);
        if (existing) {
          existing.count += 1;
        } else {
          sectionMap.set(item.normalizedName, {
            ...item,
            count: 1
          });
        }
        sectionToSuggestions.set(sectionId, sectionMap);
      }
    }

    const sorted = new Map<string, RecentListItem[]>();
    for (const [sectionId, itemMap] of sectionToSuggestions.entries()) {
      const ordered = Array.from(itemMap.values())
        .sort((left, right) => {
          if (right.count !== left.count) {
            return right.count - left.count;
          }
          return left.canonicalName.localeCompare(right.canonicalName);
        })
        .map(({ count, ...item }) => item);
      if (ordered.length) {
        sorted.set(sectionId, ordered);
      }
    }
    return sorted;
  }, [recentLists, session?.items]);

  const onSuggestMore = (sectionId: string): void => {
    const next = suggestionsBySection.get(sectionId) ?? [];
    if (!next.length) {
      return;
    }
    addSuggestedItems(next.slice(0, 3));
  };

  useEffect(() => {
    lastRemovedRef.current = lastRemovedItem;
  }, [lastRemovedItem]);

  const restoreLastRemoved = useCallback((): boolean => {
    const removed = lastRemovedRef.current;
    if (!removed) {
      return false;
    }

    const currentSession = useAppStore.getState().session;
    if (!currentSession) {
      return false;
    }

    if (currentSession.items.some((item) => item.id === removed.id)) {
      setLastRemovedItem(null);
      return false;
    }

    const merged = buildOrderedItems([...currentSession.items, removed]);
    replaceItems(merged, currentSession.listTitle);
    setLastRemovedItem(null);
    return true;
  }, [replaceItems]);

  useEffect(() => {
    if (shakeEnabled || typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      return;
    }

    const ctor = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };
    if (typeof ctor.requestPermission === "function") {
      return;
    }
    setShakeEnabled(true);
  }, [shakeEnabled]);

  const enableShakeUndo = useCallback(async (): Promise<void> => {
    if (shakeEnabled || typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      return;
    }

    const ctor = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };
    if (typeof ctor.requestPermission === "function") {
      try {
        const permission = await ctor.requestPermission();
        if (permission !== "granted") {
          return;
        }
      } catch {
        return;
      }
    }

    setShakeEnabled(true);
  }, [shakeEnabled]);

  useEffect(() => {
    if (!shakeEnabled || typeof window === "undefined") {
      return;
    }

    const onDeviceMotion = (event: DeviceMotionEvent): void => {
      if (!lastRemovedRef.current) {
        return;
      }

      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) {
        return;
      }

      const x = acceleration.x ?? 0;
      const y = acceleration.y ?? 0;
      const z = acceleration.z ?? 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const lastMagnitude = lastMagnitudeRef.current;
      lastMagnitudeRef.current = magnitude;
      if (lastMagnitude === null) {
        return;
      }

      const delta = Math.abs(magnitude - lastMagnitude);
      const now = Date.now();
      if (delta < SHAKE_DELTA_THRESHOLD || now - lastShakeAtRef.current < SHAKE_COOLDOWN_MS) {
        return;
      }

      lastShakeAtRef.current = now;
      if (!restoreLastRemoved()) {
        return;
      }
      if ("vibrate" in navigator) {
        navigator.vibrate(80);
      }
    };

    window.addEventListener("devicemotion", onDeviceMotion);
    return () => {
      window.removeEventListener("devicemotion", onDeviceMotion);
    };
  }, [restoreLastRemoved, shakeEnabled]);

  const onSwipeRemove = (itemId: string): void => {
    const currentSession = useAppStore.getState().session;
    if (!currentSession) {
      return;
    }

    const target = currentSession.items.find((item) => item.id === itemId);
    if (!target) {
      return;
    }

    setLastRemovedItem(target);
    removeItem(itemId);
    void enableShakeUndo();
  };

  useEffect(() => {
    return () => {
      addPhotoAbortRef.current?.abort();
    };
  }, []);

  const onAddPhoto = useCallback(
    async (file: File): Promise<void> => {
      if (isAddingPhoto) {
        return;
      }

      setIsAddingPhoto(true);
      setAddPhotoError(null);
      addPhotoAbortRef.current?.abort();
      const controller = new AbortController();
      addPhotoAbortRef.current = controller;

      try {
        const parsed = await requestMagicModeParse({
          imageBlob: file,
          model: import.meta.env.VITE_OPENAI_MODEL ?? "gpt-5.2",
          signal: controller.signal
        });
        setMagicDebugOutput(parsed.debug_raw_output ?? null);

        const incoming = mapMagicModeItems(parsed.items);
        if (!incoming.length) {
          throw new Error("No list items detected in added image.");
        }

        const currentSession = useAppStore.getState().session;
        const existingItems = currentSession?.items ?? [];
        const merged = collateItems(existingItems, incoming);
        const resolvedListTitle = finalizeListTitleForItems(
          null,
          merged.map((item) => item.canonicalName)
        );
        replaceItems(merged, resolvedListTitle, { forkRecentList: true });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setAddPhotoError(error instanceof Error && error.message ? error.message : ADD_PHOTO_ERROR_TEXT);
      } finally {
        if (addPhotoAbortRef.current === controller) {
          addPhotoAbortRef.current = null;
        }
        setIsAddingPhoto(false);
      }
    },
    [isAddingPhoto, replaceItems, setMagicDebugOutput]
  );

  const onAddPhotoInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) {
      return;
    }
    void onAddPhoto(file);
  };

  const clearShareStatusTimer = (): void => {
    if (shareStatusTimerRef.current !== null) {
      window.clearTimeout(shareStatusTimerRef.current);
      shareStatusTimerRef.current = null;
    }
  };

  const setShareStatusWithTimeout = (message: string): void => {
    clearShareStatusTimer();
    setShareStatus(message);
    shareStatusTimerRef.current = window.setTimeout(() => {
      setShareStatus(null);
      shareStatusTimerRef.current = null;
    }, 2600);
  };

  const copyToClipboard = async (value: string): Promise<boolean> => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // fallback below
      }
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  };

  const openSmsComposer = (shareUrl: string): void => {
    const message = `${activeListTitle}: ${shareUrl}`;
    const encodedMessage = encodeURIComponent(message);
    const isiOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    const smsUrl = isiOS ? `sms:&body=${encodedMessage}` : `sms:?body=${encodedMessage}`;
    window.location.href = smsUrl;
  };

  const onShareList = async (): Promise<void> => {
    const shareUrl = window.location.href;
    const copied = await copyToClipboard(shareUrl);
    setShareStatusWithTimeout(copied ? "Link copied. Opening SMS…" : "Opening SMS…");
    openSmsComposer(shareUrl);
  };

  const closeActionMenu = useCallback((): void => {
    setShowActionMenu(false);
  }, []);

  const onSelectMenuAction = (action: () => void): void => {
    closeActionMenu();
    action();
  };

  useEffect(() => {
    return () => {
      clearShareStatusTimer();
    };
  }, []);

  useEffect(() => {
    if (!showActionMenu) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeActionMenu();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeActionMenu, showActionMenu]);

  return (
    <main className="screen list-screen">
      <TopBar
        title={`${itemsLeft} left`}
        leftContent={
          <div className="top-left-actions">
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                resetForNewList();
                navigate(ROUTES.landing);
              }}
            >
              New
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={() => addPhotoInputRef.current?.click()}
              disabled={isAddingPhoto}
            >
              {isAddingPhoto ? "Adding…" : "Add"}
            </button>
          </div>
        }
        rightContent={
          <button
            type="button"
            className="header-icon-btn header-menu-trigger"
            aria-label={showActionMenu ? "Close list actions" : "Open list actions"}
            aria-haspopup="dialog"
            aria-expanded={showActionMenu}
            onClick={() => setShowActionMenu((open) => !open)}
          >
            <MenuIcon />
          </button>
        }
      />
      {showActionMenu ? (
        <div className="top-actions-overlay" role="dialog" aria-modal="true" aria-label="List actions">
          <button type="button" className="top-actions-backdrop" aria-label="Close list actions" onClick={closeActionMenu} />
          <section className="top-actions-panel" onClick={(event) => event.stopPropagation()}>
            <header className="top-actions-header">
              <h2>Actions</h2>
              <button type="button" className="link-btn top-actions-close" onClick={closeActionMenu}>
                Close
              </button>
            </header>
            <div className="top-actions-list">
              <button
                type="button"
                className="top-actions-btn"
                onClick={() => {
                  onSelectMenuAction(() => {
                    void onShareList();
                  });
                }}
              >
                <ShareIcon />
                <span>Share</span>
              </button>
              <button
                type="button"
                className="top-actions-btn"
                disabled={!sourceImageUrl}
                onClick={() => onSelectMenuAction(() => setShowImageSheet(true))}
              >
                <ImageIcon />
                <span>Show Picture</span>
              </button>
              <button type="button" className="top-actions-btn" onClick={() => onSelectMenuAction(() => navigate(ROUTES.review))}>
                <EditIcon />
                <span>Edit list</span>
              </button>
              <button type="button" className="top-actions-btn" onClick={() => onSelectMenuAction(() => setShowTextSize(true))}>
                <span className="top-actions-aa">Aa</span>
                <span>Text size</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
      <header className="list-title-block">
        <h1 className="list-title">{activeListTitle}</h1>
        {lastRemovedItem ? (
          <p className="shake-undo-hint">Shake phone to undo last swipe delete.</p>
        ) : null}
        {isAddingPhoto ? (
          <div className="inline-add-progress" role="status" aria-label="Adding items from photo">
            <span className="inline-add-progress-fill" />
          </div>
        ) : null}
        {addPhotoError ? <p className="error-text">{addPhotoError}</p> : null}
        {shareStatus ? <p className="share-status">{shareStatus}</p> : null}
      </header>

      <section className="sections-wrap">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            onToggleItem={toggleItem}
            onDismissSuggestedItem={dismissSuggestedItem}
            onRemoveItem={onSwipeRemove}
            suggestionCount={suggestionsBySection.get(section.id)?.length ?? 0}
            onSuggestMore={() => onSuggestMore(section.id)}
          />
        ))}
      </section>

      {showModelDebugPanel ? (
        <section className="model-debug-panel">
          <h2 className="model-debug-title">Debug: model output</h2>
          {debugComparison ? (
            <p className="model-debug-meta">
              Model items: {debugComparison.modelItemCount} | Checklist items: {debugComparison.checklistItemCount}
              {debugComparison.parseError
                ? ` | Parse error: ${debugComparison.parseError}`
                : debugComparison.missingInChecklist.length
                  ? ` | Missing after mapping: ${debugComparison.missingInChecklist.join(", ")}`
                  : " | Missing after mapping: none"}
            </p>
          ) : null}
          <pre className="model-debug-pre">{magicDebugOutput ?? "No model output captured yet."}</pre>
        </section>
      ) : null}

      <TextSizeControl open={showTextSize} onClose={() => setShowTextSize(false)} />
      <BottomSheet open={showImageSheet} title="Original List Photo" onClose={() => setShowImageSheet(false)}>
        {sourceImageUrl ? (
          <div className="source-image-wrap">
            <img
              src={sourceImageUrl}
              alt="Original uploaded shopping list"
              className="source-image"
              loading="lazy"
            />
          </div>
        ) : (
          <p className="hint-text">No uploaded image is available for this list.</p>
        )}
      </BottomSheet>
      <input
        ref={addPhotoInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onAddPhotoInputChange}
      />
    </main>
  );
};
