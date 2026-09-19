import { useCallback, useMemo, useState } from "react";

import { CameraView } from "../components/CameraView";
import { ControlPanel } from "../components/ControlPanel";
import { ResultReadout } from "../components/ResultReadout";
import type { StatusTone } from "../components/ResultReadout";
import { createShapeDetector, isShapeDetectionSupported } from "../detection/shapeDetection";
import type { BarcodeResult } from "../ean/types";
import { useCamera } from "../hooks/useCamera";
import { useBarcodeDetector } from "./useBarcodeDetector";

interface Status {
  message: string;
  tone: StatusTone;
}

/**
 * このブラウザがカメラAPIを公開しているかを返す。 型定義には必ず存在する前提で書かれているため、実体を確かめてから使う。
 */
function isCameraApiAvailable(): boolean {
  const mediaDevices = (navigator as unknown as { mediaDevices?: { getUserMedia?: unknown } })
    .mediaDevices;

  return mediaDevices?.getUserMedia !== undefined;
}

/**
 * Shape Detection API版の画面。
 *
 * ブラウザ内蔵のBarcodeDetectorへ映像を渡すだけで、画像処理も復号も書かない。 OpenCV版と同じ画面部品を使い、読み取り部分だけを差し替えている。
 */
export function App() {
  const { videoRef, active, error: cameraError, start, stop } = useCamera();

  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [stopped, setStopped] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const shapeSupported = useMemo(() => isShapeDetectionSupported(), []);
  const detector = useMemo(() => (shapeSupported ? createShapeDetector() : null), [shapeSupported]);

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

  useBarcodeDetector({
    detector,
    videoRef,
    active: active && result === null && scannerError === null,
    onDetected: handleDetected,
    onError: handleScannerError,
  });

  const ready = detector !== null;

  const handleStart = useCallback(async () => {
    setResult(null);
    setScannerError(null);
    setStopped(false);

    if (!window.isSecureContext) {
      setScannerError("カメラの利用にはHTTPSで開く必要があります。");
      return;
    }
    if (!isCameraApiAvailable()) {
      setScannerError("このブラウザはカメラAPIに対応していません。");
      return;
    }
    if (detector === null) {
      setScannerError("このブラウザはShape Detection APIに対応していません。");
      return;
    }

    await start();
  }, [detector, start]);

  const handleStop = useCallback(() => {
    stop();
    setStopped(true);
  }, [stop]);

  const status = useMemo<Status>(() => {
    if (!shapeSupported) {
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
      return { message: "枠の中へJANコードを水平に合わせてください。", tone: "active" };
    }
    if (stopped) {
      return { message: "カメラを停止しました。", tone: "neutral" };
    }
    return { message: "準備ができました。カメラを開始できます。", tone: "neutral" };
  }, [shapeSupported, cameraError, scannerError, result, active, stopped]);

  return (
    <div className="page">
      <header>
        <div>
          <p className="eyebrow">browser barcode reader / shape detection api</p>
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
      <footer>
        <span>検出と復号はブラウザ内蔵のBarcodeDetectorに任せています。</span>
        <a href="/index.html">OpenCV版を見る</a>
      </footer>
    </div>
  );
}
