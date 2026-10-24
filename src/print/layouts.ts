// Layout templates the machine uses to set up a new sheet (the user then edits freely).
import type { Page, PageObj } from '../model/types';
import { PAGE_W, PAGE_H } from '../model/types';
import type { Rng } from '../core/rng';
import { pick } from '../core/rng';
import { newId } from '../model/store';
import { OBJ, nameOf } from '../objects';
import { kanjiNum } from '../press/util';

export const LAYOUTS = ['void', 'wash', 'vaxis', 'softtype', 'scroll', 'tableau', 'horizon', 'closeup', 'solar'] as const;
export type Layout = (typeof LAYOUTS)[number];

const helper = (page: Page, key: string, text: string, x: number, y: number, s: number, r = 0, plates?: number[]): PageObj =>
  ({ id: newId(), kind: 'helper', key, text, x, y, s, r, plates: plates ?? [0, 1, 2].map((i) => i % page.inks.length), seed: Math.floor(x * 31 + y) });

const JA_TIME = ['夜明け', '昼', '夕暮れ', '月明かり'];
const real = (objs: PageObj[]) => objs.filter((o) => !o.fx && o.kind !== 'helper');

/** Arrange a page's objects into a template and add the template's type helpers. */
export function applyLayout(layout: Layout, page: Page, r: Rng, keepsakeId?: string) {
  const objs = real(page.objects);
  const others = objs.filter((o) => o.id !== keepsakeId);
  const n = page.inks.length;
  const top = n - 1;
  const ja = (k: string) => (OBJ[k] ? nameOf(k, 'ja') : k);
  const band = Math.min(3, Math.floor((page.n - 1) / 4));
  switch (layout) {
    case 'void': {
      // vast emptiness with one small object
      others.slice(1).forEach((o) => { o.s *= 0.6; o.opacity = (o.opacity ?? 1) * 0.55; o.x = 20 + r() * 108; o.y = 150 + r() * 40; });
      const hero = others[0]; if (hero) { hero.s = 22 + r() * 10; hero.x = 40 + r() * 70; hero.y = 120 + r() * 40; }
      page.objects.push(helper(page, 'inscription', inscription(page, r), 14, 28, 30));
      break;
    }
    case 'wash': page.ground = 'wash'; objs.forEach((o) => { o.y = 60 + r() * 120; }); break;
    case 'vaxis': {
      const word = others[0] ? ja(others[0].key) : '夢';
      const text = (word + 'のゆめ').slice(0, 8);
      page.objects.push(helper(page, 'vja', text, 122, 30 + text.length * 4.2, 9, 0, [top, 0, 1]));
      others.forEach((o, i) => { o.x = 24 + (i % 3) * 30 + r() * 8; o.y = 70 + Math.floor(i / 3) * 44 + r() * 10; });
      break;
    }
    case 'softtype': {
      const o = others[0];
      if (o) page.objects.push({ id: newId(), kind: 'word', key: nameOf(o.key, pick(r, ['en', 'ja'] as const)).toLowerCase(), style: Math.floor(r() * 6), x: PAGE_W / 2, y: 70 + r() * 30, s: 132, r: (r() - 0.5) * 8, plates: [top, 0, 1], seed: 5, opacity: 0.9 });
      page.strokes.push({ tool: 'haze', pts: [[0.1, 0.4], [0.9, 0.42]], size: 0.16, intensity: 0.7, seed: 4 });
      break;
    }
    case 'scroll': {
      // tall scroll-like composition: objects stacked down a vertical path, near to far
      others.forEach((o, i) => { const t = (i + 0.5) / Math.max(1, others.length); o.y = 30 + t * 150; o.x = PAGE_W / 2 + Math.sin(t * 5 + r()) * 34; o.s *= 0.6 + t * 0.6; });
      page.objects.push(helper(page, 'date', datecol(page), 140, 100, 3.6));
      break;
    }
    case 'tableau': {
      others.forEach((o) => { o.x = 16 + r() * 116; o.y = 80 + r() * 100; o.s *= 0.8 + r() * 0.5; });
      page.objects.sort((a, b) => (a.kind === 'helper' ? 1 : 0) - (b.kind === 'helper' ? 1 : 0) || a.y - b.y);
      break;
    }
    case 'horizon': {
      page.ground = pick(r, ['horizon', 'sea', 'pool'] as const);
      others.forEach((o, i) => { const far = i % 2 === 0; o.y = far ? 112 + r() * 8 : 150 + r() * 30; o.s *= far ? 0.55 : 1.1; o.x = 18 + r() * 112; });
      break;
    }
    case 'closeup': {
      const o = others[0]; if (o) { o.s = 150 + r() * 60; o.x = PAGE_W / 2 + (r() - 0.5) * 40; o.y = PAGE_H / 2 + (r() - 0.5) * 30; }
      others.slice(1).forEach((q) => { q.s *= 0.5; q.opacity = 0.7; });
      page.objects.push(helper(page, 'inscription', inscription(page, r), 12, 186, 28));
      break;
    }
    case 'solar': {
      // 24 solar-terms poster: big vertical CJK + one halftone object + tiny bilingual text
      const o = others[0];
      const word = o ? ja(o.key) : '殆';
      page.objects.push(helper(page, 'vja', [...word].slice(0, 3).join(''), 118, 66, 22, 0, [0, 1, 2]));
      if (o) { o.s = 70; o.x = 56; o.y = 118; }
      others.slice(1).forEach((q) => { q.s *= 0.4; q.x = 20 + r() * 40; q.y = 170 + r() * 14; });
      page.objects.push(helper(page, 'inscription', `${kanjiNum(page.n)} · ${JA_TIME[band]}\n${o ? `${OBJ[o.key]?.en.toLowerCase()} · ${OBJ[o.key]?.ja}` : ''}`, 14, 30, 26));
      page.objects.push(helper(page, 'date', datecol(page), 140, 150, 3.4));
      break;
    }
  }
}
export function inscription(page: Page, r: Rng) {
  const lines = ['sweep the floor', 'mop the floor', 'the water was warm', 'someone was late', 'the clock kept going', '水はぬるかった', '時計はまだ動く', 'almost', 'it was nearly morning', 'ほとんど', 'wait for the ink'];
  return [pick(r, lines), pick(r, lines)].join('\n') + `\np.${String(page.n).padStart(2, '0')}`;
}
function datecol(page: Page) { return `${kanjiNum(page.n)}頁`; }
