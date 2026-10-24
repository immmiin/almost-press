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
/** The same single-object print with the paper divided out, so under `mix-blend-mode: multiply` only the ink shows
 *  (used for objects flying between the strip, the page and the dish). */
const inkCache = new Map<string, Promise<string>>();
export function inkThumb(o: Parameters<typeof objectThumb>[0], inks: string[], px = 144): Promise<string> {
  const key = JSON.stringify([o.key, o.kind, o.wrong, o.style, o.text, inks, px]);
  let hit = inkCache.get(key);
  if (hit) return hit;
  hit = new Promise<string>((res) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d')!; x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height);
      // the sheet's own colour (paper plus any light ground tint), read from the four corners
      const P = [0, 0, 0];
      for (const [cx, cy] of [[1, 1], [c.width - 2, 1], [1, c.height - 2], [c.width - 2, c.height - 2]]) { const k = (cy * c.width + cx) * 4; for (let ch = 0; ch < 3; ch++) P[ch] += d.data[k + ch] / 4; }
      for (let i = 0; i < d.data.length; i += 4) for (let ch = 0; ch < 3; ch++) d.data[i + ch] = Math.min(255, (d.data[i + ch] * 255) / P[ch]);
      x.putImageData(d, 0, 0);
      res(c.toDataURL('image/png'));
    };
    img.src = objectThumb(o, inks, px);
  });
  inkCache.set(key, hit);
  if (inkCache.size > 200) inkCache.delete(inkCache.keys().next().value!);
  return hit;
}
/** A whole page thumbnail. */
export function pageThumb(page: Page, px = 120): string {
  const src = pipeline().render(page, px);
  return src.toDataURL('image/jpeg', 0.82);
}
