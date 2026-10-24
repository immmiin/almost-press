// Type → outlines with opentype.js. Fonts load lazily from public/fonts (OFL TTFs) the first time a
// word needs them; until then canvas text with the same web font is used, then the page re-renders.
import { parse, type Font } from 'opentype.js';

const FILES: Record<string, string> = {
  'Bagel Fat One': 'BagelFatOne-Regular.ttf',
  'Black Han Sans': 'BlackHanSans-Regular.ttf',
  'Bodoni Moda': 'BodoniModa-Italic.ttf',
  'Dela Gothic One': 'DelaGothicOne-Regular.ttf',
  'Do Hyeon': 'DoHyeon-Regular.ttf',
  'DotGothic16': 'DotGothic16-Regular.ttf',
  'Gowun Batang': 'GowunBatang-Bold.ttf',
  'Rubik Mono One': 'RubikMonoOne-Regular.ttf',
};
const fonts = new Map<string, Font | 'loading' | 'failed'>();
const listeners = new Set<() => void>();
export const onFontsLoaded = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };

export function familyOf(css: string): string { return css.split(',')[0].replace(/['"]/g, '').trim(); }

export function outlineFont(family: string): Font | null {
  const st = fonts.get(family);
  if (st && st !== 'loading' && st !== 'failed') return st;
  if (!st && FILES[family]) {
    fonts.set(family, 'loading');
    fetch(`${import.meta.env.BASE_URL}fonts/${FILES[family]}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
      .then((buf) => { fonts.set(family, parse(buf)); listeners.forEach((f) => f()); })
      .catch(() => fonts.set(family, 'failed'));
  }
  return null;
}
/** Preload outline fonts (export waits for these so 300 dpi pages use real outlines). */
export async function loadOutlineFonts(families = Object.keys(FILES)) {
  await Promise.all(families.map((f) => new Promise<void>((res) => {
    if (outlineFont(f)) return res();
    const t = setInterval(() => { const s = fonts.get(f); if (s !== 'loading') { clearInterval(t); res(); } }, 50);
  })));
}

const pathCache = new Map<string, { path: Path2D; width: number } | null>();
/** Outline path of a string at a size, baseline at y=0, starting at x=0. Null if the font isn't ready or lacks glyphs. */
export function outlinePath(family: string, str: string, size: number): { path: Path2D; width: number } | null {
  const key = `${family}|${size}|${str}`;
  if (pathCache.has(key)) return pathCache.get(key)!;
  const f = outlineFont(family);
  if (!f) return null;
  // fall back to canvas text when the font has no glyph for a character
  for (const ch of str) if (ch.trim() && f.charToGlyph(ch).index === 0) { pathCache.set(key, null); return null; }
  // built from the raw commands: opentype's toPathData() can print NaN for some coordinates (e.g. "MO" in Rubik Mono),
  // which silently truncates the Path2D after the first bad number
  const path = new Path2D();
  for (const c of f.getPath(str, 0, 0, size).commands) {
    if (c.type === 'M') path.moveTo(c.x, c.y);
    else if (c.type === 'L') path.lineTo(c.x, c.y);
    else if (c.type === 'Q') path.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
    else if (c.type === 'C') path.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else if (c.type === 'Z') path.closePath();
  }
  const res = { path, width: f.getAdvanceWidth(str, size) };
  pathCache.set(key, res);
  return res;
}
