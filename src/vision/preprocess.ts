import type { CV, Mat } from "@techstark/opencv-js";

const SCANLINE_INTERVAL = 24;

export interface Frame {
  data: Uint8ClampedArray;
  height: number;
  width: number;
}

export function binarizeImage(cv: CV, image: Frame): Mat {
  const source = new cv.Mat(image.height, image.width, cv.CV_8UC4);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const binary = new cv.Mat();

  try {
    source.data.set(image.data);
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
  return Array.from(
    { length: Math.floor(binary.rows / SCANLINE_INTERVAL) },
    (_, index) => (index + 1) * SCANLINE_INTERVAL,
  ).filter((row) => row < binary.rows);
}
