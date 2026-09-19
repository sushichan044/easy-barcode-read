import type { BarcodeResult } from "../ean/types";

/**
 * Shape Detection APIのBarcodeDetectorを使う、もう1つの読み取り方法。
 *
 * OpenCVで前処理して自前で復号する代わりに、ブラウザの内蔵検出器へ映像を渡す。 対応しているかはブラウザ次第なので、使う前に isShapeDetectionSupported で確認する。
 */

/**
 * BarcodeDetectorが返す1件の検出結果。
 */
interface DetectedBarcode {
  rawValue: string;
  format: string;
}

/**
 * このアプリで使うShape Detection APIのAPIだけを型にしたもの。
 */
export interface ShapeDetector {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): ShapeDetector;
}

/**
 * BarcodeDetectorに要求する形式。EAN-13とEAN-8だけを使う。
 */
const SHAPE_FORMATS = ["ean_13", "ean_8"];

/**
 * ブラウザが公開しているBarcodeDetectorを取り出す。無ければnull。
 */
function getConstructor(): BarcodeDetectorConstructor | null {
  const candidate = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
  return candidate ?? null;
}

/**
 * このブラウザがBarcodeDetectorに対応しているかを返す。
 */
export function isShapeDetectionSupported(): boolean {
  return getConstructor() !== null;
}

/**
 * EAN-13/EAN-8用の検出器を作る。未対応のブラウザではnullを返す。
 */
export function createShapeDetector(): ShapeDetector | null {
  const Constructor = getConstructor();
  if (Constructor === null) {
    return null;
  }
  return new Constructor({ formats: SHAPE_FORMATS });
}

/**
 * BarcodeDetectorの形式名を、このアプリの形式名へ対応づける。
 */
function toResult(detected: DetectedBarcode): BarcodeResult | null {
  if (detected.format === "ean_13") {
    return { format: "EAN-13", value: detected.rawValue };
  }
  if (detected.format === "ean_8") {
    return { format: "EAN-8", value: detected.rawValue };
  }
  return null;
}

/**
 * 映像からバーコードを検出する。見つからなければnullを返す。
 */
export async function detectWithShapeDetection(
  detector: ShapeDetector,
  source: CanvasImageSource,
): Promise<BarcodeResult | null> {
  const detections = await detector.detect(source);

  for (const detected of detections) {
    const result = toResult(detected);
    if (result !== null) {
      return result;
    }
  }

  return null;
}
