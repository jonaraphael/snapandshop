import { logDebug } from "../debug/logger";

export const loadImageBitmap = async (file: Blob): Promise<ImageBitmap> => {
  return createImageBitmap(file);
};

export const bitmapToJpegBlob = async (
  bitmap: ImageBitmap,
  quality = 0.8
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/jpeg", quality);
  });

  if (!blob) {
    throw new Error("Failed to create JPEG blob");
  }

  return blob;
};

export const blobToDataUrl = async (blob: Blob): Promise<string> => {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Data URL conversion failed"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(blob);
  });
};

const fallbackDigestHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    h1 ^= byte;
    h1 = Math.imul(h1, 0x01000193) >>> 0;

    h2 ^= byte;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }

  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
};

export const computeSha256 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  const subtle = globalThis.crypto?.subtle;

  if (subtle && typeof subtle.digest === "function") {
    try {
      const digest = await subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    } catch (error) {
      logDebug("hash_sha256_failed_fallback", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    logDebug("hash_sha256_unavailable_fallback");
  }

  return `fallback-${fallbackDigestHex(buffer)}`;
};
