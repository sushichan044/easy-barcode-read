import { describe, expect, it } from "vite-plus/test";

import { decodeModuleBits, decodeScanline } from "./decode";
import { EAN13_PARITIES, G_PATTERNS, L_PATTERNS, R_PATTERNS } from "./patterns";

/**
 * テスト用にEAN-13のビット列を組み立てる。
 */
function encodeEan13(value: string): string {
  const digits = Array.from(value, (char) => Number(char));
  const parity = EAN13_PARITIES[digits[0] ?? 0];
  const left = digits
    .slice(1, 7)
    .map((digit, index) => (parity?.[index] === "L" ? L_PATTERNS[digit] : G_PATTERNS[digit]))
    .join("");
  const right = digits
    .slice(7)
    .map((digit) => R_PATTERNS[digit])
    .join("");
  return `101${left}01010${right}101`;
}

/**
 * テスト用にEAN-8のビット列を組み立てる。
 */
function encodeEan8(value: string): string {
  const digits = Array.from(value, (char) => Number(char));
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

/**
 * モジュール列を、指定した拡大率の走査線ビット列へ描く。
 */
function renderScanline(modules: string, scale: number, jitter = false): number[] {
  const bits = Array.from({ length: scale * 12 }, () => 0);

  for (const [index, module] of Array.from(modules).entries()) {
    const width = scale + (jitter && index % 23 === 11 ? 1 : 0);
    bits.push(...Array.from({ length: width }, () => Number(module)));
  }

  bits.push(...Array.from({ length: scale * 12 }, () => 0));
  return bits;
}

describe("decodeModuleBits", () => {
  it("EAN-13とEAN-8のモジュール列を復号する", () => {
    expect(decodeModuleBits(encodeEan13("4901234567894"))).toEqual({
      format: "EAN-13",
      value: "4901234567894",
    });
    expect(decodeModuleBits(encodeEan8("12345670"))).toEqual({
      format: "EAN-8",
      value: "12345670",
    });
  });

  it("逆方向から読んだバーコードも復号する", () => {
    const reversed = encodeEan13("4901234567894").split("").reverse().join("");

    expect(decodeModuleBits(reversed)).toEqual({
      format: "EAN-13",
      value: "4901234567894",
    });
  });

  it("不正なガードパターンや検査数字を拒否する", () => {
    const invalidGuard = `0${encodeEan13("4901234567894").slice(1)}`;

    expect(decodeModuleBits(invalidGuard)).toBeNull();
    expect(decodeModuleBits(encodeEan13("4901234567895"))).toBeNull();
  });
});

describe("decodeScanline", () => {
  it("拡大率と軽い幅の揺れが違っても復号する", () => {
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
