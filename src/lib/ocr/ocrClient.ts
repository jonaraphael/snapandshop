import Tesseract from "tesseract.js";
import type { OcrMeta, PipelineState, ShoppingItem } from "../../app/types";
import { logDebug } from "../debug/logger";
import { createId } from "../id";
import { downscaleBitmap } from "../image/downscale";
import { normalizeOrientation } from "../image/exifOrientation";
import { bitmapToJpegBlob, blobToDataUrl, computeSha256, loadImageBitmap } from "../image/loadImage";
import { preprocessForOcr } from "../image/preprocess";
import { categorizeItemName } from "../categorize/categorize";
import { dedupeItems } from "../parse/dedupe";
import { parseRawLines } from "../parse/parseLines";
import { parseQuantityAndNotes } from "../parse/parseQuantity";
import type { OcrWorkerDone, OcrWorkerOutput, OcrWorkerProgress } from "./ocrWorkerTypes";

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const computeOcrConfidence = (meta: {
  wordCount: number;
  meanConfidence: number;
  lineCount: number;
  garbageLineRatio: number;
}): number => {
  let score = 0;
  if (meta.wordCount >= 8) {
    score += 0.3;
  }
  if (meta.meanConfidence >= 0.7) {
    score += 0.2;
  }
  if (meta.lineCount >= 5) {
    score += 0.2;
  }
  if (meta.garbageLineRatio > 0.4) {
    score -= 0.3;
  }
  return clamp(score, 0, 1);
};

const hasMostlyGarbage = (line: string): boolean => {
  if (!line.trim()) {
    return false;
  }

  const nonAlnum = line.replace(/[a-z0-9\s]/gi, "").length;
  return nonAlnum / line.length > 0.5;
};

const getMetaFromTesseract = (result: Tesseract.RecognizeResult): OcrMeta => {
  const lineCandidates = (result.data.lines ?? [])
    .map((line) => line.text.trim())
    .filter(Boolean);
  const lineCount = lineCandidates.length;
  const garbageLines = lineCandidates.filter((line) => hasMostlyGarbage(line)).length;

  return {
    meanConfidence: (result.data.confidence ?? 0) / 100,
    wordCount: result.data.words?.length ?? 0,
    lineCount,
    garbageLineRatio: lineCount ? garbageLines / lineCount : 0,
    timeMs: 0
  };
};

const rotateBitmap = async (bitmap: ImageBitmap, degrees: number): Promise<ImageBitmap> => {
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized === 0) {
    return bitmap;
  }

  const canvas = document.createElement("canvas");
  const swapAxes = normalized === 90 || normalized === 270;
  canvas.width = swapAxes ? bitmap.height : bitmap.width;
  canvas.height = swapAxes ? bitmap.width : bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable for rotation");
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalized * Math.PI) / 180);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

  return createImageBitmap(canvas);
};

const imageDataToJpegBlob = async (imageData: ImageData, quality = 0.9): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/jpeg", quality);
  });

  if (!blob) {
    throw new Error("Failed to create OCR blob from ImageData");
  }

  return blob;
};

const buildOcrBlobVariants = async (
  bitmap: ImageBitmap
): Promise<Array<{ variant: "preprocessed" | "raw"; blob: Blob }>> => {
  const preprocessed = preprocessForOcr(bitmap);
  const preprocessedBlob = await imageDataToJpegBlob(preprocessed, 0.92);
  const rawBlob = await bitmapToJpegBlob(bitmap, 0.9);

  return [
    { variant: "preprocessed", blob: preprocessedBlob },
    { variant: "raw", blob: rawBlob }
  ];
};

const runOcrWorker = async (
  imageBlob: Blob,
  onProgress: (patch: Partial<PipelineState>) => void,
  signal?: AbortSignal
): Promise<OcrWorkerDone> => {
  return await new Promise<OcrWorkerDone>((resolve, reject) => {
    const worker = new Worker(new URL("../../workers/ocr.worker.ts", import.meta.url), {
      type: "module"
    });

    const onAbort = (): void => {
      worker.terminate();
      reject(new DOMException("Processing cancelled", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    const onMessage = (event: MessageEvent<OcrWorkerOutput>): void => {
      const payload = event.data;
      if (payload.type === "progress") {
        const progressPayload = payload as OcrWorkerProgress;
        onProgress({
          status: "ocr",
          progress: 0.28 + progressPayload.progress * 0.36,
          label: "Reading text"
        });
        return;
      }

      if (payload.type === "error") {
        worker.removeEventListener("message", onMessage);
        worker.terminate();
        signal?.removeEventListener("abort", onAbort);
        reject(new Error(payload.message || "OCR worker failed"));
        return;
      }

      worker.removeEventListener("message", onMessage);
      worker.terminate();
      signal?.removeEventListener("abort", onAbort);
      resolve(payload);
    };

    worker.addEventListener("message", onMessage);
    worker.postMessage({ type: "run", imageBlob });
  });
};

const runOcrMainThread = async (
  imageBlob: Blob,
  onProgress: (patch: Partial<PipelineState>) => void
): Promise<OcrWorkerDone> => {
  const start = performance.now();
  const result = await Tesseract.recognize(imageBlob, "eng", {
    logger: (message) => {
      const progress = typeof message.progress === "number" ? message.progress : 0;
      onProgress({
        status: "ocr",
        progress: 0.28 + progress * 0.36,
        label: "Reading text"
      });
    }
  });

  const rawText = result.data.text ?? "";
  const lineCandidates = (result.data.lines ?? [])
    .map((line) => line.text.trim())
    .filter(Boolean);

  const meta = getMetaFromTesseract(result);

  return {
    type: "done",
    rawText,
    lineCandidates,
    ocrMeta: {
      ...meta,
      timeMs: Math.round(performance.now() - start)
    }
  };
};

const buildItems = (lines: string[]): ShoppingItem[] => {
  const items: ShoppingItem[] = [];

  for (const line of lines) {
    const parsed = parseQuantityAndNotes(line);
    if (!parsed.name) {
      continue;
    }

    const categorized = categorizeItemName(parsed.name);

    items.push({
      id: createId(),
      rawText: line,
      canonicalName: categorized.canonicalName,
      normalizedName: categorized.normalizedName,
      quantity: parsed.quantity,
      notes: parsed.notes,
      categoryId: categorized.categoryId,
      subcategoryId: categorized.subcategoryId,
      orderHint: categorized.orderHint,
      checked: false,
      confidence: categorized.confidence,
      source: "ocr",
      categoryOverridden: false,
      majorSectionId: null,
      majorSectionLabel: null,
      majorSubsection: null,
      majorSectionOrder: null,
      majorSectionItemOrder: null,
      suggested: false
    });
  }

  return dedupeItems(items);
};

const tryOcr = async (
  imageBlob: Blob,
  onProgress: (patch: Partial<PipelineState>) => void,
  signal?: AbortSignal
): Promise<OcrWorkerDone> => {
  try {
    logDebug("ocr_worker_try");
    return await runOcrWorker(imageBlob, onProgress, signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    logDebug("ocr_worker_failed_fallback_main_thread", {
      error: error instanceof Error ? error.message : String(error)
    });

    onProgress({
      status: "ocr",
      progress: 0.35,
      label: "OCR worker failed, retrying"
    });

    logDebug("ocr_main_thread_try");
    return await runOcrMainThread(imageBlob, onProgress);
  }
};

interface CandidateScore {
  knownItemCount: number;
  avgItemConfidence: number;
  alphaWordCount: number;
  garbageLineRatio: number;
  score: number;
}

const scoreCandidate = (input: {
  items: ShoppingItem[];
  lines: string[];
  rawText: string;
}): CandidateScore => {
  const knownItemCount = input.items.filter(
    (item) => item.categoryId !== "other" && item.confidence >= 0.6
  ).length;

  const avgItemConfidence =
    input.items.length > 0
      ? input.items.reduce((total, item) => total + item.confidence, 0) / input.items.length
      : 0;

  const alphaWordCount = (input.rawText.match(/[a-z]{3,}/gi) ?? []).length;
  const garbageLines = input.lines.filter((line) => hasMostlyGarbage(line)).length;
  const garbageLineRatio = input.lines.length ? garbageLines / input.lines.length : 0;

  const score =
    knownItemCount * 7 +
    avgItemConfidence * 3 +
    Math.min(alphaWordCount, 24) * 0.25 +
    Math.min(input.items.length, 20) * 0.15 -
    garbageLineRatio * 4;

  return {
    knownItemCount,
    avgItemConfidence,
    alphaWordCount,
    garbageLineRatio,
    score
  };
};

const isStrongCandidate = (candidate: CandidateScore): boolean => {
  if (candidate.knownItemCount >= 2) {
    return true;
  }

  if (candidate.knownItemCount >= 1 && candidate.avgItemConfidence >= 0.55) {
    return true;
  }

  return candidate.score >= 12;
};

const defaultOcrMeta: OcrMeta = {
  meanConfidence: 0,
  wordCount: 0,
  lineCount: 0,
  garbageLineRatio: 0,
  timeMs: 0
};

interface OcrCandidate {
  rawText: string;
  items: ShoppingItem[];
  ocrMeta: OcrMeta;
  ocrConfidence: number;
  quality: CandidateScore;
}

export interface ProcessResult {
  rawText: string;
  items: ShoppingItem[];
  ocrMeta: OcrMeta;
  ocrConfidence: number;
  imageHash: string;
  thumbnailDataUrl: string;
}

export const processImageToItems = async (
  file: File,
  onProgress: (patch: Partial<PipelineState>) => void,
  signal?: AbortSignal
): Promise<ProcessResult> => {
  logDebug("ocr_process_start", {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size
  });

  onProgress({ status: "preprocess", progress: 0.05, label: "Preparing image", error: null });

  const rawBitmap = await loadImageBitmap(file);
  const oriented = await normalizeOrientation(file, rawBitmap);
  const downscaled = await downscaleBitmap(oriented, 1600);
  logDebug("ocr_image_ready", {
    width: downscaled.width,
    height: downscaled.height
  });

  const thumbnailBitmap = await downscaleBitmap(oriented, 320);
  const thumbnailBlob = await bitmapToJpegBlob(thumbnailBitmap, 0.65);
  const thumbnailDataUrl = await blobToDataUrl(thumbnailBlob);

  const normalizedBlob = await bitmapToJpegBlob(downscaled, 0.8);
  const imageHash = await computeSha256(normalizedBlob);

  const rotations = [0, 90, 270, 180];
  let bestCandidate: OcrCandidate | null = null;
  let failureCount = 0;

  outer: for (let rotationIndex = 0; rotationIndex < rotations.length; rotationIndex += 1) {
    if (signal?.aborted) {
      throw new DOMException("Processing cancelled", "AbortError");
    }

    const degrees = rotations[rotationIndex];
    let candidateBitmap: ImageBitmap | null = null;

    try {
      candidateBitmap = await rotateBitmap(downscaled, degrees);
      const variants = await buildOcrBlobVariants(candidateBitmap);

      for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
        const variant = variants[variantIndex];

        try {
          logDebug("ocr_rotation_attempt", {
            attempt: rotationIndex + 1,
            degrees,
            variant: variant.variant
          });

          onProgress({
            status: "ocr",
            progress: 0.2 + (rotationIndex * variants.length + variantIndex) * 0.08,
            label:
              rotationIndex === 0 && variantIndex === 0
                ? "Reading text"
                : `Retrying ${degrees}\u00b0 (${variant.variant})`
          });

          const ocr = await tryOcr(variant.blob, onProgress, signal);

          onProgress({ status: "parse_lines", progress: 0.68, label: "Parsing lines", error: null });
          const lines = parseRawLines(ocr.rawText);

          onProgress({ status: "normalize", progress: 0.75, label: "Normalizing items", error: null });
          const items = buildItems(lines);
          const quality = scoreCandidate({ items, lines, rawText: ocr.rawText });

          const ocrConfidence = computeOcrConfidence(ocr.ocrMeta);
          const candidate: OcrCandidate = {
            rawText: ocr.rawText,
            items,
            ocrMeta: ocr.ocrMeta,
            ocrConfidence,
            quality
          };

          logDebug("ocr_rotation_result", {
            attempt: rotationIndex + 1,
            degrees,
            variant: variant.variant,
            rawTextLength: ocr.rawText.length,
            lineCount: lines.length,
            itemCount: items.length,
            knownItemCount: quality.knownItemCount,
            avgItemConfidence: quality.avgItemConfidence,
            score: quality.score,
            sampleItems: items.slice(0, 5).map((item) => item.canonicalName)
          });

          if (!bestCandidate || candidate.quality.score > bestCandidate.quality.score) {
            bestCandidate = candidate;
          }

          if (isStrongCandidate(quality)) {
            logDebug("ocr_rotation_strong_candidate", {
              attempt: rotationIndex + 1,
              degrees,
              variant: variant.variant,
              score: quality.score,
              knownItemCount: quality.knownItemCount
            });
            break outer;
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }

          failureCount += 1;
          logDebug("ocr_rotation_error", {
            attempt: rotationIndex + 1,
            degrees,
            variant: variant.variant,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } finally {
      if (candidateBitmap && candidateBitmap !== downscaled && typeof candidateBitmap.close === "function") {
        candidateBitmap.close();
      }
    }
  }

  if (!bestCandidate) {
    logDebug("ocr_all_attempts_failed", {
      failureCount,
      note: "Proceeding to review with empty extracted list"
    });

    bestCandidate = {
      rawText: "",
      items: [],
      ocrMeta: defaultOcrMeta,
      ocrConfidence: 0,
      quality: {
        knownItemCount: 0,
        avgItemConfidence: 0,
        alphaWordCount: 0,
        garbageLineRatio: 0,
        score: 0
      }
    };
  }

  onProgress({ status: "categorize", progress: 0.85, label: "Organizing aisles", error: null });
  onProgress({ status: "order", progress: 0.95, label: "Final touches", error: null });

  return {
    rawText: bestCandidate.rawText,
    items: bestCandidate.items,
    ocrMeta: bestCandidate.ocrMeta,
    ocrConfidence: bestCandidate.ocrConfidence,
    imageHash,
    thumbnailDataUrl
  };
};
