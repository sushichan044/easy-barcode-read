/**
 * EAN-13/EAN-8が使う7モジュールの符号表。
 *
 * EANの1桁は7ビットで表す。左半分はL（奇数パリティ）とG（偶数パリティ）、 右半分はR符号を使う。GはLの反転、RはLのビット反転なので、表を別々に持つ。
 */
export const L_PATTERNS = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
] as const;

export const G_PATTERNS = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
] as const;

export const R_PATTERNS = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
] as const;

/**
 * EAN-13の左6桁にどのパリティ（L/G）を並べたかで、先頭桁が決まる。 左6桁の並びを読み取れば、表の位置から13桁目の先頭を復元できる。
 */
export const EAN13_PARITIES = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
] as const;

/**
 * 対応する形式ごとの総モジュール数と、ぼけを許容する連続区間数の範囲。
 */
export const FORMATS = [
  { format: "EAN-13", modules: 95, minRuns: 50, maxRuns: 70 },
  { format: "EAN-8", modules: 67, minRuns: 35, maxRuns: 50 },
] as const;
