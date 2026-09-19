export const PROCESSING_WIDTH = 960;
export const PROCESSING_HEIGHT = 240;

const CROP_WIDTH_RATIO = 0.92;
const CROP_HEIGHT_RATIO = 0.34;
const CROP_ASPECT = 1 / 4;

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
