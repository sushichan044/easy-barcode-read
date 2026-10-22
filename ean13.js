//@ts-check

/**
 * @typedef {{ format: "EAN-13", value: string }} BarcodeResult
 */

/**
 * @typedef {{ bit: string, start: number, end: number, length: number }} Run
 */

/**
 * @param {string} pixelBits
 * @returns {Run[]}
 */
function groupConsecutivePixels(pixelBits) {
  if (pixelBits.length === 0) {
    return [];
  }

  const runs = [];
  let start = 0;
  let bit = pixelBits[0];

  for (let index = 1; index <= pixelBits.length; index += 1) {
    if (index === pixelBits.length || pixelBits[index] !== bit) {
      runs.push({ bit, start, end: index, length: index - start });
      start = index;
      bit = pixelBits[index] ?? bit;
    }
  }

  return runs;
}

const MIN_RUNS = 50;
const MAX_RUNS = 70;
const MIN_MODULE_WIDTH = 1;
const MAX_MODULE_WIDTH = 12;
const MIN_QUIET_ZONE_MODULES = 3;
/**
 * @param {Run[]} runs
 * @yields {{ start: number, end: number }}
 */
function* findBarcodeCandidates(runs) {
  for (let startIdx = 1; startIdx < runs.length - 1; startIdx += 1) {
    const first = runs[startIdx];
    const whiteBefore = runs[startIdx - 1];
    if (first.bit !== "1") {
      continue;
    }

    const firstEndIdx = startIdx + MIN_RUNS - 1;
    const lastEndIdx = Math.min(startIdx + MAX_RUNS - 1, runs.length - 2);
    for (let endIdx = firstEndIdx; endIdx <= lastEndIdx; endIdx += 1) {
      const last = runs[endIdx];
      const whiteAfter = runs[endIdx + 1];
      // 左右に白い余白があり、かつ黒で始まり黒で終わる範囲を絞り込む
      if (last.bit !== "1") {
        continue;
      }
      const moduleWidth = (last.end - first.start) / MODULE_COUNT;
      if (moduleWidth > MAX_MODULE_WIDTH) {
        break;
      }
      if (
        moduleWidth < MIN_MODULE_WIDTH ||
        whiteBefore.length < moduleWidth * MIN_QUIET_ZONE_MODULES ||
        whiteAfter.length < moduleWidth * MIN_QUIET_ZONE_MODULES
      ) {
        continue;
      }
      yield { start: first.start, end: last.end };
    }
  }
}

const MODULE_COUNT = 95;

/**
 * @param {Array<0 | 1>} pixels
 * @returns {BarcodeResult | null}
 */
export function decodeEan13FromScanline(pixels) {
  const pixelBits = pixels.join("");
  const runs = groupConsecutivePixels(pixelBits);

  for (const { start, end } of findBarcodeCandidates(runs)) {
    const moduleBits = resampleEan13Modules(pixelBits, start, end);
    // ここでJANコードを復号(次章で実装します)
    const result = decodeEan13Modules(moduleBits);
    if (result) {
      return result;
    }
  }
  return null;
}

// JANコードらしき領域を横に95等分して色を取り出す
function resampleEan13Modules(pixelBits, start, end) {
  const moduleWidth = (end - start) / MODULE_COUNT;

  return Array.from({ length: MODULE_COUNT }, (_, index) => {
    const sampleAt = Math.floor(start + (index + 0.5) * moduleWidth);
    return pixelBits[sampleAt];
  }).join("");
}

const FIRST_DIGIT_PATTERNS = [
  "AAAAAA", // 0
  "AABABB", // 1
  "AABBAB", // 2
  "AABBBA", // 3
  "ABAABB", // 4
  "ABBAAB", // 5
  "ABBBAA", // 6
  "ABABAB", // 7
  "ABABBA", // 8
  "ABBABA", // 9
];

const A_PATTERNS = [
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

const B_PATTERNS = [
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

/**
 * @param {string} pattern
 * @param {string[]} patterns
 * @returns {number | null}
 */
function findDigitForPattern(pattern, patterns) {
  const index = patterns.indexOf(pattern);
  return index === -1 ? null : index;
}

/**
 * @param {string} moduleBits
 * @returns {string | null}
 */
function decodeLeftEan13Digits(moduleBits) {
  let digits = "";
  let patternNames = "";

  for (let index = 0; index < 6; index += 1) {
    // 左端の目印3モジュールを除き、1桁分の7モジュールを取り出す
    const pattern = moduleBits.slice(3 + index * 7, 10 + index * 7);
    const aDigit = findDigitForPattern(pattern, A_PATTERNS);
    const bDigit = findDigitForPattern(pattern, B_PATTERNS);
    const digit = aDigit ?? bDigit;
    if (digit === null) {
      return null;
    }
    digits += digit;
    patternNames += aDigit !== null ? "A" : "B";
  }

  // 6桁分のA・Bの並びを使って先頭桁を復元する
  const firstDigit = findDigitForPattern(patternNames, FIRST_DIGIT_PATTERNS);
  return firstDigit === null ? null : firstDigit + digits;
}

const C_PATTERNS = [
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

/**
 * @param {string} moduleBits
 * @returns {string | null}
 */
function decodeRightEan13Digits(moduleBits) {
  let digits = "";
  for (let index = 0; index < 6; index += 1) {
    // 左端〜中央の 3 + 42 + 5 = 50 モジュールを飛ばして読み始める
    const pattern = moduleBits.slice(50 + index * 7, 57 + index * 7);
    const digit = findDigitForPattern(pattern, C_PATTERNS);
    if (digit === null) {
      return null;
    }
    digits += digit;
  }
  return digits;
}

/**
 * @param {string} payload
 * @returns {number}
 */
function calculateEan13CheckDigit(payload) {
  let sum = 0;

  for (let index = payload.length - 1; index >= 0; index -= 1) {
    const digit = Number(payload[index]);
    const distanceFromRight = payload.length - 1 - index;
    sum += digit * (distanceFromRight % 2 === 0 ? 3 : 1);
  }

  // 次の10の倍数までに足すべき数字を求める
  return (10 - (sum % 10)) % 10;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function hasValidEan13CheckDigit(value) {
  return calculateEan13CheckDigit(value.slice(0, -1)) === Number(value.at(-1));
}

/**
 * @param {string | Array<0 | 1>} modules
 * @returns {BarcodeResult | null}
 */
export function decodeEan13Modules(modules) {
  const moduleBits = Array.isArray(modules) ? modules.join("") : modules;

  for (const orderedModules of [moduleBits, [...moduleBits].reverse().join("")]) {
    // 両端の101と中央の01010が揃っているか確認
    if (
      orderedModules.length !== MODULE_COUNT ||
      orderedModules.slice(0, 3) !== "101" ||
      orderedModules.slice(45, 50) !== "01010" ||
      orderedModules.slice(92) !== "101"
    ) {
      continue;
    }

    const leftDigits = decodeLeftEan13Digits(orderedModules);
    const rightDigits = decodeRightEan13Digits(orderedModules);
    if (leftDigits === null || rightDigits === null) {
      continue;
    }

    const value = leftDigits + rightDigits;
    if (hasValidEan13CheckDigit(value)) {
      return { format: "EAN-13", value };
    }
  }
  return null;
}
