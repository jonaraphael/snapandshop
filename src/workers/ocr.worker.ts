/// <reference lib="webworker" />

import type { OcrWorkerInput, OcrWorkerOutput } from "../lib/ocr/ocrWorkerTypes";
import Tesseract from "tesseract.js";

let cancelled = false;

const hasMostlyGarbage = (line: string): boolean => {
  if (!line.trim()) {
    return false;
  }

  const nonAlnum = line.replace(/[a-z0-9\s]/gi, "").length;
  return nonAlnum / line.length > 0.5;
};

const post = (payload: OcrWorkerOutput): void => {
  self.postMessage(payload);
};

self.onmessage = async (event: MessageEvent<OcrWorkerInput>) => {
  if (event.data.type === "cancel") {
    cancelled = true;
    return;
  }

  cancelled = false;
  const start = performance.now();

  try {
    const result = await Tesseract.recognize(event.data.imageBlob, "eng", {
      logger: (message) => {
        if (cancelled) {
          return;
        }

        const progress = typeof message.progress === "number" ? message.progress : 0;
        post({
          type: "progress",
          progress,
          label: message.status || "Reading text"
        });
      }
    });

    if (cancelled) {
      return;
    }

    const rawText = result.data.text || "";
    const lineCandidates = (result.data.lines ?? [])
      .map((line) => line.text.trim())
      .filter(Boolean);

    const lineCount = lineCandidates.length;
    const garbageLines = lineCandidates.filter((line) => hasMostlyGarbage(line)).length;
    const garbageLineRatio = lineCount ? garbageLines / lineCount : 0;

    post({
      type: "done",
      rawText,
      lineCandidates,
      ocrMeta: {
        meanConfidence: (result.data.confidence ?? 0) / 100,
        wordCount: result.data.words?.length ?? 0,
        lineCount,
        garbageLineRatio,
        timeMs: Math.round(performance.now() - start)
      }
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `${error.message}${error.stack ? `\n${error.stack}` : ""}`
        : "OCR worker failed";
    post({ type: "error", message });
  }
};
