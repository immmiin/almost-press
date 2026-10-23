// Small renders through the same pipeline: drawer stamps, the page strip, the forgotten dish.
import { pipeline } from '../riso/pipeline';
import type { Page, PageObj } from '../model/types';

const cache = new Map<string, string>();
/** A single object printed alone on a transparent-ish sheet (returns a data URL). */
export function objectThumb(o: Partial<PageObj> & { key: string; kind?: PageObj['kind'] }, inks: string[], px = 144, crop = true): string {
  const key = JSON.stringify([o.key, o.kind, o.wrong, o.style, o.text, inks, px]);
  const hit = cache.get(key);
  if (hit) return hit;
  const page: Page = {
    n: 1, inks, ground: 'rice', mis: 0.4, density: 0.85, grain: 0.5, seed: 7, printed: false, platesPrinted: 0, drift: [], strokes: [],
    objects: [{ id: 't', kind: o.kind ?? 'obj', key: o.key, x: 74, y: 105, s: o.kind === 'helper' ? (o.s ?? 60) : 140, r: 0, plates: o.plates ?? [0, 1, 2], seed: o.seed ?? 3, wrong: o.wrong, style: o.style, text: o.text }],
  };
  const src = pipeline().render(page, px * (154 / 140));
  const c = document.createElement('canvas');
  // crop to the object box (square around the centre)
  const ppm = src.width / 154;
  const side = crop ? Math.round(144 * ppm) : src.width;
  c.width = c.height = Math.min(src.width, side);
  const sx = (src.width - c.width) / 2, sy = (3 + 105) * ppm - c.height / 2;
  c.getContext('2d')!.drawImage(src, sx, sy, c.width, c.height, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
/** A whole page thumbnail. */
export function pageThumb(page: Page, px = 120): string {
  const src = pipeline().render(page, px);
  return src.toDataURL('image/jpeg', 0.82);
}
