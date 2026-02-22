export const preprocessForOcr = (bitmap: ImageBitmap): ImageData => {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.drawImage(bitmap, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = data.data;

  let sum = 0;
  const total = pixels.length / 4;
  for (let index = 0; index < pixels.length; index += 4) {
    const gray = 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
    sum += gray;
  }
  const average = sum / total;

  for (let index = 0; index < pixels.length; index += 4) {
    const gray = 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
    const highContrast = gray > average ? 255 : 0;
    pixels[index] = highContrast;
    pixels[index + 1] = highContrast;
    pixels[index + 2] = highContrast;
  }

  return data;
};
