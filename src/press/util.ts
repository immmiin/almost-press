// Small shared helpers for the press.
const K = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** 1..99 → 一 … 十六 */
export function kanjiNum(n: number): string {
  if (n <= 10) return n === 10 ? '十' : K[n];
  const t = Math.floor(n / 10), u = n % 10;
  return (t > 1 ? K[t] : '') + '十' + (u ? K[u] : '');
}
const KO = ['영', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열하나', '열둘', '열셋', '열넷', '열다섯', '열여섯'];
export const koNum = (n: number) => KO[n] ?? String(n);
