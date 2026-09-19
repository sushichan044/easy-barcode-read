import { useEffect, useState } from "react";

import { openCv } from "../vision/opencv";
import type { Cv } from "../vision/opencv";

interface OpenCvState {
  cv: Cv | null;
  error: string | null;
}

/**
 * OpenCV.jsの初期化が終わるのを待ち、準備完了かエラーを返す。 読み込みには時間がかかるので、完了まではcvがnullになる。
 */
export function useOpenCv(): OpenCvState {
  const [cv, setCv] = useState<Cv | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    openCv
      .then((loaded) => {
        if (active) {
          setCv(loaded);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "OpenCV.jsを読み込めませんでした。");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { cv, error };
}
