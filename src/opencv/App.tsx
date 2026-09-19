import { useRef, useState } from "react";

import { CameraView } from "../components/CameraView";
import { ControlPanel } from "../components/ControlPanel";
import { ResultReadout } from "../components/ResultReadout";
import type { StatusTone } from "../components/ResultReadout";
import type { BarcodeResult } from "../ean/types";
import { useCamera } from "../hooks/useCamera";
import { PROCESSING_HEIGHT, PROCESSING_WIDTH } from "../vision/frame";
import { useJanScanner } from "./useJanScanner";

interface Status {
  message: string;
  tone: StatusTone;
}

export function App() {
  const { videoRef, active, error: cameraError, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  function handleDetected(detected: BarcodeResult) {
    setResult(detected);
    stop();
  }

  function handleScannerError(message: string) {
    setScannerError(message);
    stop({ keepError: true });
  }

  useJanScanner({
    videoRef,
    canvasRef,
    active: active && result === null && scannerError === null,
    onDetected: handleDetected,
    onError: handleScannerError,
  });

  async function handleStart() {
    setResult(null);
    setScannerError(null);

    if (!window.isSecureContext) {
      setScannerError("HTTPSで開く必要があります。");
      return;
    }

    // oxlint-disable-next-line typescript/no-unnecessary-condition
    if (navigator.mediaDevices.getUserMedia == null) {
      setScannerError("このブラウザはカメラAPIに対応していません。");
      return;
    }

    await start();
  }

  function handleStop() {
    stop();
  }

  const status: Status = (() => {
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
          <p className="eyebrow">browser barcode reader / opencv</p>
          <h1>JAN Scan</h1>
        </hgroup>
        <p className="formats">EAN-13 / EAN-8</p>
      </header>
      <main>
        <CameraView videoRef={videoRef} running={active} />
        <ControlPanel running={active} ready onStart={handleStart} onStop={handleStop} />
        <ResultReadout message={status.message} tone={status.tone} result={result} />
      </main>
      <canvas
        id="processing-canvas"
        ref={canvasRef}
        width={PROCESSING_WIDTH}
        height={PROCESSING_HEIGHT}
        hidden
      />
      <footer>
        <p>OpenCV.jsは前処理だけに使い、復号はEANの仕様に沿って自前で実装しています。</p>
        <a href="/shape-detection.html">Shape Detection API版を見る</a>
      </footer>
    </>
  );
}
