// Layout helpers placed and edited like objects: vertical Japanese line, Hangul block word,
// stretched English label, tiny inscription block, date column, seal, issue seal, three-script title.
// Fine text (inscriptions, dates, labels) is marked "sharp": it prints on the overlay layer and is not
// softened by the plate effects — tiny perfectly sharp words over soft images.
import { s, type Part } from '../riso/parts';
import type { PageObj } from '../model/types';
import { sealGeometry } from '../design/seal';

const esc = (v: string) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const HELPERS: { id: string; char: string; en: string; ko: string; ja: string; def: string }[] = [
  { id: 'vja', char: '縦', en: 'vertical line', ko: '세로쓰기', ja: '縦書き', def: 'ほとんど覚えている' },
  { id: 'hangul', char: '韓', en: 'hangul block', ko: '한글 덩어리', ja: 'ハングル', def: '늦었다' },
  { id: 'stretch', char: '伸', en: 'stretched label', ko: '늘인 글자', ja: '伸ばし文字', def: 'ALMOST' },
  { id: 'inscription', char: '題', en: 'inscription', ko: '화제', ja: '画題', def: 'a day i almost remember' },
  { id: 'date', char: '暦', en: 'date column', ko: '날짜', ja: '日付', def: '' },
  { id: 'seal', char: '殆', en: 'seal', ko: '낙관', ja: '落款', def: '殆' },
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
    case 'title': return [0, 0, 200, 150];
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
      const [, , w] = helperBox(o);
      return [s(1, `<text x="${w / 2 + 3}" y="61" font-family="'Black Han Sans',sans-serif" font-size="64" textLength="${w - 4}" lengthAdjust="spacingAndGlyphs" text-anchor="middle" fill="{F}">${esc(txt)}</text>`),
        s(0, `<text x="${w / 2}" y="58" font-family="'Black Han Sans',sans-serif" font-size="64" textLength="${w - 4}" lengthAdjust="spacingAndGlyphs" text-anchor="middle" fill="{F}">${esc(txt)}</text>`)];
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
    case 'title': {
      // A Day I Almost Remember / 거의 기억나는 하루 / ほとんど覚えている一日 — each script set differently
      const ja = 'ほとんど覚えている一日';
      return [
        s(0, `<text x="0" y="40" font-family="'Rubik Mono One',sans-serif" font-size="17" textLength="168" lengthAdjust="spacingAndGlyphs" fill="{F}">A DAY I ALMOST</text>`),
        s(0, `<text x="0" y="60" font-family="'Rubik Mono One',sans-serif" font-size="17" textLength="132" lengthAdjust="spacingAndGlyphs" fill="{F}">REMEMBER</text>`),
        s(1, `<text x="2" y="104" font-family="'Black Han Sans',sans-serif" font-size="32" textLength="150" lengthAdjust="spacingAndGlyphs" fill="{F}">거의 기억나는 하루</text>`),
        ...[...ja].map((ch, i) => s(2, `<text x="190" y="${i * 13 + 12}" font-family="'Shippori Mincho B1',serif" font-weight="800" font-size="12" text-anchor="middle" fill="{F}">${ch}</text>`)),
      ];
    }
  }
  return [];
}
