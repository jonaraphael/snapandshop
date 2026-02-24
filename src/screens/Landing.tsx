import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import type { RecentList } from "../app/types";
import { useAppStore } from "../app/store";
import { BrandLogo } from "../components/BrandLogo";
import { PrimaryButton } from "../components/PrimaryButton";
import { logDebug } from "../lib/debug/logger";

const RECENT_SWIPE_TRIGGER_PX = 86;
const RECENT_SWIPE_MAX_PX = 126;
const RECENT_SWIPE_LOCK_PX = 10;

interface RecentListRowProps {
  recent: RecentList;
  gradient: string;
  dateLabel: string;
  onOpen: () => void;
  onDelete: () => void;
}

const RecentListRow = ({
  recent,
  gradient,
  dateLabel,
  onOpen,
  onDelete
}: RecentListRowProps): JSX.Element => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const swipeLockedRef = useRef(false);

  const setDrag = (value: number): void => {
    dragXRef.current = value;
    setDragX(value);
  };

  const clearGesture = (): void => {
    pointerIdRef.current = null;
    startXRef.current = null;
    startYRef.current = null;
    setIsDragging(false);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === "mouse") {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    swipeLockedRef.current = false;
    setIsDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional.
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }
    const startX = startXRef.current;
    const startY = startYRef.current;
    if (startX === null || startY === null) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaY) > RECENT_SWIPE_LOCK_PX && Math.abs(deltaY) > Math.abs(deltaX)) {
      clearGesture();
      setDrag(0);
      return;
    }

    if (deltaX >= 0) {
      setDrag(0);
      return;
    }

    const next = Math.max(-RECENT_SWIPE_MAX_PX, deltaX);
    if (Math.abs(next) > RECENT_SWIPE_LOCK_PX) {
      swipeLockedRef.current = true;
    }
    setDrag(next);
  };

  const finalizeSwipe = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release failures.
    }

    const shouldRemove = dragXRef.current <= -RECENT_SWIPE_TRIGGER_PX;
    clearGesture();

    if (!shouldRemove) {
      setDrag(0);
      return;
    }

    setIsRemoving(true);
    setDrag(-RECENT_SWIPE_MAX_PX);
    window.setTimeout(() => {
      onDelete();
      setIsRemoving(false);
      setDrag(0);
      swipeLockedRef.current = false;
    }, 120);
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }
    clearGesture();
    setDrag(0);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (!swipeLockedRef.current) {
      return;
    }
    swipeLockedRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const rowStyle = {
    "--recent-gradient": gradient,
    transform: `translateX(${dragX}px)`
  } as CSSProperties;
  const gestureActive = isDragging || isRemoving;

  return (
    <div
      className={`recent-row-shell ${gestureActive ? "gesture-active" : ""} ${isRemoving ? "removing" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finalizeSwipe}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
    >
      <div className="recent-row-delete-bg" aria-hidden>
        <span className="recent-row-delete-label">Delete</span>
      </div>
      <button type="button" className={`recent-list-btn ${isDragging ? "dragging" : ""}`} style={rowStyle} onClick={onOpen}>
        <span className="recent-list-name">{recent.listTitle?.trim() || "Shopping list"}</span>
        <span className="recent-list-date">{dateLabel}</span>
        <span className="recent-list-preview">
          {recent.preview.length ? recent.preview.join(" • ") : "Saved list"}
        </span>
        <span className="recent-list-meta">{recent.itemCount} items</span>
      </button>
    </div>
  );
};

export const Landing = (): JSX.Element => {
  const navigate = useNavigate();
  const setImageInput = useAppStore((state) => state.setImageInput);
  const recentLists = useAppStore((state) => state.recentLists);
  const loadRecentList = useAppStore((state) => state.loadRecentList);
  const removeRecentList = useAppStore((state) => state.removeRecentList);
  const ensureSession = useAppStore((state) => state.ensureSession);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const pickerTimerRef = useRef<number | null>(null);
  const pickerSourceRef = useRef<"camera" | "gallery" | null>(null);
  const dragDepthRef = useRef(0);

  const clearPickerTimer = (): void => {
    if (pickerTimerRef.current !== null) {
      window.clearTimeout(pickerTimerRef.current);
      pickerTimerRef.current = null;
    }
  };

  const armPickerTimeout = (source: "camera" | "gallery"): void => {
    clearPickerTimer();
    pickerSourceRef.current = source;
    pickerTimerRef.current = window.setTimeout(() => {
      logDebug("picker_closed_no_change", {
        source,
        note: "No input change event after picker interaction"
      });
      pickerTimerRef.current = null;
    }, 3000);
  };

  const openPicker = (source: "camera" | "gallery"): void => {
    const targetInput = source === "camera" ? cameraInputRef.current : fileInputRef.current;
    if (!targetInput) {
      logDebug("picker_ref_missing", { source });
      return;
    }

    targetInput.value = "";
    armPickerTimeout(source);
    targetInput.click();
    logDebug("picker_open_requested", { source });
  };

  const onSelectFile = async (file: File | null, source: "camera" | "gallery"): Promise<void> => {
    clearPickerTimer();
    if (!file) {
      logDebug("file_selected_empty", { source });
      return;
    }

    logDebug("file_selected", {
      source,
      name: file.name,
      type: file.type,
      size: file.size
    });

    try {
      const session = ensureSession();
      logDebug("session_ready", { sessionId: session.id });
      const preview = URL.createObjectURL(file);
      setImageInput(file, preview);
      logDebug("navigate_processing", { source });
      navigate(ROUTES.processing);
    } catch (error) {
      logDebug("landing_select_error", {
        source,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  };

  const isFileDrag = (event: DragEvent<HTMLElement>): boolean => {
    return Array.from(event.dataTransfer?.types ?? []).includes("Files");
  };

  const onDragEnter = (event: DragEvent<HTMLElement>): void => {
    if (!isFileDrag(event)) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  };

  const onDragOver = (event: DragEvent<HTMLElement>): void => {
    if (!isFileDrag(event)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const onDragLeave = (event: DragEvent<HTMLElement>): void => {
    if (!isFileDrag(event)) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  };

  const onDropFile = (event: DragEvent<HTMLElement>): void => {
    if (!isFileDrag(event)) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (!file) {
      logDebug("drop_file_empty");
      return;
    }
    if (file.type && !file.type.startsWith("image/")) {
      logDebug("drop_file_rejected_non_image", {
        name: file.name,
        type: file.type
      });
      return;
    }

    pickerSourceRef.current = null;
    logDebug("drop_file_selected", {
      name: file.name,
      type: file.type,
      size: file.size
    });
    void onSelectFile(file, "gallery");
  };

  useEffect(() => {
    const onFocus = (): void => {
      if (pickerSourceRef.current) {
        logDebug("window_focus_after_picker", { source: pickerSourceRef.current });
      }
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearPickerTimer();
    };
  }, []);

  const formatRecentDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  };

  const gradientForId = (id: string): string => {
    const gradients = [
      "linear-gradient(135deg, #5aa0de 0%, #e6f2fd 100%)",
      "linear-gradient(135deg, #2d79c6 0%, #d8e9fb 100%)",
      "linear-gradient(135deg, #89b8e4 0%, #edf5fe 100%)",
      "linear-gradient(135deg, #3d6f9f 0%, #dceaf9 100%)",
      "linear-gradient(135deg, #659eca 0%, #e7f1fb 100%)"
    ];
    let hash = 0;
    for (const char of id) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    return gradients[hash % gradients.length];
  };

  return (
    <main
      className="screen landing-screen"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDropFile}
    >
      <section className={`hero-card${dragActive ? " drag-active" : ""}`}>
        <div className="landing-brand">
          <BrandLogo size={66} className="landing-brand-logo" decorative />
          <h1 className="hero-title">Snap&Shop</h1>
        </div>
        <p className="hero-subtitle">Take a picture of a recipe or your handwritten shopping list, and get a sorted grocery list instantly.</p>
        <div className="cta-stack">
          <PrimaryButton
            label={
              <span className="cta-content">
                <span className="cta-emoji">📷</span>
                <span className="cta-text">Take photo</span>
              </span>
            }
            ariaLabel="Take a photo"
            variant="secondary"
            onClick={() => {
              logDebug("tap_take_photo");
              openPicker("camera");
            }}
            testId="take-photo"
          />
          <PrimaryButton
            label={
              <span className="cta-content">
                <span className="cta-emoji">🖼️</span>
                <span className="cta-text">Choose photo</span>
              </span>
            }
            ariaLabel="Choose a photo"
            variant="secondary"
            onClick={() => {
              logDebug("tap_choose_photo");
              openPicker("gallery");
            }}
            testId="choose-photo"
          />
          <PrimaryButton
            label={
              <span className="cta-content">
                <span className="cta-emoji">✏️</span>
                <span className="cta-text">Type list</span>
              </span>
            }
            ariaLabel="Type your list"
            variant="secondary"
            onClick={() => {
              logDebug("tap_type_list");
              navigate(ROUTES.review);
            }}
            testId="type-list"
          />
        </div>

        {recentLists.length ? (
          <section className="recent-lists" aria-label="Recent lists">
            <h2 className="recent-title">Recent lists</h2>
            <div className="recent-list-grid">
              {recentLists.map((recent) => (
                <RecentListRow
                  key={recent.id}
                  recent={recent}
                  gradient={gradientForId(recent.id)}
                  dateLabel={formatRecentDate(recent.savedAt)}
                  onOpen={() => {
                    if (loadRecentList(recent.id)) {
                      navigate(ROUTES.list);
                    }
                  }}
                  onDelete={() => {
                    removeRecentList(recent.id);
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          logDebug("camera_input_change", { hasFile: Boolean(file) });
          void onSelectFile(file, "camera");
          pickerSourceRef.current = null;
          event.currentTarget.value = "";
        }}
        onClick={() => {
          logDebug("camera_input_click");
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          logDebug("gallery_input_change", { hasFile: Boolean(file) });
          void onSelectFile(file, "gallery");
          pickerSourceRef.current = null;
          event.currentTarget.value = "";
        }}
        onClick={() => {
          logDebug("gallery_input_click");
        }}
      />
    </main>
  );
};
