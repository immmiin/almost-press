// The Reader: a finished issue opens as an emakimono hand scroll — all 16 pages side by side on one long
// scroll, unrolled by drag or wheel with inertia and paper curl at the unrolling edge; time flows right to
// left. Toggle to booklet mode with 3D page turns and watercolour dissolves between spreads.
// It also opens shared issues (a link with the issue in its hash, or a dropped .almost file), shares the issue,
// and records a vertical reel of the sixteen sheets.
import './reader.css';
import { loadIssue } from '../issues/load';
import { decodeIssue, readAlmost, shareLink, almostFile, encodeIssue, holdIssue, heldIssue } from '../issues/share';
import { pipeline } from '../riso/pipeline';
import { t, tA, tAll, onLang } from '../core/i18n';
import { go } from '../core/router';
import { atmosphere } from '../atmosphere/atmosphere';
import { reducedMotion, clamp } from '../core/rng';
import { kanjiNum } from '../press/util';
import { dreamTimeOf, INK_BY_ID } from '../design/tokens';
import { refreshText } from '../print/loop';
import { tick, thud } from '../core/sound';
import { onFontsLoaded } from '../type/outlines';
import { slip } from '../design/materials';
import type { Issue } from '../model/types';
import { sealSVG } from '../design/seal';

const download = (blob: Blob, name: string) => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
};

export default async function reader(root: HTMLElement, params: URLSearchParams) {
  root.innerHTML = `<p class="mono r-loading">${tA('unrolling')}</p>`;
  const d = params.get('d');
  const which = params.get('issue') ?? (d || params.get('held') ? 'shared' : '01');
  let issue: Issue;
  try {
    issue = d ? await decodeIssue(d) : params.get('held') && heldIssue() ? heldIssue()! : await loadIssue(which);
  } catch {
    root.innerHTML = `<p class="mono r-loading">this link could not be unrolled · <a href="#/reader?issue=01">Issue 01</a></p>`;
    return;
  }
  if (!root.isConnected) return;
  const pages = issue.pages.slice(0, 16);
  pages.forEach((p) => { if (!p.slug) refreshText(issue, p); });
  // where the edition and the share link point for this issue
  const runParams = d ? `d=${d}` : params.get('held') ? 'held=1' : `issue=${which}`;
  const rm = reducedMotion();
  const complete = pages.length >= 16 && pages.every((p) => p.printed || issue.fixed);
  root.innerHTML = `<main class="reader" data-mode="scroll">
    <header class="r-head"><a class="r-back mono" href="#/press">← ${t('back')}</a>
      <h1 class="r-title"><span class="r-seal" aria-hidden="true">${sealSVG({ size: 30, seed: issue.seed % 97 + 3, rotate: -3 })}</span><span class="r-en">ALMOST PRESS</span><span class="r-no">Issue #${String(issue.seed).padStart(4, '0')}</span><span class="r-spec mono">16pp · A5 · risograph</span></h1>
      <div class="r-ctl"><button type="button" class="r-mode mono" data-m="scroll" aria-pressed="true"></button><button type="button" class="r-mode mono" data-m="booklet" aria-pressed="false"></button>
      <button type="button" class="r-run slip"></button></div>
      <div class="r-acts"><button type="button" class="r-act mono" data-a="share"></button><button type="button" class="r-act mono" data-a="reel"></button><label class="r-act r-open mono"><input type="file" accept=".almost,application/octet-stream,text/plain" hidden><span></span></label></div></header>
    <section class="r-scroll" aria-label="hand scroll, drag or use arrow keys" tabindex="0"><div class="r-roll r-roll-l" aria-hidden="true"></div><div class="r-track"></div><div class="r-roll r-roll-r" aria-hidden="true"></div></section>
    <section class="r-book" aria-label="booklet" tabindex="0" hidden><div class="r-spread"></div><p class="r-book-n mono" aria-live="polite"></p>
      <button type="button" class="r-turn r-prev mono" aria-label="${tA('prevSpread')}">←</button><button type="button" class="r-turn r-next mono" aria-label="${tA('nextSpread')}">→</button></section>
    <div class="r-notes" aria-live="polite"></div>
    <div class="r-drop" hidden><p><span class="ja">開</span> drop a .almost file to unroll it</p></div>
  </main>`;
  const $ = (s: string) => root.querySelector(s) as HTMLElement;
  const labels = () => {
    // the kanji already says it in Japanese: the word beside it stays in the chosen language (no drift)
    $('[data-m="scroll"]').textContent = `絵巻 ${tAll('scroll')[0]}`;
    $('[data-m="booklet"]').textContent = `冊子 ${tAll('booklet')[0]}`;
    $('.r-run').innerHTML = `<span class="ja">刷</span> ${tA('run')}`;
    $('[data-a="share"]').textContent = `共 ${tA('share')}`;
    $('[data-a="reel"]').textContent = `映 ${tA('reel')}`;
    ($('.r-open span') as HTMLElement).textContent = `開 ${tA('open')}`;
  };
  labels();
  const offLang = onLang(labels);
  if (!complete) { ($('[data-a="share"]') as HTMLButtonElement).disabled = true; ($('[data-a="reel"]') as HTMLButtonElement).disabled = true; $('[data-a="share"]').title = $('[data-a="reel"]').title = 'bind all sixteen sheets first'; }

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
  let ri = 0, fillT = 0;
  const fill = () => {
    // nearest pages first (from the right end)
    const f = figs[figs.length - 1 - ri];
    if (!f) return;
    const i = +f.dataset.i!;
    (f.querySelector('.r-img') as HTMLElement).style.backgroundImage = `url(${renderPage(i)})`;
    ri++;
    if (ri < figs.length) fillT = window.setTimeout(fill, 16);
  };
  fill();
  // type objects print with real outlines once their font files arrive: print the scroll again then
  const offFonts = onFontsLoaded(() => {
    pipeline().invalidate(); urls.length = 0; ri = 0; clearTimeout(fillT); fill();
    if (!book.hidden) drawSpread();
  });

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
  if (!rm) { const target = Math.max(minX, minX + W * 1.6); const t0 = performance.now(); const from = minX; const un = (now: number) => { const k = Math.min(1, (now - t0) / 2200); const e = 1 - Math.pow(1 - k, 3); x = from + (target - from) * e; apply(); if (k < 1) requestAnimationFrame(un); }; requestAnimationFrame(un); }

  // ---------- booklet ----------
  const spreads: [number | null, number | null][] = [[null, 0]];
  for (let i = 1; i < 15; i += 2) spreads.push([i, i + 1]);
  spreads.push([15, null]);
  let si = 0;
  const book = $('.r-book'), spread = $('.r-spread');
  const face = (i: number | null) => (i === null || !pages[i] ? `<div class="r-face r-blank"></div>` : `<div class="r-face" style="background-image:url(${renderPage(i)})" role="img" aria-label="page ${i + 1}"></div>`);
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
    root.querySelectorAll('.r-mode').forEach((q) => q.setAttribute('aria-pressed', String(q === b)));
    scroller.hidden = m !== 'scroll'; book.hidden = m !== 'booklet';
    if (m === 'booklet') { drawSpread(); book.focus(); } else { scroller.focus(); measure(); apply(); }
  }));
  $('.r-run').addEventListener('click', () => go('export', runParams));

  // ---------- slips the reader lays down (share, reel) ----------
  const notes = $('.r-notes');
  const note = (html: string, seed: number, keep = 0) => {
    notes.querySelector('.r-note')?.remove();
    const s = slip('div', seed, `<button type="button" class="r-note-x mono" aria-label="close">×</button>${html}`, 'r-note');
    notes.append(s);
    s.querySelector('.r-note-x')!.addEventListener('click', () => s.remove());
    if (!rm) s.animate([{ opacity: 0, transform: 'translateY(-8px) rotate(-1deg)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,.7,.2,1)' });
    if (keep) setTimeout(() => s.remove(), keep);
    return s;
  };

  // ---------- share this issue: a link with the issue inside it, or a small .almost file ----------
  $('[data-a="share"]').addEventListener('click', async () => {
    const link = await shareLink(issue);
    const [sEn, sJa] = tAll('share');
    if (link) {
      let copied = false;
      try { await navigator.clipboard.writeText(link); copied = true; } catch { /* no clipboard permission: the field below is selected instead */ }
      const s = note(`<h3>${sEn} · <span lang="ja">${sJa}</span></h3><p class="mono">${copied ? 'link copied — ' : ''}anyone with this link sees Issue #${String(issue.seed).padStart(4, '0')} in the Reader. ${link.length.toLocaleString()} characters, no server.</p><input class="ruled mono r-link" readonly value="${link}" aria-label="share link">`, 41);
      const inp = s.querySelector('input') as HTMLInputElement;
      inp.addEventListener('focus', () => inp.select());
      if (!copied) { inp.focus(); inp.select(); }
      thud(0.4);
    } else {
      download(await almostFile(issue), `almost-press-${String(issue.seed).padStart(4, '0')}.almost`);
      note(`<h3>${sEn} · <span lang="ja">${sJa}</span></h3><p class="mono">this issue is too long for a link, so it was saved as a small .almost file. Drop it on any Reader of ALMOST PRESS to unroll it.</p>`, 43, 9000);
    }
  });
  void encodeIssue;

  // ---------- record a reel: 1080×1920, the sixteen sheets passing through the mist ----------
  let reelCancel: (() => void) | null = null;
  $('[data-a="reel"]').addEventListener('click', async () => {
    if (reelCancel) return;
    const { recordReel, canRecord } = await import('./reel');
    if (!canRecord()) { note(`<p class="mono">this browser cannot record video from a canvas (MediaRecorder). Try Chrome, Edge, Firefox or Safari 14.1+.</p>`, 45, 7000); return; }
    const [rEn, rJa] = tAll('reel');
    const s = note(`<h3>${rEn} · <span lang="ja">${rJa}</span></h3><div class="r-reel"><div class="r-reel-prev"></div><div><p class="mono r-reel-p">getting the sheets ready…</p><p class="mono" style="color:var(--soft)">1080×1920 · about 18 s · keep this tab in front while it records</p><button type="button" class="r-reel-x lnk mono">cancel</button></div></div>`, 47);
    const p = s.querySelector('.r-reel-p') as HTMLElement;
    const run = await recordReel(issue, pages, (_k, label) => { p.textContent = label; });
    s.querySelector('.r-reel-prev')!.append(run.canvas);
    reelCancel = run.cancel;
    s.querySelector('.r-reel-x')!.addEventListener('click', () => { run.cancel(); });
    s.querySelector('.r-note-x')!.addEventListener('click', () => { run.cancel(); });
    const files = await run.done;
    reelCancel = null;
    if (!files.length) { s.remove(); return; }
    files.forEach((f, i) => setTimeout(() => download(f.blob, f.name), i * 400));
    p.textContent = `saved · ${files.map((f) => `${f.name.split('.').pop()} ${(f.blob.size / 1048576).toFixed(1)} MB`).join(' · ')}`;
    (s.querySelector('.r-reel-x') as HTMLElement).remove();
    thud(0.6);
  });

  // ---------- open a .almost file (button or drag and drop) ----------
  const openFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const is = await readAlmost(f);
      const dd = await encodeIssue(is);
      if (dd.length < 15000) go('reader', `d=${dd}`);
      else { holdIssue(is); go('reader', `held=1&t=${Date.now()}`); }
    } catch { note(`<p class="mono">that file is not an ALMOST PRESS issue.</p>`, 49, 5000); }
  };
  ($('.r-open input') as HTMLInputElement).addEventListener('change', (e) => openFile((e.target as HTMLInputElement).files?.[0]));
  const drop = $('.r-drop');
  let dragDepth = 0;
  const onEnter = (e: DragEvent) => { if (!e.dataTransfer?.types.includes('Files')) return; e.preventDefault(); dragDepth++; drop.hidden = false; };
  const onLeave = () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) drop.hidden = true; };
  const onOver = (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); };
  const onDrop = (e: DragEvent) => { e.preventDefault(); dragDepth = 0; drop.hidden = true; openFile(e.dataTransfer?.files?.[0]); };
  addEventListener('dragenter', onEnter); addEventListener('dragleave', onLeave); addEventListener('dragover', onOver); addEventListener('drop', onDrop);

  atmosphere().setPage(16);
  atmosphere().setInks(pages[pages.length - 1].inks.map((id) => INK_BY_ID[id].hex));
  return () => {
    cancelAnimationFrame(raf); clearTimeout(fillT); ro.disconnect(); offLang(); offFonts(); reelCancel?.();
    removeEventListener('dragenter', onEnter); removeEventListener('dragleave', onLeave); removeEventListener('dragover', onOver); removeEventListener('drop', onDrop);
  };
}
