import { describe, expect, it } from "vite-plus/test";

import { createRuns, modulesBySampling, modulesFromRuns } from "./runs";

describe("createRuns", () => {
  it("同じ値が連続する区間へ分解する", () => {
    expect(createRuns("0011100")).toEqual([
      { bit: "0", start: 0, end: 2, length: 2 },
      { bit: "1", start: 2, end: 5, length: 3 },
      { bit: "0", start: 5, end: 7, length: 2 },
    ]);
  });
});

describe("modulesFromRuns", () => {
  it("区間の幅をモジュール数へ正規化する", () => {
    const runs = createRuns("1110001111");

    expect(modulesFromRuns(runs, 10)).toBe("1110001111");
  });

  it("モジュール幅に収まらない区間があれば候補を捨てる", () => {
    const runs = createRuns("100000000001");

    expect(modulesFromRuns(runs, 7)).toBeNull();
  });
});

describe("modulesBySampling", () => {
  it("等間隔にサンプリングしてビット列を作る", () => {
    expect(modulesBySampling("1100", 0, 4, 4)).toBe("1100");
  });
});
