import { describe, expect, it } from "vite-plus/test";

import { decodeEan13Modules, decodeEan13FromScanline } from "./ean13.js";

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
const FIRST_DIGIT_PATTERNS = [
  "AAAAAA",
  "AABABB",
  "AABBAB",
  "AABBBA",
  "ABAABB",
  "ABBAAB",
  "ABBBAA",
  "ABABAB",
  "ABABBA",
  "ABBABA",
];

function encodeEan13(value) {
  const digits = Array.from(value, Number);
  const names = FIRST_DIGIT_PATTERNS[digits[0]];
  const left = digits
    .slice(1, 7)
    .map((digit, index) => (names[index] === "A" ? A_PATTERNS[digit] : B_PATTERNS[digit]))
    .join("");
  const right = digits
    .slice(7)
    .map((digit) => C_PATTERNS[digit])
    .join("");
  return `101${left}01010${right}101`;
}

function renderScanline(modules, scale, whiteModules = 12, jitter = false) {
  const pixels = Array.from({ length: scale * whiteModules }, () => 0);

  for (const [index, module] of [...modules].entries()) {
    const width = scale + (jitter && index % 23 === 11 ? 1 : 0);
    pixels.push(...Array.from({ length: width }, () => Number(module)));
  }

  pixels.push(...Array.from({ length: scale * whiteModules }, () => 0));
  return pixels;
}

const SAMPLE_VALUE = "4569951110016";
const SAMPLE_MODULES = encodeEan13(SAMPLE_VALUE);

describe("decodeEan13Modules", () => {
  it.each([
    "0000000000000",
    "1000000000009",
    "2000000000008",
    "3000000000007",
    "4000000000006",
    "5000000000005",
    "6000000000004",
    "7000000000003",
    "8000000000002",
    "9000000000001",
  ])("先頭桁が異なる番号%sを両方向から読む", (value) => {
    const modules = encodeEan13(value);
    const expected = { format: "EAN-13", value };
    expect(decodeEan13Modules(modules)).toEqual(expected);
    expect(decodeEan13Modules([...modules].reverse())).toEqual(expected);
  });

  it("95個の白黒から13桁のJANコードを読む", () => {
    expect(decodeEan13Modules(SAMPLE_MODULES)).toEqual({
      format: "EAN-13",
      value: SAMPLE_VALUE,
    });
  });

  it("逆向きのJANコードも読む", () => {
    expect(decodeEan13Modules([...SAMPLE_MODULES].reverse().join(""))).toEqual({
      format: "EAN-13",
      value: SAMPLE_VALUE,
    });
  });

  it("目印や検査数字が合わない並びを読まない", () => {
    const invalidGuard = `0${SAMPLE_MODULES.slice(1)}`;
    const invalidCheckDigit = encodeEan13("4569951110017");

    expect(decodeEan13Modules(invalidGuard)).toBeNull();
    expect(decodeEan13Modules(invalidCheckDigit)).toBeNull();
  });
});

describe("decodeEan13FromScanline", () => {
  it.each([1, 2, 6, 12])("1モジュールが%i画素のバーコードを読む", (scale) => {
    const pixels = renderScanline(SAMPLE_MODULES, scale);
    expect(decodeEan13FromScanline(pixels)).toEqual({
      format: "EAN-13",
      value: SAMPLE_VALUE,
    });
    expect(decodeEan13FromScanline(pixels.toReversed())).toEqual({
      format: "EAN-13",
      value: SAMPLE_VALUE,
    });
  });

  it.each([
    { pixels: [] },
    { pixels: [0, 0, 0] },
    { pixels: [1, 1, 1] },
    { pixels: [0, 1, 0, 1, 0] },
  ])("バーコードを含まない走査線では番号を返さない", ({ pixels }) => {
    expect(decodeEan13FromScanline(pixels)).toBeNull();
  });

  it("背景の縞の後ろにあるバーコードを読む", () => {
    const background = Array.from({ length: 80 }, (_, index) => index % 2);
    const pixels = [...background, ...renderScanline(SAMPLE_MODULES, 3)];
    expect(decodeEan13FromScanline(pixels)).toEqual({
      format: "EAN-13",
      value: SAMPLE_VALUE,
    });
  });

  it("バーが拡大され、幅が少しずれていても読む", () => {
    expect(decodeEan13FromScanline(renderScanline(SAMPLE_MODULES, 3, 12, true))).toEqual({
      format: "EAN-13",
      value: SAMPLE_VALUE,
    });
  });

  it("左右の白い余白が短い並びを読まない", () => {
    expect(decodeEan13FromScanline(renderScanline(SAMPLE_MODULES, 3, 2))).toBeNull();
  });
});
