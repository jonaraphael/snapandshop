import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useAppStore } from "../app/store";
import { PrimaryButton } from "../components/PrimaryButton";
import { logDebug } from "../lib/debug/logger";

export const Landing = (): JSX.Element => {
  const navigate = useNavigate();
  const setImageInput = useAppStore((state) => state.setImageInput);
  const recentLists = useAppStore((state) => state.recentLists);
  const loadRecentList = useAppStore((state) => state.loadRecentList);
  const ensureSession = useAppStore((state) => state.ensureSession);
  const prefs = useAppStore((state) => state.prefs);
  const setPrefs = useAppStore((state) => state.setPrefs);
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

  const ensureApiKeyForImageParse = (): boolean => {
    const existingKey = prefs.byoOpenAiKey?.trim() ?? "";
    if (existingKey) {
      return true;
    }

    const prompted = window.prompt(
      "Paste your OpenAI API key (sk-...). It is saved only in this browser, never uploaded by us, and not used for any purpose other than reading this image."
    );

    if (prompted === null) {
      logDebug("byo_key_prompt_cancelled");
      return false;
    }

    const trimmed = prompted.trim();
    if (!trimmed) {
      logDebug("byo_key_prompt_empty");
      return false;
    }

    setPrefs({
      byoOpenAiKey: trimmed,
      magicModeDefault: true
    });
    logDebug("byo_key_prompt_saved", {
      length: trimmed.length
    });
    return true;
  };

  const onSelectFile = async (file: File | null, source: "camera" | "gallery"): Promise<void> => {
    clearPickerTimer();
    if (!file) {
      logDebug("file_selected_empty", { source });
      return;
    }

    if (!ensureApiKeyForImageParse()) {
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
      "linear-gradient(135deg, #f0b37e 0%, #f6e6d0 100%)",
      "linear-gradient(135deg, #8ac9a5 0%, #d7efe2 100%)",
      "linear-gradient(135deg, #7fb7df 0%, #dcecf8 100%)",
      "linear-gradient(135deg, #d79bd8 0%, #f3e2f3 100%)",
      "linear-gradient(135deg, #a8b67a 0%, #e7edd4 100%)"
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
        <h1 className="hero-title">ChoppingList.store</h1>
        <p className="hero-subtitle">Snap your list. Shop faster.</p>
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
                <button
                  key={recent.id}
                  type="button"
                  className="recent-list-btn"
                  style={{ "--recent-gradient": gradientForId(recent.id) } as CSSProperties}
                  onClick={() => {
                    if (loadRecentList(recent.id)) {
                      navigate(ROUTES.list);
                    }
                  }}
                >
                  <span className="recent-list-name">{recent.listTitle?.trim() || "Shopping list"}</span>
                  <span className="recent-list-date">{formatRecentDate(recent.savedAt)}</span>
                  <span className="recent-list-preview">
                    {recent.preview.length ? recent.preview.join(" • ") : "Saved list"}
                  </span>
                  <span className="recent-list-meta">{recent.itemCount} items</span>
                </button>
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
