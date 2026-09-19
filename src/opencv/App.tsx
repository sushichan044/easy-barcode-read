import { useCallback, useMemo, useRef, useState } from "react";

import { CameraView } from "../components/CameraView";
import { ControlPanel } from "../components/ControlPanel";
import { ResultReadout } from "../components/ResultReadout";
import type { StatusTone } from "../components/ResultReadout";
import type { BarcodeResult } from "../ean/types";
import { useCamera } from "../hooks/useCamera";
import { useOpenCv } from "../hooks/useOpenCv";
import { PROCESSING_HEIGHT, PROCESSING_WIDTH } from "../vision/frame";
import { useJanScanner } from "./useJanScanner";

interface Status {
  message: string;
  tone: StatusTone;
}

export function App() {
  const { cv, error: cvError } = useOpenCv();
  const { videoRef, active, error: cameraError, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [stopped, setStopped] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const handleDetected = useCallback(
    (detected: BarcodeResult) => {
      setResult(detected);
      stop();
    },
    [stop],
  );

  const handleScannerError = useCallback(
    (message: string) => {
      setScannerError(message);
      stop({ keepError: true });
      setStopped(true);
    },
    [stop],
  );

  useJanScanner({
    cv,
    videoRef,
    canvasRef,
    active: active && result === null && scannerError === null,
    onDetected: handleDetected,
    onError: handleScannerError,
  });

  const ready = cv !== null && cvError === null;

  const handleStart = useCallback(async () => {
    setResult(null);
    setScannerError(null);
    setStopped(false);

    if (!window.isSecureContext) {
      setScannerError("HTTPSで開く必要があります。");
      return;
    }

    // oxlint-disable-next-line typescript/no-unnecessary-condition
    if (navigator.mediaDevices.getUserMedia == null) {
      setScannerError("このブラウザはカメラAPIに対応していません。");
      return;
    }

    if (cv === null) {
      setScannerError("OpenCV.jsの準備ができていません。");
      return;
    }

    await start();
  }, [cv, start]);

  const handleStop = useCallback(() => {
    stop();
    setStopped(true);
  }, [stop]);

  const status = useMemo<Status>(() => {
    if (cvError !== null) {
      return { message: cvError, tone: "error" };
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
      return { message: "枠の中へJANコードを水平に合わせてください。", tone: "active" };
    }
    if (stopped) {
      return { message: "カメラを停止しました。", tone: "neutral" };
    }
    if (cv === null) {
      return { message: "画像処理を準備しています。", tone: "neutral" };
    }
    return { message: "準備ができました。カメラを開始できます。", tone: "neutral" };
  }, [cvError, cameraError, scannerError, result, active, stopped, cv]);

  return (
    <div className="page">
      <header>
        <div>
          <p className="eyebrow">browser barcode reader / opencv</p>
          <h1>JAN Scan</h1>
        </div>
        <span className="formats">EAN-13 / EAN-8</span>
      </header>
      <main>
        <CameraView videoRef={videoRef} running={active} />
        <ControlPanel
          running={active}
          ready={ready}
          onStart={() => {
            void handleStart();
          }}
          onStop={handleStop}
        />
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
        <span>OpenCV.jsは前処理だけに使い、復号はEANの仕様に沿って自前で実装しています。</span>
        <a href="/shape-detection.html">Shape Detection API版を見る</a>
      </footer>
    </div>
  );
}
