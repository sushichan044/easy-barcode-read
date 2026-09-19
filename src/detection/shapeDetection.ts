import type { BarcodeResult } from "../ean/types";

interface DetectedBarcode {
  format: string;
  rawValue: string;
}

export interface ShapeDetector {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): ShapeDetector;
}

function getConstructor(): BarcodeDetectorConstructor | null {
  return (
    (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ??
    null
  );
}

export function createShapeDetector(): ShapeDetector | null {
  const Constructor = getConstructor();
  return Constructor === null ? null : new Constructor({ formats: ["ean_13", "ean_8"] });
}

export async function detectWithShapeDetection(
  detector: ShapeDetector,
  source: CanvasImageSource,
): Promise<BarcodeResult | null> {
  const detected = await detector.detect(source);

  for (const barcode of detected) {
    if (barcode.format === "ean_13") {
      return { format: "EAN-13", value: barcode.rawValue };
    }
    if (barcode.format === "ean_8") {
      return { format: "EAN-8", value: barcode.rawValue };
    }
  }

  return null;
}
