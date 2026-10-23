// UI materials: washi tape, paper slips, seal-stamp buttons, ceramic knobs, enamel print button.
import { rng } from '../core/rng';
import { deckle } from './paper';
import { GLYPHS } from './glyphs';
import { glyphLayout, sealEdge } from './seal';

const WASHI = [
  { bg: '#F7C6D4', pat: 'dots' }, { bg: '#CFE6D2', pat: 'stripe' }, { bg: '#C9B6E4', pat: 'plain' },
  { bg: '#C4D8EC', pat: 'grid' }, { bg: '#F3E3B5', pat: 'dots' }, { bg: '#E6B5C9', pat: 'stripe' },
];
/** A strip of washi tape. Absolutely positioned by the caller (left/top/right/bottom via style). */
export function washi(seed: number, style: Partial<CSSStyleDeclaration> = {}, len = 74): HTMLElement {
  const r = rng(seed * 13 + 5);
  const k = WASHI[Math.floor(r() * WASHI.length)];
  const el = document.createElement('i');
  el.className = `washi washi-${k.pat}`;
  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--washi', k.bg);
  el.style.width = `${len}px`;
  el.style.transform = `rotate(${((r() - 0.5) * 16).toFixed(1)}deg)`;
  // torn fibrous ends
  const L: string[] = [], R: string[] = [];
  for (let i = 0; i <= 6; i++) {
    const y = (i / 6) * 100;
    L.push(`${(r() * 5).toFixed(1)}% ${y}%`);
    R.push(`${(100 - r() * 5).toFixed(1)}% ${100 - y}%`);
  }
  el.style.clipPath = `polygon(${L.join(',')},${R.join(',')})`;
  Object.assign(el.style, style);
  return el;
}

/** A torn paper slip (for buttons and notes). */
export function slip(tag: 'button' | 'div' | 'a', seed: number, html: string, cls = ''): HTMLElement {
  const el = document.createElement(tag);
  el.className = `slip ${cls}`;
  el.innerHTML = html;
  if (tag === 'button') (el as HTMLButtonElement).type = 'button';
  deckle(el, seed, 'torn', 5);
  return el;
}

/** Seal-stamp button: one kanji in a stamped square. Active → vermilion. */
export function stampButton(char: string, label: string, seed = 1): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'stamp';
  b.setAttribute('aria-pressed', 'false');
  b.setAttribute('aria-label', label);
  const edge = sealEdge(seed * 3 + 1, 1.8, 6);
  const g = GLYPHS[char] ? glyphLayout(char, [20, 18, 80, 82]) : [];
  b.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="stamp-edge" d="${edge}"/>${g.map((x) => `<path class="stamp-glyph" d="${x.d}" transform="${x.transform}"/>`).join('')}</svg><span class="stamp-label">${label}</span>`;
  return b;
}

/** Ceramic knob with an accessible slider role. */
export function knob(label: string, value: number, onInput: (v: number) => void, opts: { min?: number; max?: number; step?: number } = {}): HTMLElement {
  const { min = 0, max = 1, step = 0.05 } = opts;
  const wrap = document.createElement('div');
  wrap.className = 'knob';
  wrap.innerHTML = `<div class="knob-dial" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="${min}" aria-valuemax="${max}"><i class="knob-tick"></i></div><span class="knob-label">${label}</span>`;
  const dial = wrap.querySelector('.knob-dial') as HTMLElement;
  let v = value;
  const set = (nv: number, fire = true) => {
    v = Math.min(max, Math.max(min, Math.round(nv / step) * step));
    const t = (v - min) / (max - min);
    dial.style.setProperty('--a', `${-135 + t * 270}deg`);
    dial.setAttribute('aria-valuenow', v.toFixed(2));
    dial.setAttribute('aria-valuetext', `${Math.round(t * 100)}%`);
    if (fire) onInput(v);
  };
  set(v, false);
  dial.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowRight') { set(v + step); e.preventDefault(); }
    else if (k === 'ArrowDown' || k === 'ArrowLeft') { set(v - step); e.preventDefault(); }
    else if (k === 'Home') { set(min); e.preventDefault(); }
    else if (k === 'End') { set(max); e.preventDefault(); }
  });
  dial.addEventListener('pointerdown', (e) => {
    dial.setPointerCapture(e.pointerId);
    const y0 = e.clientY, x0 = e.clientX, v0 = v;
    const move = (m: PointerEvent) => set(v0 + ((y0 - m.clientY) + (m.clientX - x0)) / 140 * (max - min));
    const up = () => { dial.removeEventListener('pointermove', move); dial.removeEventListener('pointerup', up); };
    dial.addEventListener('pointermove', move); dial.addEventListener('pointerup', up);
  });
  (wrap as unknown as { setValue: (n: number) => void }).setValue = (n: number) => set(n, false);
  return wrap;
}

/** Large round enamel PRINT button; the vermilion ring fills via --fill (0..1). */
export function enamelButton(label: string, sub: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'enamel';
  b.innerHTML = `<span class="enamel-ring" aria-hidden="true"></span><span class="enamel-face"><span class="enamel-label">${label}</span><span class="enamel-sub">${sub}</span></span>`;
  return b;
}

/** Three-way switch drawn as a little slotted plate (mild / normal / wild). */
export function slotSwitch(label: string, options: [string, string][], value: string, onChange: (v: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'slot-switch';
  wrap.setAttribute('role', 'radiogroup');
  wrap.setAttribute('aria-label', label);
  const render = () => {
    wrap.innerHTML = `<span class="slot-label">${label}</span>` + options.map(([v, l]) =>
      `<button type="button" role="radio" aria-checked="${v === value}" data-v="${v}">${l}</button>`).join('');
  };
  render();
  wrap.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    value = b.dataset.v!; render(); onChange(value);
    (wrap.querySelector(`[data-v="${value}"]`) as HTMLElement)?.focus();
  });
  return wrap;
}
