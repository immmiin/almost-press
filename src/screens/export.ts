// Export: the press runs the edition. A code-drawn riso machine ("ALMOST PRESS AP-16", pale celadon enamel,
// pearl drum window) glides into the mist. Pick the job on the LCD, hold START: the drum spins, the LCD counts
// the real 300 dpi renders, each plate prints through the window, sheets slide out onto the tray, masters
// drift into the master box. A seeded paper jam may stop the run (keep the jam or reprint). Then the stack is
// jogged, folded, stapled and sealed, the zine drops toward the viewer and the files download.
import './export.css';
import { loadIssue } from '../issues/load';
import { decodeIssue, heldIssue } from '../issues/share';
import { runEdition, download, type Kind, type Rendered } from './../export/files';
import { inspectPdf, summarise, type PdfFacts } from '../export/inspect';
import { t, onLang } from '../core/i18n';
import { atmosphere } from '../atmosphere/atmosphere';
import { enamelButton } from '../design/materials';
import { sealSVG } from '../design/seal';
import { deckle } from '../design/paper';
import { INK_BY_ID } from '../design/tokens';
import { reducedMotion, rng, hash } from '../core/rng';
import { roller, thud, tick } from '../core/sound';
import type { Issue, Page } from '../model/types';

const KINDS: Kind[] = ['zine', 'spreads', 'plates', 'instagram', 'all'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;

export interface EditionResult { name: string; size: number; facts?: PdfFacts; summary?: string }

/** The jam is seeded: an issue always jams on the same sheet (or never). */
export function jamOf(issue: Issue): number {
  const r = rng(hash(issue.seed, 'jam'));
  return r() < 0.3 ? 1 + Math.floor(r() * 14) : -1;
}

export default async function exportScreen(root: HTMLElement, params: URLSearchParams) {
  root.innerHTML = `<p class="mono x-loading">warming the drum…</p>`;
  // a shared issue (link or dropped .almost file) runs its edition too
  const d = params.get('d');
  const which = params.get('issue') ?? (d || params.get('held') ? 'shared' : 'current');
  const issue = d ? await decodeIssue(d) : params.get('held') && heldIssue() ? heldIssue()! : await loadIssue(which);
  const back = d ? `d=${d}` : params.get('held') ? 'held=1' : `issue=${which}`;
  if (!root.isConnected) return;
  const rm = reducedMotion();
  const no = `#${String(issue.seed).padStart(4, '0')}`;
  root.innerHTML = `<main class="export" data-state="idle">
    <header class="x-head"><a class="x-back mono" href="#/reader?${back}"></a>
      <p class="mono x-spec">ALMOST PRESS AP-16 · ${no} · 16pp · A5 148×210 · bleed 3 mm · 300 dpi</p></header>
    <p class="x-axis ja vert" aria-hidden="true">刷り上げ · ${which === '01' ? '第一号' : no} · 十六頁</p>
    <section class="x-scene">
      <div class="x-tray" aria-hidden="true"><div class="x-stack"></div><i class="x-tray-lip"></i></div>
      <div class="x-machine">
        <div class="x-feed" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="x-body">
          <div class="x-name" aria-hidden="true"><span class="x-name-en">ALMOST PRESS</span><span class="x-model mono">AP-16 · digital duplicator · 殆</span></div><span class="x-name-ja" aria-hidden="true">ほぼ印刷機</span>
          <div class="x-window" aria-hidden="true"><div class="x-drum"><div class="x-skin"></div></div><div class="x-passes"></div><i class="x-glass"></i></div>
          <div class="x-slot" aria-hidden="true"></div>
          <div class="x-panel">
            <div class="x-lcd" role="group" aria-label="job">
              <p class="x-lcd-top" aria-live="polite">READY</p>
              <div class="x-menu" role="radiogroup" aria-label="job"></div>
              <p class="x-lcd-count" aria-live="polite">--/16</p>
            </div>
            <div class="x-start-wrap"></div>
            <p class="mono x-hint"></p>
          </div>
          <div class="x-masters" aria-hidden="true"><span class="mono">masters · 版</span><div class="x-mstack"></div></div>
          <i class="x-seam"></i>
        </div>
        <div class="x-feet" aria-hidden="true"><i></i><i></i></div>
        <p class="x-lab x-lab-drum mono" aria-hidden="true">drum · 胴</p>
        <p class="x-lab x-lab-feed mono" aria-hidden="true">feed · rice paper 148×210 + 3 mm</p>
        <p class="x-lab x-lab-master mono" aria-hidden="true">master box · 製版</p>
        <p class="x-lab x-lab-tray mono" aria-hidden="true">← out · 排紙 · time flows right to left</p>
      </div>
    </section>
    <div class="x-jam" role="alertdialog" aria-label="paper jam" hidden></div>
    <section class="x-done" aria-label="the edition" hidden></section>
    <button type="button" class="x-skip mono" hidden></button>
  </main>`;
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector(s) as T;
  const main = $('.export');
  const lcdTop = $('.x-lcd-top'), lcdCount = $('.x-lcd-count'), menu = $('.x-menu');
  let kind: Kind = (params.get('kind') as Kind) && KINDS.includes(params.get('kind') as Kind) ? (params.get('kind') as Kind) : 'all';
  const kindLabel = (k: Kind) => t(`x_${k}`);
  const drawMenu = () => {
    menu.innerHTML = KINDS.map((k) => `<button type="button" role="radio" aria-checked="${k === kind}" tabindex="${k === kind ? 0 : -1}" data-k="${k}"><i>${k === kind ? '▶' : ' '}</i>${kindLabel(k)}</button>`).join('');
  };
  const labels = () => {
    $('.x-back').textContent = `← ${t('x_reader')}`;
    $('.x-hint').textContent = t('x_hold');
    $('.x-skip').textContent = t('x_skip');
    drawMenu();
  };
  const start = enamelButton('START', '開始');
  start.classList.add('x-start');
  start.setAttribute('aria-label', `START · ${t('x_hold')}`);
  $('.x-start-wrap').append(start);
  labels();
  const offLang = onLang(labels);
  deckle($('.x-masters'), 9, 'deckle', 2);

  menu.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button'); if (!b || main.dataset.state !== 'idle') return;
    kind = b.dataset.k as Kind; tick(); drawMenu(); (menu.querySelector(`[data-k="${kind}"]`) as HTMLElement).focus();
  });
  menu.addEventListener('keydown', (e) => {
    if (main.dataset.state !== 'idle') return;
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    kind = KINDS[(KINDS.indexOf(kind) + d + KINDS.length) % KINDS.length]; tick(); drawMenu();
    (menu.querySelector(`[data-k="${kind}"]`) as HTMLElement).focus();
  });

  atmosphere().setPage(16);
  atmosphere().setInks(issue.pages[issue.pages.length - 1].inks.map((id) => INK_BY_ID[id].hex));

  // ---------- hold START ----------
  let fill = 0, holding = false, raf = 0, last = 0;
  const HOLD = 1100;
  const loop = (now: number) => {
    const dt = now - (last || now); last = now;
    fill = Math.max(0, Math.min(1, fill + (holding ? dt / HOLD : -dt / 400)));
    start.style.setProperty('--fill', fill.toFixed(3));
    if (fill >= 1 && holding) { holding = false; start.classList.remove('held'); fill = 0; start.style.setProperty('--fill', '0'); raf = 0; void run(); return; }
    raf = fill > 0 || holding ? requestAnimationFrame(loop) : 0;
  };
  const press = () => { if (main.dataset.state !== 'idle' || holding) return; holding = true; start.classList.add('held'); last = 0; if (rm) { fill = 1; } if (!raf) raf = requestAnimationFrame(loop); };
  const release = () => { holding = false; start.classList.remove('held'); };
  start.addEventListener('pointerdown', (e) => { start.setPointerCapture?.(e.pointerId); press(); });
  start.addEventListener('pointerup', release); start.addEventListener('pointercancel', release);
  start.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } });
  start.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });

  // ---------- the run ----------
  const passes = $('.x-passes'), stack = $('.x-stack'), mstack = $('.x-mstack'), drum = $('.x-drum');
  const anim = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => (rm ? null : el.animate(kf, { fill: 'both', ...o }));
  let sheetCount = 0;
  const printThrough = (p: Page) => {
    // each plate prints in order through the drum window
    passes.innerHTML = '';
    p.inks.forEach((id, k) => {
      const hex = INK_BY_ID[id].hex;
      const band = document.createElement('i');
      band.style.setProperty('--ink', hex);
      passes.append(band);
      anim(band, [{ transform: 'translateY(-110%)', opacity: 0 }, { opacity: 0.8, offset: 0.25 }, { transform: 'translateY(110%)', opacity: 0.5 }], { duration: 520, delay: k * 200, easing: 'cubic-bezier(.4,0,.3,1)' });
      setTimeout(() => atmosphere().flashInk(hex, 0.3), k * 200);
    });
    drum.style.setProperty('--ink', INK_BY_ID[p.inks[p.inks.length - 1]].hex);
  };
  const sheetOut = (r: Rendered, p: Page, jam: boolean) => {
    const s = document.createElement('div');
    s.className = `x-sheet${jam ? ' x-crumpled' : ''}`;
    s.style.backgroundImage = `url(${r.thumb})`;
    const k = sheetCount++;
    const rot = ((hash(p.seed, 'tray') % 100) / 100 - 0.5) * 5;
    s.style.setProperty('--r', `${rot.toFixed(2)}deg`);
    s.style.setProperty('--dx', `${(k % 3) - 1}px`); s.style.setProperty('--dy', `${-k * 0.9}px`);
    s.style.zIndex = String(k + 1);
    stack.append(s);
    // from the slot on the left of the machine onto the tray
    anim(s, [{ transform: 'translate(calc(var(--slot-x) * 1px), -40px) rotate(0deg) scaleY(.2)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: 'translate(calc(var(--slot-x) * .4px), -6px) rotate(calc(var(--r) * -.5)) scaleY(1)', offset: 0.55 }, { transform: 'translate(var(--dx), var(--dy)) rotate(var(--r))' }], { duration: 760, delay: 380 + p.inks.length * 200, easing: 'cubic-bezier(.3,.1,.2,1)' });
    setTimeout(tick, 400 + p.inks.length * 200);
  };
  const mastersOut = (p: Page) => {
    p.inks.forEach((id, k) => {
      const m = document.createElement('i');
      m.style.setProperty('--ink', INK_BY_ID[id].hex);
      m.style.setProperty('--r', `${(((hash(p.seed, k) % 100) / 100) - 0.5) * 14}deg`);
      mstack.append(m);
      while (mstack.childElementCount > 10) mstack.firstElementChild!.remove();
      anim(m, [{ transform: 'translate(-30px, -90px) rotate(-20deg)', opacity: 0 }, { opacity: 0.85, offset: 0.3 }, { transform: 'translate(0, 0) rotate(var(--r))', opacity: 0.85 }], { duration: 1200, delay: 300 + k * 160, easing: 'cubic-bezier(.25,.6,.3,1)' });
    });
  };
  let skip = false;
  const wait = (ms: number) => new Promise<void>((res) => { if (rm) return res(); const t0 = performance.now(); const f = () => (skip || performance.now() - t0 >= ms ? res() : requestAnimationFrame(f)); f(); });
  const onJam = (i: number) => new Promise<boolean>((resolve) => {
    main.dataset.state = 'jam';
    lcdTop.textContent = t('x_jam').toUpperCase();
    lcdTop.classList.add('x-flash');
    atmosphere().bloom(0.3, 0.45, '#FF7477', 0.6);
    thud(0.6);
    const jam = $('.x-jam');
    jam.hidden = false;
    jam.innerHTML = `<div class="x-jam-slip slip"><p class="x-jam-h"><span class="x-jam-en">PAPER JAM</span><span class="x-jam-ja vert">紙づまり</span></p>
      <p class="mono">sheet ${pad2(i + 1)}/16 came out crumpled · ${pad2(i + 1)}頁</p>
      <div class="x-jam-btns"><button type="button" class="x-keep">${t('keepJam')}</button><button type="button" class="x-reprint">${t('reprintJam')}</button></div></div>`;
    deckle(jam.querySelector('.x-jam-slip') as HTMLElement, 61, 'torn', 5);
    const done = (keep: boolean) => { jam.hidden = true; jam.innerHTML = ''; lcdTop.classList.remove('x-flash'); main.dataset.state = 'running'; lcdTop.textContent = 'PRINTING'; tick(); resolve(keep); };
    (jam.querySelector('.x-keep') as HTMLButtonElement).addEventListener('click', () => done(true));
    (jam.querySelector('.x-reprint') as HTMLButtonElement).addEventListener('click', () => done(false));
    (jam.querySelector('.x-keep') as HTMLButtonElement).focus();
  });

  let stopRoller = () => {};
  const urls: string[] = [];
  const run = async () => {
    main.dataset.state = 'running';
    menu.querySelectorAll('button').forEach((b) => b.setAttribute('aria-disabled', 'true'));
    stack.innerHTML = ''; mstack.innerHTML = ''; sheetCount = 0; skip = false;
    const sr = $('.x-slot').getBoundingClientRect(), kr = stack.getBoundingClientRect();
    stack.style.setProperty('--slot-x', String(Math.round(sr.left - kr.left)));
    $('.x-done').hidden = true;
    lcdTop.textContent = 'PRINTING';
    stopRoller = roller();
    thud(0.5);
    const needPlates = kind === 'plates' || kind === 'all';
    const jamPage = params.has('jam') ? +params.get('jam')! - 1 : jamOf(issue);
    let jamKept = -1;
    let files: { name: string; blob: Blob }[] = [];
    const parts: { name: string; blob: Blob }[] = [];
    try {
      files = await runEdition(issue, kind, (done, _total, label, page) => {
        if (label === 'render') lcdCount.textContent = `${pad2(page ?? done)}/16`;
        else { lcdTop.textContent = 'BINDING FILES'; lcdCount.textContent = '16/16'; }
      }, {
        jamPage,
        onJam: async (i) => { const keep = await onJam(i); if (keep) jamKept = i; return keep; },
        onFile: (name, blob) => parts.push({ name, blob }),
        onPage: (i, r, p) => { printThrough(p); sheetOut(r, p, i === jamKept); if (needPlates) mastersOut(p); },
      });
    } catch (err) {
      console.error(err);
      lcdTop.textContent = 'ERROR · SEE CONSOLE';
      main.dataset.state = 'idle'; stopRoller();
      return;
    }
    stopRoller();
    passes.innerHTML = '';
    lcdTop.textContent = 'FINISHING';
    await finish();
    // the files
    const results: EditionResult[] = [];
    for (const f of parts) {
      const res: EditionResult = { name: f.name, size: f.blob.size };
      if (f.name.endsWith('.pdf')) { res.facts = inspectPdf(new Uint8Array(await f.blob.arrayBuffer())); res.summary = summarise(res.facts); }
      results.push(res);
    }
    (window as unknown as { __edition: unknown }).__edition = { kind, jamPage, jamKept, results };
    files.forEach((f, i) => setTimeout(() => download(f.blob, f.name), i * 350));
    urls.forEach((u) => URL.revokeObjectURL(u)); urls.length = 0;
    const done = $('.x-done');
    done.hidden = false;
    done.innerHTML = `<div class="x-done-sheet sheet"><h2 class="x-done-h"><span class="ja">刷了</span> ${t('x_files')}</h2>
      <ul class="x-files">${files.map((f) => { const u = URL.createObjectURL(f.blob); urls.push(u); return `<li><a class="mono" href="${u}" download="${f.name}">${f.name}</a><span class="mono">${mb(f.blob.size)}</span></li>`; }).join('')}</ul>
      <ul class="x-facts mono" aria-label="read back from the files">${results.map((r) => `<li>${r.name.replace(/^almost-press-\d+-/, '')} · ${mb(r.size)}${r.summary ? ' · ' + r.summary : ''}</li>`).join('')}</ul>
      ${jamKept >= 0 ? `<p class="mono x-done-jam">p.${pad2(jamKept + 1)} kept its jam.</p>` : ''}
      <div class="x-done-btns"><button type="button" class="slip x-again">${t('x_again')}</button><a class="mono x-back2" href="#/reader?${back}">← ${t('x_reader')}</a></div></div>`;
    deckle(done.querySelector('.x-done-sheet') as HTMLElement, 77, 'deckle', 3);
    (done.querySelector('.x-again') as HTMLButtonElement).addEventListener('click', () => { done.hidden = true; reset(); start.focus(); });
    lcdTop.textContent = 'DONE'; lcdCount.textContent = '16/16';
    main.dataset.state = 'done';
    (done.querySelector('a') as HTMLElement)?.focus();
  };
  const reset = () => {
    main.dataset.state = 'idle';
    stack.innerHTML = ''; stack.style.transform = ''; stack.classList.remove('x-folded'); mstack.innerHTML = '';
    lcdTop.textContent = 'READY'; lcdCount.textContent = '--/16';
    drawMenu();
  };

  /** Jog, fold, two staples, the seal, and the zine drops toward the viewer. Skippable (Esc or click). */
  const finish = async () => {
    const skipBtn = $<HTMLButtonElement>('.x-skip');
    skipBtn.hidden = rm;
    const onSkip = () => { skip = true; };
    skipBtn.onclick = onSkip;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip(); };
    addEventListener('keydown', esc);
    await wait(900);
    const go = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => (skip ? null : anim(el, kf, o));
    // jog: knocked square on the tray
    for (const dx of [-5, 4]) { go(stack, [{ transform: 'none' }, { transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 180, fill: 'none' }); tick(); await wait(200); }
    stack.querySelectorAll<HTMLElement>('.x-sheet').forEach((s) => { s.getAnimations().forEach((a) => a.cancel()); s.style.transform = `translate(${s.style.getPropertyValue('--dx')}, 0)`; });
    // fold along the spine
    stack.classList.add('x-folded');
    go(stack, [{ transform: 'none' }, { transform: 'perspective(900px) rotateY(-24deg) scaleX(.62)' }], { duration: 700, easing: 'cubic-bezier(.45,.05,.2,1)' });
    await wait(720);
    for (const y of [0.28, 0.72]) {
      const st = document.createElement('i'); st.className = 'x-staple'; st.style.top = `${y * 100}%`; stack.append(st);
      go(st, [{ transform: 'scaleY(2.2)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 160 });
      thud(0.4); await wait(260);
    }
    const seal = document.createElement('div'); seal.className = 'x-cover-seal';
    seal.innerHTML = sealSVG({ size: 34, seed: issue.seed % 97 + 3, doubleStrike: issue.seed % 3 === 0, rotate: (issue.seed % 9) - 4 });
    stack.append(seal);
    go(seal, [{ transform: 'scale(1.6)', opacity: 0, filter: 'blur(3px)' }, { transform: 'scale(.94)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1, filter: 'none' }], { duration: 420 });
    thud(1);
    atmosphere().bloom(0.25, 0.4, '#F7C6D4', 0.7);
    await wait(700);
    // the zine drops toward the viewer
    go(stack, [{ transform: 'perspective(900px) rotateY(-24deg) scaleX(.62)' }, { transform: 'perspective(900px) translate(20vw, 6vh) rotateY(-8deg) rotate(-4deg) scale(2.1, 3.2)', filter: 'blur(0px)', opacity: 1, offset: 0.7 }, { transform: 'perspective(900px) translate(26vw, 22vh) rotateY(0deg) rotate(-6deg) scale(2.8, 4.2)', filter: 'blur(6px)', opacity: 0 }], { duration: 1500, easing: 'cubic-bezier(.5,0,.6,1)' });
    await wait(1500);
    // the bound zine is back on the tray, folded and sealed
    stack.getAnimations().forEach((a) => a.cancel());
    stack.style.transform = 'perspective(900px) rotateY(-24deg) scaleX(.62)';
    anim(stack, [{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
    removeEventListener('keydown', esc);
    skipBtn.hidden = true;
  };

  // an unfinished issue cannot run: the machine says so and START stays dark
  if (issue.pages.length < 16 || issue.pages.slice(0, 16).some((p) => !p.printed && !issue.fixed)) {
    const printed = issue.pages.filter((p) => p.printed).length;
    main.dataset.state = 'short';
    lcdTop.textContent = 'NEED 16 SHEETS';
    lcdCount.textContent = `${pad2(printed)}/16`;
    start.disabled = true;
    $('.x-hint').innerHTML = `<a href="#/press">${t('back')}</a>`;
  }
  // the machine glides in
  if (!rm) $('.x-machine').animate([{ transform: 'translateX(28vw)', filter: 'blur(6px)', opacity: 0 }, { transform: 'none', filter: 'blur(0)', opacity: 1 }], { duration: 1600, easing: 'cubic-bezier(.2,.7,.2,1)' });
  start.focus({ preventScroll: true });
  (window as unknown as { __ready: boolean }).__ready = true;
  return () => { offLang(); stopRoller(); cancelAnimationFrame(raf); urls.forEach((u) => URL.revokeObjectURL(u)); };
}
