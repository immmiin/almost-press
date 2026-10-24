// The Gate: the sheet IS the screen. A translucent rice-paper sheet fills the viewport edge to edge (deckled just inside
// the screen edge, washi tape on the corners); the mist shows through its fibres. The seal 殆 is pressed in the middle,
// ALMOST PRESS / 거의 인쇄소 / ほぼ印刷所 print plate by plate across the whole sheet at poster scale (misregistered
// differently on every visit), three torn slips are taped on at different angles. The cursor paints watercolour into
// the paper, which drinks it and lets it fade. Clicking a slip peels it off and the sheet is pulled into the press.
import './gate.css';
import { sealSVG } from '../design/seal';
import { deckle } from '../design/paper';
import { washi, slip } from '../design/materials';
import { t, tAll, onLang } from '../core/i18n';
import { go } from '../core/router';
import { atmosphere, dissolveTo } from '../atmosphere/atmosphere';
import { thud, tick, rustle } from '../core/sound';
import { reducedMotion } from '../core/rng';
import { getIssue, ISSUE_NO } from '../model/store';
import { hexToRgb } from '../design/tokens';

export default function gate(root: HTMLElement) {
  const rm = reducedMotion();
  const R = () => Math.random();
  const inks = ['#FF48B0', '#9D7AD2', '#62C2B1'];
  // misregistered differently on every visit
  const off = inks.map(() => [(R() - 0.5) * 9, (R() - 0.5) * 7]);
  const titleLayer = (i: number) => `<div class="g-plate" style="--dx:${off[i][0].toFixed(1)}px;--dy:${off[i][1].toFixed(1)}px;--ink:${inks[i]};--d:${0.9 + i * 0.55}s">
      <span class="g-en">ALMOST<i class="g-en-gap"> </i>PRESS</span><span class="g-ko">거의<br>인쇄소</span><span class="g-ja">ほぼ印刷所</span></div>`;
  const is = getIssue();
  const inProgress = !is.fixed && !is.bound && (is.current > 0 || is.pages[0].objects.length > 2);
  root.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="g-riso" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="${Math.floor(R() * 99)}" result="w"/>
    <feDisplacementMap in="SourceGraphic" in2="w" scale="4" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 2.05" result="sp"/>
    <feComposite in="d" in2="sp" operator="in"/></filter></svg><main class="gate" aria-label="ALMOST PRESS · 거의 인쇄소 · ほぼ印刷所">
    <div class="g-sheet-wrap">
      <div class="g-sheet sheet">
        <canvas class="g-wash" aria-hidden="true"></canvas>
        <div class="g-title" aria-hidden="true">${[0, 1, 2].map(titleLayer).join('')}</div>
        <h1 class="sr">ALMOST PRESS · 거의 인쇄소 · ほぼ印刷所</h1>
        <div class="g-seal" aria-hidden="true">${sealSVG({ size: 190, seed: Math.floor(R() * 40) + 1, doubleStrike: R() < 0.4, rotate: (R() - 0.5) * 9 })}</div>
        <p class="g-sub mono">a dream print shop · 16 pages · A5 risograph<span lang="ja">夢の印刷所 · 十六頁</span></p>
      </div>
      <nav class="g-slips" aria-label="enter"></nav>
    </div>
  </main>`;
  const sheet = root.querySelector('.g-sheet') as HTMLElement;
  deckle(sheet, 33, 'deckle', 6);
  const wrap = root.querySelector('.g-sheet-wrap') as HTMLElement;
  // washi tape holds the four corners of the sheet to the screen
  wrap.append(
    washi(2, { left: '-12px', top: '20px', transform: 'rotate(-42deg)' }, 104), washi(5, { right: '-14px', top: '22px', transform: 'rotate(44deg)' }, 96),
    washi(8, { left: '-10px', bottom: '24px', transform: 'rotate(40deg)' }, 92), washi(11, { right: '-12px', bottom: '22px', transform: 'rotate(-46deg)' }, 100),
  );
  const nav = root.querySelector('.g-slips') as HTMLElement;
  const slips: [string, () => void, string?][] = [
    ['start', () => leave(() => go('press', inProgress ? '' : 'new=1')), inProgress ? `${ISSUE_NO(is)} · p.${is.pages[is.current].n} · ${t('back')}` : undefined],
    ['unroll', () => leave(() => go('reader', 'issue=01'))],
    ['about', () => leave(() => go('colophon'))],
  ];
  const render = () => {
    nav.innerHTML = '';
    slips.forEach(([key, fn, note], i) => {
      const w = document.createElement('div');
      w.className = `g-slip-wrap g-slip-${i}`;
      const [en, ja] = tAll(key);
      const main = t(key);
      const sub = main === en ? ja : en;
      const s = slip('button', 50 + i, `<span class="g-slip-main">${main}</span><span class="g-slip-alt" lang="${main === en ? 'ja' : 'en'}">${sub}</span>${note ? `<span class="g-slip-note mono">${note}</span>` : ''}`, 'g-slip');
      s.addEventListener('click', () => peel(w, fn));
      s.addEventListener('pointerenter', () => flutter(s));
      s.addEventListener('focus', () => flutter(s));
      w.append(s, washi(60 + i, { left: `${24 + i * 17}%`, top: '-10px' }, 58));
      nav.append(w);
    });
    if (inProgress) {
      const n = document.createElement('button');
      n.type = 'button'; n.className = 'g-new mono'; n.textContent = `${tAll('newIssue')[0]} · ${tAll('newIssue')[1]}`;
      n.addEventListener('click', () => leave(() => go('press', 'new=1')));
      nav.append(n);
    }
  };
  render();
  const offLang = onLang(render);

  // the seal is pressed onto the sheet
  const seal = root.querySelector('.g-seal') as HTMLElement;
  if (!rm) {
    seal.animate([
      { transform: 'translateY(-40px) scale(1.35)', opacity: 0, filter: 'blur(4px)' },
      { transform: 'translateY(0) scale(.9)', opacity: 1, filter: 'blur(0)', offset: 0.55 },
      { transform: 'scale(1.02)', offset: 0.75 },
      { transform: 'scale(1)', opacity: 1 },
    ], { duration: 900, delay: 300, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'backwards' });
    setTimeout(() => { thud(1); atmosphere().bloom(0.5, 0.52, '#E5483E', 1.6); }, 800);
  }

  // ---------- the cursor paints watercolour into the sheet; the paper drinks it, then it fades ----------
  const wash = root.querySelector('.g-wash') as HTMLCanvasElement;
  const wx = wash.getContext('2d')!;
  const K = 0.5; // half resolution: softer and cheap
  const fit = () => { wash.width = Math.max(2, Math.round(sheet.clientWidth * K)); wash.height = Math.max(2, Math.round(sheet.clientHeight * K)); };
  fit();
  const ro = new ResizeObserver(fit); ro.observe(sheet);
  type Drop = { x: number; y: number; r: number; rgb: [number, number, number]; t0: number; a: number; rot: number; sq: number };
  const drops: Drop[] = [];
  let paintRaf = 0, lastPaint = 0, ci = 0, last: [number, number] | null = null;
  const deposit = (x: number, y: number, r: number, a: number) => {
    const rgb = hexToRgb(inks[Math.floor(ci) % inks.length]);
    drops.push({ x, y, r, rgb, t0: performance.now(), a, rot: R() * Math.PI, sq: 0.6 + R() * 0.5 });
    if (drops.length > 260) drops.splice(0, drops.length - 260);
    lastPaint = performance.now();
    if (!paintRaf) paintRaf = requestAnimationFrame(paint);
  };
  const paint = (now: number) => {
    // the whole sheet slowly gives the colour back to the paper
    wx.globalCompositeOperation = 'destination-out';
    wx.fillStyle = 'rgba(0,0,0,0.014)';
    wx.fillRect(0, 0, wash.width, wash.height);
    // wet drops spread along the fibres while they soak in (≈ 0.9 s), leaving a slightly darker drying edge;
    // each frame adds only a breath of pigment, so overlapping strokes build up like washes rather than paint
    wx.globalCompositeOperation = 'source-over';
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      const age = (now - d.t0) / 900;
      if (age >= 1) { drops.splice(i, 1); continue; }
      const rad = d.r * (0.55 + age * 0.9);
      const a = d.a * (1 - age) * 0.022;
      const g = wx.createRadialGradient(d.x, d.y, 0, d.x, d.y, rad);
      const [r, gg, b] = d.rgb;
      g.addColorStop(0, `rgba(${r},${gg},${b},${(a * 0.55).toFixed(3)})`);
      g.addColorStop(0.78, `rgba(${r},${gg},${b},${(a * 0.8).toFixed(3)})`);
      g.addColorStop(0.92, `rgba(${r},${gg},${b},${a.toFixed(3)})`);
      g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      wx.fillStyle = g;
      // each drop soaks out unevenly: a turned ellipse, longer along the fibres
      wx.beginPath(); wx.ellipse(d.x, d.y, rad * 1.2, rad * d.sq, d.rot, 0, Math.PI * 2); wx.fill();
    }
    paintRaf = drops.length || now - lastPaint < 9000 ? requestAnimationFrame(paint) : 0;
  };
  const paintMove = (e: PointerEvent) => {
    const r = sheet.getBoundingClientRect();
    const x = (e.clientX - r.left) * K, y = (e.clientY - r.top) * K;
    if (x < 0 || y < 0 || x > wash.width || y > wash.height) { last = null; return; }
    if ((e.target as Element | null)?.closest?.('.g-slips')) { last = null; return; }
    if (last) {
      const d = Math.hypot(x - last[0], y - last[1]);
      const n = Math.min(6, Math.floor(d / 9));
      for (let i = 1; i <= n; i++) deposit(last[0] + (x - last[0]) * i / n + (R() - 0.5) * 4, last[1] + (y - last[1]) * i / n + (R() - 0.5) * 4, 9 + Math.min(15, d * 0.35) + R() * 7, 0.7 + R() * 0.3);
      if (n) last = [x, y];
      ci += d * 0.004;
    } else last = [x, y];
  };
  const paintDown = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest?.('.g-slips')) return;
    const r = sheet.getBoundingClientRect();
    const x = (e.clientX - r.left) * K, y = (e.clientY - r.top) * K;
    // a click drops a small bloom of ink
    for (let i = 0; i < 5; i++) deposit(x + (R() - 0.5) * 26, y + (R() - 0.5) * 26, 26 + R() * 30, 0.8);
    ci += 1;
  };
  addEventListener('pointermove', paintMove);
  sheet.addEventListener('pointerdown', paintDown);

  // parallax: the sheet leans a little toward the cursor
  let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
  const move = (e: PointerEvent) => { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; if (!raf && !rm) raf = requestAnimationFrame(tilt); };
  const tilt = () => {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    wrap.style.transform = `perspective(2200px) rotateY(${(cx * 1.4).toFixed(2)}deg) rotateX(${(-cy * 1.1).toFixed(2)}deg)`;
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(tilt) : 0;
  };
  addEventListener('pointermove', move);

  function flutter(el: HTMLElement) {
    if (rm) return;
    // a paper slip on tape: a short damped flutter (skew + lift), like cloth held at one edge
    el.animate([
      { transform: 'rotate(0) skewX(0)' }, { transform: 'rotate(-2.2deg) skewX(3deg) translateY(-2px)' },
      { transform: 'rotate(1.4deg) skewX(-2deg) translateY(-1px)' }, { transform: 'rotate(-.6deg) skewX(1deg)' }, { transform: 'rotate(0) skewX(0)' },
    ], { duration: 720, easing: 'cubic-bezier(.3,.6,.3,1)' });
    tick();
  }
  function peel(w: HTMLElement, fn: () => void) {
    if (rm) { fn(); return; }
    rustle();
    w.querySelector('.washi')?.animate([{ opacity: 0.82 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    w.animate([{ transform: getComputedStyle(w).transform }, { transform: 'translate(40px,-80px) rotate(16deg)', opacity: 0, filter: 'blur(2px)' }], { duration: 600, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
    setTimeout(fn, 380);
  }
  // the sheet is pulled into the drum while a watercolour dissolve reveals the next screen
  function leave(fn: () => void) {
    if (rm) { fn(); return; }
    wrap.animate([{ transform: wrap.style.transform || 'none' }, { transform: 'perspective(1000px) rotateX(-55deg) translateY(-70%) scale(.6)', opacity: 0.1, filter: 'blur(3px)' }], { duration: 800, easing: 'cubic-bezier(.5,0,.75,.2)', fill: 'forwards' });
    setTimeout(() => dissolveTo(fn, 900), 350);
  }
  atmosphere().setPage(1);
  atmosphere().setInks(inks);
  return () => {
    removeEventListener('pointermove', move); removeEventListener('pointermove', paintMove);
    cancelAnimationFrame(raf); cancelAnimationFrame(paintRaf); ro.disconnect(); offLang();
  };
}
