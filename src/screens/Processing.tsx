import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useAppStore } from "../app/store";
import { logDebug } from "../lib/debug/logger";
import { resolveApiKeyForMagicCall } from "../lib/ocr/apiKeyPolicy";
import {
  finalizeListTitleForItems,
  mapMagicModeItems,
  requestMagicModeParse
} from "../lib/ocr/magicMode";
import { buildOrderedItems } from "../lib/order/itemOrder";

const FUNNY_LOADING_MESSAGES = [
  "Warming up the grocery radar...",
  "Translating recipe dreams into aisle reality...",
  "Finding the shortest path past the bananas...",
  "Converting kitchen inspiration into checklist form...",
  "Politely asking the dairy wall to stand by...",
  "Building your cart strategy...",
  "Organizing ingredients by store geography...",
  "Matching pantry goals to real aisles...",
  "Getting your list ready for a smooth lap...",
  "Turning notes into a shopping game plan...",
  "Cueing up the produce section first...",
  "Dialing in the snack-to-necessity ratio...",
  "Stacking items in store-friendly order...",
  "Untangling recipe steps into shopping steps...",
  "Putting every item in its best section...",
  "Optimizing your future cart route...",
  "Giving your list a little aisle magic...",
  "Syncing bread, produce, and frozen diplomacy...",
  "Preparing a no-backtracking mission...",
  "Lining things up for efficient grabbing...",
  "Converting scribbles into a clean checklist...",
  "Setting up your one-pass store run...",
  "Sorting now so shopping later is easy...",
  "Arranging essentials for maximum momentum...",
  "Turning your picture into cart-ready clarity...",
  "Polishing the list for a faster trip...",
  "Coaching your list into store order...",
  "Drafting the ultimate aisle itinerary...",
  "Mapping item locations for fewer detours...",
  "Packing your list with strategic elegance..."
];

const pickRandomMessageIndex = (currentIndex: number): number => {
  if (FUNNY_LOADING_MESSAGES.length <= 1) {
    return 0;
  }

  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * FUNNY_LOADING_MESSAGES.length);
  }
  return nextIndex;
};

export const Processing = (): JSX.Element => {
  const navigate = useNavigate();
  const imageFile = useAppStore((state) => state.imageFile);
  const prefs = useAppStore((state) => state.prefs);
  const setPrefs = useAppStore((state) => state.setPrefs);
  const setPipeline = useAppStore((state) => state.setPipeline);
  const setMagicDebugOutput = useAppStore((state) => state.setMagicDebugOutput);
  const setExtractionResult = useAppStore((state) => state.setExtractionResult);
  const replaceItems = useAppStore((state) => state.replaceItems);
  const controllerRef = useRef<AbortController | null>(null);
  const [funnyIndex, setFunnyIndex] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    logDebug("processing_effect_start", {
      hasImageFile: Boolean(imageFile),
      imageName: imageFile?.name ?? null,
      imageType: imageFile?.type ?? null,
      imageSize: imageFile?.size ?? null,
      hasByoOpenAiKey: Boolean(prefs.byoOpenAiKey)
    });

    if (!imageFile) {
      logDebug("processing_no_image_redirect_landing");
      navigate(ROUTES.landing, { replace: true });
      return;
    }
    let cancelled = false;

    const run = async (): Promise<void> => {
      try {
        const apiKey = resolveApiKeyForMagicCall({
          currentKey: prefs.byoOpenAiKey,
          onPersistUserKey: (key) =>
            setPrefs({
              byoOpenAiKey: key,
              magicModeDefault: true
            })
        });

        controllerRef.current = new AbortController();
        setPipeline({
          status: "ocr",
          progress: 0.12,
          label: "Reading your list",
          error: null
        });

        logDebug("processing_frontier_start", {
          hasByoOpenAiKey: true
        });

        const frontier = await requestMagicModeParse({
          imageBlob: imageFile,
          byoOpenAiKey: apiKey,
          model: import.meta.env.VITE_OPENAI_MODEL ?? "gpt-5.2",
          signal: controllerRef.current.signal
        });
        setMagicDebugOutput(frontier.debug_raw_output ?? null);

        if (cancelled) {
          logDebug("processing_cancelled_before_frontier_commit");
          return;
        }

        const mapped = mapMagicModeItems(frontier.items);
        if (!mapped.length) {
          throw new Error("AI parser returned zero items.");
        }

        const ordered = buildOrderedItems(mapped);
        const resolvedListTitle = finalizeListTitleForItems(
          frontier.list_title,
          ordered.map((item) => item.canonicalName)
        );

        setExtractionResult({
          rawText: mapped.map((item) => item.rawText).join("\n"),
          ocrMeta: null,
          ocrConfidence: 0.95,
          imageHash: null,
          thumbnailDataUrl: null,
          listTitle: resolvedListTitle,
          usedMagicMode: true
        });
        replaceItems(ordered, resolvedListTitle);
        setPipeline({ status: "review_ready", progress: 1, label: "Ready", error: null });

        logDebug("processing_frontier_success", {
          itemCount: ordered.length,
          warningCount: frontier.warnings.length,
          warningPreview: frontier.warnings.slice(0, 3)
        });

        navigate(ROUTES.list, { replace: true });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          logDebug("processing_aborted");
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to process image";
        logDebug("processing_failed", {
          message,
          stack: error instanceof Error ? error.stack : undefined
        });
        setPipeline({ status: "error", progress: 0, label: "Error", error: message });
      }
    };

    void run();

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
      logDebug("processing_effect_cleanup");
    };
  }, [imageFile, navigate, prefs.byoOpenAiKey, replaceItems, setExtractionResult, setMagicDebugOutput, setPipeline, setPrefs]);

  const pipeline = useAppStore((state) => state.pipeline);
  const isLoading = !pipeline.error && pipeline.status !== "review_ready" && pipeline.status !== "error";

  useEffect(() => {
    setDisplayProgress((current) => Math.max(current, pipeline.progress));
  }, [pipeline.progress]);

  useEffect(() => {
    if (!isLoading) {
      setDisplayProgress(pipeline.progress);
      return;
    }

    const timer = window.setInterval(() => {
      setDisplayProgress((current) => {
        const base = Math.max(current, pipeline.progress, 0.14);
        const next = base + (0.92 - base) * 0.06;
        return Math.min(0.92, next);
      });
    }, 170);

    return () => window.clearInterval(timer);
  }, [isLoading, pipeline.progress]);

  useEffect(() => {
    if (!isLoading) {
      setFunnyIndex(0);
      return;
    }

    setFunnyIndex(() => Math.floor(Math.random() * FUNNY_LOADING_MESSAGES.length));
    const timer = window.setInterval(() => {
      setFunnyIndex((index) => pickRandomMessageIndex(index));
    }, 2900);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  const progress = isLoading ? Math.max(displayProgress, pipeline.progress) : pipeline.progress;
  const progressPercent = Math.round(Math.min(100, Math.max(0, progress * 100)));
  const progressWidth = `${Math.max(progressPercent, isLoading ? 18 : 0)}%`;

  return (
    <main className="screen processing-screen">
      <h1 className="screen-title">Reading your list…</h1>
      {isLoading ? <p className="processing-funny">{FUNNY_LOADING_MESSAGES[funnyIndex]}</p> : null}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
      >
        <div className={`progress-value ${isLoading ? "loading" : ""}`} style={{ width: progressWidth }} />
      </div>
      {pipeline.error ? <p className="error-text">{pipeline.error}</p> : null}
      {pipeline.error ? (
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            logDebug("processing_back_to_landing_after_error");
            navigate(ROUTES.landing);
          }}
        >
          Back
        </button>
      ) : (
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            controllerRef.current?.abort();
            logDebug("processing_cancel_clicked");
            navigate(ROUTES.landing);
          }}
        >
          Cancel
        </button>
      )}
    </main>
  );
};
