import { decodeScanline } from "./ean/decode";
import type { BarcodeResult } from "./ean/types";
import { binarizeImage, rowToBits, scanlineRows } from "./vision/preprocess";
import type { CV, Frame } from "./vision/preprocess";

const OPENCV_URL =
  "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@5.0.0-release.1/dist/opencv.js";

interface OpenCVModule extends CV {
  then: (cb: (cv: CV) => void) => void;
}

let opencv: CV | null = null;

await import(/* @vite-ignore */ OPENCV_URL)
  .then(async () => {
    // @ts-expect-error no types
    const mod: OpenCVModule | null = globalThis["cv"];
    if (!mod) {
      postMessage({ type: "error" });
      return;
    }

    opencv = await mod;
    postMessage({ type: "ready" });
  })
  .catch(() => {
    postMessage({ type: "error" });
  });

addEventListener("message", ({ data }: MessageEvent<Frame>) => {
  if (!opencv) {
    return;
  }

  try {
    const binary = binarizeImage(opencv, data);
    try {
      let result: BarcodeResult | null = null;
      for (const row of scanlineRows(binary)) {
        result = decodeScanline(rowToBits(binary, row));
        if (result) {
          break;
        }
      }
      postMessage({ type: "result", result });
    } finally {
      binary.delete();
    }
  } catch (cause) {
    postMessage({
      type: "error",
      message: cause instanceof Error ? cause.message : "Unknown error",
    });
  }
});
