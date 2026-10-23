// Grounds: rice paper, bokashi sky (ichimonji band), mist horizon, pool tiles, sea, cloud floor,
// checker floor, full-bleed wash, or "let the machine choose". All in page mm; washes go to the B channel.
import type { Page, GroundId } from '../model/types';
import { PAGE_W, PAGE_H, BLEED } from '../model/types';
import { rng } from '../core/rng';
import { INK_BY_ID, hexToRgb } from '../design/tokens';

type Paint = (c: CanvasRenderingContext2D, k: { SOLID: string; TINT: string; WASH: string }) => void;
export interface GroundPart { plate: number; kind: 'solid' | 'tint' | 'wash'; markup?: string; paint?: Paint; alpha?: number; m?: DOMMatrix }

export const GROUNDS: { id: GroundId; char: string; en: string; ko: string; ja: string }[] = [
  { id: 'rice', char: '紙', en: 'rice paper', ko: '한지', ja: '和紙' },
  { id: 'bokashi', char: '暈', en: 'bokashi sky', ko: '선염 하늘', ja: 'ぼかし空' },
  { id: 'horizon', char: '霞', en: 'mist horizon', ko: '안개 지평', ja: '霞の地平' },
  { id: 'pool', char: '泳', en: 'pool tiles', ko: '수영장 타일', ja: 'プールのタイル' },
  { id: 'sea', char: '海', en: 'sea', ko: '바다', ja: '海' },
  { id: 'cloud', char: '雲', en: 'cloud floor', ko: '구름 바닥', ja: '雲の床' },
  { id: 'checker', char: '格', en: 'checker floor', ko: '체커 바닥', ja: '市松の床' },
  { id: 'wash', char: '染', en: 'full-bleed wash', ko: '전면 번짐', ja: '全面の染め' },
  { id: 'machine', char: '機', en: 'let the machine choose', ko: '기계에게 맡기기', ja: '機械まかせ' },
];
const X0 = -BLEED, Y0 = -BLEED, W = PAGE_W + BLEED * 2, H = PAGE_H + BLEED * 2;

/** Gradient wash band (B channel) between y0 and y1, peak alpha a. */
function band(y0: number, y1: number, a: number, fadeTop = true, fadeBottom = true): Paint {
  return (c, k) => {
    const g = c.createLinearGradient(0, y0, 0, y1);
    const col = (al: number) => `rgba(0,0,255,${al})`;
    void k;
    g.addColorStop(0, col(fadeTop ? 0 : a));
    g.addColorStop(0.35, col(a)); g.addColorStop(0.6, col(a * 0.9));
    g.addColorStop(1, col(fadeBottom ? 0 : a));
    c.fillStyle = g; c.fillRect(X0, y0, W, y1 - y0);
  };
}

function perspectiveTiles(hz: number, fl: number, checker: boolean): string {
  // ported idea of the reference's floor: rows growing toward the viewer, columns converging
  const ys = [hz]; let y = hz, h = 2;
  while (y < fl) { y = Math.min(fl, y + h); ys.push(y); h *= 1.38; }
  const vx = PAGE_W / 2;
  const X = (yy: number, xb: number) => vx + (xb - vx) * (yy - hz + 18) / (fl - hz + 18);
  const out: string[] = [];
  for (let ri = 0; ri < ys.length - 1; ri++) for (let ci = 0; ci < 22; ci++) {
    if (checker && (ri + ci) % 2) continue;
    const x0 = -230 + ci * 28, x1 = x0 + (checker ? 28 : 26), ya = ys[ri], yb = ys[ri + 1] - (checker ? 0 : 0.5);
    out.push(`<polygon points="${X(ya, x0).toFixed(2)},${ya.toFixed(2)} ${X(ya, x1).toFixed(2)},${ya.toFixed(2)} ${X(yb, x1).toFixed(2)},${yb.toFixed(2)} ${X(yb, x0).toFixed(2)},${yb.toFixed(2)}" fill="{F}"/>`);
  }
  return out.join('');
}

export function resolveGround(page: Page): GroundId {
  if (page.ground !== 'machine') return page.ground;
  const r = rng(page.seed * 13 + 5);
  const opts: GroundId[] = ['rice', 'bokashi', 'horizon', 'pool', 'sea', 'cloud', 'checker', 'wash'];
  return opts[Math.floor(r() * opts.length)];
}

export function groundParts(page: Page): GroundPart[] {
  const n = Math.max(1, page.inks.length);
  // the 4th plate carries washes and backgrounds; otherwise the lightest ink does (stays pale)
  const lum = (id: string) => { const [a, b, c] = hexToRgb(INK_BY_ID[id]?.hex ?? '#888888'); return a * 0.3 + b * 0.59 + c * 0.11; };
  const lightest = page.inks.reduce((best, id, i) => (lum(id) > lum(page.inks[best]) ? i : best), 0);
  const top = page.groundPlate !== undefined ? page.groundPlate % n : n >= 4 ? 3 : lightest;
  const sec = n >= 2 ? 1 : 0;
  const thr = n >= 3 ? 2 : 0;
  const r = rng(page.seed * 31 + 7);
  const hz = 118 + Math.round((r() - 0.5) * 20);
  switch (resolveGround(page)) {
    case 'rice': return [];
    case 'bokashi': return [{ plate: top, kind: 'wash', paint: band(Y0, 64, 0.42, false, true) }];
    case 'horizon': return [
      { plate: thr, kind: 'wash', paint: band(hz - 30, hz + 26, 0.45) },
      { plate: top, kind: 'wash', paint: band(Y0, hz - 10, 0.22, false, true) },
      { plate: sec, kind: 'solid', markup: `<rect x="${X0}" y="${hz}" width="${W}" height="0.35" fill="{F}"/>` },
    ];
    case 'pool': return [
      { plate: top, kind: 'wash', paint: band(Y0, hz, 0.4, false, true) },
      { plate: thr, kind: 'tint', markup: perspectiveTiles(hz, PAGE_H + BLEED, false) },
      { plate: sec, kind: 'solid', markup: `<rect x="${X0}" y="${hz - 0.6}" width="${W}" height="1.2" fill="{F}"/>` },
    ];
    case 'sea': {
      const waves: string[] = [];
      for (let y = hz, i = 0; y < PAGE_H + BLEED; y += 2.2 + i * 0.5, i++) {
        const a = 0.6 + i * 0.25, l = 6 + i * 1.6;
        let d = `M${X0} ${y.toFixed(2)}`;
        for (let x = X0; x < PAGE_W + BLEED; x += l) d += ` q${(l / 4).toFixed(2)} ${(-a).toFixed(2)} ${(l / 2).toFixed(2)} 0 t${(l / 2).toFixed(2)} 0`;
        waves.push(`<path d="${d}" fill="none" stroke="{F}" stroke-width="${(0.25 + i * 0.05).toFixed(2)}"/>`);
      }
      return [{ plate: top, kind: 'wash', paint: band(hz - 6, PAGE_H + BLEED, 0.35, true, false) }, { plate: sec, kind: 'solid', markup: waves.join('') }];
    }
    case 'cloud': {
      const puffs: string[] = [];
      for (let i = 0; i < 26; i++) {
        const x = X0 + r() * W, y = hz + 10 + r() * (PAGE_H - hz), rr = 6 + r() * 16;
        puffs.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(rr * 1.6).toFixed(1)}" ry="${rr.toFixed(1)}" fill="{F}"/>`);
      }
      return [{ plate: top, kind: 'wash', paint: band(Y0, hz + 20, 0.3, false, true) }, { plate: thr, kind: 'tint', markup: puffs.join('') }];
    }
    case 'checker': return [
      { plate: thr, kind: 'tint', markup: `<rect x="${X0}" y="${Y0}" width="${W}" height="${hz - Y0}" fill="{F}"/>` },
      { plate: sec, kind: 'tint', markup: perspectiveTiles(hz, PAGE_H + BLEED, true) },
      { plate: sec, kind: 'solid', markup: `<rect x="${X0}" y="${hz - 0.4}" width="${W}" height="0.8" fill="{F}"/>` },
    ];
    case 'wash': return [
      { plate: top, kind: 'wash', paint: (c) => { const g = c.createLinearGradient(0, Y0, W * 0.3, H); g.addColorStop(0, 'rgba(0,0,255,.3)'); g.addColorStop(0.55, 'rgba(0,0,255,.1)'); g.addColorStop(1, 'rgba(0,0,255,.26)'); c.fillStyle = g; c.fillRect(X0, Y0, W, H); } },
      { plate: sec, kind: 'wash', paint: (c) => { const g = c.createRadialGradient(PAGE_W * 0.7, PAGE_H * 0.7, 4, PAGE_W * 0.7, PAGE_H * 0.7, 110); g.addColorStop(0, 'rgba(0,0,255,.22)'); g.addColorStop(1, 'rgba(0,0,255,0)'); c.fillStyle = g; c.fillRect(X0, Y0, W, H); } },
    ];
  }
  return [];
}
