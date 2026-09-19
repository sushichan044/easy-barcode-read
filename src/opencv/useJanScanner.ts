import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";

import type { BarcodeResult } from "../ean/types";
import { PROCESSING_HEIGHT, PROCESSING_WIDTH, drawFrame } from "../vision/frame";

/**
 * 次のフレームを処理するまでの間隔。
 */
const FRAME_INTERVAL_MS = 140;

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  onDetected: (result: BarcodeResult) => void;
  onError: (message: string) => void;
}

type WorkerMessage =
  | { type: "ready" }
  | { type: "error" }
  | { type: "debug"; frames: number; scannedRows: number }
  | { type: "result"; result: BarcodeResult | null };

/**
 * カメラが動いている間、一定間隔でフレームを処理してバーコードを探す。
 *
 * OpenCVで二値化した走査線を自作の復号器に通す。
 */
export function useJanScanner({ videoRef, canvasRef, active, onDetected, onError }: Options): void {
  const handleDetected = useEffectEvent(onDetected);
  const handleError = useEffectEvent(onError);

  useEffect(() => {
    if (!active) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true }) ?? null;
    if (video === null || canvas === null || context === null) {
      return;
    }

    let cancelled = false;
    let timer: number | null = null;
    const worker = new Worker(new URL("./scanner.worker.ts", import.meta.url), { type: "module" });
    console.log("[JAN scanner] started");

    const schedule = () => {
      if (!cancelled) {
        timer = window.setTimeout(scanFrame, FRAME_INTERVAL_MS);
      }
    };

    const scanFrame = () => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        schedule();
        return;
      }
      try {
        drawFrame(video, context);
        const image = context.getImageData(0, 0, PROCESSING_WIDTH, PROCESSING_HEIGHT);
        worker.postMessage({ data: image.data, height: image.height, width: image.width }, [
          image.data.buffer,
        ]);
      } catch (error) {
        console.error("[JAN scanner] frame transfer failed", error);
        handleError("映像を処理できませんでした。カメラを止めて、もう一度お試しください。");
      }
    };

    worker.addEventListener("message", ({ data }: MessageEvent<WorkerMessage>) => {
      if (data.type === "ready") {
        console.log("[JAN scanner] OpenCV ready");
        scanFrame();
        return;
      }
      if (data.type === "error") {
        console.error("[JAN scanner] frame processing failed");
        handleError("映像を処理できませんでした。カメラを止めて、もう一度お試しください。");
        return;
      }
      if (data.type === "debug") {
        console.log("[JAN scanner] scanning", {
          frames: data.frames,
          scannedRows: data.scannedRows,
        });
        return;
      }
      if ("result" in data && data.result !== null) {
        console.log("[JAN scanner] detected", data.result);
        handleDetected(data.result);
        return;
      }
      schedule();
    });

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      worker.terminate();
    };
  }, [active, videoRef, canvasRef]);
}
