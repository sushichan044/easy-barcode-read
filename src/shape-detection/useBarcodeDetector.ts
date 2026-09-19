import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";

import { detectWithShapeDetection } from "../detection/shapeDetection";
import type { ShapeDetector } from "../detection/shapeDetection";
import type { BarcodeResult } from "../ean/types";
import { drawFrame } from "../vision/frame";

const DETECT_INTERVAL_MS = 200;

interface Options {
  active: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  detector: ShapeDetector | null;
  onDetected: (result: BarcodeResult) => void;
  onError: (message: string) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function useBarcodeDetector({
  active,
  canvasRef,
  detector,
  onDetected,
  onError,
  videoRef,
}: Options): void {
  const handleDetected = useEffectEvent(onDetected);
  const handleError = useEffectEvent(onError);

  useEffect(() => {
    if (!active || detector === null) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d") ?? null;
    if (video === null || canvas === null || context === null) {
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      try {
        drawFrame(video, context);
        const result = await detectWithShapeDetection(detector, canvas);
        if (result !== null) {
          handleDetected(result);
          return;
        }
      } catch {
        handleError("映像を処理できませんでした。カメラを止めて、もう一度お試しください。");
        return;
      }

      if (!cancelled) {
        timer = window.setTimeout(() => void tick(), DETECT_INTERVAL_MS);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [active, canvasRef, detector, videoRef]);
}
