// The Gate: a huge sheet of rice paper floating in the mist. The seal is pressed onto it, the title prints
// plate by plate in three scripts (misregistered differently on every visit), three torn slips are taped on.
import './gate.css';
import { sealSVG } from '../design/seal';
import { deckle } from '../design/paper';
import { washi, slip } from '../design/materials';
import { t, tAll, onLang } from '../core/i18n';
import { go } from '../core/router';
import { atmosphere, dissolveTo } from '../atmosphere/atmosphere';
import { thud, tick } from '../core/sound';
import { reducedMotion } from '../core/rng';
import { getIssue, ISSUE_NO } from '../model/store';
import { kanjiNum } from '../press/util';

export default function gate(root: HTMLElement) {
  const rm = reducedMotion();
  const R = () => Math.random();
  const inks = ['#FF48B0', '#9D7AD2', '#62C2B1'];
  // misregistered differently on every visit
  const off = inks.map(() => [(R() - 0.5) * 7, (R() - 0.5) * 5]);
  const titleLayer = (i: number) => `<div class="g-plate" style="--dx:${off[i][0].toFixed(1)}px;--dy:${off[i][1].toFixed(1)}px;--ink:${inks[i]};--d:${0.9 + i * 0.55}s">
      <span class="g-en">ALMOST PRESS</span><span class="g-ko">거의 인쇄소</span><span class="g-ja">ほぼ印刷所</span></div>`;
  const is = getIssue();
  const inProgress = !is.fixed && !is.bound && (is.current > 0 || is.pages[0].objects.length > 2);
  const now = new Date();
  root.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="g-riso" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="${Math.floor(R() * 99)}" result="w"/>
    <feDisplacementMap in="SourceGraphic" in2="w" scale="3" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 2.05" result="sp"/>
    <feComposite in="d" in2="sp" operator="in"/></filter></svg><main class="gate" aria-label="ALMOST PRESS · 거의 인쇄소 · ほぼ印刷所">
    <div class="g-sheet-wrap"><div class="g-sheet sheet">
      <div class="g-title" aria-hidden="true">${[0, 1, 2].map(titleLayer).join('')}</div>
      <h1 class="sr">ALMOST PRESS · 거의 인쇄소 · ほぼ印刷所</h1>
      <div class="g-seal" aria-hidden="true">${sealSVG({ size: 150, seed: Math.floor(R() * 40) + 1, doubleStrike: R() < 0.4, rotate: (R() - 0.5) * 9 })}</div>
      <p class="g-sub mono">a dream print shop · 16 pages · A5 · risograph<br>夢の印刷所 · 十六頁</p>
      <p class="g-date mono vert">${now.getFullYear()} · ${kanjiNum(now.getMonth() + 1)}月 · issue 01–${ISSUE_NO(is).slice(1)}</p>
      <p class="g-ins mono">sweep the floor<br>mop the floor<br>wait for the ink</p>
    </div></div>
    <nav class="g-slips" aria-label="enter"></nav>
  </main>`;
  const sheet = root.querySelector('.g-sheet') as HTMLElement;
  deckle(sheet, 33, 'deckle', 5);
  const wrap = root.querySelector('.g-sheet-wrap') as HTMLElement;
  wrap.append(washi(2, { left: '8%', top: '-6px' }, 96), washi(5, { right: '12%', top: '-8px' }, 80), washi(8, { left: '46%', bottom: '-6px' }, 70));
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
      const [, ja] = tAll(key);
      const s = slip('button', 50 + i, `<span class="g-slip-main">${t(key)}</span><span class="g-slip-alt mono">${ja}</span>${note ? `<span class="g-slip-note mono">${note}</span>` : ''}`, 'g-slip');
      s.addEventListener('click', () => peel(w, fn));
      s.addEventListener('pointerenter', () => flutter(s));
      s.addEventListener('focus', () => flutter(s));
      w.append(s, washi(60 + i, { left: `${30 + i * 12}%`, top: '-9px' }, 54));
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
    setTimeout(() => { thud(1); atmosphere().bloom(0.62, 0.4, '#E5483E', 1.6); }, 800);
  }

  // parallax: the sheet tilts toward the cursor (max 4°)
  let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
  const move = (e: PointerEvent) => { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; if (!raf && !rm) raf = requestAnimationFrame(tilt); };
  const tilt = () => {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    wrap.style.transform = `perspective(1400px) rotateY(${(cx * 4).toFixed(2)}deg) rotateX(${(-cy * 3).toFixed(2)}deg) rotate(-1.2deg)`;
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
    tick();
    w.querySelector('.washi')?.animate([{ opacity: 0.82 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    w.animate([{ transform: 'none' }, { transform: 'translate(30px,-60px) rotate(14deg)', opacity: 0, filter: 'blur(2px)' }], { duration: 600, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
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
  return () => { removeEventListener('pointermove', move); cancelAnimationFrame(raf); offLang(); };
}
