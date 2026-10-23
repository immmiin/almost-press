// The seal (낙관 / 落款): vermilion square with 殆, uneven stamped edge, ink gaps and a slight double strike.
import { GLYPHS } from './glyphs';
import { rng } from '../core/rng';
import { UI } from './tokens';

/** Rough square outline in a 100×100 box. */
export function sealEdge(seed: number, rough = 1.6, inset = 4): string {
  const r = rng(seed);
  const pts: string[] = [];
  const n = 13;
  const side = (fx: (t: number) => number, fy: (t: number) => number, nx: number, ny: number) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const o = (r() - 0.5) * rough * 2 + (r() < 0.12 ? -rough * 1.4 : 0);
      pts.push(`${(fx(t) + nx * o).toFixed(2)} ${(fy(t) + ny * o).toFixed(2)}`);
    }
  };
  const a = inset, b = 100 - inset;
  side((t) => a + t * (b - a), () => a, 0, -1);
  side(() => b, (t) => a + t * (b - a), 1, 0);
  side((t) => b - t * (b - a), () => b, 0, 1);
  side(() => a, (t) => b - t * (b - a), -1, 0);
  return 'M' + pts.join('L') + 'Z';
}

/** Glyph paths laid out to fill a box. Single char centred; several chars in a grid (right-to-left columns). */
export function glyphLayout(chars: string, box = [14, 14, 86, 86]): { d: string; transform: string }[] {
  const list = [...chars].filter((c) => GLYPHS[c]);
  if (!list.length) return [];
  const [x0, y0, x1, y1] = box;
  const cols = list.length <= 1 ? 1 : list.length <= 2 ? 1 : 2;
  const rows = Math.ceil(list.length / cols);
  const cw = (x1 - x0) / cols, ch = (y1 - y0) / rows;
  return list.map((c, i) => {
    const g = GLYPHS[c];
    // CJK reads in columns right-to-left; numerals read in rows left-to-right
    const digits = /^[0-9#]+$/.test(chars);
    const col = digits ? i % cols : cols - 1 - Math.floor(i / rows);
    const row = digits ? Math.floor(i / cols) : i % rows;
    const [bx0, by0, bx1, by1] = g.bb;
    const gw = bx1 - bx0, gh = by1 - by0;
    const s = Math.min(cw / gw, ch / gh) * 0.92;
    const cx = x0 + cw * (col + 0.5), cy = y0 + ch * (row + 0.5);
    return { d: g.d, transform: `translate(${(cx - (bx0 + gw / 2) * s).toFixed(2)} ${(cy - (by0 + gh / 2) * s).toFixed(2)}) scale(${s.toFixed(4)})` };
  });
}

let sealUid = 0;
export interface SealOpts {
  chars?: string; size?: number; seed?: number; color?: string;
  doubleStrike?: boolean; rotate?: number; gaps?: number; /** 'knock' = white glyph on red (朱文 reversed), 'line' = red glyph */
  mode?: 'knock' | 'line'; className?: string; label?: string;
}
/** Inline SVG markup of a seal. Uses filters (DOM only, not for page renders). */
export function sealSVG(o: SealOpts = {}): string {
  const { chars = '殆', size = 64, seed = 3, color = UI.vermilion, doubleStrike = false, rotate = 0, gaps = 1, mode = 'knock', className = 'seal', label } = o;
  const id = `sl${sealUid++}`;
  const edge = sealEdge(seed);
  const glyphs = glyphLayout(chars, chars.length > 2 ? [16, 14, 84, 86] : [17, 16, 83, 84]);
  const glyphMarkup = (fill: string) => glyphs.map((g) => `<path d="${g.d}" transform="${g.transform}" fill="${fill}"/>`).join('');
  const inner = mode === 'knock'
    ? `<mask id="${id}m"><path d="${edge}" fill="#fff"/>${glyphMarkup('#000')}</mask><rect width="100" height="100" fill="${color}" mask="url(#${id}m)"/>`
    : `<path d="${edge}" fill="none" stroke="${color}" stroke-width="5"/>${glyphMarkup(color)}`;
  const strike = (dx: number, dy: number, op: number, rot: number) =>
    `<g transform="translate(${dx} ${dy}) rotate(${rot} 50 50)" opacity="${op}" filter="url(#${id}f)">${inner}</g>`;
  const r = rng(seed * 7 + 1);
  return `<svg class="${className}" viewBox="-6 -6 112 112" width="${size}" height="${size}" style="transform:rotate(${rotate}deg)" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} xmlns="http://www.w3.org/2000/svg">
<defs><filter id="${id}f" x="-10%" y="-10%" width="120%" height="120%">
<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="${seed}" result="w"/>
<feDisplacementMap in="SourceGraphic" in2="w" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feTurbulence type="fractalNoise" baseFrequency="${(0.5 + gaps * 0.25).toFixed(2)}" numOctaves="2" seed="${seed + 9}" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${(-2.4 * gaps).toFixed(2)} 0 0 0 ${(2.0 + gaps * 0.35 + (1 - gaps) * 1.2).toFixed(2)}" result="sp"/>
<feComposite in="d" in2="sp" operator="in"/></filter></defs>
${doubleStrike ? strike((r() - 0.5) * 5, (r() - 0.5) * 5, 0.32, (r() - 0.5) * 4) : ''}${strike(0, 0, 0.94, 0)}</svg>`;
}

/** Parts for page renders (no filters): edge + knocked-out glyph paths in seal-local 0..100 space. */
export function sealGeometry(chars = '殆', seed = 3) {
  return { edge: sealEdge(seed), glyphs: glyphLayout(chars, chars.length > 2 ? [16, 14, 84, 86] : [17, 16, 83, 84]) };
}

/** Issue-number seal text: "#0427" → 〇四二七-style digits are kept as Arabic numerals in a 2×2 grid. */
export const issueSealChars = (n: number) => String(n).padStart(4, '0');
