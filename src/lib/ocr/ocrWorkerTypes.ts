import type { OcrMeta } from "../../app/types";

export interface OcrWorkerRunMessage {
  type: "run";
  imageBlob: Blob;
}

export interface OcrWorkerCancelMessage {
  type: "cancel";
}

export type OcrWorkerInput = OcrWorkerRunMessage | OcrWorkerCancelMessage;

export interface OcrWorkerProgress {
  type: "progress";
  progress: number;
  label: string;
}

export interface OcrWorkerDone {
  type: "done";
  rawText: string;
  lineCandidates: string[];
  ocrMeta: OcrMeta;
}

export interface OcrWorkerError {
  type: "error";
  message: string;
}

export type OcrWorkerOutput = OcrWorkerProgress | OcrWorkerDone | OcrWorkerError;
