import type { BarcodeResult } from "../ean/types";

/**
 * 状態表示の色分け。CSSのdata属性と同じ名前を使う。
 */
export type StatusTone = "neutral" | "active" | "success" | "error";

interface Props {
  message: string;
  tone: StatusTone;
  result: BarcodeResult | null;
}

/**
 * 現在の状態と、読み取った形式・番号を表示する。
 */
export function ResultReadout({ message, tone, result }: Props) {
  return (
    <div className="readout">
      <p id="status" role="status" aria-live="polite" data-tone={tone}>
        {message}
      </p>
      <p id="result" aria-live="polite" hidden={result === null}>
        <span id="result-format">{result?.format ?? ""}</span>
        <strong id="result-value">{result?.value ?? ""}</strong>
      </p>
    </div>
  );
}
