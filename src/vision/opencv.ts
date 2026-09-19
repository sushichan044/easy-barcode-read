/**
 * OpenCV.js（WebAssembly版）の読み込み。
 *
 * Npmパッケージ同梱のOpenCV.jsを使う。このアプリでOpenCVを使うのは、 映像を白黒の二値画像へ前処理するところまで。 バーコードの復号はEANの仕様に沿って自前で実装する。
 */

/**
 * OpenCV.jsが扱う行列（cv::Mat）。
 */
export interface CvMat {
  readonly rows: number;
  readonly cols: number;
  /**
   * 1チャンネル8bitの画素値。二値化後は0か255が入る。
   */
  readonly data: Uint8Array;
  delete(): void;
}

/**
 * OpenCV.jsが扱うサイズ。
 */
export interface CvSize {
  width: number;
  height: number;
}

/**
 * このアプリで使うOpenCV.jsのAPIだけを型にしたもの。
 */
export interface Cv {
  Mat: new () => CvMat;
  Size: new (width: number, height: number) => CvSize;
  imread(source: HTMLCanvasElement): CvMat;
  cvtColor(source: CvMat, destination: CvMat, code: number): void;
  GaussianBlur(
    source: CvMat,
    destination: CvMat,
    size: CvSize,
    sigmaX: number,
    sigmaY: number,
    border: number,
  ): void;
  threshold(
    source: CvMat,
    destination: CvMat,
    threshold: number,
    maxValue: number,
    type: number,
  ): number;
  readonly COLOR_RGBA2GRAY: number;
  readonly BORDER_DEFAULT: number;
  readonly THRESH_BINARY: number;
  readonly THRESH_OTSU: number;
}

/**
 * 初期化が終わったOpenCV.js。
 *
 * OpenCV.jsは10MB近いWebAssemblyなので、静的なimportにすると初期表示まで 読み込みで止まってしまう。動的importにして、画面を出してから読み込む。
 * モジュールはthenableで、読み込みが終わると自分自身を返す。
 */
export const openCv: Promise<Cv> = import("@techstark/opencv-js").then((namespace) => {
  const module = (namespace as unknown as { default?: Promise<Cv> }).default;
  return module ?? namespace;
});
