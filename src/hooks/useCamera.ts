import { useCallback, useEffect, useRef, useState } from "react";

/**
 * カメラの取得、video要素への接続、停止時の解放をまとめて扱う。
 *
 * 停止やページ離脱のときに全トラックを止める。カメラを掴んだままにすると、 端末のカメラランプが点いたままになるため。
 */

/**
 * カメラのエラーを、利用者向けのメッセージへ変換する。
 */
function cameraErrorMessage(cause: unknown): string {
  if (cause instanceof DOMException) {
    if (cause.name === "NotAllowedError") {
      return "カメラの利用が許可されませんでした。ブラウザの設定を確認してください。";
    }
    if (cause.name === "NotFoundError") {
      return "利用できるカメラが見つかりませんでした。";
    }
    if (cause.name === "NotReadableError") {
      return "カメラを開始できませんでした。他のアプリで使用中でないか確認してください。";
    }
  }
  return "カメラを開始できませんでした。ページを再読み込みしてお試しください。";
}

export interface CameraControls {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: (options?: { keepError?: boolean }) => void;
}

export function useCamera(): CameraControls {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(({ keepError = false }: { keepError?: boolean } = {}) => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;

    const video = videoRef.current;
    if (video !== null) {
      video.srcObject = null;
    }

    setActive(false);
    if (!keepError) {
      setError(null);
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          height: { ideal: 720 },
          width: { ideal: 1280 },
        },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video !== null) {
        video.srcObject = stream;
        await video.play();
      }

      setActive(true);
    } catch (cause) {
      stop({ keepError: true });
      setError(cameraErrorMessage(cause));
    }
  }, [stop]);

  useEffect(() => {
    const handlePageHide = () => {
      stop({ keepError: true });
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop({ keepError: true });
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stop({ keepError: true });
    };
  }, [stop]);

  return { videoRef, active, error, start, stop };
}
