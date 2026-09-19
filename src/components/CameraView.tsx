import type { RefObject } from "react";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  running: boolean;
}

/**
 * カメラ映像と、バーコードを合わせるガイド枠を表示する。
 */
export function CameraView({ videoRef, running }: Props) {
  return (
    <section id="scanner" data-running={String(running)} aria-label="カメラ映像">
      <video ref={videoRef} id="camera" autoPlay muted playsInline />
      <div className="empty-camera" aria-hidden="true">
        <span className="barcode-mark" />
        <span>カメラはまだ起動していません</span>
      </div>
      <div className="guide" aria-hidden="true" />
    </section>
  );
}
