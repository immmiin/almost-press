// The Reader: a finished issue opens as an emakimono hand scroll — all 16 pages side by side on one long
// scroll, unrolled by drag or wheel with inertia and paper curl at the unrolling edge; time flows right to
// left. Toggle to booklet mode with 3D page turns and watercolour dissolves between spreads.
import './reader.css';
import { loadIssue } from '../issues/load';
import { pipeline } from '../riso/pipeline';
import { t, tA, onLang } from '../core/i18n';
import { go } from '../core/router';
import { atmosphere } from '../atmosphere/atmosphere';
import { reducedMotion, clamp } from '../core/rng';
import { kanjiNum } from '../press/util';
import { dreamTimeOf, INK_BY_ID } from '../design/tokens';
import { refreshText } from '../print/loop';
import { tick } from '../core/sound';
import type { Issue } from '../model/types';
import { sealSVG } from '../design/seal';

export default async function reader(root: HTMLElement, params: URLSearchParams) {
  root.innerHTML = `<p class="mono r-loading">${tA('unrolling')}</p>`;
  const which = params.get('issue') ?? '01';
  const issue: Issue = await loadIssue(which);
  if (!root.isConnected) return;
  const pages = issue.pages.slice(0, 16);
  pages.forEach((p) => { if (!p.slug) refreshText(issue, p); });
  const rm = reducedMotion();
  root.innerHTML = `<main class="reader" data-mode="scroll">
    <header class="r-head"><a class="r-back mono" href="#/press">← ${t('back')}</a>
      <h1 class="r-title"><span class="r-seal" aria-hidden="true">${sealSVG({ size: 30, seed: issue.seed % 97 + 3, rotate: -3 })}</span><span class="r-en">ALMOST PRESS</span><span class="r-no">Issue #${String(issue.seed).padStart(4, '0')}</span><span class="r-spec mono">16pp · A5 · risograph</span></h1>
      <div class="r-ctl"><button type="button" class="r-mode mono" data-m="scroll" aria-pressed="true"></button><button type="button" class="r-mode mono" data-m="booklet" aria-pressed="false"></button>
      <button type="button" class="r-run slip"></button></div></header>
    <section class="r-scroll" aria-label="hand scroll, drag or use arrow keys" tabindex="0"><div class="r-roll r-roll-l" aria-hidden="true"></div><div class="r-track"></div><div class="r-roll r-roll-r" aria-hidden="true"></div></section>
    <section class="r-book" aria-label="booklet" tabindex="0" hidden><div class="r-spread"></div><p class="r-book-n mono" aria-live="polite"></p>
      <button type="button" class="r-turn r-prev mono" aria-label="${tA('prevSpread')}">←</button><button type="button" class="r-turn r-next mono" aria-label="${tA('nextSpread')}">→</button></section>
  </main>`;
  const $ = (s: string) => root.querySelector(s) as HTMLElement;
  const labels = () => {
    $('[data-m="scroll"]').textContent = `絵巻 ${t('scroll')}`;
    $('[data-m="booklet"]').textContent = `冊子 ${t('booklet')}`;
    $('.r-run').innerHTML = `<span class="ja">刷</span> ${t('run')}`;
  };
  labels();
  const offLang = onLang(labels);

  // ---------- render pages ----------
  const H = Math.round(Math.min(innerHeight * 0.64, 760, innerWidth * 0.66 * (216 / 154)));
  const W = Math.round(H * (154 / 216));
  const urls: string[] = [];
  const renderPage = (i: number) => {
    if (urls[i]) return urls[i];
    const src = pipeline().render(pages[i], Math.min(1100, Math.round(W * Math.min(2, devicePixelRatio || 1))));
    urls[i] = src.toDataURL('image/jpeg', 0.9);
    return urls[i];
  };
  const track = $('.r-track');
  track.style.setProperty('--pw', `${W}px`); track.style.setProperty('--ph', `${H}px`);
  // time flows right to left: page 1 sits at the right end
  const order = pages.map((_, i) => i).reverse();
  track.innerHTML = order.map((i) => {
    const p = pages[i]; const dt = dreamTimeOf(p.n);
    return `<figure class="r-page" data-i="${i}"><div class="r-img" role="img" aria-label="page ${p.n}"></div>
      <figcaption class="mono"><span class="vert ja">第${kanjiNum(p.n)}頁</span><span>p.${String(p.n).padStart(2, '0')} · ${dt.en}</span><span class="r-drift">${p.drift.join(' · ') || '—'}</span><span>${p.inks.map((id) => INK_BY_ID[id]?.name.toLowerCase()).join(' / ')}</span></figcaption></figure>`;
  }).join('');
  const figs = [...track.querySelectorAll<HTMLElement>('.r-page')];
  let ri = 0;
  const fill = () => {
    // nearest pages first (from the right end)
    const f = figs[figs.length - 1 - ri];
    if (!f) return;
    const i = +f.dataset.i!;
    (f.querySelector('.r-img') as HTMLElement).style.backgroundImage = `url(${renderPage(i)})`;
    ri++;
    if (ri < figs.length) setTimeout(fill, 16);
  };
  fill();

  // ---------- hand scroll: drag / wheel with inertia, curl at the unrolling edge ----------
  const scroller = $('.r-scroll');
  let x = 0, v = 0, raf = 0, maxX = 0, minX = 0;
  const measure = () => {
    const total = track.scrollWidth, vw = scroller.clientWidth;
    minX = Math.min(0, vw - total - 80); maxX = 0;
    if (x === 0) x = minX; // start unrolled at the cover (right end)
  };
  const curl = () => {
    const vw = scroller.clientWidth;
    const zone = Math.min(260, vw * 0.22);
    for (const f of figs) {
      const r = f.getBoundingClientRect();
      const edge = r.left - scroller.getBoundingClientRect().left;
      const k = clamp(1 - edge / zone, 0, 1);
      // paper rolls onto the rod at the left: rotate around its right edge, darken in the fold
      f.style.transform = k > 0 ? `perspective(900px) rotateY(${(-k * 62).toFixed(1)}deg)` : '';
      f.style.setProperty('--shade', (k * 0.45).toFixed(3));
    }
  };
  const apply = () => { track.style.transform = `translateX(${x.toFixed(1)}px)`; curl(); };
  const step = () => {
    x += v; v *= 0.93;
    if (x > maxX) { x += (maxX - x) * 0.2; v *= 0.5; }
    if (x < minX) { x += (minX - x) * 0.2; v *= 0.5; }
    apply();
    raf = Math.abs(v) > 0.1 || x > maxX + 0.5 || x < minX - 0.5 ? requestAnimationFrame(step) : 0;
  };
  const kick = (dv: number) => { if (rm) { x = clamp(x + dv * 12, minX, maxX); apply(); return; } v += dv; if (!raf) raf = requestAnimationFrame(step); };
  let drag: null | { x0: number; xs: number; lx: number; lt: number } = null;
  scroller.addEventListener('pointerdown', (e) => { drag = { x0: e.clientX, xs: x, lx: e.clientX, lt: performance.now() }; scroller.setPointerCapture?.(e.pointerId); v = 0; scroller.classList.add('grab'); });
  scroller.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const now = performance.now();
    v = (e.clientX - drag.lx) / Math.max(1, now - drag.lt) * 16;
    drag.lx = e.clientX; drag.lt = now;
    x = drag.xs + (e.clientX - drag.x0); apply();
  });
  const up = () => { if (!drag) return; drag = null; scroller.classList.remove('grab'); if (!raf && !rm) raf = requestAnimationFrame(step); };
  scroller.addEventListener('pointerup', up); scroller.addEventListener('pointercancel', up);
  scroller.addEventListener('wheel', (e) => { e.preventDefault(); kick(-(Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.12); }, { passive: false });
  scroller.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { kick(W * 0.06); e.preventDefault(); }
    if (e.key === 'ArrowRight') { kick(-W * 0.06); e.preventDefault(); }
    if (e.key === 'Home') { x = minX; apply(); }
    if (e.key === 'End') { x = maxX; apply(); }
  });
  const ro = new ResizeObserver(() => { measure(); x = clamp(x, minX, maxX); apply(); });
  ro.observe(scroller);
  measure(); apply();
  // the unroll: the scroll opens from the cover leftwards (the one orchestrated moment here)
  if (!rm) { x = minX - 0; const target = Math.max(minX, minX + W * 1.6); const t0 = performance.now(); const from = minX; const un = (now: number) => { const k = Math.min(1, (now - t0) / 2200); const e = 1 - Math.pow(1 - k, 3); x = from + (target - from) * e; apply(); if (k < 1) requestAnimationFrame(un); }; void from; requestAnimationFrame(un); }

  // ---------- booklet ----------
  const spreads: [number | null, number | null][] = [[null, 0]];
  for (let i = 1; i < 15; i += 2) spreads.push([i, i + 1]);
  spreads.push([15, null]);
  let si = 0;
  const book = $('.r-book'), spread = $('.r-spread');
  const face = (i: number | null) => (i === null ? `<div class="r-face r-blank"></div>` : `<div class="r-face" style="background-image:url(${renderPage(i)})" role="img" aria-label="page ${i + 1}"></div>`);
  const drawSpread = () => {
    const [a, b] = spreads[si];
    spread.style.setProperty('--pw', `${W}px`); spread.style.setProperty('--ph', `${H}px`);
    spread.innerHTML = `<div class="r-side r-left">${face(a)}</div><div class="r-side r-right">${face(b)}</div><i class="r-spine"></i>`;
    $('.r-book-n').textContent = si === 0 ? tA('cover') : si === spreads.length - 1 ? tA('backcover') : `${a! + 1}–${b! + 1}`;
  };
  const turn = (dir: 1 | -1) => {
    const nx = si + dir;
    if (nx < 0 || nx >= spreads.length) return;
    tick();
    if (rm) { si = nx; drawSpread(); return; }
    const [a, b] = spreads[si], [na, nb] = spreads[nx];
    // a leaf turns on the spine: front = the page leaving, back = the page arriving
    const leaf = document.createElement('div');
    leaf.className = `r-leaf ${dir > 0 ? 'fwd' : 'back'}`;
    leaf.innerHTML = dir > 0 ? `${face(b)}${face(na)}` : `${face(a)}${face(nb)}`;
    // under the turning leaf the next pages already show
    const under = dir > 0 ? spread.querySelector('.r-right')! : spread.querySelector('.r-left')!;
    under.innerHTML = face(dir > 0 ? nb : na);
    spread.append(leaf);
    atmosphere().bloom(0.5, 0.5, INK_BY_ID[pages[(nb ?? na ?? 0)].inks[0]].hex, 1.2);
    leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${dir > 0 ? -180 : 180}deg)` }], { duration: 900, easing: 'cubic-bezier(.45,.05,.25,1)' }).onfinish = () => { si = nx; drawSpread(); };
    // watercolour dissolve between spreads
    spread.animate([{ filter: 'blur(0) saturate(1)' }, { filter: 'blur(1.5px) saturate(1.2)', offset: 0.5 }, { filter: 'blur(0) saturate(1)' }], { duration: 900 });
  };
  root.querySelector('.r-prev')!.addEventListener('click', () => turn(-1));
  root.querySelector('.r-next')!.addEventListener('click', () => turn(1));
  book.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') turn(1); if (e.key === 'ArrowLeft') turn(-1); });
  book.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) return; const r = book.getBoundingClientRect(); turn(e.clientX > r.left + r.width / 2 ? 1 : -1); });

  root.querySelectorAll<HTMLButtonElement>('.r-mode').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.m!;
    $('.reader').dataset.mode = m;
    root.querySelectorAll('.r-mode').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    scroller.hidden = m !== 'scroll'; book.hidden = m !== 'booklet';
    if (m === 'booklet') { drawSpread(); book.focus(); } else { scroller.focus(); measure(); apply(); }
  }));
  $('.r-run').addEventListener('click', () => go('export', `issue=${which}`));
  atmosphere().setPage(16);
  atmosphere().setInks(pages[pages.length - 1].inks.map((id) => INK_BY_ID[id].hex));
  void tA;
  return () => { cancelAnimationFrame(raf); ro.disconnect(); offLang(); };
}
