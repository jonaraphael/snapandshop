import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useAppStore } from "../app/store";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextSizeControl } from "../components/TextSizeControl";
import { clearDebugLog, getDebugText, logDebug } from "../lib/debug/logger";

export const Landing = (): JSX.Element => {
  const navigate = useNavigate();
  const setImageInput = useAppStore((state) => state.setImageInput);
  const ensureSession = useAppStore((state) => state.ensureSession);
  const prefs = useAppStore((state) => state.prefs);
  const setPrefs = useAppStore((state) => state.setPrefs);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showTextSize, setShowTextSize] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugText, setDebugText] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const pickerTimerRef = useRef<number | null>(null);
  const pickerSourceRef = useRef<"camera" | "gallery" | null>(null);

  const refreshDebug = (): void => {
    setDebugText(getDebugText());
  };

  const clearPickerTimer = (): void => {
    if (pickerTimerRef.current !== null) {
      window.clearTimeout(pickerTimerRef.current);
      pickerTimerRef.current = null;
    }
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

  const onToggleDebug = (): void => {
    const next = !showDebug;
    setShowDebug(next);
    if (next) {
      refreshDebug();
    }
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

  const onCopyDebug = async (): Promise<void> => {
    const content = getDebugText();
    setDebugText(content);

    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus("Copied");
      logDebug("debug_copied");
    } catch (error) {
      setCopyStatus("Copy failed");
      logDebug("debug_copy_failed", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const onResetCache = async (): Promise<void> => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      logDebug("debug_reset_cache_complete");
      refreshDebug();
      setCopyStatus("Cache reset done. Reload page.");
    } catch (error) {
      logDebug("debug_reset_cache_failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      setCopyStatus("Cache reset failed");
    }
  };

  const onSetAiKey = (): void => {
    const nextValue = window.prompt(
      "Paste OpenAI API key (sk-...). Leave blank to clear. This stays only on this device.",
      prefs.byoOpenAiKey ?? ""
    );
    if (nextValue === null) {
      return;
    }

    const trimmed = nextValue.trim();
    setPrefs({
      byoOpenAiKey: trimmed || null,
      magicModeDefault: true
    });

    logDebug("byo_key_updated", {
      hasKey: Boolean(trimmed),
      length: trimmed.length
    });
  };

  return (
    <main className="screen landing-screen">
      <section className="hero-card">
        <h1 className="hero-title">ChoppingList.store</h1>
        <p className="hero-subtitle">Snap your list. Shop faster.</p>
        <div className="cta-stack">
          <PrimaryButton
            label="Take a photo"
            onClick={() => {
              logDebug("tap_take_photo");
              openPicker("camera");
            }}
            testId="take-photo"
          />
          <PrimaryButton
            label="Choose a photo"
            variant="secondary"
            onClick={() => {
              logDebug("tap_choose_photo");
              openPicker("gallery");
            }}
            testId="choose-photo"
          />
        </div>

        <div className="links-row">
          <button type="button" className="link-btn" onClick={() => navigate(ROUTES.review)}>
            Type it instead
          </button>
          <button type="button" className="link-btn" onClick={() => setShowTextSize(true)}>
            Text size
          </button>
          <button type="button" className="link-btn" onClick={onSetAiKey}>
            AI Key
          </button>
          <button type="button" className="link-btn" onClick={() => setShowPrivacy((value) => !value)}>
            Privacy
          </button>
          <button type="button" className="link-btn" onClick={onToggleDebug}>
            Debug
          </button>
        </div>

        {showPrivacy ? (
          <p className="hint-text">
            Frontier handwriting parsing runs first by default. Images are sent to OpenAI using your BYO key or your
            configured proxy endpoint. If frontier is unavailable, local OCR fallback runs on-device.
          </p>
        ) : null}

        <p className="hint-text">
          AI mode: {prefs.magicModeDefault ? "On" : "Off"} | BYO key: {prefs.byoOpenAiKey ? "Configured" : "Not set"}
        </p>

        {showDebug ? (
          <section className="debug-card" aria-label="Debug log">
            <p className="hint-text">Reproduce the issue, tap Refresh, then tap Copy and paste here.</p>
            <div className="debug-actions">
              <button type="button" className="ghost-btn" onClick={refreshDebug}>
                Refresh
              </button>
              <button type="button" className="ghost-btn" onClick={() => void onCopyDebug()}>
                Copy
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  clearDebugLog();
                  refreshDebug();
                  logDebug("debug_cleared");
                }}
              >
                Clear
              </button>
              <button type="button" className="ghost-btn" onClick={() => void onResetCache()}>
                Reset Cache
              </button>
            </div>
            {copyStatus ? <p className="hint-text">{copyStatus}</p> : null}
            <textarea className="debug-textarea" readOnly value={debugText} rows={10} />
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
      <TextSizeControl open={showTextSize} onClose={() => setShowTextSize(false)} />
    </main>
  );
};
