// Making things on a page: stamps, words, helpers, and the side effect every edit leaves behind.
import type { Page, PageObj, Stroke } from '../model/types';
import { PAGE_W, PAGE_H } from '../model/types';
import { newId } from '../model/store';
import { OBJ } from '../objects';
import { rng, hash, clamp } from '../core/rng';
import { parse, KR, JA_RE } from '../parse/parser';
import { HELPERS } from '../type/helpers';

export type SideLevel = 'mild' | 'normal' | 'wild';
let sideLevel: SideLevel = (localStorage.getItem('ap.side') as SideLevel) || 'normal';
export const getSide = () => sideLevel;
export function setSide(v: SideLevel) { sideLevel = v; localStorage.setItem('ap.side', v); }
/** Side-effect strength from the switch and the page number. */
export function sideK(page: Page) { return ({ mild: 0.3, normal: 0.65, wild: 1.1 })[sideLevel] * (0.45 + (page.n / 16) * 0.75); }

const defaultPlates = (page: Page, r: () => number): number[] => {
  const n = page.inks.length;
  // ink roles land on plates 0..n-1; a light rotation keeps pages from looking identical
  const rot = Math.floor(r() * n);
  return [0, 1, 2].map((i) => (i + rot) % Math.min(3, n));
};

/** Default stamp size (mm, the 200-unit box): the drawing lands at about 28% of the page width. */
export const stampSize = (key: string) => (OBJ[key]?.float ? 46 : 58);
export function makeStamp(page: Page, key: string, x: number, y: number, pressure: number, seed: number): PageObj {
  const r = rng(seed);
  const s = stampSize(key) * (0.92 + r() * 0.16);
  return {
    id: newId(), kind: 'obj', key, x: x + (r() - 0.5) * 0.8, y: y + (r() - 0.5) * 0.8, s, r: (r() - 0.5) * 5,
    // every stamp lands slightly differently; pressure = how much ink
    plates: defaultPlates(page, r), seed, opacity: clamp(0.55 + pressure * 0.5, 0.5, 1),
  };
}
export function makeWord(page: Page, word: string, x: number, y: number, seed: number): PageObj {
  const r = rng(seed);
  const cjk = KR.test(word) || JA_RE.test(word);
  return { id: newId(), kind: 'word', key: word, style: Math.floor(r() * 6), x, y, s: Math.min(110, (cjk ? 26 : 16) * Math.max(2, [...word].length) * 0.62 + 20), r: (r() - 0.5) * 10, plates: defaultPlates(page, r), seed };
}
export const HELPER_SIZES: Record<string, number> = { vja: 8, hangul: 52, stretch: 70, inscription: 36, date: 3.6, seal: 12, dots: 40 };
export function makeHelper(page: Page, id: string, x: number, y: number, seed: number, text?: string): PageObj {
  const h = HELPERS.find((q) => q.id === id)!;
  const r = rng(seed);
  return { id: newId(), kind: 'helper', key: id, text: text ?? (id === 'date' ? dateText() : h.def), x, y, s: HELPER_SIZES[id] ?? 20, r: id === 'seal' ? (r() - 0.5) * 8 : 0, plates: defaultPlates(page, r), seed };
}
export function dateText() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** Bloom: a long press makes ink bloom outward around a fresh stamp. */
export function bloomStroke(o: PageObj, pressure: number): Stroke {
  return { tool: 'bleed', pts: [[o.x / PAGE_W, o.y / PAGE_H]], size: (o.s / PAGE_W) * 0.55, intensity: clamp(pressure - 0.9, 0.2, 1), seed: o.seed };
}

/** Dream sentence → stamped objects and type objects, placed in a loose composition. */
export function stampDream(page: Page, text: string, seed: number): PageObj[] {
  const { objs, words } = parse(text);
  const r = rng(seed);
  const out: PageObj[] = [];
  const ground = [[74, 160], [34, 150], [114, 154], [56, 132], [100, 128], [24, 176], [126, 178]];
  const sky = [[34, 44], [112, 36], [74, 24]];
  let gi = 0, si = 0;
  for (const key of objs.slice(0, 9)) {
    const o = OBJ[key];
    const [x, y] = o.float && si < sky.length ? sky[si++] : ground[gi++ % ground.length];
    out.push(makeStamp(page, key, x + (r() - 0.5) * 8, y + (r() - 0.5) * 6, 0.8, hash(seed, key)));
  }
  words.slice(0, 2).forEach((w, i) => out.push(makeWord(page, w, i ? 96 : 66, i ? 104 : 70, hash(seed, w))));
  return out;
}

// ---------- side effects ----------
/** move → afterimage trail */
export function sideMove(page: Page, o: PageObj, from: { x: number; y: number }) {
  const k = sideK(page);
  const d = Math.hypot(o.x - from.x, o.y - from.y);
  if (d < 4 || Math.random() > 0.35 + k * 0.5) return;
  const n = Math.min(4, 1 + Math.floor(k * 3));
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    page.objects.splice(page.objects.indexOf(o), 0, { ...o, id: newId(), x: from.x + (o.x - from.x) * t * 0.6, y: from.y + (o.y - from.y) * t * 0.6, opacity: (o.opacity ?? 1) * 0.16 * (1 - t * 0.5) * Math.min(1, k + 0.3), fx: 'trail' });
  }
}
/** erase → an object-shaped hole showing paper */
export function sideErase(page: Page, o: PageObj) {
  const k = sideK(page);
  const i = page.objects.indexOf(o);
  page.objects.splice(i, 1);
  if (o.fx === 'hole' || o.fx === 'trail') return;
  if (Math.random() < 0.4 + k * 0.5) page.objects.splice(i, 0, { ...o, id: newId(), fx: 'hole', opacity: Math.min(1, 0.45 + k * 0.4) });
}
/** scale up → a small copy stays behind */
export function sideScale(page: Page, o: PageObj, fromS: number) {
  const k = sideK(page);
  if (o.s <= fromS * 1.25 || Math.random() > 0.3 + k * 0.5) return;
  page.objects.splice(page.objects.indexOf(o), 0, { ...o, id: newId(), s: fromS * 0.7, x: o.x + (Math.random() - 0.5) * 10, y: o.y + o.s * 0.3, fx: 'copy', opacity: 0.85 });
}
/** plate change → ink bleeds onto the floor */
export function sidePlate(page: Page, o: PageObj, plate: number) {
  const k = sideK(page);
  page.strokes.push({ tool: 'bleed', pts: [[o.x / PAGE_W, Math.min(0.98, (o.y + o.s * 0.42) / PAGE_H)], [(o.x + o.s * 0.2) / PAGE_W, Math.min(0.99, (o.y + o.s * 0.48) / PAGE_H)]], size: (o.s / PAGE_W) * 0.35, intensity: clamp(0.3 + k * 0.5), seed: o.seed, plate });
}
/** duplicate → the copy is slightly wrong */
export function sideDuplicate(page: Page, o: PageObj): PageObj {
  const k = sideK(page);
  return { ...o, id: newId(), x: o.x + 7, y: o.y + 5, seed: o.seed + 1, wrong: clamp(0.25 + k * 0.6), r: o.r + (Math.random() - 0.5) * 10 * k, fx: undefined };
}
