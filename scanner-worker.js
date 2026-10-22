/**
 * @typedef {{ data: Uint8ClampedArray, width: number, height: number }} Frame
 */

/**
 * @typedef {{ data: Uint8Array, rows: number, cols: number, delete: () => void }} BinaryImage
 */

import { decodeEan13FromScanline } from "./ean13.js";

const OPENCV_URL =
  "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@5.0.0-release.1/dist/opencv.js";
let cv;

try {
  await import(/* @vite-ignore */ OPENCV_URL);
  cv = await globalThis.cv; // OpenCV のimportが終わると`globalThis.cv`からアクセスできる
  if (!cv) {
    throw new Error("OpenCVを読み込めませんでした。");
  }
  postMessage({ type: "ready" });
} catch {
  postMessage({ type: "error", message: "OpenCVを読み込めませんでした。" });
}
/**
 * @param {Frame} image
 * @returns {BinaryImage}
 * @throws {Error}
 */
function convertRgbaToBinaryImage(image) {
  const source = new cv.Mat(image.height, image.width, cv.CV_8UC4);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const blackAndWhite = new cv.Mat();

  try {
    source.data.set(image.data);
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY); // グレースケールに変換
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT); // ガウシアンぼかし
    cv.threshold(blurred, blackAndWhite, 0, 1, cv.THRESH_BINARY_INV + cv.THRESH_OTSU); // 黒を1、白を0に二値化
    return blackAndWhite;
  } catch (error) {
    blackAndWhite.delete();
    throw error;
  } finally {
    source.delete();
    gray.delete();
    blurred.delete();
  }
}

const SCANLINE_INTERVAL = 24;
addEventListener("message", ({ data }) => {
  if (!cv) {
    return;
  }

  try {
    const blackAndWhite = convertRgbaToBinaryImage(data);
    try {
      let result = null;
      // 上から 24px ごとにその行のピクセルを取り出してJANコードが検出できないか試してみる
      for (let row = SCANLINE_INTERVAL; row < blackAndWhite.rows; row += SCANLINE_INTERVAL) {
        const offset = row * blackAndWhite.cols;
        const pixels = Array.from(blackAndWhite.data.subarray(offset, offset + blackAndWhite.cols));
        result = decodeEan13FromScanline(pixels);
        if (result) {
          break;
        }
      }
      postMessage({ type: "result", result });
    } finally {
      blackAndWhite.delete();
    }
  } catch (cause) {
    postMessage({
      type: "error",
      message: cause instanceof Error ? cause.message : "画像を読み取れませんでした。",
    });
  }
});
