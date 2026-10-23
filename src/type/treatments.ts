// The six typographic treatments for words without objects, ported from the reference.
// Text is drawn through riso/draw.ts, which converts it to opentype.js outlines once the font is loaded.
import { s, t, k, R, type Part } from '../riso/parts';
import { KR, JA_RE } from '../parse/parser';

const esc = (v: string) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
interface F { fat: string; heavy: string; tall: string; serif: string; fatN: string; heavyN: string; tallN: string; serifN: string }
export function fonts(w: string): F {
  if (KR.test(w)) return { fat: "'Bagel Fat One',sans-serif", heavy: "'Black Han Sans',sans-serif", tall: "'Do Hyeon',sans-serif", serif: "'Gowun Batang',serif", fatN: 'Bagel Fat One', heavyN: 'Black Han Sans', tallN: 'Do Hyeon', serifN: 'Gowun Batang' };
  if (JA_RE.test(w)) return { fat: "'Dela Gothic One',sans-serif", heavy: "'Dela Gothic One',sans-serif", tall: "'DotGothic16',monospace", serif: "'Shippori Mincho B1',serif", fatN: 'Dela Gothic One', heavyN: 'Dela Gothic One', tallN: 'DotGothic16', serifN: 'Shippori Mincho B1' };
  return { fat: "'Bagel Fat One',sans-serif", heavy: "'Rubik Mono One',sans-serif", tall: "'Rubik Mono One',sans-serif", serif: "'Bodoni Moda',serif", fatN: 'Bagel Fat One', heavyN: 'Rubik Mono One', tallN: 'Rubik Mono One, stretched', serifN: 'Bodoni Moda Italic' };
}
interface B { cx: number; by: number; size: number; len: number }
const T = (w: string, x: number, y: number, size: number, len: number, font: string, extra = '') => `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" textLength="${len}" lengthAdjust="spacingAndGlyphs" text-anchor="middle" ${extra} fill="{F}">${esc(w)}</text>`;
const TS = (w: string, x: number, y: number, size: number, len: number, font: string, sw: number) => `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" textLength="${len}" lengthAdjust="spacingAndGlyphs" text-anchor="middle" fill="none" stroke="{F}" stroke-width="${sw}" stroke-linejoin="round">${esc(w)}</text>`;
const CJK = (w: string) => KR.test(w) || JA_RE.test(w);

export const STYLES: { en: string; f: (w: string, F: F, b: B) => Part[]; font: (F: F) => string }[] = [
  { en: 'Fat, double-struck', f: (w, F, b) => [s(1, T(w, b.cx + b.size * .06, b.by + b.size * .06, b.size, b.len, F.fat)), s(0, T(w, b.cx, b.by, b.size, b.len, F.fat))], font: (F) => F.fatN },
  { en: 'Outline over halftone', f: (w, F, b) => [t(2, T(w, b.cx, b.by, b.size, b.len, F.heavy)), s(1, TS(w, b.cx, b.by, b.size, b.len, F.heavy, b.size * .035))], font: (F) => F.heavyN },
  { en: 'Stretched tall', f: (w, F, b) => [t(0, T(w, b.cx + b.size * .08, b.by + b.size * .05, b.size * 1.7, b.len * .92, F.tall)), s(2, T(w, b.cx, b.by, b.size * 1.7, b.len * .92, F.tall))], font: (F) => F.tallN },
  { en: 'Afterimage', f: (w, F, b) => [t(0, T(w, b.cx - b.size * .36, b.by - b.size * .12, b.size, b.len, F.fat)), t(2, T(w, b.cx - b.size * .18, b.by - b.size * .06, b.size, b.len, F.fat)), s(1, T(w, b.cx, b.by, b.size, b.len, F.fat))], font: (F) => F.fatN },
  { en: 'Serif with a brushed underline', f: (w, F, b) => [s(0, `<path d="M${b.cx - b.len / 2} ${b.by + b.size * .18} Q${b.cx} ${b.by + b.size * .02} ${b.cx + b.len / 2} ${b.by + b.size * .2}" fill="none" stroke="{F}" stroke-width="${b.size * .14}" stroke-linecap="round"/>`), s(1, T(w, b.cx, b.by, b.size * 1.05, b.len, F.serif, CJK(w) ? `transform="skewX(-10)" transform-origin="${b.cx} ${b.by}"` : 'font-style="italic"'))], font: (F) => F.serifN },
  { en: 'Sliced', f: (w, F, b) => [t(1, R(b.cx - b.len / 2 - 8, b.by - b.size * .82, b.len + 16, b.size * 1.0)), s(0, T(w, b.cx, b.by, b.size, b.len, F.heavy)), ...[.62, .42, .22].map((q) => k(R(b.cx - b.len / 2 - 20, b.by - b.size * q, b.len + 40, b.size * .05)))], font: (F) => F.heavyN },
];
export function wordLen(w: string, max: number, per: number) { return Math.min(max, Math.max(per * 1.6, [...w].length * per)); }

const cache = new Map<string, Part[]>();
/** A word as a type object in a 200×120 box (centre 100,60). */
export function wordParts(w: string, style: number): Part[] {
  const key = `${style}|${w}`;
  let p = cache.get(key);
  if (!p) {
    const cjk = CJK(w);
    const size = cjk ? 58 : 50;
    const b = { cx: 100, by: 60 + size * 0.34, size, len: wordLen(w, 186, cjk ? 58 : 32) };
    p = STYLES[((style % 6) + 6) % 6].f(w, fonts(w), b);
    cache.set(key, p);
  }
  return p;
}
