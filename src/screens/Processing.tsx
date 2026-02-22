import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useAppStore } from "../app/store";
import { logDebug } from "../lib/debug/logger";
import { mapMagicModeItems, requestMagicModeParse } from "../lib/ocr/magicMode";
import { buildOrderedItems } from "../lib/order/itemOrder";

export const Processing = (): JSX.Element => {
  const navigate = useNavigate();
  const imageFile = useAppStore((state) => state.imageFile);
  const prefs = useAppStore((state) => state.prefs);
  const setPipeline = useAppStore((state) => state.setPipeline);
  const setExtractionResult = useAppStore((state) => state.setExtractionResult);
  const replaceItems = useAppStore((state) => state.replaceItems);
  const controllerRef = useRef<AbortController | null>(null);

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
    if (!prefs.byoOpenAiKey?.trim()) {
      setPipeline({
        status: "error",
        progress: 0,
        label: "API key required",
        error: "OpenAI API key is required to process photos."
      });
      return;
    }

    let cancelled = false;

    const run = async (): Promise<void> => {
      try {
        controllerRef.current = new AbortController();
        setPipeline({
          status: "ocr",
          progress: 0.12,
          label: "AI handwriting model",
          error: null
        });

        logDebug("processing_frontier_start", {
          hasByoOpenAiKey: true
        });

        const frontier = await requestMagicModeParse({
          imageBlob: imageFile,
          byoOpenAiKey: prefs.byoOpenAiKey,
          model: import.meta.env.VITE_OPENAI_MODEL ?? "gpt-5.2",
          signal: controllerRef.current.signal
        });

        if (cancelled) {
          logDebug("processing_cancelled_before_frontier_commit");
          return;
        }

        const mapped = mapMagicModeItems(frontier.items);
        if (!mapped.length) {
          throw new Error("AI parser returned zero items.");
        }

        const ordered = buildOrderedItems(mapped);

        setExtractionResult({
          rawText: mapped.map((item) => item.rawText).join("\n"),
          ocrMeta: null,
          ocrConfidence: 0.95,
          imageHash: null,
          thumbnailDataUrl: null,
          listTitle: frontier.list_title,
          usedMagicMode: true
        });
        replaceItems(ordered, frontier.list_title);
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
  }, [imageFile, navigate, prefs.byoOpenAiKey, replaceItems, setExtractionResult, setPipeline]);

  const pipeline = useAppStore((state) => state.pipeline);

  return (
    <main className="screen processing-screen">
      <h1 className="screen-title">Reading your list…</h1>
      <p className="processing-label">{pipeline.label}</p>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pipeline.progress * 100)}
      >
        <div className="progress-value" style={{ width: `${pipeline.progress * 100}%` }} />
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
