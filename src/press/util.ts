// Small shared helpers for the press.
const K = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** 1..99 → 一 … 十六 */
export function kanjiNum(n: number): string {
  if (n <= 10) return n === 10 ? '十' : K[n];
  const t = Math.floor(n / 10), u = n % 10;
  return (t > 1 ? K[t] : '') + '十' + (u ? K[u] : '');
}
