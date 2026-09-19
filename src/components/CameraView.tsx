import type { RefObject } from "react";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  running: boolean;
}

/**
 * カメラ映像と、読み取り範囲を表示する。
 */
export function CameraView({ videoRef, running }: Props) {
  return (
    <section id="scanner" data-running={running} aria-label="カメラ映像">
      <video ref={videoRef} id="camera" autoPlay muted playsInline />
      <div className="empty-camera" aria-hidden="true">
        <span className="barcode-mark" />
        カメラはまだ起動していません
      </div>
      <span className="guide" aria-hidden="true" />
    </section>
  );
}
