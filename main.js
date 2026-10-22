const FRAME_INTERVAL_MS = 140;
const PROCESSING_WIDTH = 960;
const PROCESSING_HEIGHT = 450;

const video = document.querySelector("video");
const canvas = document.querySelector("canvas");
const message = document.querySelector(".message");
const result = document.querySelector(".result");
const button = document.querySelector("button");
const context = canvas.getContext("2d", { willReadFrequently: true });

let state = "idle";
let stream = null;
let worker = null; // あとで画像処理用Web Workerのインスタンスを保持するために必要
let timer;

function updateScannerDisplay(nextState, text, label, barcode) {
  state = nextState;
  message.textContent = text;
  button.textContent = label;
  button.disabled = state === "starting";
  result.textContent = barcode?.value ?? "";
}

function stopBarcodeScanning() {
  window.clearTimeout(timer);
  worker?.terminate();
  worker = null;

  for (const track of stream?.getTracks() ?? []) {
    track.stop();
  }
  stream = null;
  video.srcObject = null;
}

function stopScanningWithError(detail) {
  stopBarcodeScanning();
  updateScannerDisplay("error", detail, "もう一度試す");
}

function sendCameraFrameToWorker(activeWorker) {
  if (worker !== activeWorker) {
    return;
  }
  // まだカメラが準備できてないよ！
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    timer = window.setTimeout(() => sendCameraFrameToWorker(activeWorker), FRAME_INTERVAL_MS);
    return;
  }

  try {
    // 読み取り画面に表示したガイド線に合わせて映像をトリミング
    context.drawImage(
      video,
      video.videoWidth * 0.2,
      video.videoHeight * 0.25,
      video.videoWidth * 0.6,
      video.videoHeight * 0.5,
      0,
      0,
      PROCESSING_WIDTH,
      PROCESSING_HEIGHT,
    );
    const image = context.getImageData(0, 0, PROCESSING_WIDTH, PROCESSING_HEIGHT);
    // 画像処理用のWorkerで処理を開始
    activeWorker.postMessage({ data: image.data, height: image.height, width: image.width }, [
      image.data.buffer, // 画像データの所有権をWorkerに移す
    ]);
  } catch {
    stopScanningWithError("画像を読み取れませんでした。");
  }
}

function initializeBarcodeWorker() {
  const activeWorker = new Worker("./scanner-worker.js", { type: "module" });
  worker = activeWorker;

  activeWorker.addEventListener("message", ({ data }) => {
    if (worker !== activeWorker) {
      return;
    }
    if (data.type === "error") {
      stopScanningWithError(data.message);
    } else if (data.type === "ready") {
      updateScannerDisplay("scanning", "枠の中にJANコードを映してください。", "カメラを停止");
      sendCameraFrameToWorker(activeWorker);
    } else if (data.result) {
      stopBarcodeScanning();
      updateScannerDisplay("found", "JANコードを読み取りました。", "もう一度", data.result);
    } else {
      // 読み取りに失敗した場合は一定時間待ってから新しい画像でリトライ
      timer = window.setTimeout(() => sendCameraFrameToWorker(activeWorker), FRAME_INTERVAL_MS);
    }
  });

  activeWorker.addEventListener("error", () => {
    if (worker === activeWorker) {
      stopScanningWithError("画像処理中にエラーが発生しました。");
    }
  });
}

async function requestMedia() {
  if (!window.isSecureContext || !navigator.mediaDevices) {
    throw new Error("カメラにアクセスできない環境です。");
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } }, // 極力背面カメラを利用する
    audio: false,
  });
  video.srcObject = stream; // index.htmlのvideo要素に映像を出してプレビュー
  await video.play(); // 映像の取り込みを開始
}

async function toggleBarcodeScanning() {
  if (state === "scanning") {
    stopBarcodeScanning();
    updateScannerDisplay("idle", "", "カメラを起動");
    return;
  }

  stopBarcodeScanning();
  updateScannerDisplay("starting", "カメラを動かしています。", "カメラを起動");
  try {
    await requestMedia();
    updateScannerDisplay("starting", "読み取りの準備をしています。", "カメラを起動");
    initializeBarcodeWorker();
  } catch (cause) {
    stopScanningWithError(cause instanceof Error ? cause.message : String(cause));
  }
}

button.addEventListener("click", toggleBarcodeScanning);

window.addEventListener("pagehide", stopBarcodeScanning);
