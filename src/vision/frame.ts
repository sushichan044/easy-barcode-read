export const PROCESSING_WIDTH = 960;
export const PROCESSING_HEIGHT = 720;

export function drawFrame(video: HTMLVideoElement, context: CanvasRenderingContext2D): void {
  context.drawImage(video, 0, 0, PROCESSING_WIDTH, PROCESSING_HEIGHT);
}
