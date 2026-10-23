// Rice paper (한지 / 和紙): fibre textures drawn in code, deckled uneven edges on every sheet.
import { rng, type Rng } from '../core/rng';

/** A deckled outline for a w×h sheet: many small irregular bites with a slow wander. */
export function deckledPath(w: number, h: number, seed = 1, amp = 3, step = 5): string {
  const r = rng(seed);
  const pts: [number, number][] = [];
  const edge = (len: number, f: (t: number, o: number) => [number, number]) => {
    const n = Math.max(4, Math.round(len / step));
    let wander = 0;
    for (let i = 0; i < n; i++) {
      wander += (r() - 0.5) * 0.5; wander *= 0.85;
      const o = (r() * 0.75 + wander * 0.6 + (r() < 0.06 ? r() * 0.9 : 0)) * amp;
      pts.push(f((i + r() * 0.5) / n, Math.max(0, o)));
    }
  };
  edge(w, (t, o) => [t * w, o]);
  edge(h, (t, o) => [w - o, t * h]);
  edge(w, (t, o) => [w - t * w, h - o]);
  edge(h, (t, o) => [o, h - t * h]);
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
}

/** Torn edge on one side only (paper slips): straight sides, ragged bottom/top. */
export function tornPath(w: number, h: number, seed = 1, amp = 5): string {
  const r = rng(seed);
  const top: string[] = [], bot: string[] = [];
  const n = Math.max(6, Math.round(w / 7));
  for (let i = 0; i <= n; i++) top.push(`${((i / n) * w).toFixed(1)} ${(r() * amp * 0.5).toFixed(1)}`);
  for (let i = n; i >= 0; i--) bot.push(`${((i / n) * w).toFixed(1)} ${(h - r() * amp - (r() < 0.15 ? amp * 0.6 : 0)).toFixed(1)}`);
  return `M${top.join('L')}L${bot.join('L')}Z`;
}

/** Keeps `clip-path: path()` in sync with the element's pixel size. */
const ro = new ResizeObserver((entries) => {
  for (const e of entries) applyDeckle(e.target as HTMLElement);
});
function applyDeckle(el: HTMLElement) {
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;
  const seed = +(el.dataset.seed ?? 1);
  const kind = el.dataset.edge ?? 'deckle';
  const amp = +(el.dataset.amp ?? (kind === 'torn' ? 6 : 3));
  const d = kind === 'torn' ? tornPath(w, h, seed, amp) : deckledPath(w, h, seed, amp);
  el.style.clipPath = `path("${d}")`;
}
export function deckle(el: HTMLElement, seed = 1, kind: 'deckle' | 'torn' = 'deckle', amp?: number) {
  el.dataset.seed = String(seed);
  el.dataset.edge = kind;
  if (amp !== undefined) el.dataset.amp = String(amp);
  ro.observe(el);
  applyDeckle(el);
  return el;
}

/** Draws rice-paper fibres into a 2D context (used by the CSS texture and by page renders). */
export function drawFibres(ctx: CanvasRenderingContext2D, w: number, h: number, r: Rng, density = 1, tone = '90,80,64') {
  const scale = Math.sqrt((w * h) / (512 * 512));
  // long soft kozo fibres
  const long = Math.round(70 * density * scale * scale);
  ctx.lineCap = 'round';
  for (let i = 0; i < long; i++) {
    let x = r() * w, y = r() * h;
    let a = r() * Math.PI * 2;
    const len = (20 + r() * 90) * scale;
    ctx.beginPath(); ctx.moveTo(x, y);
    const segs = 8;
    for (let s = 0; s < segs; s++) {
      a += (r() - 0.5) * 0.9;
      x += Math.cos(a) * len / segs; y += Math.sin(a) * len / segs;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${tone},${(0.05 + r() * 0.09).toFixed(3)})`;
    ctx.lineWidth = (0.35 + r() * 0.7) * Math.max(1, scale * 0.8);
    ctx.stroke();
  }
  // tiny bark specks and short hairs
  const specks = Math.round(260 * density * scale * scale);
  for (let i = 0; i < specks; i++) {
    const x = r() * w, y = r() * h, a = r() * Math.PI;
    const l = (1 + r() * 5) * scale;
    ctx.strokeStyle = `rgba(${tone},${(0.04 + r() * 0.12).toFixed(3)})`;
    ctx.lineWidth = 0.5 * Math.max(1, scale * 0.7);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
}

/** Fine paper grain + cloudy formation (uneven pulp thickness). */
export function drawFormation(ctx: CanvasRenderingContext2D, w: number, h: number, r: Rng, strength = 1) {
  for (let i = 0; i < 40; i++) {
    const x0 = r() * w, y0 = r() * h, rad = (0.08 + r() * 0.22) * Math.max(w, h);
    const light = r() < 0.5;
    // drawn at wrapped offsets so tiles repeat without seams
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      const x = x0 + ox, y = y0 + oy;
      if (x + rad < 0 || x - rad > w || y + rad < 0 || y - rad > h) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, light ? `rgba(255,255,255,${0.10 * strength})` : `rgba(120,105,90,${0.035 * strength})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 14 * strength;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

const textureCache = new Map<string, string>();
/** A tileable rice-paper texture as an object URL, for CSS backgrounds. */
export function paperTextureURL(base: string | null = '#F1ECE2', seed = 7, size = 384, density = 1): string {
  const key = `${base}|${seed}|${size}|${density}`;
  const hit = textureCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  if (base) { ctx.fillStyle = base; ctx.fillRect(0, 0, size, size); }
  const r = rng(seed);
  // draw fibres 3×3 wrapped so the tile repeats seamlessly
  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
    ctx.save(); ctx.translate(ox, oy);
    drawFibres(ctx, size, size, rng(seed * 31 + 1), density);
    ctx.restore();
  }
  if (base) drawFormation(ctx, size, size, r, 0.8);
  const url = c.toDataURL('image/png');
  textureCache.set(key, url);
  return url;
}

/** Mount the shared paper textures as CSS custom properties. */
export function installPaperTextures() {
  const root = document.documentElement.style;
  root.setProperty('--tex-rice', `url(${paperTextureURL('#F1ECE2', 7)})`);
  root.setProperty('--tex-pearl', `url(${paperTextureURL('#F6F2EC', 11)})`);
  root.setProperty('--tex-fibre', `url(${paperTextureURL(null, 5, 320, 1.4)})`);
}
