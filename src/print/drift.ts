// Drift: random, different every issue, all derived from the seed. Each new page draws drift cards;
// only their number (1 → 5) and intensity (0.1 → 1.0) rise with the page number. Tendency:
// crisp → bled → blurred → poured/broken → abstract.
import type { Page, PageObj, Stroke, GroundId } from '../model/types';
import { PAGE_W, PAGE_H } from '../model/types';
import type { Rng } from '../core/rng';
import { pick, clamp } from '../core/rng';
import { newId } from '../model/store';
import { OBJ, nameOf } from '../objects';
import type { ToolId } from '../press/toolDefs';

export const CARDS = ['bleed', 'bokashi', 'haze', 'wave', 'pour', 'break', 'tube', 'echo', 'melt', 'dither',
  'scale-wrong', 'multiply', 'gravity', 'material-swap', 'window-in-window', 'floor-swap', 'word-takeover', 'language-drift',
  'mirror', 'ghost', 'crop-wrong', 'color-leak', 'ink-starve', 'misregister-spike', 'mist', 'shrink-world', 'pile-in'] as const;
export type Card = (typeof CARDS)[number];

const STAGES: Card[][] = [
  ['misregister-spike', 'scale-wrong', 'ghost', 'multiply', 'bleed', 'mirror', 'language-drift', 'window-in-window'],
  ['bleed', 'bokashi', 'mist', 'color-leak', 'haze', 'floor-swap', 'material-swap', 'window-in-window', 'multiply'],
  ['haze', 'mist', 'wave', 'echo', 'ghost', 'tube', 'shrink-world', 'word-takeover', 'language-drift'],
  ['pour', 'break', 'wave', 'tube', 'dither', 'gravity', 'crop-wrong', 'ink-starve', 'word-takeover'],
  ['melt', 'dither', 'pour', 'echo', 'bleed', 'pile-in', 'ink-starve', 'bokashi', 'haze'],
];

/** Draw cards for page n (1-based). driftKnob scales count and intensity. */
export function drawCards(r: Rng, n: number, driftKnob: number): { cards: Card[]; k: number } {
  const t = (n - 1) / 15;
  const count = Math.max(n > 1 ? 1 : 0, Math.round((1 + t * 4) * (0.4 + driftKnob * 0.8)));
  const k = clamp((0.1 + t * 0.9) * (0.5 + driftKnob * 0.75), 0.05, 1.1);
  const stage = Math.min(4, Math.floor(t * 5));
  const pool = [...STAGES[stage], ...STAGES[stage], ...(stage ? STAGES[stage - 1] : [])];
  const cards: Card[] = [];
  let guard = 0;
  while (cards.length < count && guard++ < 50) { const c = pick(r, pool); if (!cards.includes(c)) cards.push(c); }
  return { cards, k };
}

const SWAP: Record<string, string> = { moon: 'egg', sun: 'lemon', planet: 'cherry', balloon: 'apple', heart: 'cherry', umbrella: 'mushroom', mushroom: 'umbrella', pool: 'bathtub', bathtub: 'pool', eye: 'egg', teacup: 'bathtub', lamp: 'streetlamp', house: 'gift', cloud: 'icecream', wave: 'snake', clock: 'lemon', table: 'piano', stairs: 'ladder', swan: 'boat', chair: 'swing' };
const TOOLS: ToolId[] = ['bleed', 'bokashi', 'haze', 'wave', 'pour', 'break', 'tube', 'echo', 'melt', 'dither'];

function strokeAcross(r: Rng, tool: ToolId, page: Page, k: number, target?: PageObj): Stroke {
  const o = target ?? (page.objects.length ? pick(r, page.objects) : null);
  const cx = o ? o.x / PAGE_W : 0.2 + r() * 0.6, cy = o ? o.y / PAGE_H : 0.2 + r() * 0.6;
  const len = 0.15 + r() * 0.35;
  const a = tool === 'pour' || tool === 'bokashi' || tool === 'wave' ? (r() - 0.5) * 0.4 : r() * Math.PI;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const f = i / 6 - 0.5;
    pts.push([clamp(cx + Math.cos(a) * len * f + (r() - 0.5) * 0.02, -0.05, 1.05), clamp(cy + Math.sin(a) * len * f * 0.7 + (r() - 0.5) * 0.02 - (tool === 'pour' ? 0.12 : 0), -0.05, 1.05)]);
  }
  const n = page.inks.length;
  const sizeBase: Record<string, number> = { bleed: 0.08, bokashi: 0.16, haze: 0.15, wave: 0.16, pour: 0.11, break: 0.13, tube: 0.18, echo: 0.12, melt: 0.13, dither: 0.15 };
  return { tool, pts, size: sizeBase[tool] * (0.8 + r() * 0.6) * (0.7 + k * 0.5), intensity: clamp(0.25 + k * 0.75), seed: Math.floor(r() * 1e5), plate: Math.floor(r() * n), plate2: tool === 'bokashi' && n > 1 && r() < 0.5 ? Math.floor(r() * n) : undefined };
}

const real = (p: Page) => p.objects.filter((o) => o.kind === 'obj' && !o.fx);

export interface DriftCtx { r: Rng; page: Page; k: number; earlier: Page[]; lang: 'en' | 'ko' | 'ja' }
/** Apply one card to a page. Returns a short description (for the slug). */
export function applyCard(card: Card, c: DriftCtx): void {
  const { r, page, k } = c;
  const objs = real(page);
  if ((TOOLS as string[]).includes(card)) { page.strokes.push(strokeAcross(r, card as ToolId, page, k)); if (k > 0.6 && r() < 0.5) page.strokes.push(strokeAcross(r, card as ToolId, page, k)); return; }
  switch (card) {
    case 'scale-wrong': { const o = objs.length ? pick(r, objs) : null; if (o) o.s = clamp(o.s * (r() < 0.6 ? 1.8 + k * 1.4 : 0.35), 6, 240); break; }
    case 'multiply': {
      const o = objs.length ? pick(r, objs) : null; if (!o) break;
      const cnt = 3 + Math.floor(k * 5 + r() * 2);
      const step = Math.min(30, (PAGE_W - 20) / cnt);
      for (let i = 0; i < cnt; i++) page.objects.push({ ...o, id: newId(), x: 10 + step * (i + 0.5), y: o.y + (r() - 0.5) * 4 * k, s: Math.min(o.s, step * 1.15), opacity: 1 - (i / cnt) * 0.6 * k, seed: o.seed + i, fx: undefined });
      break;
    }
    case 'gravity': {
      const mode = r();
      page.objects.forEach((o) => {
        if (o.kind === 'helper') return;
        if (mode < 0.35) { o.y = PAGE_H - o.y; o.r += 180; } // ceiling
        else if (mode < 0.7) { const a = (r() < 0.5 ? -1 : 1) * (12 + k * 18); const dx = o.x - PAGE_W / 2, dy = o.y - PAGE_H / 2, ra = a * Math.PI / 180; o.x = PAGE_W / 2 + dx * Math.cos(ra) - dy * Math.sin(ra); o.y = PAGE_H / 2 + dx * Math.sin(ra) + dy * Math.cos(ra); o.r += a; }
        else { const dx = o.x - PAGE_W / 2, dy = o.y - PAGE_H / 2; o.x = PAGE_W / 2 - dy * 0.7; o.y = PAGE_H / 2 + dx * 1.3; o.r += 90; } // vertical horizon
      });
      break;
    }
    case 'material-swap': { const o = objs.find((q) => SWAP[q.key]); if (o) o.key = SWAP[o.key]; else if (objs.length) pick(r, objs).wrong = 0.7; break; }
    case 'window-in-window': {
      const o = objs.length ? pick(r, objs) : null;
      const x = 20 + r() * 100, y = 30 + r() * 110;
      page.objects.push({ id: newId(), kind: 'obj', key: 'window', x, y, s: 46, r: 0, plates: [0, 1, 2].map((i) => i % page.inks.length), seed: Math.floor(r() * 1e5) });
      if (o) page.objects.push({ ...o, id: newId(), x, y: y + 4, s: 18, fx: undefined });
      break;
    }
    case 'floor-swap': { const opts: GroundId[] = ['pool', 'sea', 'cloud', 'checker', 'horizon', 'wash', 'bokashi']; page.ground = pick(r, opts.filter((g) => g !== page.ground)); break; }
    case 'word-takeover': {
      const o = objs.length ? pick(r, objs) : null; if (!o) break;
      const lang = pick(r, ['en', 'ko', 'ja'] as const);
      const w = nameOf(o.key, lang).toLowerCase();
      Object.assign(o, { kind: 'word', key: w, style: Math.floor(r() * 6), s: Math.max(40, o.s * 1.1) });
      break;
    }
    case 'mirror': {
      const o = objs.length ? pick(r, objs) : null; if (!o) break;
      page.objects.push({ ...o, id: newId(), x: PAGE_W - o.x, flip: !o.flip, fx: undefined, seed: o.seed + 9 });
      break;
    }
    case 'ghost': {
      const src = c.earlier.length ? pick(r, c.earlier) : null;
      if (src) page.setoff = [...(page.setoff ?? []), ...src.objects.filter((o) => !o.fx).slice(0, 6).map((o) => ({ ...o, id: newId(), opacity: 0.5 + k * 0.6, x: PAGE_W - o.x }))];
      break;
    }
    case 'crop-wrong': { const o = objs.length ? pick(r, objs) : null; if (o) { o.s = clamp(o.s * 2.4, 40, 260); o.x = r() < 0.5 ? -o.s * 0.15 : PAGE_W + o.s * 0.15; o.y = clamp(o.y, 30, 180); } break; }
    case 'color-leak': { const o = objs.length ? pick(r, objs) : null; if (o) { o.plates = o.plates.map((p) => (p + 1) % page.inks.length); page.strokes.push(strokeAcross(r, 'bleed', page, k, o)); } break; }
    case 'ink-starve': case 'misregister-spike': if (!page.drift.includes(card)) page.drift.push(card); if (card === 'misregister-spike') page.mis = Math.max(page.mis, 0.8 + k); break;
    case 'mist': {
      const y = 0.42 + r() * 0.2;
      page.strokes.push({ tool: 'haze', pts: [[-0.05, y], [0.5, y + (r() - 0.5) * 0.04], [1.05, y]], size: 0.12 + k * 0.08, intensity: clamp(0.4 + k * 0.5), seed: Math.floor(r() * 1e5) });
      page.strokes.push({ tool: 'bokashi', pts: [[-0.05, y], [1.05, y]], size: 0.07, intensity: 0.5 + k * 0.4, seed: 1, plate: page.inks.length - 1 });
      break;
    }
    case 'shrink-world': page.objects.forEach((o) => { if (o.kind === 'helper') return; o.s *= 0.5; o.x = PAGE_W / 2 + (o.x - PAGE_W / 2) * 0.5; o.y = PAGE_H * 0.55 + (o.y - PAGE_H * 0.55) * 0.5; }); break;
    case 'pile-in': {
      const host = objs.length ? objs.reduce((a, b) => (a.s > b.s ? a : b)) : null; if (!host) break;
      host.s = Math.max(host.s, 90); host.x = PAGE_W / 2; host.y = PAGE_H * 0.55;
      page.objects.forEach((o) => { if (o === host || o.kind === 'helper') return; o.s = Math.min(o.s, host.s * 0.22); o.x = host.x + (r() - 0.5) * host.s * 0.4; o.y = host.y + (r() - 0.5) * host.s * 0.3; });
      // the host comes first: everything else sits inside it
      page.objects.splice(page.objects.indexOf(host), 1); page.objects.unshift(host);
      break;
    }
    case 'language-drift': break; // handled by the dream line
  }
}
export const isTool = (c: string) => (TOOLS as string[]).includes(c);
export { OBJ };
