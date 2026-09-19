import { describe, expect, it } from "vite-plus/test";

import {
  DetectionConsensus,
  calculateCheckDigit,
  decodeModuleBits,
  decodeScanline,
} from "./index.js";

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

function encodeEan13(value) {
  const digits = [...value].map(Number);
  const parity = EAN13_PARITIES[digits[0]];
  const left = digits
    .slice(1, 7)
    .map((digit, index) => (parity[index] === "L" ? L_PATTERNS[digit] : G_PATTERNS[digit]))
    .join("");
  const right = digits
    .slice(7)
    .map((digit) => R_PATTERNS[digit])
    .join("");
  return `101${left}01010${right}101`;
}

function encodeEan8(value) {
  const digits = [...value].map(Number);
  const left = digits
    .slice(0, 4)
    .map((digit) => L_PATTERNS[digit])
    .join("");
  const right = digits
    .slice(4)
    .map((digit) => R_PATTERNS[digit])
    .join("");
  return `101${left}01010${right}101`;
}

function renderScanline(modules, scale, jitter = false) {
  const bits = Array.from({ length: scale * 12 }, () => 0);

  for (const [index, module] of [...modules].entries()) {
    const width = scale + (jitter && index % 23 === 11 ? 1 : 0);
    bits.push(...Array.from({ length: width }, () => Number(module)));
  }

  bits.push(...Array.from({ length: scale * 12 }, () => 0));
  return bits;
}

describe("calculateCheckDigit", () => {
  it("calculates EAN-13 and EAN-8 check digits", () => {
    expect(calculateCheckDigit("490123456789")).toBe(4);
    expect(calculateCheckDigit("1234567")).toBe(0);
  });
});

describe("decodeModuleBits", () => {
  it("decodes EAN-13 and EAN-8 module sequences", () => {
    expect(decodeModuleBits(encodeEan13("4901234567894"))).toEqual({
      format: "EAN-13",
      value: "4901234567894",
    });
    expect(decodeModuleBits(encodeEan8("12345670"))).toEqual({
      format: "EAN-8",
      value: "12345670",
    });
  });

  it("decodes barcodes scanned from the opposite direction", () => {
    const reversed = encodeEan13("4901234567894").split("").reverse().join("");

    expect(decodeModuleBits(reversed)).toEqual({
      format: "EAN-13",
      value: "4901234567894",
    });
  });

  it("rejects invalid guards and check digits", () => {
    const invalidGuard = `0${encodeEan13("4901234567894").slice(1)}`;

    expect(decodeModuleBits(invalidGuard)).toBeNull();
    expect(decodeModuleBits(encodeEan13("4901234567895"))).toBeNull();
  });
});

describe("decodeScanline", () => {
  it("decodes different scales with small width variations", () => {
    const ean13 = encodeEan13("4901234567894");
    const ean8 = encodeEan8("12345670");

    expect(decodeScanline(renderScanline(ean13, 3))).toEqual({
      format: "EAN-13",
      value: "4901234567894",
    });
    expect(decodeScanline(renderScanline(ean8, 5, true))).toEqual({
      format: "EAN-8",
      value: "12345670",
    });
  });
});

describe("DetectionConsensus", () => {
  const detection = { format: "EAN-13", value: "4901234567894" };

  it("accepts two matching scanlines in one frame", () => {
    const consensus = new DetectionConsensus();

    expect(consensus.add([detection, detection], 100)).toEqual(detection);
  });

  it("accepts the same result across three recent frames", () => {
    const consensus = new DetectionConsensus();

    expect(consensus.add([detection], 100)).toBeNull();
    expect(consensus.add([detection], 400)).toBeNull();
    expect(consensus.add([detection], 700)).toEqual(detection);
  });
});
