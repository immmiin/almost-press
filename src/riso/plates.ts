// Page → plate separations. Each plate is a 2D canvas holding coverage fields:
//   R = solid ink, G = halftone tint (screened in the shader), B = continuous wash (grain-screened).
// Objects draw in stacking order; an object's knockouts cut through every plate beneath it.
import { drawMarkup } from './draw';
import type { Part } from './parts';
import type { Page, PageObj } from '../model/types';
import { PAGE_W, PAGE_H, BLEED } from '../model/types';
import { partsOf, OBJ } from '../objects';
import { wordParts } from '../type/treatments';
import { helperParts, helperBox, isSharp, isSeal } from '../type/helpers';
import { INK_BY_ID, hexToRgb } from '../design/tokens';
import { groundParts } from './grounds';
import { rng } from '../core/rng';

export const FULL_W = PAGE_W + BLEED * 2, FULL_H = PAGE_H + BLEED * 2;
const SOLID = '#ff0000', TINT = '#00ff00', WASH = '#0000ff';

export interface PlateSet { canvases: HTMLCanvasElement[]; overlay: HTMLCanvasElement; w: number; h: number; ppm: number }

const pool: HTMLCanvasElement[] = [];
function canvas(w: number, h: number, i: number) {
  const c = pool[i] ?? (pool[i] = document.createElement('canvas'));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
}

/** Parts for any page object, in its own local unit box (objects: 200×200; words/helpers: their own box). */
export function objParts(o: PageObj): Part[] {
  if (o.kind === 'obj') {
    if (!OBJ[o.key]) return [];
    let p = partsOf(o.key);
    if (o.wrong) p = wrongVariant(p, o.wrong, o.seed);
    if (o.fx === 'hole') p = p.map((q) => ({ i: 'k' as const, m: q.m }));
    return p;
  }
  if (o.kind === 'word') return wordParts(o.key, o.style ?? 0);
  return helperParts(o);
}

/** A twin that is slightly wrong: one ink role swapped and one part missing or doubled. */
function wrongVariant(parts: Part[], amount: number, seed: number): Part[] {
  const r = rng(seed * 17 + 3);
  const swapA = Math.floor(r() * 3), swapB = (swapA + 1 + Math.floor(r() * 2)) % 3;
  const drop = Math.floor(r() * parts.length);
  const out: Part[] = [];
  parts.forEach((p, i) => {
    if (i === drop && amount > 0.3) return;
    if (p.i !== 'k' && r() < 0.5 + amount * 0.4) out.push({ ...p, i: p.i === swapA ? swapB : p.i === swapB ? swapA : p.i });
    else out.push(p);
    if (r() < amount * 0.12 && p.i !== 'k') out.push({ ...p, m: `<g transform="translate(${(r() * 10 - 5).toFixed(1)} ${(r() * 10 - 5).toFixed(1)})">${p.m}</g>` });
  });
  return out;
}

/** The unit box of an object kind: objects are drawn in 0..200, words/helpers report their own. */
export function boxOf(o: PageObj): [number, number, number, number] {
  if (o.kind === 'obj') return [0, 0, 200, 200];
  if (o.kind === 'word') return [0, 0, 200, 120];
  return helperBox(o);
}

/** Local → page-mm matrix for an object. */
export function objMatrix(o: PageObj): DOMMatrix {
  const [x0, y0, x1, y1] = boxOf(o);
  const bw = x1 - x0;
  const k = o.s / bw;
  return new DOMMatrix().translate(o.x, o.y).rotate(o.r).scale(k * (o.flip ? -1 : 1), k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
}

/** Colour for tiny sharp text: the darkest page ink if it reads at ≥ 4.5:1 on rice paper, else sumi. */
export function textInk(page: Page): string {
  const lum = (hex: string) => { const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const paper = lum('#F1ECE2');
  let best = '#3B3A40', bl = 1;
  for (const id of page.inks) { const h = INK_BY_ID[id]?.hex; if (h && lum(h) < bl) { bl = lum(h); best = h; } }
  return (paper + 0.05) / (bl + 0.05) >= 4.5 ? best : '#3B3A40';
}

/** Seals and sharp type print on the overlay in true colour, untouched by plate effects. */
function drawOverlayObj(ctx: CanvasRenderingContext2D, o: PageObj, base: DOMMatrix, colour: string) {
  const parts = objParts(o);
  ctx.save(); ctx.setTransform(base.multiply(objMatrix(o))); ctx.globalAlpha = o.opacity ?? 1;
  ctx.globalCompositeOperation = 'source-over';
  parts.forEach((p) => { if (p.i !== 'k') drawMarkup(ctx, p.m, colour); });
  ctx.globalCompositeOperation = 'destination-out';
  parts.forEach((p) => { if (p.i === 'k') drawMarkup(ctx, p.m, '#000'); });
  ctx.restore();
}

function drawObj(ctxs: CanvasRenderingContext2D[], o: PageObj, base: DOMMatrix, nPlates: number) {
  const parts = objParts(o);
  const m = base.multiply(objMatrix(o));
  const alpha = o.opacity ?? 1;
  const crum = o.crumple ?? 0;
  const facets = crum > 0.02 ? crumpleFacets(o, crum) : [null];
  const shadowFix = o.flip && o.kind === 'obj';
  // soft focus on the object alone (drift ghosts, receding swans): radius in page mm → canvas px
  const blurPx = (o.blur ?? 0) > 0.01 ? (o.blur ?? 0) * 2.2 * Math.hypot(base.a, base.b) : 0;
  for (const f of facets) {
    for (const c of ctxs) { c.save(); c.setTransform(m); if (blurPx) c.filter = `blur(${blurPx.toFixed(1)}px)`; if (f) { c.beginPath(); c.moveTo(...f.poly[0]); f.poly.slice(1).forEach((p) => c.lineTo(...p)); c.closePath(); c.clip(); c.transform(...f.t); } c.globalAlpha = alpha; c.globalCompositeOperation = 'lighter'; }
    // parts in drawing order; a knockout cuts every plate drawn so far (beneath objects included),
    // later parts print over it — e.g. the egg white is paper, the yolk sits on top.
    parts.forEach((p, idx) => {
      if (p.i === 'k') {
        for (const c of ctxs) { c.globalCompositeOperation = 'destination-out'; c.globalAlpha = Math.min(1, alpha * 1.2); drawMarkup(c, p.m, '#000'); c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha; }
        return;
      }
      const role = p.i;
      const plate = (o.plates[role] ?? role) % nPlates;
      const ctx = ctxs[plate];
      // flip: "the shadow does not flip" — the ground-shadow part is drawn unflipped
      if (shadowFix && idx === 0 && p.t && p.m.includes('cy="179"')) {
        ctx.save(); ctx.translate(100, 0); ctx.scale(-1, 1); ctx.translate(-100, 0);
        drawMarkup(ctx, p.m, TINT); ctx.restore(); return;
      }
      drawMarkup(ctx, p.m, p.t ? TINT : SOLID);
    });
    if (crum > 0.02 && f) {
      // creases print as fine tint lines in the pattern plate
      const pc = ctxs[(o.plates[2] ?? 2) % nPlates];
      pc.globalCompositeOperation = 'lighter'; pc.globalAlpha = 0.8 * crum;
      pc.strokeStyle = TINT; pc.lineWidth = 2.2;
      pc.beginPath(); pc.moveTo(...f.poly[0]); f.poly.slice(1).forEach((p) => pc.lineTo(...p)); pc.closePath(); pc.stroke();
      drawPattern(pc, f.poly, o.pattern ?? 0, crum);
    }
    for (const c of ctxs) c.restore();
  }
}

/** Crumple: the 200-box splits into facets, each slightly displaced (like paper folds). */
function crumpleFacets(o: PageObj, c: number) {
  const r = rng(o.seed * 7 + 11);
  const cx = 60 + r() * 80, cy = 60 + r() * 80;
  const ring: [number, number][] = [[-20, -20], [100 + (r() - 0.5) * 60, -20], [220, -20], [220, 100 + (r() - 0.5) * 60], [220, 220], [100 + (r() - 0.5) * 60, 220], [-20, 220], [-20, 100 + (r() - 0.5) * 60]];
  return ring.map((p, i) => {
    const q = ring[(i + 1) % ring.length];
    const a = (r() - 0.5) * 0.25 * c, dx = (r() - 0.5) * 14 * c, dy = (r() - 0.5) * 14 * c, sc = 1 - r() * 0.12 * c;
    const ca = Math.cos(a) * sc, sa = Math.sin(a) * sc;
    // rotate/scale about the facet centroid
    const mx = (p[0] + q[0] + cx) / 3, my = (p[1] + q[1] + cy) / 3;
    const t: [number, number, number, number, number, number] = [ca, sa, -sa, ca, mx - ca * mx + sa * my + dx, my - sa * mx - ca * my + dy];
    return { poly: [[cx, cy], p, q] as [number, number][], t };
  });
}
function drawPattern(ctx: CanvasRenderingContext2D, poly: [number, number][], kind: number, c: number) {
  ctx.save();
  ctx.beginPath(); ctx.moveTo(...poly[0]); poly.slice(1).forEach((p) => ctx.lineTo(...p)); ctx.closePath(); ctx.clip();
  ctx.globalAlpha = 0.35 * c; ctx.fillStyle = TINT; ctx.strokeStyle = TINT; ctx.lineWidth = 3;
  if (kind % 3 === 0) for (let x = -40; x < 240; x += 12) for (let y = -40; y < 240; y += 12) { ctx.beginPath(); ctx.arc(x + (y % 24 ? 6 : 0), y, 2.6, 0, 7); ctx.fill(); }
  else if (kind % 3 === 1) for (let x = -240; x < 240; x += 11) { ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x + 240, 220); ctx.stroke(); }
  else for (let y = -20; y < 240; y += 14) { ctx.beginPath(); for (let x = -20; x < 240; x += 10) ctx.lineTo(x, y + Math.sin(x / 9) * 4); ctx.stroke(); }
  ctx.restore();
}

export interface RenderOpts { /** include set-off ghost, trail */ extras?: boolean; /** skip objects (ground only) */ groundOnly?: boolean; exclude?: string }

/** Rasterise a page's plates at a given pixel width (bleed included). */
export function renderPlates(page: Page, pxW: number, opts: RenderOpts = {}): PlateSet {
  const ppm = pxW / FULL_W;
  const w = Math.round(pxW), h = Math.round(FULL_H * ppm);
  const n = Math.max(1, Math.min(4, page.inks.length));
  const canvases = [0, 1, 2, 3].map((i) => canvas(w, h, i));
  const overlay = canvas(w, h, 4);
  const octx = overlay.getContext('2d')!;
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalCompositeOperation = 'source-over'; octx.globalAlpha = 1; octx.clearRect(0, 0, w, h);
  const ink = textInk(page);
  const ctxs = canvases.map((c) => c.getContext('2d', { willReadFrequently: false })!);
  ctxs.forEach((c) => { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, w, h); });
  const base = new DOMMatrix().scale(ppm, ppm).translate(BLEED, BLEED);
  const active = ctxs.slice(0, n);
  // ground
  for (const g of groundParts(page)) {
    const c = active[g.plate % n];
    c.save(); c.setTransform(base.multiply(g.m ?? new DOMMatrix())); c.globalCompositeOperation = 'lighter'; c.globalAlpha = g.alpha ?? 1;
    if (g.paint) g.paint(c, { SOLID, TINT, WASH }); else drawMarkup(c, g.markup!, g.kind === 'wash' ? WASH : g.kind === 'tint' ? TINT : SOLID);
    c.restore();
  }
  if (!opts.groundOnly) {
    // set-off: a faint mirrored ghost of the previous page
    if (opts.extras !== false && page.setoff?.length) {
      for (const o of page.setoff) drawObj(active, { ...o, x: PAGE_W - o.x, flip: !o.flip, r: -o.r, opacity: 0.16 * (o.opacity ?? 1), fx: 'setoff' }, base, n);
    }
    for (const o of page.objects) {
      if (o.id === opts.exclude) continue;
      if (isSeal(o)) {
        // the seal sometimes double-strikes
        if (o.seed % 5 === 0) drawOverlayObj(octx, { ...o, x: o.x + 0.7, y: o.y - 0.5, r: o.r + 2.5, opacity: 0.38 }, base, '#E5483E');
        drawOverlayObj(octx, o, base, '#E5483E');
      }
      else if (isSharp(o)) drawOverlayObj(octx, o, base, ink);
      else drawObj(active, o, base, n);
    }
    // the cursor's ink trail over the paper prints with the page
    if (opts.extras !== false && page.trail && page.trail.length > 1) {
      const c = active[n - 1];
      c.save(); c.setTransform(base); c.globalCompositeOperation = 'lighter';
      c.strokeStyle = TINT; c.lineWidth = 0.35; c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = 0.55;
      c.beginPath();
      page.trail.forEach(([u, v], i) => (i && Math.hypot(u - page.trail![i - 1][0], v - page.trail![i - 1][1]) < 0.08 ? c.lineTo(u * PAGE_W, v * PAGE_H) : c.moveTo(u * PAGE_W, v * PAGE_H)));
      c.stroke(); c.restore();
    }
  }
  // the dream sentence and the slug, tiny and sharp, in the bottom margin
  if (opts.extras !== false) {
    octx.save(); octx.setTransform(base); octx.fillStyle = ink; octx.globalCompositeOperation = 'source-over';
    if (page.dreamLine) { octx.font = `1.75px 'IBM Plex Sans KR', 'Shippori Mincho B1', sans-serif`; octx.fillText(clip(octx, page.dreamLine, PAGE_W - 14), 7, PAGE_H - 9.2); }
    if (page.slug) { octx.font = `1.45px 'IBM Plex Mono', monospace`; octx.fillText(clip(octx, page.slug, PAGE_W - 14), 7, PAGE_H - 6); }
    octx.restore();
  }
  return { canvases: canvases.slice(0, n), overlay, w, h, ppm };
}
function clip(ctx: CanvasRenderingContext2D, s: string, max: number) {
  if (ctx.measureText(s).width <= max) return s;
  while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s + '…';
}
