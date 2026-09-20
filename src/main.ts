import type { BarcodeResult } from "./ean/types";
import { createCamera } from "./vision/camera";
import { PROCESSING_HEIGHT, PROCESSING_WIDTH, drawFrame } from "./vision/frame";

const FRAME_INTERVAL_MS = 140;

type WorkerMessage =
  | { type: "ready" }
  | { type: "error"; message?: string }
  | { type: "result"; result: BarcodeResult | null };

function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`Element not found: ${selector}`);
  }
  return found;
}

const app = element<HTMLElement>(".app");
const video = element<HTMLVideoElement>("video");
const canvas = element<HTMLCanvasElement>("canvas");
const message = element<HTMLElement>(".message");
const result = element<HTMLElement>(".result");
const format = element<HTMLElement>(".result span");
const value = element<HTMLElement>(".result strong");
const button = element<HTMLButtonElement>("button");
function canvasContext(): CanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Canvas 2D context unavailable");
  }
  return context;
}
const context = canvasContext();

const camera = createCamera(video);
let worker: Worker | null = null;
let timer: number | undefined;

function show(state: string, text: string, label: string, barcode?: BarcodeResult) {
  app.dataset["state"] = state;
  message.textContent = text;
  button.textContent = label;
  button.disabled = state === "starting";
  result.hidden = barcode === undefined;
  if (barcode) {
    format.textContent = barcode.format;
    value.textContent = barcode.value;
  }
}

function stop() {
  window.clearTimeout(timer);
  worker?.terminate();
  worker = null;
  camera.stop();
}

function fail(detail?: string) {
  stop();
  let text = "映像を処理できませんでした。";
  if (detail) {
    text += detail;
  }
  show("error", text, "もう一度試す");
}

function scanFrame(activeWorker: Worker) {
  if (worker !== activeWorker) {
    return;
  }
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    timer = window.setTimeout(() => {
      scanFrame(activeWorker);
    }, FRAME_INTERVAL_MS);
    return;
  }
  try {
    drawFrame(video, context);
    const image = context.getImageData(0, 0, PROCESSING_WIDTH, PROCESSING_HEIGHT);
    activeWorker.postMessage({ data: image.data, height: image.height, width: image.width }, [
      image.data.buffer,
    ]);
  } catch {
    fail();
  }
}

function scan() {
  const activeWorker = new Worker(new URL("./scanner.worker.ts", import.meta.url), {
    type: "module",
  });
  worker = activeWorker;
  activeWorker.addEventListener("message", ({ data }: MessageEvent<WorkerMessage>) => {
    if (worker !== activeWorker) {
      return;
    }
    if (data.type === "error") {
      fail(data.message);
    } else if (data.type === "ready") {
      show("scanning", "枠内にJANコードを映してください。", "カメラを停止");
      scanFrame(activeWorker);
    } else if (data.result) {
      stop();
      show("found", "JANコードを読み取りました。", "もう一度読む", data.result);
    } else {
      timer = window.setTimeout(() => {
        scanFrame(activeWorker);
      }, FRAME_INTERVAL_MS);
    }
  });
  activeWorker.addEventListener("error", () => {
    if (worker === activeWorker) {
      fail();
    }
  });
}

async function handleButton() {
  if (app.dataset["state"] === "scanning") {
    stop();
    show("idle", "ボタンを押すとカメラが起動します。", "カメラを開始");
    return;
  }

  show("starting", "カメラを起動しています。", "カメラを開始");
  try {
    if (await camera.start()) {
      show("scanning", "OpenCV を準備しています。", "カメラを停止");
      scan();
    }
  } catch (cause) {
    let text = "カメラを開始できませんでした。";
    if (cause instanceof Error) {
      text = cause.message;
    }
    show("error", text, "もう一度試す");
  }
}

button.addEventListener("click", () => {
  void handleButton();
});

window.addEventListener("pagehide", stop);
