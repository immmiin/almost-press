// Glass ink vial: liquid pigment that sloshes when touched and drains as it is used.
import { reducedMotion } from '../core/rng';

let vialUid = 0;
const BODY = 'M14 30 C14 24 18 22 22 21 L22 12 L38 12 L38 21 C42 22 46 24 46 30 L46 104 C46 112 41 116 30 116 C19 116 14 112 14 104 Z';

export class Vial {
  el: SVGSVGElement;
  private liquid: SVGPathElement;
  private shine: SVGPathElement;
  private bubbles: SVGGElement;
  private tilt = 0; private vel = 0; private phase = 0; private amp = 0;
  private raf = 0;
  level: number;
  color: string;

  constructor(color: string, level = 0.82, label = '') {
    this.color = color; this.level = level;
    const id = `vl${vialUid++}`;
    const wrap = document.createElement('div');
    wrap.innerHTML = `<svg class="vial" viewBox="0 0 60 124" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
<defs><clipPath id="${id}c"><path d="${BODY}"/></clipPath>
<linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".22" stop-color="#fff" stop-opacity=".08"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient>
<radialGradient id="${id}l" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="30" cy="119" rx="17" ry="3" fill="#3B3A40" opacity=".10"/>
<path d="${BODY}" fill="rgba(246,242,236,.35)"/>
<g clip-path="url(#${id}c)"><path class="liq" fill="${color}" style="mix-blend-mode:multiply" opacity=".9"/>
<path class="liq-shine" fill="url(#${id}l)"/><g class="bub"></g></g>
<path d="${BODY}" fill="url(#${id}g)" stroke="#3B3A40" stroke-opacity=".55" stroke-width="1"/>
<path d="M19 34 C18 50 18 80 19 100" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<rect x="20" y="4" width="20" height="10" rx="2" fill="#E6D9C6" stroke="#3B3A40" stroke-opacity=".5" stroke-width=".8"/>
<path d="M21 7 H39 M21 10 H39" stroke="#3B3A40" stroke-opacity=".18" stroke-width=".6"/>
</svg>`;
    this.el = wrap.firstElementChild as SVGSVGElement;
    this.liquid = this.el.querySelector('.liq')!;
    this.shine = this.el.querySelector('.liq-shine')!;
    this.bubbles = this.el.querySelector('.bub')!;
    this.draw();
  }

  setColor(c: string) { this.color = c; this.liquid.setAttribute('fill', c); }
  setLevel(l: number, animate = true) {
    this.level = Math.max(0, Math.min(1, l));
    if (animate) this.slosh(0.4); else this.draw();
  }
  /** Kick the liquid; strength 0..1. */
  slosh(strength = 1, dir = 1) {
    if (reducedMotion()) { this.draw(); return; }
    this.vel += 0.16 * strength * dir; this.amp = Math.min(6, this.amp + 3.5 * strength);
    if (!this.raf) this.loop();
  }
  /** A few rising bubbles (the press dozing). */
  bubble() {
    if (reducedMotion()) return;
    for (let i = 0; i < 4; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', String(0.8 + Math.random() * 1.4));
      c.setAttribute('cx', String(20 + Math.random() * 20));
      c.setAttribute('cy', '110');
      c.setAttribute('fill', '#fff'); c.setAttribute('opacity', '.7');
      this.bubbles.appendChild(c);
      const top = this.surfaceY() + 2;
      c.animate([{ transform: 'translateY(0)', opacity: 0.8 }, { transform: `translateY(${top - 110}px)`, opacity: 0 }], { duration: 1400 + Math.random() * 900, delay: i * 260, easing: 'cubic-bezier(.3,.1,.6,1)' }).onfinish = () => c.remove();
    }
  }
  private surfaceY() { return 112 - this.level * 84; }
  private loop = () => {
    // damped spring for tilt, travelling wave for the surface
    this.vel += -this.tilt * 0.09; this.vel *= 0.9; this.tilt += this.vel;
    this.phase += 0.22; this.amp *= 0.965;
    this.draw();
    if (Math.abs(this.vel) + Math.abs(this.tilt) + this.amp > 0.01) this.raf = requestAnimationFrame(this.loop);
    else { this.raf = 0; this.tilt = 0; this.amp = 0; this.draw(); }
  };
  private draw() {
    const y = this.surfaceY();
    const pts: string[] = [];
    for (let i = 0; i <= 12; i++) {
      const x = 10 + i * 3.4;
      const yy = y + (x - 30) * this.tilt * 0.9 + Math.sin(this.phase + i * 0.8) * this.amp * 0.35;
      pts.push(`${x.toFixed(1)} ${yy.toFixed(2)}`);
    }
    const d = `M${pts.join('L')}L52 124L8 124Z`;
    this.liquid.setAttribute('d', this.level <= 0.001 ? '' : d);
    this.shine.setAttribute('d', this.level <= 0.001 ? '' : d);
  }
}
