import type { CV } from "@techstark/opencv-js";

import { decodeScanline } from "../ean/decode";
import type { BarcodeResult } from "../ean/types";
import { binarizeImage, rowToBits, scanlineRows } from "../vision/preprocess";
import type { Frame } from "../vision/preprocess";

type LoadingCv = CV & { calledRun?: boolean };
const OPENCV_MODULE_URL = new URL("/vendor/opencv.js", globalThis.location.href).href;

let cv: CV | null = null;
let frames = 0;
let lastLogAt = 0;

void import(/* @vite-ignore */ OPENCV_MODULE_URL)
  .then(() => {
    const loaded = (globalThis as unknown as { cv?: LoadingCv }).cv;
    if (loaded === undefined) {
      throw new Error("OpenCV did not expose cv");
    }
    const ready = () => {
      cv = loaded;
      postMessage({ type: "ready" });
    };

    if (loaded.calledRun) {
      ready();
    } else {
      loaded.onRuntimeInitialized = ready;
    }
  })
  .catch(() => {
    postMessage({ type: "error" });
  });

addEventListener("message", ({ data }: MessageEvent<Frame>) => {
  if (cv === null) {
    return;
  }

  try {
    const binary = binarizeImage(cv, data);
    try {
      let result: BarcodeResult | null = null;
      let scannedRows = 0;
      for (const row of scanlineRows(binary)) {
        scannedRows += 1;
        result = decodeScanline(rowToBits(binary, row));
        if (result !== null) {
          break;
        }
      }
      frames += 1;
      if (result === null && Date.now() - lastLogAt >= 1000) {
        postMessage({ type: "debug", frames, scannedRows });
        frames = 0;
        lastLogAt = Date.now();
      }
      postMessage({ type: "result", result: result ?? null });
    } finally {
      binary.delete();
    }
  } catch {
    postMessage({ type: "error" });
  }
});
