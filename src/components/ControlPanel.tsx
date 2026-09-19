interface Props {
  running: boolean;
  ready: boolean;
  onStart: () => Promise<void>;
  onStop: () => void;
}

/**
 * 説明文と、開始・停止の操作をまとめたパネル。
 */
export function ControlPanel({ running, ready, onStart, onStop }: Props) {
  return (
    <section className="panel" aria-labelledby="camera-guide">
      <div>
        <p id="camera-guide" className="lead">
          カメラを使い、枠内のJANコードを端末上で読み取ります。
        </p>
        <p className="privacy">
          開始するとカメラの使用許可を求めます。
          <strong>映像や画像は外部へ送信せず、この端末内だけで処理します。</strong>
        </p>
      </div>
      {running ? (
        <button id="stop-camera" className="button button--stop" type="button" onClick={onStop}>
          カメラを停止
        </button>
      ) : (
        <button
          id="start-camera"
          className="button"
          type="button"
          disabled={!ready}
          onClick={() => void onStart()}
        >
          カメラを開始
        </button>
      )}
    </section>
  );
}
