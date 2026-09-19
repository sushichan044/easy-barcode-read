/**
 * 同じ色が連続する区間。バーとスペースの幅を数えるために使う。
 */
export interface Run {
  /**
   * 区間の色。黒は"1"、白は"0"。
   */
  bit: string;
  /**
   * 開始位置（ビット列の添字）。
   */
  start: number;
  /**
   * 終了位置の次。長さはend - startで求まる。
   */
  end: number;
  length: number;
}

/**
 * ビット列を、同じ値が連続する区間の配列へ分解する。
 */
export function createRuns(bits: string): Run[] {
  const firstBit = bits[0];
  if (firstBit === undefined) {
    return [];
  }

  const runs: Run[] = [];
  let start = 0;
  let bit = firstBit;

  for (let index = 1; index <= bits.length; index += 1) {
    if (index === bits.length || bits[index] !== bit) {
      runs.push({ bit, start, end: index, length: index - start });
      start = index;
      bit = bits[index] ?? bit;
    }
  }

  return runs;
}

/**
 * 連続区間の幅を、1モジュール幅を基準に整数比へ丸めてビット列に戻す。 丸めの誤差が大きい区間が1つでもあれば、その候補は捨てる。
 */
export function modulesFromRuns(candidateRuns: Run[], moduleCount: number): string | null {
  const pixelWidth = candidateRuns.reduce((sum, run) => sum + run.length, 0);
  const moduleWidth = pixelWidth / moduleCount;
  const modules: string[] = [];

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

/**
 * モジュール幅で等間隔にサンプリングしてビット列を作る。 幅の丸めが合わない候補を、位置のサンプリングで拾い直すために使う。
 */
export function modulesBySampling(
  bits: string,
  start: number,
  end: number,
  moduleCount: number,
  offset: number = 0,
): string {
  const moduleWidth = (end - start) / moduleCount;

  return Array.from({ length: moduleCount }, (_, index) => {
    const sampleAt = Math.min(
      end - 1,
      Math.max(start, Math.floor(start + (index + 0.5 + offset) * moduleWidth)),
    );
    return bits[sampleAt] ?? "0";
  }).join("");
}
