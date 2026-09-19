export const PROCESSING_WIDTH = 960;
export const PROCESSING_HEIGHT = 450;

const REGION_LEFT = 0.2;
const REGION_TOP = 0.25;
const REGION_WIDTH = 0.6;
const REGION_HEIGHT = 0.5;

export function drawFrame(video: HTMLVideoElement, context: CanvasRenderingContext2D): void {
  context.drawImage(
    video,
    video.videoWidth * REGION_LEFT,
    video.videoHeight * REGION_TOP,
    video.videoWidth * REGION_WIDTH,
    video.videoHeight * REGION_HEIGHT,
    0,
    0,
    PROCESSING_WIDTH,
    PROCESSING_HEIGHT,
  );
}
