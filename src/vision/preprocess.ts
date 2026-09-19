import type { CV, Mat } from "@techstark/opencv-js";

const SCANLINE_RATIOS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

export function binarizeImage(cv: CV, image: ImageData): Mat {
  const source = cv.matFromImageData(image);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const binary = new cv.Mat();

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.threshold(blurred, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    return binary;
  } catch (error) {
    binary.delete();
    throw error;
  } finally {
    source.delete();
    gray.delete();
    blurred.delete();
  }
}

export function rowToBits(binary: Mat, row: number): number[] {
  const offset = row * binary.cols;

  return Array.from(binary.data.subarray(offset, offset + binary.cols), (pixel) =>
    pixel < 128 ? 1 : 0,
  );
}

export function scanlineRows(binary: Mat): number[] {
  return SCANLINE_RATIOS.map((ratio) => Math.floor(binary.rows * ratio));
}
