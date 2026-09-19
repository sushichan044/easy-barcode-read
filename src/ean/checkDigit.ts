/**
 * 検査数字を除いた数字列から、末尾に付く検査数字を計算する。
 *
 * 右端から数えて奇数番目の桁を3倍、偶数番目を1倍して合計し、10の補数を返す。 EAN-13とEAN-8で同じ計算式を使う。
 */
export function calculateCheckDigit(payload: string): number {
  let sum = 0;

  for (let index = payload.length - 1; index >= 0; index -= 1) {
    const digit = Number(payload[index]);
    const distanceFromRight = payload.length - 1 - index;
    sum += digit * (distanceFromRight % 2 === 0 ? 3 : 1);
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * 検査数字を含む数字列が、EANとして正しいかを返す。
 */
export function hasValidCheckDigit(value: string): boolean {
  const payload = value.slice(0, -1);
  return calculateCheckDigit(payload) === Number(value.at(-1));
}
