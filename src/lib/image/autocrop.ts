export interface AutoCropResult {
  imageData: ImageData;
  applied: boolean;
}

export const autoCropDocument = async (imageData: ImageData): Promise<AutoCropResult> => {
  // Placeholder for OpenCV.js edge-detection crop path.
  return {
    imageData,
    applied: false
  };
};
