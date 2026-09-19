const OPENCV_URL = "https://docs.opencv.org/4.13.0/opencv.js";
const PROCESSING_WIDTH = 960;
const PROCESSING_HEIGHT = 240;
const FRAME_INTERVAL_MS = 140;

const L_PATTERNS = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];

const G_PATTERNS = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];

const R_PATTERNS = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];

const EAN13_PARITIES = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

const FORMATS = [
  { format: "EAN-13", modules: 95, runs: 59 },
  { format: "EAN-8", modules: 67, runs: 43 },
];

/**
 * Calculate the final EAN check digit for a payload without its check digit.
 *
 * @param {string} payload Numeric EAN payload.
 * @returns {number} Check digit from 0 through 9.
 */
export function calculateCheckDigit(payload) {
  let sum = 0;

  for (let index = payload.length - 1; index >= 0; index -= 1) {
    const digit = Number(payload[index]);
    const distanceFromRight = payload.length - 1 - index;
    sum += digit * (distanceFromRight % 2 === 0 ? 3 : 1);
  }

  return (10 - (sum % 10)) % 10;
}

function hasValidCheckDigit(value) {
  const payload = value.slice(0, -1);
  return calculateCheckDigit(payload) === Number(value.at(-1));
}

function findPattern(pattern, patterns) {
  const index = patterns.indexOf(pattern);
  return index === -1 ? null : index;
}

function decodeEan13(bits) {
  if (
    bits.length !== 95 ||
    bits.slice(0, 3) !== "101" ||
    bits.slice(45, 50) !== "01010" ||
    bits.slice(92) !== "101"
  ) {
    return null;
  }

  const leftDigits = [];
  let parity = "";

  for (let index = 0; index < 6; index += 1) {
    const pattern = bits.slice(3 + index * 7, 10 + index * 7);
    const lDigit = findPattern(pattern, L_PATTERNS);
    const gDigit = findPattern(pattern, G_PATTERNS);

    if (lDigit !== null) {
      leftDigits.push(lDigit);
      parity += "L";
    } else if (gDigit !== null) {
      leftDigits.push(gDigit);
      parity += "G";
    } else {
      return null;
    }
  }

  const firstDigit = EAN13_PARITIES.indexOf(parity);
  if (firstDigit === -1) {
    return null;
  }

  const rightDigits = [];
  for (let index = 0; index < 6; index += 1) {
    const pattern = bits.slice(50 + index * 7, 57 + index * 7);
    const digit = findPattern(pattern, R_PATTERNS);

    if (digit === null) {
      return null;
    }
    rightDigits.push(digit);
  }

  const value = [firstDigit, ...leftDigits, ...rightDigits].join("");
  return hasValidCheckDigit(value) ? { format: "EAN-13", value } : null;
}

function decodeEan8(bits) {
  if (
    bits.length !== 67 ||
    bits.slice(0, 3) !== "101" ||
    bits.slice(31, 36) !== "01010" ||
    bits.slice(64) !== "101"
  ) {
    return null;
  }

  const digits = [];
  for (let index = 0; index < 4; index += 1) {
    const pattern = bits.slice(3 + index * 7, 10 + index * 7);
    const digit = findPattern(pattern, L_PATTERNS);

    if (digit === null) {
      return null;
    }
    digits.push(digit);
  }

  for (let index = 0; index < 4; index += 1) {
    const pattern = bits.slice(36 + index * 7, 43 + index * 7);
    const digit = findPattern(pattern, R_PATTERNS);

    if (digit === null) {
      return null;
    }
    digits.push(digit);
  }

  const value = digits.join("");
  return hasValidCheckDigit(value) ? { format: "EAN-8", value } : null;
}

function decodeForward(bits) {
  if (bits.length === 95) {
    return decodeEan13(bits);
  }
  if (bits.length === 67) {
    return decodeEan8(bits);
  }
  return null;
}

/**
 * Decode an EAN module string in either scanning direction.
 *
 * @param {string | number[]} input A 95- or 67-module black-and-white sequence.
 * @returns {{ format: string; value: string } | null} A verified barcode result.
 */
export function decodeModuleBits(input) {
  const bits = Array.isArray(input) ? input.join("") : input;
  const forward = decodeForward(bits);

  if (forward !== null) {
    return forward;
  }

  return decodeForward(bits.split("").reverse().join(""));
}

function createRuns(bits) {
  if (bits.length === 0) {
    return [];
  }

  const runs = [];
  let start = 0;
  let bit = bits[0];

  for (let index = 1; index <= bits.length; index += 1) {
    if (index === bits.length || bits[index] !== bit) {
      runs.push({ bit, start, end: index, length: index - start });
      start = index;
      bit = bits[index];
    }
  }

  return runs;
}

function modulesFromRuns(candidateRuns, moduleCount) {
  const pixelWidth = candidateRuns.reduce((sum, run) => sum + run.length, 0);
  const moduleWidth = pixelWidth / moduleCount;
  const modules = [];

  for (const run of candidateRuns) {
    const exactWidth = run.length / moduleWidth;
    const normalizedWidth = Math.round(exactWidth);

    if (
      normalizedWidth < 1 ||
      normalizedWidth > 4 ||
      Math.abs(exactWidth - normalizedWidth) > 0.55
    ) {
      return null;
    }
    modules.push(...Array.from({ length: normalizedWidth }, () => run.bit));
  }

  return modules.length === moduleCount ? modules.join("") : null;
}

function modulesBySampling(bits, start, end, moduleCount) {
  const moduleWidth = (end - start) / moduleCount;
  return Array.from({ length: moduleCount }, (_, index) => {
    const sampleAt = Math.min(end - 1, Math.floor(start + (index + 0.5) * moduleWidth));
    return bits[sampleAt];
  }).join("");
}

/**
 * Find and decode an EAN barcode in a thresholded horizontal image row. Black pixels are 1 and
 * white pixels are 0.
 *
 * @param {number[]} bits Thresholded scanline.
 * @returns {{ format: string; value: string } | null} A verified barcode result.
 */
export function decodeScanline(bits) {
  const runs = createRuns(bits);

  for (const configuration of FORMATS) {
    for (let startIndex = 0; startIndex + configuration.runs <= runs.length; startIndex += 1) {
      const endIndex = startIndex + configuration.runs - 1;
      if (runs[startIndex].bit !== 1 || runs[endIndex].bit !== 1) {
        continue;
      }

      const candidateRuns = runs.slice(startIndex, endIndex + 1);
      const start = candidateRuns[0].start;
      const end = candidateRuns.at(-1).end;
      const moduleWidth = (end - start) / configuration.modules;
      const quietBefore = runs[startIndex - 1];
      const quietAfter = runs[endIndex + 1];

      if (
        quietBefore?.bit !== 0 ||
        quietAfter?.bit !== 0 ||
        quietBefore.length < moduleWidth * 3 ||
        quietAfter.length < moduleWidth * 3
      ) {
        continue;
      }

      const normalized = modulesFromRuns(candidateRuns, configuration.modules);
      const sampled = modulesBySampling(bits, start, end, configuration.modules);

      for (const candidate of [normalized, sampled]) {
        if (candidate === null) {
          continue;
        }
        const decoded = decodeModuleBits(candidate);
        if (decoded?.format === configuration.format) {
          return decoded;
        }
      }
    }
  }

  return null;
}

/**
 * Stabilize scan results across several rows and video frames.
 */
export class DetectionConsensus {
  #history = [];
  #requiredFrames;
  #windowMs;

  /**
   * @param {{ requiredFrames?: number; windowMs?: number }} options Consensus options.
   */
  constructor({ requiredFrames = 3, windowMs = 1200 } = {}) {
    this.#requiredFrames = requiredFrames;
    this.#windowMs = windowMs;
  }

  /**
   * @param {{ format: string; value: string }[]} detections Results from one frame.
   * @param {number} now Timestamp in milliseconds.
   * @returns {{ format: string; value: string } | null} A stable result.
   */
  add(detections, now = Date.now()) {
    /**
     * @type {Map<string, number>}
     */
    const frameCounts = new Map();

    for (const detection of detections) {
      const key = `${detection.format}|${detection.value}`;
      const count = (frameCounts.get(key) ?? 0) + 1;
      frameCounts.set(key, count);

      if (count >= 2) {
        this.reset();
        return detection;
      }
    }

    this.#history = this.#history.filter((entry) => now - entry.timestamp <= this.#windowMs);

    for (const key of frameCounts.keys()) {
      this.#history.push({ key, timestamp: now });
      const count = this.#history.filter((entry) => entry.key === key).length;

      if (count >= this.#requiredFrames) {
        const [format, value] = key.split("|");
        this.reset();
        return { format, value };
      }
    }

    return null;
  }

  reset() {
    this.#history = [];
  }
}

function loadOpenCv() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      script.remove();
      reject(new Error("OpenCV.jsの読み込みがタイムアウトしました。"));
    }, 30_000);

    script.async = true;
    script.src = OPENCV_URL;
    script.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("OpenCV.jsを読み込めませんでした。"));
    });
    script.addEventListener("load", async () => {
      try {
        const cv = await globalThis.cv;
        window.clearTimeout(timeout);
        resolve(cv);
      } catch {
        window.clearTimeout(timeout);
        reject(new Error("OpenCV.jsを初期化できませんでした。"));
      }
    });
    document.head.append(script);
  });
}

function cameraErrorMessage(error) {
  if (error?.name === "NotAllowedError") {
    return "カメラの利用が許可されませんでした。ブラウザの設定を確認してください。";
  }
  if (error?.name === "NotFoundError") {
    return "利用できるカメラが見つかりませんでした。";
  }
  if (error?.name === "NotReadableError") {
    return "カメラを開始できませんでした。他のアプリで使用中でないか確認してください。";
  }
  return "カメラを開始できませんでした。ページを再読み込みしてお試しください。";
}

async function initializeApp() {
  const video = document.querySelector("#camera");
  const canvas = document.querySelector("#processing-canvas");
  const startButton = document.querySelector("#start-camera");
  const stopButton = document.querySelector("#stop-camera");
  const scanner = document.querySelector("#scanner");
  const status = document.querySelector("#status");
  const result = document.querySelector("#result");
  const resultFormat = document.querySelector("#result-format");
  const resultValue = document.querySelector("#result-value");

  if (
    !(video instanceof HTMLVideoElement) ||
    !(canvas instanceof HTMLCanvasElement) ||
    !(startButton instanceof HTMLButtonElement) ||
    !(stopButton instanceof HTMLButtonElement) ||
    !(scanner instanceof HTMLElement) ||
    !(status instanceof HTMLElement) ||
    !(result instanceof HTMLElement) ||
    !(resultFormat instanceof HTMLElement) ||
    !(resultValue instanceof HTMLElement)
  ) {
    throw new Error("画面の初期化に失敗しました。");
  }

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("Canvasを初期化できませんでした。");
  }

  let stream = null;
  let scanTimer = null;
  let scanning = false;
  const consensus = new DetectionConsensus();

  const setStatus = (message, tone = "neutral") => {
    status.textContent = message;
    status.dataset.tone = tone;
  };

  const setRunning = (running) => {
    scanner.dataset.running = String(running);
    startButton.hidden = running;
    stopButton.hidden = !running;
  };

  const stopCamera = ({ keepStatus = false } = {}) => {
    scanning = false;
    if (scanTimer !== null) {
      window.clearTimeout(scanTimer);
      scanTimer = null;
    }
    for (const track of stream?.getTracks() ?? []) {
      track.stop();
    }
    stream = null;
    video.srcObject = null;
    consensus.reset();
    setRunning(false);
    if (!keepStatus) {
      setStatus("カメラを停止しました。", "neutral");
    }
  };

  setStatus("画像処理を準備しています。", "neutral");
  const cvPromise = loadOpenCv();

  const processFrame = async (cv) => {
    if (!scanning) {
      return;
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      const cropWidth = sourceWidth * 0.92;
      const cropHeight = Math.min(sourceHeight * 0.34, cropWidth / 4);
      const sourceX = (sourceWidth - cropWidth) / 2;
      const sourceY = (sourceHeight - cropHeight) / 2;

      context.drawImage(
        video,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        PROCESSING_WIDTH,
        PROCESSING_HEIGHT,
      );

      let source;
      let gray;
      let blurred;
      let binary;

      try {
        source = cv.imread(canvas);
        gray = new cv.Mat();
        blurred = new cv.Mat();
        binary = new cv.Mat();
        cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        cv.threshold(blurred, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

        const detections = [];
        for (const ratio of [0.2, 0.35, 0.5, 0.65, 0.8]) {
          const row = Math.floor(binary.rows * ratio);
          const offset = row * binary.cols;
          const bits = Array.from(binary.data.subarray(offset, offset + binary.cols), (pixel) =>
            pixel < 128 ? 1 : 0,
          );
          const detection = decodeScanline(bits);
          if (detection !== null) {
            detections.push(detection);
          }
        }

        const stableResult = consensus.add(detections);
        if (stableResult !== null) {
          resultFormat.textContent = stableResult.format;
          resultValue.textContent = stableResult.value;
          result.hidden = false;
          setStatus("JANコードを読み取りました。", "success");
          stopCamera({ keepStatus: true });
          return;
        }
      } catch {
        setStatus("映像を処理できませんでした。カメラを止めて、もう一度お試しください。", "error");
        stopCamera({ keepStatus: true });
        return;
      } finally {
        source?.delete();
        gray?.delete();
        blurred?.delete();
        binary?.delete();
      }
    }

    if (scanning) {
      scanTimer = window.setTimeout(() => {
        void processFrame(cv);
      }, FRAME_INTERVAL_MS);
    }
  };

  startButton.addEventListener("click", async () => {
    result.hidden = true;

    if (!window.isSecureContext) {
      setStatus("カメラの利用にはHTTPSで開く必要があります。", "error");
      return;
    }
    if (navigator.mediaDevices?.getUserMedia === undefined) {
      setStatus("このブラウザはカメラAPIに対応していません。", "error");
      return;
    }

    startButton.disabled = true;
    setStatus("カメラを準備しています。", "neutral");

    try {
      const cv = await cvPromise;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          height: { ideal: 720 },
          width: { ideal: 1280 },
        },
      });
      video.srcObject = stream;
      await video.play();
      scanning = true;
      setRunning(true);
      setStatus("枠の中へJANコードを水平に合わせてください。", "active");
      void processFrame(cv);
    } catch (error) {
      stopCamera({ keepStatus: true });
      setStatus(
        error instanceof Error && error.message.startsWith("OpenCV")
          ? error.message
          : cameraErrorMessage(error),
        "error",
      );
    } finally {
      startButton.disabled = false;
    }
  });

  stopButton.addEventListener("click", () => {
    stopCamera();
  });

  window.addEventListener("pagehide", () => {
    stopCamera({ keepStatus: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && scanning) {
      stopCamera();
    }
  });

  try {
    await cvPromise;
    setStatus("準備ができました。カメラを開始できます。", "neutral");
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "OpenCV.jsを読み込めませんでした。",
      "error",
    );
  }
}

if (typeof document !== "undefined") {
  void initializeApp();
}
