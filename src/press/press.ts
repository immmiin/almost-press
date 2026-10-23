// The Press (workbench). Full screen, no page scroll on desktop; the page is the hero.
import './press.css';
import { Stage, type Mode } from './stage';
import { Drawer } from './drawer';
import { InkPanel } from './inkPanel';
import { Ticket } from './ticket';
import { Strip } from './strip';
import { TOOLS, type ToolId } from './toolDefs';
import { stampButton, slip, washi } from '../design/materials';
import { deckle } from '../design/paper';
import { getIssue, emit, onIssue, ISSUE_NO, currentPage, newIssue, setIssue } from '../model/store';
import { commitPrint, nextPage, reprint, refreshText, inkUse } from '../print/loop';
import { stampDream } from './edits';
import { atmosphere, dissolveTo } from '../atmosphere/atmosphere';
import { t, tA, onLang, setLabelDrift, getLang } from '../core/i18n';
import { dreamTimeOf, INK_BY_ID } from '../design/tokens';
import { kanjiNum } from './util';
import { roller, thud } from '../core/sound';
import { reducedMotion, hash, rng } from '../core/rng';
import { go } from '../core/router';
import { bindIssue } from '../print/binding';
import type { Issue } from '../model/types';

export default function press(root: HTMLElement, params: URLSearchParams) {
  if (params.get('new')) { setIssue(newIssue(params.get('seed') ? +params.get('seed')! : undefined)); history.replaceState(null, '', '#/press'); }
  let issue: Issue = getIssue();
  if (issue.fixed || issue.bound) { /* a finished or fixed issue opens a fresh one at the press */ setIssue(newIssue()); issue = getIssue(); }
  root.innerHTML = `<div class="press" data-dozing="false">
    <div class="p-ticket"></div><div class="p-drawer"></div>
    <div class="p-stage"><div class="p-vline vert" aria-live="polite"></div><div class="p-roller" aria-hidden="true"><i></i></div><div class="p-drum" aria-hidden="true"></div></div>
    <div class="p-tools"></div><div class="p-inks"></div><div class="p-bench"></div>
    <p class="sr" aria-live="polite" id="p-status"></p></div>`;
  const $ = (s: string) => root.querySelector(s) as HTMLElement;
  const status = (m: string) => { $('#p-status').textContent = m; };

  const stage = new Stage();
  const drawer = new Drawer();
  const inks = new InkPanel();
  const ticket = new Ticket();
  const strip = new Strip();
  inks.levels = issue.levels ?? (issue.levels = {});
  $('.p-stage').prepend(stage.el);
  $('.p-drawer').append(drawer.el);
  $('.p-inks').append(inks.el);
  $('.p-ticket').append(ticket.el);
  $('.p-bench').append(strip.el);
  stage.dishTarget = () => strip.dish.getBoundingClientRect();

  // ---------- tools column ----------
  const toolsWrap = document.createElement('div');
  toolsWrap.className = 'tools-wrap vellum-wrap';
  toolsWrap.innerHTML = `<div class="tools vellum" role="toolbar" aria-orientation="vertical"></div>`;
  const tools = toolsWrap.querySelector('.tools') as HTMLElement;
  deckle(tools, 61, 'deckle', 2);
  toolsWrap.append(washi(21, { left: '6px', top: '-8px' }, 46));
  const toolBtns = TOOLS.map((def, i) => {
    const b = stampButton(def.char, def.en, i + 2);
    b.dataset.tool = def.id;
    b.addEventListener('click', () => stage.setMode(stage.mode.type === 'tool' && stage.mode.tool === def.id ? { type: 'select' } : { type: 'tool', tool: def.id }));
    tools.append(b);
    return b;
  });
  const reprintBtn = slip('button', 88, '', 'reprint-slip');
  reprintBtn.addEventListener('click', () => {
    const is = getIssue(); const p = reprint(currentPage());
    is.pages[is.current] = p; stage.setPage(p); emit('reprint'); status(tA('reprint'));
  });
  const layerBtns = document.createElement('div');
  layerBtns.className = 'layer-btns';
  layerBtns.innerHTML = `<button type="button" class="mono" data-l="1" aria-label="${tA('a_fwd')}">上</button><button type="button" class="mono" data-l="-1" aria-label="${tA('a_bwd')}">下</button>`;
  layerBtns.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button'); if (!b) return; stage.reorder(currentPage().objects.filter((o) => stage.selected.has(o.id)), +b.dataset.l!); emit('layer'); stage.render(); });
  tools.append(layerBtns, reprintBtn);
  $('.p-tools').append(toolsWrap);

  // ---------- wiring ----------
  const labels = () => {
    TOOLS.forEach((def, i) => {
      const lang = getLang();
      const name = lang === 'ko' ? def.ko : lang === 'ja' ? def.ja : def.en;
      toolBtns[i].querySelector('.stamp-label')!.textContent = name;
      toolBtns[i].setAttribute('aria-label', `${name} — ${def.note}`);
      toolBtns[i].title = def.note;
    });
    reprintBtn.innerHTML = `<span class="mono">${t('reprint')}</span>`;
    tools.setAttribute('aria-label', tA('tools'));
    vline();
  };
  const vline = () => {
    const p = currentPage();
    const dt = dreamTimeOf(p.n);
    $('.p-vline').textContent = `第${kanjiNum(p.n)}頁 · ${dt.ja}`;
    $('.p-vline').setAttribute('aria-label', `${tA('page')} ${p.n} · ${dt.en}`);
  };
  stage.onModeChange = () => {
    const m = stage.mode;
    toolBtns.forEach((b) => b.setAttribute('aria-pressed', String(m.type === 'tool' && b.dataset.tool === m.tool)));
    root.querySelector('.press')!.setAttribute('data-mode', m.type === 'tool' ? `tool-${m.tool}` : m.type);
  };
  stage.onSelect = () => {};
  drawer.onPick = (it) => { stage.setMode({ type: 'stamp', item: it }); status('stamp: press on the page. Short = light, long = ink blooms. Esc to stop.'); };
  drawer.onGround = (g) => { currentPage().ground = g; emit('ground'); stage.render(); };
  strip.onForgotten = (o) => stage.setMode({ type: 'stamp', item: { kind: 'forgotten', obj: o } });
  inks.onChange = () => { emit('ink'); syncAtmo(); drawer.setInks(currentPage().inks, hash(issue.seed, currentPage().n)); stage.render(); };
  inks.onView = (v) => { stage.view = v; stage.render(); };
  inks.onSlot = (i) => { stage.activePlate = i; };
  ticket.onDream = (text) => {
    const is = getIssue();
    if (!is.dream || currentPage().n === 1) is.dream = text;
    const p = currentPage();
    p.objects.push(...stampDream(p, text, hash(is.seed, p.n, text)));
    refreshText(is, p);
    thud(0.8);
    emit('dream'); stage.render(); status(`dream stamped: ${text}`);
  };
  strip.onOpen = (i) => {
    const is = getIssue();
    if (i === is.current) return;
    is.current = i; emit('open'); load();
  };

  const syncAtmo = () => {
    const p = currentPage();
    const a = atmosphere();
    a.setPage(p.n);
    a.setInks(p.inks.map((i) => INK_BY_ID[i].hex));
    setLabelDrift(Math.max(0, (p.n - 2) / 14), issue.seed);
  };
  const load = () => {
    issue = getIssue();
    const p = currentPage();
    if (!p.slug) refreshText(issue, p);
    stage.setPage(p);
    stage.view = inks.view;
    inks.setPage(p);
    drawer.setInks(p.inks, hash(issue.seed, p.n));
    drawer.currentGround = p.ground;
    drawer.renderGrid();
    ticket.setIssue(ISSUE_NO(issue), issue.dream);
    strip.render(issue);
    syncAtmo();
    vline();
  };

  // ---------- layout ----------
  const fit = () => {
    const box = $('.p-stage').getBoundingClientRect();
    stage.layout(box.width, box.height);
  };
  const ro = new ResizeObserver(fit);
  ro.observe($('.p-stage'));

  // ---------- hold to print ----------
  let printing: null | { t0: number; raf: number; stopSound: () => void; landed: number; n: number } = null;
  const PER_PLATE = reducedMotion() ? 260 : 900;
  const ring = (v: number) => strip.print.style.setProperty('--fill', String(v));
  const roll = $('.p-roller');
  const startPrint = () => {
    if (printing || busy) return;
    const p = currentPage();
    const n = p.inks.length;
    strip.print.classList.add('held');
    stage.setMode({ type: 'select' }); stage.selected.clear(); stage.drawHandles();
    printing = { t0: performance.now(), raf: 0, stopSound: roller(), landed: 0, n };
    const frame = () => {
      if (!printing) return;
      const el = (performance.now() - printing.t0) / (PER_PLATE * n);
      const prog = Math.min(1, el);
      ring(prog);
      const shown = [0, 1, 2, 3].map((i) => Math.max(0, Math.min(1, prog * n - i)));
      const landed = Math.floor(prog * n + 1e-6);
      if (landed > printing.landed) {
        // each plate lands with its own offset and a soft flash of its ink across the mist
        const ink = INK_BY_ID[p.inks[landed - 1]].hex;
        atmosphere().flashInk(ink, 0.9);
        inks.drain(inkUse(p).map((u, i) => (i === landed - 1 ? u : 0)));
        printing.landed = landed;
        thud(0.35);
      }
      const cur = Math.min(n - 1, Math.floor(prog * n));
      const y = (prog * n - cur);
      roll.style.setProperty('--y', String(y));
      roll.style.setProperty('--ink', INK_BY_ID[p.inks[cur]].hex);
      roll.classList.toggle('on', prog < 1);
      // the page shows plates as they land (sheet is fed blank)
      const src = stagePrintRender(shown);
      void src;
      if (prog >= 1) { finishPrint(n); return; }
      printing.raf = requestAnimationFrame(frame);
    };
    frame();
  };
  const stagePrintRender = (shown: number[]) => {
    const src = (stage as unknown as { canvas: HTMLCanvasElement }).canvas;
    const pl = currentPage();
    const out = pipelineRender(pl, src.width, shown);
    src.getContext('2d')!.drawImage(out, 0, 0);
    return out;
  };
  const stopPrint = () => {
    if (!printing) return;
    const landed = printing.landed;
    if (landed >= printing.n) return;
    if (landed === 0) { cancelPrint(); return; }
    finishPrint(landed);
  };
  const cancelPrint = () => {
    if (!printing) return;
    cancelAnimationFrame(printing.raf); printing.stopSound(); printing = null;
    strip.print.classList.remove('held'); ring(0); roll.classList.remove('on');
    stage.render('full');
  };
  let busy = false;
  const finishPrint = async (plates: number) => {
    if (!printing) return;
    cancelAnimationFrame(printing.raf); printing.stopSound(); printing = null;
    strip.print.classList.remove('held'); roll.classList.remove('on');
    busy = true;
    const is = getIssue();
    const p = currentPage();
    commitPrint(is, p, plates);
    strip.invalidate(is.current);
    status(`${tA('page')} ${p.n} printed with ${plates} of ${p.inks.length} plates`);
    emit('print');
    // the sheet curls and is pulled into the drum
    const sheet = stage.sheet;
    if (!reducedMotion()) {
      await sheet.animate([
        { transform: 'none', filter: 'none' },
        { transform: 'perspective(900px) rotateX(-14deg) translateY(-2%) scale(.98)', offset: 0.35 },
        { transform: 'perspective(900px) rotateX(-62deg) translateY(-62%) scale(.72)', filter: 'blur(2px)', opacity: 0.2 },
      ], { duration: 900, easing: 'cubic-bezier(.5,0,.75,.2)' }).finished;
    }
    const wasLatest = is.current === is.pages.length - 1;
    if (wasLatest && p.n >= 16) {
      busy = false; ring(0);
      await bindIssue(is, root);
      is.bound = true; emit('bound');
      go('reader', 'issue=current');
      return;
    }
    await dissolveTo(() => {
      if (wasLatest) { is.pages.push(nextPage(is, inks.drift)); is.current = is.pages.length - 1; }
      else {
        // reopened sheet: later pages are not regenerated; go back to the sheet on the press
        const firstOpen = is.pages.findIndex((q) => !q.printed);
        is.current = firstOpen >= 0 ? firstOpen : is.pages.length - 1;
      }
      emit('next'); load(); ring(0);
    }, 1100);
    busy = false;
  };
  strip.print.addEventListener('pointerdown', (e) => { e.preventDefault(); try { strip.print.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } startPrint(); });
  strip.print.addEventListener('pointerup', stopPrint);
  strip.print.addEventListener('pointercancel', stopPrint);
  strip.print.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startPrint(); } });
  strip.print.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stopPrint(); });
  const spaceDown = (e: KeyboardEvent) => { if (e.key === ' ' && !e.repeat && !(e.target as HTMLElement).closest('input,textarea,button,[role="slider"]')) { e.preventDefault(); startPrint(); } };
  const spaceUp = (e: KeyboardEvent) => { if (e.key === ' ' && !(e.target as HTMLElement).closest('input,textarea,button,[role="slider"]')) stopPrint(); };
  addEventListener('keydown', spaceDown); addEventListener('keyup', spaceUp);

  // ---------- weird, never in the way ----------
  const pressEl = $('.press') as HTMLElement;
  let idleT = 0;
  const wake = () => {
    clearTimeout(idleT);
    if (pressEl.dataset.dozing === 'true') { pressEl.dataset.dozing = 'false'; atmosphere().sleep(false); }
    idleT = window.setTimeout(() => { pressEl.dataset.dozing = 'true'; atmosphere().sleep(true); inks.bubble(); }, 40000);
  };
  const ev = ['pointermove', 'pointerdown', 'keydown', 'wheel'];
  ev.forEach((e) => addEventListener(e, wake, { passive: true }));
  wake();
  // soft-focus interface: panels you have not touched for a while drift out of focus
  const panels = [$('.p-drawer'), $('.p-inks'), $('.p-tools'), $('.p-ticket')];
  const touched = new Map<HTMLElement, number>(panels.map((p) => [p, performance.now()]));
  panels.forEach((p) => { p.addEventListener('pointerenter', () => { touched.set(p, performance.now()); p.classList.remove('unfocused'); }); p.addEventListener('focusin', () => { touched.set(p, performance.now()); p.classList.remove('unfocused'); }); });
  const focusTimer = setInterval(() => { const now = performance.now(); panels.forEach((p) => p.classList.toggle('unfocused', now - touched.get(p)! > 28000 && !p.matches(':hover,:focus-within'))); }, 2000);
  // after the tab was hidden, objects on the page have slid slightly (never while visible)
  let hiddenAt = 0;
  const vis = () => {
    if (document.hidden) { hiddenAt = performance.now(); return; }
    if (hiddenAt && performance.now() - hiddenAt > 3000) {
      const p = currentPage(); const r = rng(Date.now() % 1e6);
      if (!p.printed) { p.objects.forEach((o) => { if (o.kind !== 'helper') { o.x += (r() - 0.5) * 3; o.y += (r() - 0.3) * 2.4; o.r += (r() - 0.5) * 2; } }); emit('slid'); stage.render(); }
    }
    hiddenAt = 0;
  };
  document.addEventListener('visibilitychange', vis);

  const offIssue = onIssue((why) => { if (why === 'forgotten' || why === 'shake' || why === 'print') strip.render(getIssue()); });
  const offLang = onLang(labels);
  load(); labels(); fit();

  return () => {
    ro.disconnect(); offIssue(); offLang(); clearInterval(focusTimer); clearTimeout(idleT);
    ev.forEach((e) => removeEventListener(e, wake));
    removeEventListener('keydown', spaceDown); removeEventListener('keyup', spaceUp);
    document.removeEventListener('visibilitychange', vis);
    stage.destroy(); drawer.destroy(); inks.destroy(); ticket.destroy(); strip.destroy();
    atmosphere().sleep(false);
  };
}

import { pipeline } from '../riso/pipeline';
function pipelineRender(p: ReturnType<typeof currentPage>, w: number, shown: number[]) { return pipeline().render(p, w, { shown }); }
export type { Mode, ToolId };
