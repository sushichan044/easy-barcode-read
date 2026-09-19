import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";

import { DetectionConsensus } from "../ean/consensus";
import { decodeScanline } from "../ean/decode";
import type { BarcodeResult } from "../ean/types";
import { drawCrop, hasFrame } from "../vision/frame";
import type { Cv } from "../vision/opencv";
import { binarizeCanvas, rowToBits, scanlineRows } from "../vision/preprocess";

/**
 * 次のフレームを処理するまでの間隔。
 */
const FRAME_INTERVAL_MS = 140;

interface Options {
  cv: Cv | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  onDetected: (result: BarcodeResult) => void;
  onError: (message: string) => void;
}

/**
 * カメラが動いている間、一定間隔でフレームを処理してバーコードを探す。
 *
 * OpenCVで二値化した走査線を自作の復号器に通し、複数の走査線とフレームで 同じ結果がそろったときに確定する。
 */
export function useJanScanner({
  cv,
  videoRef,
  canvasRef,
  active,
  onDetected,
  onError,
}: Options): void {
  const handleDetected = useEffectEvent(onDetected);
  const handleError = useEffectEvent(onError);

  useEffect(() => {
    if (!active || cv === null) {
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
    const consensus = new DetectionConsensus();

    const scanFrame = (): BarcodeResult | null => {
      if (!hasFrame(video)) {
        return null;
      }
      drawCrop(video, context);

      const binary = binarizeCanvas(cv, canvas);
      try {
        const detections: BarcodeResult[] = [];
        for (const row of scanlineRows(binary)) {
          const detection = decodeScanline(rowToBits(binary, row));
          if (detection !== null) {
            detections.push(detection);
          }
        }
        const result = consensus.add(detections);
        binary.delete();
        return result;
      } catch (error) {
        binary.delete();
        throw error;
      }
    };

    const tick = () => {
      let result: BarcodeResult | null;
      try {
        result = scanFrame();
      } catch {
        handleError("映像を処理できませんでした。カメラを止めて、もう一度お試しください。");
        return;
      }

      if (result !== null) {
        handleDetected(result);
        return;
      }

      if (!cancelled) {
        timer = window.setTimeout(tick, FRAME_INTERVAL_MS);
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [active, cv, videoRef, canvasRef]);
}
