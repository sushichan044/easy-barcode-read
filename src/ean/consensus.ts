import type { BarcodeResult } from "./types";

interface HistoryEntry {
  key: string;
  timestamp: number;
}

/**
 * 複数の走査線と連続フレームで同じ結果が得られたときだけ、読み取り成功とみなす。
 *
 * 二値化した映像には反射や欠けによる誤検出が混じる。1回の検出で確定せず、 同じ形式と番号が繰り返し現れるまで待つことで、誤読を減らす。
 */
export class DetectionConsensus {
  #history: HistoryEntry[] = [];
  readonly #requiredFrames: number;
  readonly #windowMs: number;

  constructor({
    requiredFrames = 3,
    windowMs = 1200,
  }: { requiredFrames?: number; windowMs?: number } = {}) {
    this.#requiredFrames = requiredFrames;
    this.#windowMs = windowMs;
  }

  /**
   * 1フレーム分の検出結果を渡す。
   *
   * 同じ値が1フレームに2回以上現れるか、直近の複数フレームで規定回数そろえば、 その結果を確定として返す。どちらも満たさなければnullを返す。
   */
  add(detections: BarcodeResult[], now: number = Date.now()): BarcodeResult | null {
    const frameCounts = new Map<string, number>();

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
        this.reset();
        const [format, value] = key.split("|");
        if (format === undefined || value === undefined) {
          continue;
        }
        return { format: format as BarcodeResult["format"], value };
      }
    }

    return null;
  }

  reset(): void {
    this.#history = [];
  }
}
