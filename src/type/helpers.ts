// Layout helpers placed and edited like objects: vertical Japanese line, heavy block word,
// stretched English label, tiny inscription block, date column, seal, issue seal, the cover masthead.
// Fine text (inscriptions, dates, labels) is marked "sharp": it prints on the overlay layer and is not
// softened by the plate effects — tiny perfectly sharp words over soft images.
import { s, type Part } from '../riso/parts';
import type { PageObj } from '../model/types';
import { sealGeometry } from '../design/seal';
import { rng } from '../core/rng';

const esc = (v: string) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const HELPERS: { id: string; char: string; en: string; ja: string; def: string }[] = [
  { id: 'vja', char: '縦', en: 'vertical line', ja: '縦書き', def: '夢をひとこと' },
  { id: 'hangul', char: '太', en: 'heavy block', ja: '太字', def: '遅れた' },
  { id: 'stretch', char: '伸', en: 'stretched label', ja: '伸ばし文字', def: 'ALMOST' },
  { id: 'inscription', char: '題', en: 'inscription', ja: '画題', def: 'sweep the floor\nwait for the ink' },
  { id: 'date', char: '暦', en: 'date column', ja: '日付', def: '' },
  { id: 'seal', char: '殆', en: 'seal', ja: '落款', def: '殆' },
  { id: 'dots', char: '玉', en: 'dot mesh', ja: '水玉', def: '' },
];

const lines = (o: PageObj) => (o.text ?? '').split('\n');

/** Local box for a helper (x0, y0, x1, y1). */
export function helperBox(o: PageObj): [number, number, number, number] {
  const txt = o.text ?? '';
  switch (o.key) {
    case 'vja': return [0, 0, 24, Math.max(24, [...txt].length * 22 + 4)];
    case 'hangul': return [0, 0, Math.max(60, [...txt].length * 58), 70];
    case 'stretch': return [0, 0, Math.max(80, txt.length * 30), 34];
    case 'inscription': { const ls = lines(o); return [0, 0, Math.max(40, Math.max(...ls.map((l) => l.length)) * 4.4), ls.length * 9 + 2]; }
    case 'date': return [0, 0, 10, Math.max(30, txt.length * 8)];
    case 'seal': case 'issueSeal': return [0, 0, 100, 100];
    case 'title': return [0, 0, 200, 190];
    default: return [0, 0, 100, 100];
  }
}
export const isSharp = (o: PageObj) => o.kind === 'helper' && ['inscription', 'date', 'slug', 'label'].includes(o.key);
export const isSeal = (o: PageObj) => o.kind === 'helper' && (o.key === 'seal' || o.key === 'issueSeal');

/** Helper parts in their local box. Ink role 0 unless noted; type roles map to plates like objects. */
export function helperParts(o: PageObj): Part[] {
  const txt = o.text ?? '';
  switch (o.key) {
    case 'vja': {
      return [...txt].map((ch, i) => s(0, `<text x="12" y="${i * 22 + 21}" font-family="'Shippori Mincho B1',serif" font-weight="800" font-size="20" text-anchor="middle" fill="{F}">${esc(ch)}</text>`));
    }
    case 'hangul': {
      // a heavy block word: Dela Gothic for kana/kanji/latin, Black Han Sans when the visitor typed Hangul
      const [, , w] = helperBox(o);
      const fam = /[\uAC00-\uD7A3]/.test(txt) ? "'Black Han Sans',sans-serif" : "'Dela Gothic One',sans-serif";
      return [s(1, `<text x="${w / 2 + 3}" y="61" font-family="${fam}" font-size="58" textLength="${w - 4}" lengthAdjust="spacingAndGlyphs" text-anchor="middle" fill="{F}">${esc(txt)}</text>`),
        s(0, `<text x="${w / 2}" y="58" font-family="${fam}" font-size="58" textLength="${w - 4}" lengthAdjust="spacingAndGlyphs" text-anchor="middle" fill="{F}">${esc(txt)}</text>`)];
    }
    case 'stretch': {
      const [, , w] = helperBox(o);
      return [s(0, `<text x="${w / 2}" y="30" font-family="'Rubik Mono One',sans-serif" font-size="28" textLength="${w}" lengthAdjust="spacingAndGlyphs" text-anchor="middle" fill="{F}">${esc(txt.toUpperCase())}</text>`)];
    }
    case 'inscription':
      return lines(o).map((l, i) => s(0, `<text x="1" y="${i * 9 + 8}" font-family="'IBM Plex Mono',monospace" font-size="7" fill="{F}">${esc(l)}</text>`));
    case 'date':
      return [...txt].map((ch, i) => s(0, `<text x="5" y="${i * 8 + 8}" font-family="'IBM Plex Mono',monospace" font-size="7" text-anchor="middle" fill="{F}">${esc(ch)}</text>`));
    case 'seal': case 'issueSeal': {
      const g = sealGeometry(o.key === 'seal' ? (txt || '殆') : txt.padStart(4, '0'), o.seed);
      return [s(0, `<path d="${g.edge}" fill="{F}"/>`), ...g.glyphs.map((x) => ({ i: 'k' as const, m: `<path d="${x.d}" transform="${x.transform}" fill="{F}"/>` }))];
    }
    case 'dots': {
      // a floating mesh of dots (Purcell; lace-like dot meshes): a jittered grid inside a soft blob, two inks
      const r = rng(o.seed * 7 + 1);
      const out: Part[] = [];
      const lobes = [0, 1, 2].map(() => [30 + r() * 40, 30 + r() * 40, 22 + r() * 18]);
      for (let y = 4; y < 100; y += 7) for (let x = 4 + ((y / 7) % 2) * 3.5; x < 100; x += 7) {
        const d = Math.min(...lobes.map(([cx, cy, rr]) => Math.hypot(x - cx, y - cy) / rr));
        if (d > 1 || r() < 0.08) continue;
        const rad = (1 - d * 0.7) * 2.4 * (0.75 + r() * 0.5);
        out.push(s(r() < 0.78 ? 0 : 1, `<circle cx="${(x + (r() - 0.5) * 1.6).toFixed(1)}" cy="${(y + (r() - 0.5) * 1.6).toFixed(1)}" r="${rad.toFixed(2)}" fill="{F}"/>`));
      }
      return out;
    }
    case 'title': {
      // the cover masthead: ALMOST PRESS wide and flat, 거의 인쇄소 as a heavy block, ほぼ印刷所 set vertically —
      // each script set differently, never a neat stack
      const ja = 'ほぼ印刷所';
      return [
        s(0, `<text x="0" y="22" font-family="'Rubik Mono One',sans-serif" font-size="24" textLength="196" lengthAdjust="spacingAndGlyphs" fill="{F}">ALMOST PRESS</text>`),
        s(1, `<text x="0" y="96" font-family="'Black Han Sans',sans-serif" font-size="66" textLength="150" lengthAdjust="spacingAndGlyphs" fill="{F}">거의</text>`),
        s(1, `<text x="0" y="150" font-family="'Black Han Sans',sans-serif" font-size="66" textLength="150" lengthAdjust="spacingAndGlyphs" fill="{F}">인쇄소</text>`),
        ...[...ja].map((ch, i) => s(2, `<text x="184" y="${i * 26 + 62}" font-family="'Shippori Mincho B1',serif" font-weight="800" font-size="24" text-anchor="middle" fill="{F}">${ch}</text>`)),
      ];
    }
  }
  return [];
}
