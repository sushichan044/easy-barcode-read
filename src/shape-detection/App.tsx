import { useRef, useState } from "react";

import { CameraView } from "../components/CameraView";
import { ControlPanel } from "../components/ControlPanel";
import { ResultReadout } from "../components/ResultReadout";
import type { StatusTone } from "../components/ResultReadout";
import { createShapeDetector } from "../detection/shapeDetection";
import type { BarcodeResult } from "../ean/types";
import { useCamera } from "../hooks/useCamera";
import { PROCESSING_HEIGHT, PROCESSING_WIDTH } from "../vision/frame";
import { useBarcodeDetector } from "./useBarcodeDetector";

interface Status {
  message: string;
  tone: StatusTone;
}

export function App() {
  const { videoRef, active, error: cameraError, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector] = useState(createShapeDetector);
  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  function handleDetected(detected: BarcodeResult) {
    setResult(detected);
    stop();
  }

  function handleError(message: string) {
    setScannerError(message);
    stop({ keepError: true });
  }

  useBarcodeDetector({
    active: active && result === null && scannerError === null,
    canvasRef,
    detector,
    onDetected: handleDetected,
    onError: handleError,
    videoRef,
  });

  async function handleStart() {
    setResult(null);
    setScannerError(null);
    await start();
  }

  const status: Status = (() => {
    if (detector === null) {
      return { message: "このブラウザはShape Detection APIに対応していません。", tone: "error" };
    }
    if (cameraError !== null) {
      return { message: cameraError, tone: "error" };
    }
    if (scannerError !== null) {
      return { message: scannerError, tone: "error" };
    }
    if (result !== null) {
      return { message: "JANコードを読み取りました。", tone: "success" };
    }
    if (active) {
      return { message: "JANコード全体を枠内で水平にしてください。", tone: "active" };
    }
    return { message: "準備ができました。カメラを開始できます。", tone: "neutral" };
  })();

  return (
    <>
      <header>
        <hgroup>
          <p className="eyebrow">browser barcode reader / shape detection api</p>
          <h1>JAN Scan</h1>
        </hgroup>
        <p className="formats">EAN-13 / EAN-8</p>
      </header>
      <main>
        <CameraView videoRef={videoRef} running={active} />
        <ControlPanel
          running={active}
          ready={detector !== null}
          onStart={handleStart}
          onStop={stop}
        />
        <ResultReadout message={status.message} tone={status.tone} result={result} />
      </main>
      <canvas ref={canvasRef} width={PROCESSING_WIDTH} height={PROCESSING_HEIGHT} hidden />
      <footer>
        <p>検出と復号はブラウザ内蔵のBarcodeDetectorに任せています。</p>
        <a href="/index.html">OpenCV版を見る</a>
      </footer>
    </>
  );
}
