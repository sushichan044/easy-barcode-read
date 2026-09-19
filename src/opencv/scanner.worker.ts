import type { CV } from "@techstark/opencv-js";

import { DetectionConsensus } from "../ean/consensus";
import { decodeScanline } from "../ean/decode";
import type { BarcodeResult } from "../ean/types";
import { binarizeImage, rowToBits, scanlineRows } from "../vision/preprocess";

type LoadingCv = CV & { then(onReady: () => void): void };

const consensus = new DetectionConsensus();

let cv: CV | null = null;

void (import("@techstark/opencv-js") as unknown as Promise<{ default: LoadingCv }>)
  .then(({ default: loaded }) => {
    loaded.then(() => {
      cv = loaded;
      postMessage({ type: "ready" });
    });
  })
  .catch(() => {
    postMessage({ type: "error" });
  });

addEventListener("message", ({ data }: MessageEvent<ImageData>) => {
  if (cv === null) {
    return;
  }

  try {
    const binary = binarizeImage(cv, data);
    try {
      const detections = scanlineRows(binary)
        .map((row) => decodeScanline(rowToBits(binary, row)))
        .filter((result): result is BarcodeResult => result !== null);
      postMessage({ type: "result", result: consensus.add(detections) });
    } finally {
      binary.delete();
    }
  } catch {
    postMessage({ type: "error" });
  }
});
