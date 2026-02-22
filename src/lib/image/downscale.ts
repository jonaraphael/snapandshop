export const downscaleBitmap = async (
  bitmap: ImageBitmap,
  maxLongEdge: number
): Promise<ImageBitmap> => {
  const longEdge = Math.max(bitmap.width, bitmap.height);
  if (longEdge <= maxLongEdge) {
    return bitmap;
  }

  const scale = maxLongEdge / longEdge;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return createImageBitmap(canvas);
};
