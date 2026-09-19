import { hasValidCheckDigit } from "./checkDigit";
import { EAN13_PARITIES, FORMATS, G_PATTERNS, L_PATTERNS, R_PATTERNS } from "./patterns";
import { createRuns, modulesBySampling, modulesFromRuns } from "./runs";
import type { BarcodeResult } from "./types";

/**
 * 7モジュールの符号を数字へ変換する。どの表にも無ければnull。
 */
function findPattern(pattern: string, patterns: readonly string[]): number | null {
  const index = patterns.indexOf(pattern);
  return index === -1 ? null : index;
}

/**
 * 95モジュールのビット列をEAN-13として復号する。
 *
 * 先頭・中央・末尾のガードを確認し、左6桁をL/G符号として読み、そのパリティから 先頭桁を復元する。最後に検査数字を検算して、誤読した候補を落とす。
 */
function decodeEan13(bits: string): BarcodeResult | null {
  if (
    bits.length !== 95 ||
    bits.slice(0, 3) !== "101" ||
    bits.slice(45, 50) !== "01010" ||
    bits.slice(92) !== "101"
  ) {
    return null;
  }

  const leftDigits: number[] = [];
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

  const firstDigit = findPattern(parity, EAN13_PARITIES);
  if (firstDigit === null) {
    return null;
  }

  const rightDigits: number[] = [];
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

/**
 * 67モジュールのビット列をEAN-8として復号する。 EAN-13と違い、左4桁はL符号だけを使い、先頭桁の復元は不要。
 */
function decodeEan8(bits: string): BarcodeResult | null {
  if (
    bits.length !== 67 ||
    bits.slice(0, 3) !== "101" ||
    bits.slice(31, 36) !== "01010" ||
    bits.slice(64) !== "101"
  ) {
    return null;
  }

  const digits: number[] = [];

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

/**
 * ビット列の長さから形式を選んで復号する。
 */
function decodeForward(bits: string): BarcodeResult | null {
  if (bits.length === 95) {
    return decodeEan13(bits);
  }
  if (bits.length === 67) {
    return decodeEan8(bits);
  }
  return null;
}

/**
 * モジュール列をEAN-13/EAN-8として復号する。 バーコードは逆さまでも読める必要があるので、正方向で失敗したら逆方向も試す。
 */
export function decodeModuleBits(input: string | number[]): BarcodeResult | null {
  const bits = Array.isArray(input) ? input.join("") : input;
  const forward = decodeForward(bits);

  if (forward !== null) {
    return forward;
  }

  return decodeForward(bits.split("").reverse().join(""));
}

/**
 * 走査線1本のビット列からEANを探して復号する。
 *
 * ガードを含む決まった数の連続区間を切り出し、前後に十分な白（クワイエットゾーン）が あることを確認する。区間の幅から作った2通りの候補を試し、形式が一致すれば採用する。
 */
export function decodeScanline(bits: number[]): BarcodeResult | null {
  const text = bits.join("");
  const runs = createRuns(text);

  for (const configuration of FORMATS) {
    for (let startIndex = 0; startIndex + configuration.runs <= runs.length; startIndex += 1) {
      const endIndex = startIndex + configuration.runs - 1;
      const first = runs[startIndex];
      const last = runs[endIndex];
      if (first === undefined || last === undefined || first.bit !== "1" || last.bit !== "1") {
        continue;
      }

      const candidateRuns = runs.slice(startIndex, endIndex + 1);
      const start = candidateRuns[0]?.start ?? 0;
      const end = candidateRuns.at(-1)?.end ?? 0;
      const moduleWidth = (end - start) / configuration.modules;
      const quietBefore = runs[startIndex - 1];
      const quietAfter = runs[endIndex + 1];

      if (
        quietBefore === undefined ||
        quietAfter === undefined ||
        quietBefore.bit !== "0" ||
        quietAfter.bit !== "0" ||
        quietBefore.length < moduleWidth * 3 ||
        quietAfter.length < moduleWidth * 3
      ) {
        continue;
      }

      const normalized = modulesFromRuns(candidateRuns, configuration.modules);
      const sampled = modulesBySampling(text, start, end, configuration.modules);

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
