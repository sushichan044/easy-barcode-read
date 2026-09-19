import type { Cv, CvMat } from "./opencv";

/**
 * 1つの二値画像を作るまでに使う比率。走査線を引く行を、上から順に決める。 帯の中央付近だけでなく複数の高さを見ることで、傾きや欠けに強くする。
 */
const SCANLINE_RATIOS = [0.2, 0.35, 0.5, 0.65, 0.8];

/**
 * RGBA画像をグレースケールへ変換する。
 */
export function toGrayscale(cv: Cv, source: CvMat, destination: CvMat): void {
  cv.cvtColor(source, destination, cv.COLOR_RGBA2GRAY);
}

/**
 * ガウスぼかしで画像を平滑化する。 細かなノイズや印刷のムラをならし、二値化の結果を安定させる。
 */
export function gaussianBlur(cv: Cv, source: CvMat, destination: CvMat): void {
  cv.GaussianBlur(source, destination, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
}

/**
 * Otsuの手法でしきい値を自動決定し、白黒の二値画像へ変換する。 照明の明暗に応じてしきい値が変わるので、固定値を使うより安定する。
 */
export function binarizeOtsu(cv: Cv, source: CvMat, destination: CvMat): void {
  cv.threshold(source, destination, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
}

/**
 * Canvasの映像をグレースケール・ぼかし・二値化の順に処理し、二値画像を返す。 返り値のMatは呼び出し側が使い終えたらdeleteすること。
 */
export function binarizeCanvas(cv: Cv, canvas: HTMLCanvasElement): CvMat {
  const source = cv.imread(canvas);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const binary = new cv.Mat();

  try {
    toGrayscale(cv, source, gray);
    gaussianBlur(cv, gray, blurred);
    binarizeOtsu(cv, blurred, binary);
    return binary;
  } catch (error) {
    binary.delete();
    throw error;
  } finally {
    source.delete();
    gray.delete();
    blurred.delete();
  }
}

/**
 * 二値画像の1行を、黒=1・白=0のビット列に変換する。 バーコードの情報は黒バーが持つので、黒を1とする。
 */
export function rowToBits(binary: CvMat, row: number): number[] {
  const offset = row * binary.cols;

  return Array.from(binary.data.subarray(offset, offset + binary.cols), (pixel) =>
    pixel < 128 ? 1 : 0,
  );
}

/**
 * 復号を試す走査線の行番号を返す。
 */
export function scanlineRows(binary: CvMat): number[] {
  return SCANLINE_RATIOS.map((ratio) => Math.floor(binary.rows * ratio));
}
