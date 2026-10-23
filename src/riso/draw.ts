// Draws part markup (the reference's SVG primitives) straight onto a 2D canvas, synchronously.
// Parsing happens once per distinct markup string; the result is a list of draw closures.
// This keeps page renders resolution independent (screen, 300 dpi) and lets text use loaded web fonts.

import { outlinePath, familyOf } from '../type/outlines';

type Op = (ctx: CanvasRenderingContext2D, ink: string) => void;
const cache = new Map<string, Op[]>();
const parser = new DOMParser();

function num(el: Element, a: string, d = 0) { const v = el.getAttribute(a); return v === null ? d : parseFloat(v); }

/** Parse an SVG transform list into a sequence of ctx calls. */
function parseTransform(tr: string | null): ((ctx: CanvasRenderingContext2D) => void) | null {
  if (!tr) return null;
  const ops: ((ctx: CanvasRenderingContext2D) => void)[] = [];
  const re = /(\w+)\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tr))) {
    const f = m[1];
    const a = m[2].split(/[\s,]+/).filter(Boolean).map(parseFloat);
    if (f === 'translate') ops.push((c) => c.translate(a[0], a[1] ?? 0));
    else if (f === 'scale') ops.push((c) => c.scale(a[0], a[1] ?? a[0]));
    else if (f === 'rotate') {
      const r = (a[0] * Math.PI) / 180;
      if (a.length >= 3) ops.push((c) => { c.translate(a[1], a[2]); c.rotate(r); c.translate(-a[1], -a[2]); });
      else ops.push((c) => c.rotate(r));
    } else if (f === 'skewX') { const k = Math.tan((a[0] * Math.PI) / 180); ops.push((c) => c.transform(1, 0, k, 1, 0, 0)); }
    else if (f === 'skewY') { const k = Math.tan((a[0] * Math.PI) / 180); ops.push((c) => c.transform(1, k, 0, 1, 0, 0)); }
    else if (f === 'matrix') ops.push((c) => c.transform(a[0], a[1], a[2], a[3], a[4], a[5]));
  }
  return (c) => ops.forEach((o) => o(c));
}

function paint(el: Element, path: Path2D | null, text?: (ctx: CanvasRenderingContext2D, mode: 'fill' | 'stroke') => void): Op {
  const fill = el.getAttribute('fill');
  const stroke = el.getAttribute('stroke');
  const sw = num(el, 'stroke-width', 1);
  const cap = (el.getAttribute('stroke-linecap') ?? 'butt') as CanvasLineCap;
  const join = (el.getAttribute('stroke-linejoin') ?? 'miter') as CanvasLineJoin;
  const dash = el.getAttribute('stroke-dasharray')?.split(/[\s,]+/).map(parseFloat) ?? null;
  const rule = (el.getAttribute('fill-rule') ?? 'nonzero') as CanvasFillRule;
  const op = parseFloat(el.getAttribute('opacity') ?? '1');
  return (ctx, ink) => {
    if (op !== 1) ctx.globalAlpha *= op;
    if (fill !== 'none') {
      ctx.fillStyle = fill === '{F}' || fill === null ? ink : fill;
      if (path) ctx.fill(path, rule); else text?.(ctx, 'fill');
    }
    if (stroke && stroke !== 'none') {
      ctx.strokeStyle = stroke === '{F}' ? ink : stroke;
      ctx.lineWidth = sw; ctx.lineCap = cap; ctx.lineJoin = join;
      if (dash) ctx.setLineDash(dash);
      if (path) ctx.stroke(path); else text?.(ctx, 'stroke');
      if (dash) ctx.setLineDash([]);
    }
    if (op !== 1) ctx.globalAlpha /= op;
  };
}

function compileEl(el: Element): Op | null {
  const tag = el.tagName;
  const to = el.getAttribute('transform-origin');
  let tr = parseTransform(el.getAttribute('transform'));
  if (tr && to) {
    const [ox, oy] = to.split(/[\s,]+/).map(parseFloat);
    const base = tr;
    tr = (c) => { c.translate(ox, oy); base(c); c.translate(-ox, -oy); };
  }
  let inner: Op | null = null;
  if (tag === 'g') {
    const kids = [...el.children].map(compileEl).filter(Boolean) as Op[];
    inner = (ctx, ink) => kids.forEach((k) => k(ctx, ink));
  } else if (tag === 'circle') {
    const p = new Path2D(); p.arc(num(el, 'cx'), num(el, 'cy'), Math.max(0, num(el, 'r')), 0, Math.PI * 2); inner = paint(el, p);
  } else if (tag === 'ellipse') {
    const p = new Path2D(); p.ellipse(num(el, 'cx'), num(el, 'cy'), Math.max(0, num(el, 'rx')), Math.max(0, num(el, 'ry')), 0, 0, Math.PI * 2); inner = paint(el, p);
  } else if (tag === 'rect') {
    const p = new Path2D();
    const x = num(el, 'x'), y = num(el, 'y'), w = num(el, 'width'), h = num(el, 'height');
    const rx = Math.min(num(el, 'rx', num(el, 'ry')), w / 2, h / 2);
    if (rx > 0) p.roundRect(x, y, w, h, rx); else p.rect(x, y, w, h);
    inner = paint(el, p);
  } else if (tag === 'path') {
    inner = paint(el, new Path2D(el.getAttribute('d') ?? ''));
  } else if (tag === 'polygon' || tag === 'polyline') {
    const n = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(parseFloat);
    const p = new Path2D();
    for (let i = 0; i + 1 < n.length; i += 2) i ? p.lineTo(n[i], n[i + 1]) : p.moveTo(n[i], n[i + 1]);
    if (tag === 'polygon') p.closePath();
    inner = paint(el, p);
  } else if (tag === 'text') {
    const str = el.textContent ?? '';
    const x = num(el, 'x'), y = num(el, 'y');
    const size = num(el, 'font-size', 16);
    const fam = el.getAttribute('font-family') ?? 'sans-serif';
    const italic = el.getAttribute('font-style') === 'italic' ? 'italic ' : '';
    const weight = el.getAttribute('font-weight') ?? '';
    const len = el.getAttribute('textLength');
    const anchor = el.getAttribute('text-anchor') ?? 'start';
    const ls = num(el, 'letter-spacing', 0);
    const font = `${italic}${weight ? weight + ' ' : ''}${size}px ${fam}`;
    inner = paint(el, null, (ctx, mode) => {
      ctx.font = font;
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${ls}px`;
      const mw = ctx.measureText(str).width || 1;
      const target = len ? parseFloat(len) : mw;
      const sx = target / mw;
      const x0 = anchor === 'middle' ? x - target / 2 : anchor === 'end' ? x - target : x;
      // type as object: real outlines (opentype.js) when the font file is loaded
      const ol = ls ? null : outlinePath(familyOf(fam), str, size);
      if (ol) {
        const osx = target / (ol.width || 1);
        const ox0 = anchor === 'middle' ? x - target / 2 : anchor === 'end' ? x - target : x;
        ctx.save(); ctx.translate(ox0, y); ctx.scale(osx, 1);
        if (italic && familyOf(fam) !== 'Bodoni Moda') ctx.transform(1, 0, -0.2, 1, 0, 0);
        if (mode === 'fill') ctx.fill(ol.path); else ctx.stroke(ol.path);
        ctx.restore();
        return;
      }
      ctx.save(); ctx.translate(x0, y); ctx.scale(sx, 1);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      if (mode === 'fill') ctx.fillText(str, 0, 0); else ctx.strokeText(str, 0, 0);
      ctx.restore();
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
    });
  } else return null;
  if (!tr) return inner;
  const i = inner!;
  return (ctx, ink) => { ctx.save(); tr(ctx); i(ctx, ink); ctx.restore(); };
}

/** Compile part markup (one or more SVG elements) to draw closures. */
export function compile(markup: string): Op[] {
  let ops = cache.get(markup);
  if (ops) return ops;
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml');
  ops = [...doc.documentElement.children].map(compileEl).filter(Boolean) as Op[];
  if (cache.size > 6000) cache.clear();
  cache.set(markup, ops);
  return ops;
}
export function drawMarkup(ctx: CanvasRenderingContext2D, markup: string, ink: string) {
  for (const op of compile(markup)) op(ctx, ink);
}
