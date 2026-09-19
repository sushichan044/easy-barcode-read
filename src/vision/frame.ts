/**
 * カメラ映像から処理対象の帯を切り出し、Canvasへ縮小して描画する。
 *
 * バーコードを画面中央に水平に置いてもらう前提なので、映像全体ではなく 中央の横長領域だけを処理する。範囲を絞ると、走査線あたりのモジュール幅が 大きくなり、復号しやすくなる。
 */

/**
 * 処理に使うCanvasの幅。
 */
export const PROCESSING_WIDTH = 960;

/**
 * 処理に使うCanvasの高さ。
 */
export const PROCESSING_HEIGHT = 240;

/**
 * 映像全体から切り出す横方向の割合。
 */
const CROP_WIDTH_RATIO = 0.92;

/**
 * 切り出す帯の高さの上限（元の映像の高さに対する割合）。
 */
const CROP_HEIGHT_RATIO = 0.34;

/**
 * 切り出す帯の縦横比。横長に保つ。
 */
const CROP_ASPECT = 1 / 4;

/**
 * 映像に描画できるフレームがそろっているかを返す。
 */
export function hasFrame(video: HTMLVideoElement): boolean {
  return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
}

/**
 * 映像の中央を、横長の帯としてCanvasへ描画する。
 */
export function drawCrop(video: HTMLVideoElement, context: CanvasRenderingContext2D): void {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const cropWidth = sourceWidth * CROP_WIDTH_RATIO;
  const cropHeight = Math.min(sourceHeight * CROP_HEIGHT_RATIO, cropWidth * CROP_ASPECT);
  const sourceX = (sourceWidth - cropWidth) / 2;
  const sourceY = (sourceHeight - cropHeight) / 2;

  context.drawImage(
    video,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    PROCESSING_WIDTH,
    PROCESSING_HEIGHT,
  );
}
