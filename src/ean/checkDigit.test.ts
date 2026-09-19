import { describe, expect, it } from "vite-plus/test";

import { calculateCheckDigit } from "./checkDigit";

describe("calculateCheckDigit", () => {
  it("EAN-13とEAN-8の検査数字を計算する", () => {
    expect(calculateCheckDigit("490123456789")).toBe(4);
    expect(calculateCheckDigit("1234567")).toBe(0);
  });
});
