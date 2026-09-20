function cameraErrorMessage(cause: unknown): string {
  if (cause instanceof DOMException) {
    if (cause.name === "NotAllowedError") {
      return "カメラの利用が許可されませんでした。";
    }
    if (cause.name === "NotFoundError") {
      return "利用できるカメラが見つかりませんでした。";
    }
  }
  return "カメラを開始できませんでした。";
}

export function createCamera(video: HTMLVideoElement) {
  let stream: MediaStream | null = null;
  let pending: AbortController | null = null;

  function stop() {
    pending?.abort();
    pending = null;
    for (const track of stream?.getTracks() ?? []) {
      track.stop();
    }
    stream = null;
    video.srcObject = null;
  }

  async function start(): Promise<boolean> {
    const mediaDevices = (navigator as { mediaDevices?: MediaDevices }).mediaDevices;
    if (mediaDevices === undefined) {
      throw new Error("カメラを使うにはHTTPSでページを開いてください。");
    }

    stop();
    const controller = new AbortController();
    pending = controller;
    let acquired: MediaStream | null = null;
    try {
      acquired = await mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (controller.signal.aborted) {
        for (const track of acquired.getTracks()) {
          track.stop();
        }
        return false;
      }

      stream = acquired;
      video.srcObject = stream;
      await video.play();
      return !controller.signal.aborted;
    } catch (cause) {
      const wasCancelled = controller.signal.aborted;
      if (stream === acquired) {
        stop();
      }
      if (wasCancelled) {
        return false;
      }
      throw new Error(cameraErrorMessage(cause));
    } finally {
      if (pending === controller) {
        pending = null;
      }
    }
  }

  return { start, stop };
}
