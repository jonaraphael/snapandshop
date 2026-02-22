import exifr from "exifr";

const drawOriented = (bitmap: ImageBitmap, orientation: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  if (orientation === 6 || orientation === 8) {
    canvas.width = bitmap.height;
    canvas.height = bitmap.width;
  } else {
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
  }

  switch (orientation) {
    case 2:
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -canvas.width);
      break;
    case 7:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(canvas.height, -canvas.width);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-canvas.height, 0);
      break;
    default:
      break;
  }

  ctx.drawImage(bitmap, 0, 0);
  return canvas;
};

export const normalizeOrientation = async (file: File, bitmap: ImageBitmap): Promise<ImageBitmap> => {
  const orientation = (await exifr.orientation(file).catch(() => 1)) ?? 1;
  if (orientation <= 1 || orientation > 8) {
    return bitmap;
  }

  const orientedCanvas = drawOriented(bitmap, orientation);
  return createImageBitmap(orientedCanvas);
};
