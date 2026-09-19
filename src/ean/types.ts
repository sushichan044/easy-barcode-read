/**
 * 読み取りに成功したバーコードの形式と番号。
 */
export interface BarcodeResult {
  format: "EAN-13" | "EAN-8";
  value: string;
}
