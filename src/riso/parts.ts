// Part helpers, ported verbatim from references/dream-object-index.html.
// A part is one SVG primitive with a {F} fill placeholder, assigned to an ink role:
// s = solid ink, t = halftone tint, k = knockout (paper shows through every plate beneath).
export type Num = number | string;
export interface Part { i: number | 'k'; m: string; t?: 1 }
export const s = (i: number, m: string): Part => ({ i, m });
export const t = (i: number, m: string): Part => ({ i, m, t: 1 });
export const k = (m: string): Part => ({ i: 'k', m });
export const C = (x: Num, y: Num, r: Num) => `<circle cx="${x}" cy="${y}" r="${r}" fill="{F}"/>`;
export const E = (x: Num, y: Num, rx: Num, ry: Num, rot: Num = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="{F}"/>`;
export const R = (x: number, y: number, w: number, h: number, rx: Num = 0, rot: Num = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" transform="rotate(${rot} ${x + w / 2} ${y + h / 2})" fill="{F}"/>`;
export const D = (d: string) => `<path d="${d}" fill="{F}"/>`;
export const DE = (d: string) => `<path d="${d}" fill="{F}" fill-rule="evenodd"/>`;
export const G = (p: string) => `<polygon points="${p}" fill="{F}"/>`;
export const L = (d: string, w: Num) => `<path d="${d}" fill="none" stroke="{F}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const LB = (d: string, w: Num, extra = '') => `<path d="${d}" fill="none" stroke="{F}" stroke-width="${w}" ${extra}/>`;
export const RING = (x: Num, y: Num, r: Num, w: Num) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="{F}" stroke-width="${w}"/>`;
export const RINGE = (x: Num, y: Num, rx: Num, ry: Num, w: Num, rot: Num = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="none" stroke="{F}" stroke-width="${w}"/>`;
export const SH = (cx = 100, w = 56) => t(1, E(cx, 179, w, 6));
export const xf = (parts: Part[], tr: string): Part[] => parts.map((p) => ({ ...p, m: `<g transform="${tr}">${p.m}</g>` }));
export function star(cx: number, cy: number, r1: number, r2: number, n: number, rot = -90) {
  const p: string[] = [];
  for (let q = 0; q < n * 2; q++) { const r = q % 2 ? r2 : r1; const a = (rot + (q * 180) / n) * Math.PI / 180; p.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); }
  return p.join(' ');
}
export const range = (n: number) => [...Array(n).keys()];
export const WAVE = (y: number, amp = 20) => `M0 ${y} Q25 ${y - amp} 50 ${y} T100 ${y} T150 ${y} T200 ${y}`;

export type Category = 'home' | 'table' | 'sky' | 'nature' | 'creature' | 'thing' | 'body' | 'place';
export interface ObjDef { c: Category; en: string; ko: string; al: string[]; float?: boolean; d: () => Part[] }
