import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";

import { detectWithShapeDetection } from "../detection/shapeDetection";
import type { ShapeDetector } from "../detection/shapeDetection";
import { DetectionConsensus } from "../ean/consensus";
import type { BarcodeResult } from "../ean/types";

/**
 * 次の検出を試みるまでの間隔。
 */
const DETECT_INTERVAL_MS = 200;

interface Options {
  detector: ShapeDetector | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  onDetected: (result: BarcodeResult) => void;
  onError: (message: string) => void;
}

/**
 * カメラが動いている間、一定間隔で映像をBarcodeDetectorへ渡す。
 *
 * ブラウザ内蔵の検出器が形式と番号を返すので、ここでは受け取った結果を 複数フレームでそろえてから確定する。
 */
export function useBarcodeDetector({
  detector,
  videoRef,
  active,
  onDetected,
  onError,
}: Options): void {
  const handleDetected = useEffectEvent(onDetected);
  const handleError = useEffectEvent(onError);

  useEffect(() => {
    if (!active || detector === null) {
      return;
    }

    const video = videoRef.current;
    if (video === null) {
      return;
    }

    let cancelled = false;
    let timer: number | null = null;
    const consensus = new DetectionConsensus();

    const detectFrame = async (): Promise<BarcodeResult | null> => {
      const detected = await detectWithShapeDetection(detector, video);
      return detected === null ? null : consensus.add([detected]);
    };

    const tick = async () => {
      let result: BarcodeResult | null;
      try {
        result = await detectFrame();
      } catch {
        handleError("映像を処理できませんでした。カメラを止めて、もう一度お試しください。");
        return;
      }

      if (result !== null) {
        handleDetected(result);
        return;
      }

      if (!cancelled) {
        timer = window.setTimeout(() => {
          void tick();
        }, DETECT_INTERVAL_MS);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [active, detector, videoRef]);
}
