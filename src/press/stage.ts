// The page on the workbench: display, crop marks, stamping, direct manipulation, tool strokes, shake.
import type { Page, PageObj } from '../model/types';
import { PAGE_W, PAGE_H, BLEED } from '../model/types';
import { FULL_W, FULL_H, objMatrix, boxOf } from '../riso/plates';
import { pipeline } from '../riso/pipeline';
import { emit, forget, getIssue } from '../model/store';
import { objectThumb } from './thumbs';
import { tA } from '../core/i18n';
import { TOOL_BY_ID, type ToolId } from './toolDefs';
import { makeStamp, makeHelper, bloomStroke, sideMove, sideErase, sideScale, sidePlate, sideDuplicate, stampSize, HELPER_SIZES } from './edits';
import { thud, tick, rustle } from '../core/sound';
import { reducedMotion, clamp } from '../core/rng';
import { onFontsLoaded } from '../type/outlines';
import { atmosphere } from '../atmosphere/atmosphere';
import { INK_BY_ID } from '../design/tokens';
import Matter from 'matter-js';
import { deckle } from '../design/paper';

export type StampItem = { kind: 'obj'; key: string; wrong?: number } | { kind: 'helper'; id: string } | { kind: 'forgotten'; obj: PageObj };
export type Mode = { type: 'select' } | { type: 'stamp'; item: StampItem } | { type: 'tool'; tool: ToolId };

const SVGNS = 'http://www.w3.org/2000/svg';

export class Stage {
  el: HTMLElement;
  sheet: HTMLElement;
  canvas: HTMLCanvasElement;
  overlay: SVGSVGElement;
  marks: SVGSVGElement;
  ghost: HTMLImageElement;
  page!: Page;
  mode: Mode = { type: 'select' };
  selected = new Set<string>();
  /** plate slot chosen in the ink panel (bokashi ink) */
  activePlate = 0;
  brushScale = 1;
  /** tool strength from the drift knob (1 = as designed) */
  toolStrength = 1;
  private brush!: SVGSVGElement;
  private lastXY: [number, number] | null = null;
  onSelect: () => void = () => {};
  onModeChange: () => void = () => {};
  /** a stamp landed / a tool stroke began (the first-time job ticket listens) */
  onStamped: () => void = () => {};
  onStroke: () => void = () => {};
  private scale = 1; // css px per mm
  private raf = 0; private pendingQ: 'low' | 'full' | null = null;
  private trailBuf: [number, number][] = [];
  private keysDown = new Set<string>();
  private crumpleRaf = 0;
  private offFonts: () => void;
  dishTarget: () => DOMRect | null = () => null;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'stage';
    this.el.innerHTML = `<svg class="stage-marks" aria-hidden="true"></svg><div class="stage-sheet"><canvas class="stage-canvas" role="img"></canvas><svg class="stage-over"></svg><svg class="stage-brush" aria-hidden="true"><circle fill="rgba(229,72,62,.06)" stroke="#E5483E" stroke-width=".35" stroke-dasharray="1.6 1"/><circle r=".5" fill="#3B3A40"/><path stroke="#3B3A40" stroke-width=".25" fill="none"/></svg></div><img class="stage-ghost" alt="" aria-hidden="true">`;
    this.sheet = this.el.querySelector('.stage-sheet')!;
    this.canvas = this.el.querySelector('canvas')!;
    this.overlay = this.el.querySelector('.stage-over')!;
    this.marks = this.el.querySelector('.stage-marks')!;
    this.ghost = this.el.querySelector('.stage-ghost')!;
    this.brush = this.el.querySelector('.stage-brush')!;
    this.sheet.tabIndex = 0;
    deckle(this.canvas, 17, 'deckle', 3);
    this.sheet.setAttribute('aria-label', tA('a_page'));
    this.bind();
    this.offFonts = onFontsLoaded(() => { pipeline().invalidate(); this.render('full'); });
  }
  destroy() { this.offFonts(); cancelAnimationFrame(this.raf); removeEventListener('keydown', this.onKey); removeEventListener('keyup', this.onKeyUp); }

  setPage(p: Page) { this.page = p; this.selected.clear(); this.render('full'); this.drawHandles(); this.onSelect(); }
  setMode(m: Mode) {
    this.mode = m;
    this.el.dataset.mode = m.type;
    if (m.type === 'stamp') {
      const it = m.item;
      const inks = this.page.inks;
      this.ghost.src = it.kind === 'obj' ? objectThumb({ key: it.key, wrong: it.wrong }, inks) : it.kind === 'helper' ? objectThumb({ kind: 'helper', key: it.id, text: makeHelper(this.page, it.id, 0, 0, 1).text, s: 60 }, inks) : objectThumb(it.obj, inks);
    }
    this.ghost.style.display = 'none';
    if (m.type !== 'tool') this.brush.classList.remove('on'); else if (this.lastXY) this.showBrush(...this.lastXY);
    this.onModeChange();
  }

  /** css px per page millimetre */
  get mm() { return this.scale; }
  /** A page point (mm, trim origin) in client px. */
  toClient(x: number, y: number): [number, number] {
    const r = this.sheet.getBoundingClientRect();
    return [r.left + (x + BLEED) * this.scale, r.top + (y + BLEED) * this.scale];
  }
  /** Fit the sheet into a box (css px): page height = available height − 24 px, unless the width runs out first. */
  layout(w: number, h: number) {
    const m = 12;
    const s = Math.max(0.5, Math.min((h - m * 2) / FULL_H, (w - m * 2) / FULL_W));
    this.scale = s;
    const sw = FULL_W * s, sh = FULL_H * s;
    this.el.style.width = `${w}px`; this.el.style.height = `${h}px`;
    Object.assign(this.sheet.style, { width: `${sw}px`, height: `${sh}px`, left: `${(w - sw) / 2}px`, top: `${(h - sh) / 2}px` });
    this.overlay.setAttribute('viewBox', `${-BLEED} ${-BLEED} ${FULL_W} ${FULL_H}`);
    this.brush.setAttribute('viewBox', `${-BLEED} ${-BLEED} ${FULL_W} ${FULL_H}`);
    this.drawMarks(w, h, sw, sh);
    this.render('full');
    this.drawHandles();
  }
  private drawMarks(w: number, h: number, sw: number, sh: number) {
    const x0 = (w - sw) / 2 + BLEED * this.scale, y0 = (h - sh) / 2 + BLEED * this.scale;
    const x1 = x0 + PAGE_W * this.scale, y1 = y0 + PAGE_H * this.scale;
    // crop marks and registration targets sit in whatever margin the page leaves; short ones when it is tight
    const bl = BLEED * this.scale;
    const mv = (h - sh) / 2, mh = (w - sw) / 2;
    const Lv = Math.max(4, Math.min(7 * this.scale, mv - 3)), Lh = Math.max(4, Math.min(7 * this.scale, mh - 3));
    const crop = [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]].map(([x, y, dx, dy]) =>
      `<path d="M${x + dx * (bl + 2)} ${y}h${dx * Lh}M${x} ${y + dy * (bl + 2)}v${dy * Lv}"/>`).join('');
    const rr = Math.min(2.4 * this.scale, 7);
    const reg = (cx: number, cy: number) => `<circle cx="${cx}" cy="${cy}" r="${rr}"/><path d="M${cx - rr * 1.7} ${cy}h${rr * 3.4}M${cx} ${cy - rr * 1.7}v${rr * 3.4}"/>`;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const regs = (mh > rr * 4 ? reg(x0 - bl - rr * 2.4, my) + reg(x1 + bl + rr * 2.4, my) : '') + (mv > rr * 4 ? reg(mx, y0 - bl - rr * 2.4) + reg(mx, y1 + bl + rr * 2.4) : '');
    this.marks.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.marks.innerHTML = `<g stroke="#3B3A40" stroke-width=".6" fill="none" opacity=".75">${crop}${regs}</g>`;
  }

  /** Schedule a render; 'low' while dragging (half resolution), 'full' on release. */
  render(q: 'low' | 'full' = 'full') {
    if (!this.page) return;
    if (this.pendingQ !== 'full') this.pendingQ = q;
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      const quality = this.pendingQ; this.pendingQ = null;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const cssW = FULL_W * this.scale;
      const px = Math.max(120, Math.round(cssW * dpr * (quality === 'low' ? 0.6 : 1)));
      const src = pipeline().render(this.page, px, { view: this.view });
      if (this.canvas.width !== src.width || this.canvas.height !== src.height) { this.canvas.width = src.width; this.canvas.height = src.height; }
      this.canvas.getContext('2d')!.drawImage(src, 0, 0);
    });
  }
  view = 0;

  // ---------- geometry ----------
  private toMM(e: { clientX: number; clientY: number }): [number, number] {
    const r = this.sheet.getBoundingClientRect();
    return [(e.clientX - r.left) / this.scale - BLEED, (e.clientY - r.top) / this.scale - BLEED];
  }
  private hit(x: number, y: number): PageObj | null {
    const objs = this.page.objects;
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      if (o.fx === 'trail' || o.fx === 'hole') continue;
      const m = objMatrix(o).inverse();
      const p = m.transformPoint(new DOMPoint(x, y));
      const [x0, y0, x1, y1] = boxOf(o);
      const pad = o.kind === 'obj' ? 12 : 4;
      if (p.x > x0 + pad && p.x < x1 - pad && p.y > y0 + pad && p.y < y1 - pad) return o;
    }
    return null;
  }
  private sel(): PageObj[] { return this.page.objects.filter((o) => this.selected.has(o.id)); }
  /** Width (mm) of the ghost image so the preview matches the stamp: thumbs show a 200-unit box at 140 of 144 mm. */
  private ghostSize(it: StampItem): number {
    if (it.kind === 'obj') return stampSize(it.key) * 144 / 140;
    if (it.kind === 'helper') return (HELPER_SIZES[it.id] ?? 20) * 144 / 60;
    const o = it.obj;
    return o.kind === 'helper' ? o.s * 144 / (o.s || 60) : o.s * 144 / 140;
  }
  private showBrush(x: number, y: number) {
    if (this.mode.type !== 'tool') return;
    const r = TOOL_BY_ID[this.mode.tool].size * this.brushScale * PAGE_W;
    const [ring, dot, cross] = [...this.brush.children] as SVGElement[];
    ring.setAttribute('cx', String(x)); ring.setAttribute('cy', String(y)); ring.setAttribute('r', String(r));
    dot.setAttribute('cx', String(x)); dot.setAttribute('cy', String(y));
    cross.setAttribute('d', `M${x - 3} ${y}h6M${x} ${y - 3}v6`);
    this.brush.classList.add('on');
  }

  /** Selection handles drawn like registration marks. */
  drawHandles() {
    const o = this.overlay;
    o.innerHTML = '';
    if (!this.page) return;
    const k = 1 / this.scale;
    for (const ob of this.sel()) {
      const m = objMatrix(ob);
      const [x0, y0, x1, y1] = boxOf(ob);
      const pad = ob.kind === 'obj' ? 10 : 0;
      const pts = [[x0 + pad, y0 + pad], [x1 - pad, y0 + pad], [x1 - pad, y1 - pad], [x0 + pad, y1 - pad]].map(([x, y]) => m.transformPoint(new DOMPoint(x, y)));
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'sel');
      const top = m.transformPoint(new DOMPoint((x0 + x1) / 2, y0 + pad));
      const up = m.transformPoint(new DOMPoint((x0 + x1) / 2, y0 + pad - 26 / (ob.s / (x1 - x0)) * k * 4));
      g.innerHTML = `<polygon points="${pts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#3B3A40" stroke-width="${0.6 * k}" stroke-dasharray="${3 * k} ${2 * k}"/>
      <line x1="${top.x}" y1="${top.y}" x2="${up.x}" y2="${up.y}" stroke="#E5483E" stroke-width="${0.8 * k}"/>
      <g data-h="rot" transform="translate(${up.x} ${up.y})"><circle r="${6 * k}" fill="rgba(246,242,236,.7)" stroke="#E5483E" stroke-width="${0.9 * k}"/><path d="M${-8 * k} 0H${8 * k}M0 ${-8 * k}V${8 * k}" stroke="#E5483E" stroke-width="${0.7 * k}"/></g>
      ${pts.map((p, i) => `<g data-h="sc${i}" transform="translate(${p.x} ${p.y})"><circle r="${5 * k}" fill="rgba(246,242,236,.7)" stroke="#3B3A40" stroke-width="${0.8 * k}"/><path d="M${-7 * k} 0H${7 * k}M0 ${-7 * k}V${7 * k}" stroke="#3B3A40" stroke-width="${0.6 * k}"/></g>`).join('')}`;
      g.dataset.id = ob.id;
      o.append(g);
    }
  }

  // ---------- pointer ----------
  private bind() {
    const s = this.sheet;
    let drag: null | { kind: 'move' | 'scale' | 'rotate' | 'tool' | 'stamp' | 'shake'; start: [number, number]; t0: number; orig: { id: string; x: number; y: number; s: number; r: number }[]; last: [number, number]; reversals: number; lastDx: number; cx?: number; cy?: number; d0?: number; a0?: number; px0?: number } = null;
    const touches = new Map<number, PointerEvent>();
    let pinch: null | { d0: number; a0: number; s0: number; r0: number } = null;

    s.addEventListener('pointerdown', (e) => {
      touches.set(e.pointerId, e);
      if (touches.size === 2 && this.selected.size === 1) {
        const [a, b] = [...touches.values()];
        const o = this.sel()[0];
        pinch = { d0: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), a0: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX), s0: o.s, r0: o.r };
        drag = null; return;
      }
      try { s.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      s.focus({ preventScroll: true });
      const [x, y] = this.toMM(e);
      const base = { start: [x, y] as [number, number], t0: performance.now(), orig: [] as { id: string; x: number; y: number; s: number; r: number }[], last: [x, y] as [number, number], reversals: 0, lastDx: 0, px0: e.clientX };
      const h = (e.target as Element).closest('[data-h]');
      if (h && this.mode.type === 'select') {
        const id = (h.parentElement as unknown as SVGGElement).dataset.id!;
        const o = this.page.objects.find((q) => q.id === id)!;
        const kind = h.getAttribute('data-h') === 'rot' ? 'rotate' : 'scale';
        drag = { ...base, kind, orig: [{ id, x: o.x, y: o.y, s: o.s, r: o.r }], cx: o.x, cy: o.y, d0: Math.hypot(x - o.x, y - o.y), a0: Math.atan2(y - o.y, x - o.x) };
        return;
      }
      if (this.mode.type === 'stamp') { drag = { ...base, kind: 'stamp' }; this.el.classList.add('pressing'); return; }
      if (this.mode.type === 'tool') {
        const def = TOOL_BY_ID[this.mode.tool];
        const n = this.page.inks.length;
        this.page.strokes.push({ tool: this.mode.tool, pts: [[x / PAGE_W, y / PAGE_H]], size: def.size * this.brushScale, intensity: 0.85 * this.toolStrength, seed: Math.floor(Math.random() * 1e5), plate: this.activePlate % n, plate2: e.shiftKey && n > 1 ? (this.activePlate + 1) % n : undefined });
        this.onStroke();
        drag = { ...base, kind: 'tool' };
        this.render('low');
        return;
      }
      const o = this.hit(x, y);
      if (o) {
        if (e.shiftKey) { this.selected.has(o.id) ? this.selected.delete(o.id) : this.selected.add(o.id); }
        else if (!this.selected.has(o.id)) { this.selected.clear(); this.selected.add(o.id); }
        drag = { ...base, kind: 'move', orig: this.sel().map((q) => ({ id: q.id, x: q.x, y: q.y, s: q.s, r: q.r })) };
      } else {
        this.selected.clear();
        // grabbing the paper (no object): shake to forget
        drag = { ...base, kind: 'shake' };
      }
      this.drawHandles(); this.onSelect();
    });
    s.addEventListener('pointermove', (e) => {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, e);
      const [x, y] = this.toMM(e);
      // ghost stamp follows the cursor at the size it will land
      if (this.mode.type === 'stamp') {
        const g = this.ghost;
        const size = this.ghostSize(this.mode.item) * this.scale;
        const er = this.el.getBoundingClientRect();
        Object.assign(g.style, { display: 'block', width: `${size}px`, left: `${e.clientX - er.left - size / 2}px`, top: `${e.clientY - er.top - size / 2}px` });
      }
      // tools: a brush circle the size of the stroke
      this.lastXY = [x, y];
      if (this.mode.type === 'tool') this.showBrush(x, y);
      // the cursor's faint ink trail over the paper
      if (!drag && this.mode.type === 'select' && x > 0 && y > 0 && x < PAGE_W && y < PAGE_H) {
        const l = this.trailBuf[this.trailBuf.length - 1];
        if (!l || Math.hypot(l[0] - x / PAGE_W, l[1] - y / PAGE_H) > 0.012) this.trailBuf.push([x / PAGE_W, y / PAGE_H]);
      }
      if (pinch && touches.size === 2) {
        const [a, b] = [...touches.values()];
        const o = this.sel()[0];
        if (o) { o.s = clamp(pinch.s0 * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.d0, 4, 300); o.r = pinch.r0 + (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) - pinch.a0) * 180 / Math.PI; this.render('low'); this.drawHandles(); }
        return;
      }
      if (!drag) return;
      const dx = x - drag.start[0], dy = y - drag.start[1];
      if (drag.kind === 'move') {
        for (const q of drag.orig) { const o = this.page.objects.find((z) => z.id === q.id); if (o) { o.x = q.x + dx; o.y = q.y + dy; } }
        this.render('low'); this.drawHandles();
      } else if (drag.kind === 'scale') {
        const q = drag.orig[0]; const o = this.page.objects.find((z) => z.id === q.id)!;
        const d = Math.hypot(x - drag.cx!, y - drag.cy!);
        o.s = clamp(q.s * d / Math.max(1, drag.d0!), 3, 320);
        this.render('low'); this.drawHandles();
      } else if (drag.kind === 'rotate') {
        const q = drag.orig[0]; const o = this.page.objects.find((z) => z.id === q.id)!;
        let r = q.r + (Math.atan2(y - drag.cy!, x - drag.cx!) - drag.a0!) * 180 / Math.PI;
        if (e.shiftKey) r = Math.round(r / 15) * 15;
        o.r = r; this.render('low'); this.drawHandles();
      } else if (drag.kind === 'tool') {
        const st = this.page.strokes[this.page.strokes.length - 1];
        const l = st.pts[st.pts.length - 1];
        if (Math.hypot(l[0] - x / PAGE_W, l[1] - y / PAGE_H) > 0.006) st.pts.push([x / PAGE_W, y / PAGE_H]);
        // holding the brush longer soaks more in; the drift knob scales the whole stroke
        st.intensity = clamp(0.85 + (performance.now() - drag.t0) / 6000, 0.85, 1.35) * this.toolStrength;
        this.render('low');
      } else if (drag.kind === 'shake') {
        const ddx = e.clientX - drag.px0!;
        drag.px0 = e.clientX;
        if (Math.abs(ddx) > 6) {
          if (drag.lastDx && Math.sign(ddx) !== Math.sign(drag.lastDx)) drag.reversals++;
          drag.lastDx = ddx;
        }
        const ox = (x - drag.start[0]) * this.scale * 0.35, oy = (y - drag.start[1]) * this.scale * 0.2;
        this.sheet.style.transform = `translate(${ox}px, ${oy}px) rotate(${clamp(ox * 0.04, -3, 3)}deg)`;
        if (drag.reversals >= 4 && performance.now() - drag.t0 < 2600) { drag.reversals = -99; this.shakeOff(); }
      }
      drag.last = [x, y];
    });
    const end = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;
      if (!drag) { if (this.trailBuf.length > 6) this.flushTrail(); return; }
      const d = drag; drag = null;
      const [x, y] = this.toMM(e);
      if (d.kind === 'stamp' && this.mode.type === 'stamp') {
        this.el.classList.remove('pressing');
        const dur = performance.now() - d.t0;
        const pressure = dur < 160 ? 0.45 : dur < 700 ? 0.85 + (dur - 160) / 2400 : 1 + Math.min(1, (dur - 700) / 1500);
        const it = this.mode.item;
        let o: PageObj;
        if (it.kind === 'obj') { o = makeStamp(this.page, it.key, x, y, pressure, Math.floor(Math.random() * 1e6)); if (it.wrong) o.wrong = it.wrong; }
        else if (it.kind === 'helper') o = makeHelper(this.page, it.id, x, y, Math.floor(Math.random() * 1e6));
        else { o = { ...it.obj, id: it.obj.id + 'r', x, y, wrong: (it.obj.wrong ?? 0) + 0.35 }; const f = getIssue().forgotten; const i = f.indexOf(it.obj); if (i >= 0) f.splice(i, 1); this.setMode({ type: 'select' }); }
        this.page.objects.push(o);
        if (pressure > 1.05 && o.kind === 'obj') this.page.strokes.push(bloomStroke(o, pressure));
        thud(Math.min(1, pressure));
        const er = this.el.getBoundingClientRect();
        atmosphere().bloom((e.clientX) / innerWidth, 1 - e.clientY / innerHeight, INK_BY_ID[this.page.inks[0]].hex, 0.6 + pressure * 0.4);
        void er;
        this.selected.clear(); this.selected.add(o.id);
        rustle(0.6);
        emit('stamp');
        this.onStamped();
      } else if (d.kind === 'move') {
        const moved = d.orig.some((q) => { const o = this.page.objects.find((z) => z.id === q.id); return o && Math.hypot(o.x - q.x, o.y - q.y) > 1; });
        if (moved) { for (const q of d.orig) { const o = this.page.objects.find((z) => z.id === q.id); if (o) sideMove(this.page, o, q); } tick(); emit('move'); }
      } else if (d.kind === 'scale') {
        const q = d.orig[0]; const o = this.page.objects.find((z) => z.id === q.id); if (o) sideScale(this.page, o, q.s); emit('scale');
      } else if (d.kind === 'rotate') emit('rotate');
      else if (d.kind === 'tool') { tick(); emit('stroke'); }
      else if (d.kind === 'shake') {
        const st = this.sheet.style;
        if (reducedMotion()) st.transform = '';
        else { this.sheet.animate([{ transform: st.transform || 'none' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,1.4,.5,1)' }); st.transform = ''; }
      }
      this.render('full'); this.drawHandles(); this.onSelect();
    };
    s.addEventListener('pointerup', end);
    s.addEventListener('pointercancel', end);
    s.addEventListener('pointerleave', () => { this.ghost.style.display = 'none'; this.brush.classList.remove('on'); });
    addEventListener('keydown', this.onKey);
    addEventListener('keyup', this.onKeyUp);
  }
  private flushTrail() {
    const t = (this.page.trail ??= []);
    t.push(...this.trailBuf.splice(0));
    if (t.length > 600) t.splice(0, t.length - 600);
    this.render('full');
  }

  // ---------- keyboard ----------
  private onKey = (e: KeyboardEvent) => {
    const tgt = e.target as HTMLElement;
    if (tgt?.closest?.('input, textarea, [role="slider"], select') || !this.el.isConnected) return;
    const sel = this.sel();
    const k = e.key;
    if (k === 'Escape') { if (this.mode.type !== 'select') this.setMode({ type: 'select' }); else { this.selected.clear(); this.drawHandles(); this.onSelect(); } return; }
    if (this.mode.type === 'tool' && (k === '[' || k === ']')) { this.brushScale = clamp(this.brushScale * (k === ']' ? 1.2 : 1 / 1.2), 0.3, 3); if (this.lastXY) this.showBrush(...this.lastXY); return; }
    if (!sel.length) { if (k === 'Tab' && tgt === this.sheet && this.page.objects.length) { e.preventDefault(); this.cycle(e.shiftKey ? -1 : 1); } return; }
    let changed = true; let why = 'key';
    const n = this.page.inks.length;
    if (k === '[' || k === ']') { for (const o of sel) { const s0 = o.s; o.s = clamp(o.s * (k === ']' ? 1.1 : 1 / 1.1), 3, 320); if (k === ']') sideScale(this.page, o, s0); } }
    else if (k === 'r' || k === 'R') sel.forEach((o) => (o.r += e.shiftKey ? -15 : 15));
    else if (k === 'f' || k === 'F') sel.forEach((o) => (o.flip = !o.flip));
    else if (k === 'd' || k === 'D') { const copies = sel.map((o) => sideDuplicate(this.page, o)); this.page.objects.push(...copies); this.selected = new Set(copies.map((c) => c.id)); why = 'duplicate'; }
    else if (k === 'Delete' || k === 'Backspace') { sel.forEach((o) => sideErase(this.page, o)); this.selected.clear(); why = 'erase'; }
    else if (/^[1-4]$/.test(k)) { const p = +k - 1; if (p < n) sel.forEach((o) => { o.plates = [0, 1, 2].map((i) => (p + i) % n); sidePlate(this.page, o, p); }); else changed = false; }
    else if (k === 'ArrowUp' && (e.altKey || e.metaKey)) { this.reorder(sel, 1); }
    else if (k === 'ArrowDown' && (e.altKey || e.metaKey)) { this.reorder(sel, -1); }
    else if (k.startsWith('Arrow')) { const st = e.shiftKey ? 5 : 1; sel.forEach((o) => { if (k === 'ArrowLeft') o.x -= st; if (k === 'ArrowRight') o.x += st; if (k === 'ArrowUp') o.y -= st; if (k === 'ArrowDown') o.y += st; }); }
    else if ((k === 'c' || k === 'C') && !this.keysDown.has('c')) { this.keysDown.add('c'); this.crumpleHold(sel); changed = false; }
    else changed = false;
    if (changed) { e.preventDefault(); emit(why); this.render('full'); this.drawHandles(); this.onSelect(); }
  };
  private onKeyUp = (e: KeyboardEvent) => { if (e.key === 'c' || e.key === 'C') this.keysDown.delete('c'); };
  /** ↑/↓ layer order. Plain ↑/↓ nudge, so layer order uses Alt/⌘ + ↑/↓ (also buttons in the panel). */
  reorder(sel: PageObj[], dir: number) {
    const objs = this.page.objects;
    for (const o of dir > 0 ? sel.slice().reverse() : sel) {
      const i = objs.indexOf(o), j = clamp(i + dir, 0, objs.length - 1);
      objs.splice(i, 1); objs.splice(j, 0, o);
    }
  }
  private cycle(dir: number) {
    const objs = this.page.objects.filter((o) => o.fx !== 'trail' && o.fx !== 'hole');
    const cur = objs.findIndex((o) => this.selected.has(o.id));
    const nx = objs[(cur + dir + objs.length) % objs.length];
    this.selected = new Set([nx.id]); this.drawHandles(); this.onSelect();
  }
  /** Hold C: the paper crumples; releasing unfolds it, leaving creases with another pattern inside. */
  private crumpleHold(sel: PageObj[]) {
    cancelAnimationFrame(this.crumpleRaf);
    const t0 = performance.now();
    const base = sel.map((o) => o.crumple ?? 0);
    sel.forEach((o) => (o.pattern ??= Math.floor(Math.random() * 3)));
    const step = () => {
      const held = this.keysDown.has('c');
      const t = (performance.now() - t0) / 1000;
      sel.forEach((o, i) => { o.crumple = held ? clamp(base[i] + t * 0.9, 0, 1) : Math.max(0.28, (o.crumple ?? 0) * 0.9); });
      this.render('low');
      if (held || sel.some((o) => (o.crumple ?? 0) > 0.29)) this.crumpleRaf = requestAnimationFrame(step);
      else { emit('crumple'); this.render('full'); }
    };
    if (reducedMotion()) { sel.forEach((o) => (o.crumple = 0.35)); emit('crumple'); this.render('full'); return; }
    step();
  }

  // ---------- shake to forget ----------
  shakeOff() {
    const objs = this.page.objects.filter((o) => o.fx !== 'hole' && !(o.kind === 'helper' && o.key === 'seal'));
    if (!objs.length) return;
    const r = Math.random;
    const falling = objs.filter(() => r() < 0.75);
    if (!falling.length) falling.push(objs[0]);
    const sr = this.sheet.getBoundingClientRect();
    this.page.objects = this.page.objects.filter((o) => !falling.includes(o));
    this.selected.clear(); this.drawHandles();
    this.render('full');
    const keep = falling.filter((o) => o.fx !== 'trail' && o.fx !== 'copy');
    const done = () => { forget(keep); emit('shake'); };
    if (reducedMotion()) { done(); return; }
    // matter-js: the objects fall off the page into the forgotten dish
    const layer = document.createElement('div');
    layer.className = 'fall-layer';
    document.body.append(layer);
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.1 } });
    const dish = this.dishTarget() ?? new DOMRect(innerWidth / 2 - 60, innerHeight - 60, 120, 40);
    const floorY = dish.top + dish.height * 0.55;
    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(dish.left + dish.width / 2, floorY + 20, dish.width + 40, 40, { isStatic: true, angle: 0 }),
      Matter.Bodies.rectangle(dish.left - 10, floorY - 10, 20, 60, { isStatic: true, angle: -0.5 }),
      Matter.Bodies.rectangle(dish.right + 10, floorY - 10, 20, 60, { isStatic: true, angle: 0.5 }),
    ]);
    const items = falling.slice(0, 24).map((o) => {
      const size = Math.max(18, o.s * this.scale * 0.9);
      const cx = sr.left + (o.x + BLEED) * this.scale, cy = sr.top + (o.y + BLEED) * this.scale;
      const img = new Image();
      img.src = objectThumb(o.kind === 'obj' ? { key: o.key, wrong: o.wrong } : o, this.page.inks, 96);
      img.className = 'fall-item';
      img.style.width = img.style.height = `${size}px`;
      layer.append(img);
      const b = Matter.Bodies.rectangle(cx, cy, size * 0.6, size * 0.6, { restitution: 0.25, friction: 0.4, frictionAir: 0.012 });
      Matter.Body.setVelocity(b, { x: (r() - 0.5) * 8, y: -r() * 4 });
      Matter.Body.setAngularVelocity(b, (r() - 0.5) * 0.3);
      // pull gently toward the dish
      (b as unknown as { tx: number }).tx = dish.left + dish.width * (0.25 + r() * 0.5);
      Matter.Composite.add(engine.world, b);
      return { img, b, size };
    });
    const t0 = performance.now();
    const loop = () => {
      Matter.Engine.update(engine, 1000 / 60);
      for (const { img, b, size } of items) {
        const tx = (b as unknown as { tx: number }).tx;
        Matter.Body.applyForce(b, b.position, { x: (tx - b.position.x) * 0.0000025 * b.mass * 60, y: 0 });
        img.style.transform = `translate(${b.position.x - size / 2}px, ${b.position.y - size / 2}px) rotate(${b.angle}rad)`;
      }
      if (performance.now() - t0 < 2400) requestAnimationFrame(loop);
      else { layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).onfinish = () => layer.remove(); done(); }
    };
    loop();
  }
}
