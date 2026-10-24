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
import { tA, tAll, onLang, setLabelDrift, getLang } from '../core/i18n';
import { dreamTimeOf, INK_BY_ID } from '../design/tokens';
import { kanjiNum } from './util';
import { roller, thud, tick } from '../core/sound';
import { reducedMotion, hash, rng } from '../core/rng';
import { go } from '../core/router';
import { bindIssue } from '../print/binding';
import type { Issue } from '../model/types';
import { remember, driftColumn, noteSlip, Guide } from './remember';

export default function press(root: HTMLElement, params: URLSearchParams) {
  // ?new=1 starts a fresh issue; ?dream=… (from the Gate) then dreams all sixteen sheets from that sentence
  const quick = params.get('dream')?.trim() ?? '';
  if (params.get('new')) { setIssue(newIssue(params.get('seed') ? +params.get('seed')! : undefined)); history.replaceState(null, '', '#/press'); }
  let issue: Issue = getIssue();
  // the fixed Issue 01 is never edited: the press opens a fresh issue. A bound issue stays open: any sheet can be reopened.
  if (issue.fixed) { setIssue(newIssue()); issue = getIssue(); }
  root.innerHTML = `<div class="press" data-dozing="false">
    <div class="p-ticket"></div><div class="p-drawer"></div>
    <div class="p-stage"><div class="p-vline vert" aria-live="polite"></div><div class="p-roller" aria-hidden="true"><i></i></div><div class="p-drum" aria-hidden="true"></div><div class="p-notes"></div></div>
    <div class="p-tools"></div><div class="p-inks"></div><div class="p-bench"></div>
    <nav class="sheet-tabs" aria-label="panels"><button type="button" data-s="drawer" aria-expanded="false"><b class="ja">判</b><span class="mono"></span></button><button type="button" data-s="tools" aria-expanded="false"><b class="ja">道</b><span class="mono"></span></button><button type="button" data-s="inks" aria-expanded="false"><b class="ja">墨</b><span class="mono"></span></button></nav>
    <p class="sr" aria-live="polite" id="p-status"></p><div class="p-fly" aria-hidden="true"></div></div>`;
  const $ = (s: string) => root.querySelector(s) as HTMLElement;
  const status = (m: string) => { $('#p-status').textContent = m; };
  const notes = () => $('.p-notes');

  const stage = new Stage();
  const drawer = new Drawer();
  const inks = new InkPanel();
  const ticket = new Ticket();
  const strip = new Strip();
  inks.levels = issue.levels ?? (issue.levels = {});
  // the drift knob also scales how strongly a tool stroke soaks in
  const strength = () => { stage.toolStrength = 0.55 + inks.drift * 0.9; };
  strength();
  $('.p-stage').prepend(stage.el);
  $('.p-drawer').append(drawer.el);
  $('.p-inks').append(inks.el);
  $('.p-ticket').append(ticket.el);
  $('.p-bench').append(strip.el);
  stage.dishTarget = () => strip.dish.getBoundingClientRect();

  // ---------- under 900 px: drawer, tools and inks become vellum bottom sheets with tabs ----------
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('.sheet-tabs button')];
  const tabLabels = () => tabs.forEach((b) => { (b.querySelector('span') as HTMLElement).textContent = tA(b.dataset.s!); });
  tabLabels();
  tabs.forEach((b) => b.addEventListener('click', () => {
    const pe = $('.press');
    const s = pe.dataset.sheet === b.dataset.s ? '' : b.dataset.s!;
    if (s) pe.dataset.sheet = s; else delete pe.dataset.sheet;
    tabs.forEach((x) => x.setAttribute('aria-expanded', String(x.dataset.s === s)));
    tick();
  }));

  // ---------- each panel folds away to a thin tab (remembered) ----------
  const FOLD: [string, string, string][] = [['drawer', '判', 'drawer'], ['tools', '道', 'tools'], ['inks', '墨', 'inks']];
  const folded = new Set<string>((localStorage.getItem('ap.fold') ?? '').split(' ').filter(Boolean));
  const foldTabs = FOLD.map(([key, ch, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fold-tab';
    b.innerHTML = `<span class="fold-k" aria-hidden="true">${ch}</span><span class="fold-a" aria-hidden="true"></span><span class="fold-l"></span>`;
    b.addEventListener('click', () => { folded.has(key) ? folded.delete(key) : folded.add(key); applyFold(); tick(); requestAnimationFrame(fit); });
    $(`.p-${key}`).prepend(b);
    return { key, b, label };
  });
  const applyFold = () => {
    $('.press').dataset.fold = [...folded].join(' ');
    localStorage.setItem('ap.fold', [...folded].join(' '));
    foldTabs.forEach(({ key, b, label }) => {
      const f = folded.has(key);
      $(`.p-${key}`).toggleAttribute('data-folded', f);
      b.setAttribute('aria-expanded', String(!f));
      b.setAttribute('aria-label', `${tA(f ? 'expand' : 'collapse')}: ${tA(label)}`);
      b.title = b.getAttribute('aria-label')!;
      (b.querySelector('.fold-a') as HTMLElement).textContent = (key === 'drawer') === f ? '›' : '‹';
      (b.querySelector('.fold-l') as HTMLElement).textContent = f ? tA(label) : '';
    });
  };

  // ---------- tools column ----------
  const toolsWrap = document.createElement('div');
  toolsWrap.className = 'tools-wrap vellum-wrap';
  toolsWrap.innerHTML = `<div class="tools vellum" role="toolbar" aria-orientation="vertical"></div>`;
  const tools = toolsWrap.querySelector('.tools') as HTMLElement;
  deckle(tools, 61, 'deckle', 2);
  toolsWrap.append(washi(21, { left: '6px', top: '-8px' }, 46));
  // the three-language name of a tool shows only on hover or focus
  const tip = slip('div', 91, '', 'tool-tip');
  tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
  toolsWrap.append(tip);
  const showTip = (b: HTMLElement, def: (typeof TOOLS)[number]) => {
    tip.innerHTML = `<b>${def.char}</b><span class="tt-n">${def.en} · ${def.ja}</span><span class="mono">${def.note} · [ ] brush</span>`;
    tip.style.top = `${b.offsetTop + b.offsetHeight / 2}px`;
    tip.hidden = false;
  };
  const toolBtns = TOOLS.map((def, i) => {
    const b = stampButton(def.char, def.en, i + 2);
    b.dataset.tool = def.id;
    b.addEventListener('pointerenter', () => showTip(b, def));
    b.addEventListener('focus', () => showTip(b, def));
    b.addEventListener('pointerleave', () => { tip.hidden = true; });
    b.addEventListener('blur', () => { tip.hidden = true; });
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
      const name = lang === 'ja' ? def.ja : def.en;
      toolBtns[i].querySelector('.stamp-label')!.textContent = name;
      toolBtns[i].setAttribute('aria-label', `${def.char} ${name} — ${def.note}`);
    });
    reprintBtn.innerHTML = `<span class="ja" aria-hidden="true">戻</span><span class="mono">reprint</span>`;
    reprintBtn.setAttribute('aria-label', tA('reprint')); reprintBtn.title = tA('reprint');
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
  // the first-time job ticket: three lines, each gets a red check when done; it peels off after the first print
  let guide: Guide | null = null;
  stage.onStamped = () => guide?.mark(0);
  stage.onStroke = () => guide?.mark(1);
  drawer.onPick = (it) => { stage.setMode({ type: 'stamp', item: it }); status('stamp: press on the page. Short = light, long = ink blooms. Esc to stop.'); };
  drawer.onGround = (g) => { currentPage().ground = g; emit('ground'); stage.render(); };
  strip.onForgotten = (o) => stage.setMode({ type: 'stamp', item: { kind: 'forgotten', obj: o } });
  inks.onDrift = strength;
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
    refreshText(issue, p);
    stage.setPage(p);
    stage.view = inks.view;
    inks.setPage(p);
    drawer.setInks(p.inks, hash(issue.seed, p.n));
    drawer.currentGround = p.ground;
    drawer.renderGrid();
    ticket.setIssue(ISSUE_NO(issue));
    strip.render(issue);
    syncAtmo();
    vline();
    showBound();
    strip.sleep.hidden = !!issue.bound;
    if (!guide && Guide.wanted() && issue.current === 0 && !p.printed) guide = new Guide(notes());
    if (guide && issue.current !== 0) { guide.el.remove(); guide = null; }
    if (guide && p.objects.some((o) => o.kind !== 'helper')) guide.mark(0);
    if (guide && p.strokes.length) guide.mark(1);
    requestAnimationFrame(placeNotes);
  };
  /** Slips beside the page follow it when the layout changes. */
  const placeNotes = () => {
    driftColumn(notes(), stage, currentPage(), false);
    guide?.place(stage);
    placeBound();
    const sr = stage.sheet.getBoundingClientRect(), pr = $('.p-stage').getBoundingClientRect();
    const rl = $('.p-roller');
    rl.style.setProperty('--rl', `${sr.left - pr.left}px`); rl.style.setProperty('--rw', `${sr.width}px`);
    rl.style.setProperty('--rt', `${sr.top - pr.top}px`); rl.style.setProperty('--rh', `${sr.height - 14}px`);
  };

  // ---------- layout ----------
  const fit = () => {
    const box = $('.p-stage').getBoundingClientRect();
    stage.layout(box.width, box.height);
    placeNotes();
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
    // under the button: the plates as they land ("plate 1 · 2 · 3")
    const count = (landed: number) => { strip.count.innerHTML = `plate ${Array.from({ length: n }, (_, i) => (i < landed ? `<b>${i + 1}</b>` : `${i + 1}`)).join(' · ')}`; };
    count(0);
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
        count(landed);
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
    // released early: only the plates printed so far stay, and the press says so on a slip
    const sr = stage.sheet.getBoundingClientRect(), nr = notes().getBoundingClientRect();
    noteSlip(notes(), `printed <b>${landed}</b> of ${printing.n} plates`, sr.left - nr.left + sr.width / 2, sr.top - nr.top + sr.height * 0.42, 2600, 5);
    finishPrint(landed);
  };
  const cancelPrint = () => {
    if (!printing) return;
    cancelAnimationFrame(printing.raf); printing.stopSound(); printing = null;
    strip.print.classList.remove('held'); ring(0); roll.classList.remove('on');
    strip.count.textContent = tA('hold');
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
    if (guide) { guide.peel(); guide = null; }
    notes().querySelector('.drift-col')?.remove();
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
      // the sixteenth sheet: the issue is bound (once) and stays on the press, with a slip to run the edition
      if (!is.bound) { await bindIssue(is, root); is.bound = true; emit('bound'); }
      busy = false; ring(0);
      if (!root.isConnected) return;
      strip.count.textContent = tA('hold');
      load();
      return;
    }
    let arriving: { prevIdx: number } | null = null;
    await dissolveTo(() => {
      if (wasLatest) {
        arriving = { prevIdx: is.current };
        is.pages.push(nextPage(is, inks.drift, inks.memory));
        is.current = is.pages.length - 1;
      } else {
        // reopened sheet: later pages are not regenerated; go back to the sheet on the press
        // (a bound issue keeps the reopened sheet on the press)
        const firstOpen = is.pages.findIndex((q) => !q.printed);
        if (!is.bound) is.current = firstOpen >= 0 ? firstOpen : is.pages.length - 1;
      }
      emit('next');
      if (!root.isConnected) return;
      load(); ring(0);
      strip.count.textContent = tA('hold');
    }, 1100);
    if (!root.isConnected) return;
    // the press remembers: set-off ghost, carried objects fly in with their tags, forgotten ones go to the dish
    if (arriving) await remember({ notes: notes(), flyLayer: $('.p-fly'), stage, strip, issue: is, prev: is.pages[(arriving as { prevIdx: number }).prevIdx], prevIdx: (arriving as { prevIdx: number }).prevIdx, page: currentPage() });
    busy = false;
  };
  strip.print.addEventListener('pointerdown', (e) => { e.preventDefault(); try { strip.print.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } startPrint(); });
  strip.print.addEventListener('pointerup', stopPrint);
  strip.print.addEventListener('pointercancel', stopPrint);
  strip.print.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startPrint(); } });
  strip.print.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stopPrint(); });
  const typing = (e: Event) => !!(e.target as Element | null)?.closest?.('input,textarea,button,[role="slider"]');
  const spaceDown = (e: KeyboardEvent) => { if (e.key === ' ' && !e.repeat && !typing(e)) { e.preventDefault(); startPrint(); } };
  const spaceUp = (e: KeyboardEvent) => { if (e.key === ' ' && !typing(e)) stopPrint(); };
  addEventListener('keydown', spaceDown); addEventListener('keyup', spaceUp);

  // ---------- a slip that asks once (Fall asleep) ----------
  const ask = (q: [string, string], yes: [string, string], no: [string, string]) => new Promise<boolean>((resolve) => {
    const veil = document.createElement('div'); veil.className = 'ask-veil';
    const s = slip('div', 73, `<p>${q[0]}</p><p class="ja" lang="ja">${q[1]}</p><div class="row"><button type="button" class="slip run-yes">${yes[0]} · <span lang="ja">${yes[1]}</span></button><button type="button" class="lnk run-no">${no[0]} · ${no[1]}</button></div>`, 'ask-slip');
    s.setAttribute('role', 'dialog'); s.setAttribute('aria-modal', 'true'); s.setAttribute('aria-label', q[0]);
    s.append(washi(81, { left: '42%', top: '-9px' }, 70));
    root.append(veil, s);
    const done = (v: boolean) => { veil.remove(); s.remove(); removeEventListener('keydown', esc); tick(); resolve(v); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') done(false); };
    addEventListener('keydown', esc);
    veil.addEventListener('click', () => done(false));
    (s.querySelector('.run-yes') as HTMLElement).addEventListener('click', () => done(true));
    (s.querySelector('.run-no') as HTMLElement).addEventListener('click', () => done(false));
    (s.querySelector('.run-yes') as HTMLElement).focus();
  });

  // ---------- Fall asleep: the press dreams the remaining sheets by itself, then binds the issue ----------
  const dreamTheRest = async () => {
    if (busy || printing) return;
    const is = getIssue();
    if (is.bound) return;
    busy = true;
    const rm = reducedMotion();
    let skip = rm;
    const onSkip = (e: Event) => { if (e instanceof KeyboardEvent && e.key !== 'Escape') return; skip = true; };
    addEventListener('keydown', onSkip); addEventListener('pointerdown', onSkip);
    const lab = slip('div', 71, '', 'dream-ceremony');
    lab.setAttribute('role', 'status');
    $('.p-stage').append(lab);
    stage.el.classList.add('remembering');
    guide?.el.remove(); guide = null;
    const mem = inks.memory === 'off' ? 'gentle' : inks.memory;
    const say = (n: number) => { lab.innerHTML = `<span lang="ja">眠る</span> · the press dreams sheet ${n} <span class="mono">${String(n).padStart(2, '0')}/16 · click to hurry</span>`; };
    const pause = (ms: number) => new Promise<void>((res) => { const t0 = performance.now(); const f = () => (skip || performance.now() - t0 >= ms ? res() : requestAnimationFrame(f)); f(); });
    // the sheet on the press prints with all its plates
    is.current = is.pages.length - 1;
    const last = currentPage();
    if (!last.printed) { commitPrint(is, last, last.inks.length); strip.invalidate(is.current); }
    emit('print'); strip.render(is); thud(0.6);
    try {
      while (is.pages.length < 16 && root.isConnected) {
        const np = nextPage(is, inks.drift, mem, { dream: true });
        commitPrint(is, np, np.inks.length);
        is.pages.push(np); is.current = is.pages.length - 1;
        say(np.n);
        stage.setPage(np); syncAtmo(); vline(); strip.render(is);
        atmosphere().flashInk(INK_BY_ID[np.inks[0]].hex, 0.5); thud(0.2);
        if (!skip) { stage.canvas.animate([{ opacity: 0.15, filter: 'blur(3px)' }, { opacity: 1, filter: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,.7,.2,1)' }); await pause(800); }
        else await new Promise((r) => requestAnimationFrame(r));
      }
    } finally {
      // whatever happens, the press never stays asleep with its controls locked
      lab.remove(); stage.el.classList.remove('remembering');
      removeEventListener('keydown', onSkip); removeEventListener('pointerdown', onSkip);
      if (is.pages.length < 16 && root.isConnected) { busy = false; load(); }
    }
    emit('dreamt');
    // (left the press mid-dream: the sheets so far are kept, binding waits for the next visit)
    if (!root.isConnected) return;
    await bindIssue(is, root);
    is.bound = true; emit('bound');
    busy = false;
    if (root.isConnected) load();
  };
  // ---------- Dream it for me: one sentence, and the press prints all sixteen sheets by itself ----------
  const quickDream = async (text: string) => {
    text = text.trim();
    if (!text || busy || printing) return;
    let is = getIssue();
    const untouched = !is.bound && is.current === 0 && !is.pages[0].printed && !is.pages[0].objects.some((o) => o.kind !== 'helper');
    if (!untouched) {
      if (!(await ask(['a new issue will be dreamt from this sentence', 'この一文から新しい号を夢に見る'], ['Dream it', '夢に見る'], ['Not now', 'やめる']))) return;
      setIssue(newIssue()); is = getIssue(); guide?.el.remove(); guide = null; load();
    }
    is.dream = text;
    const p = currentPage();
    p.objects.push(...stampDream(p, text, hash(is.seed, p.n, text)));
    refreshText(is, p); thud(0.8); emit('dream'); stage.render('full');
    ticket.input.value = text;
    status(`dream stamped: ${text}`);
    if (!reducedMotion()) await new Promise((r) => setTimeout(r, 1000));
    await dreamTheRest();
  };
  ticket.onDreamFor = (text) => { void quickDream(text); };

  strip.onSleep = async () => {
    if (busy || printing || getIssue().bound) return;
    if (await ask(tAll('sleepAsk'), tAll('sleepYes'), tAll('sleepNo'))) await dreamTheRest();
  };

  // ---------- after binding: a clear slip to run the edition; every sheet can still be reopened ----------
  let boundSlip: HTMLElement | null = null;
  const showBound = () => {
    const is = getIssue();
    if (!is.bound) { boundSlip?.remove(); boundSlip = null; return; }
    if (boundSlip?.isConnected) { placeBound(); return; }
    const [bEn, bJa] = tAll('bound');
    boundSlip = slip('div', 37, `<h3>${bEn} · <span lang="ja">${bJa}</span></h3>
      <button type="button" class="slip run"><span class="ja" aria-hidden="true">刷</span>${tA('run')}<small lang="${getLang() === 'ja' ? 'en' : 'ja'}">${tAll('run')[getLang() === 'ja' ? 0 : 1]}</small></button>
      <a href="#/reader?issue=current">${tA('scroll')} →</a>
      <span class="mono" style="color:var(--soft)">click any sheet on the rod to reopen it</span>`, 'bound-slip');
    boundSlip.append(washi(57, { left: '30%', top: '-9px' }, 64));
    (boundSlip.querySelector('.run') as HTMLElement).addEventListener('click', () => dissolveTo(() => go('export', 'issue=current'), 900));
    notes().append(boundSlip);
    placeBound();
    if (!reducedMotion()) boundSlip.animate([{ opacity: 0, transform: 'translateY(-10px) rotate(-3deg)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,.7,.2,1)' });
  };
  const placeBound = () => {
    if (!boundSlip) return;
    // beside the page: the right margin under the drift slips, else the left margin, else over the page's foot
    const h = notes().getBoundingClientRect(), s = stage.sheet.getBoundingClientRect();
    const W = 176;
    let x = s.right - h.left + 14, y = s.top - h.top + s.height * 0.46;
    if (h.right - s.right < W + 20) { x = s.left - h.left - W - 16; if (x < 28) { x = s.left - h.left + 10; y = s.bottom - h.top - 200; } }
    Object.assign(boundSlip.style, { left: `${x}px`, top: `${y}px`, rotate: '-2deg' });
  };

  // ---------- print this sheet as a single poster (刷 on a printed sheet, or right-click it) ----------
  strip.onPoster = async (i) => {
    const is = getIssue(); const p = is.pages[i];
    if (!p?.printed || busy) return;
    const sr = stage.sheet.getBoundingClientRect(), nr = notes().getBoundingClientRect();
    const at: [number, number] = [sr.left - nr.left + sr.width / 2, sr.top - nr.top + sr.height * 0.5];
    noteSlip(notes(), `printing sheet <b>${p.n}</b> as a poster…`, ...at, 1800, 9);
    const { posterFiles, download } = await import('../export/files');
    const files = await posterFiles(is, p);
    files.forEach((f, k) => setTimeout(() => download(f.blob, f.name), k * 350));
    stage.render('full');
    noteSlip(notes(), `poster <b>${p.n}</b> · A5 PDF with bleed + PNG`, at[0], at[1] + 36, 3200, 13);
    thud(0.6);
  };

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
  // soft-focus interface: after a minute of stillness the panels drift a breath out of focus —
  // never the one under the cursor or holding focus, never the drawer while it is being searched
  const panels = [$('.p-drawer'), $('.p-inks'), $('.p-tools'), $('.p-ticket')];
  let lastInput = performance.now();
  const touch = () => { lastInput = performance.now(); panels.forEach((q) => q.classList.remove('unfocused')); };
  ev.forEach((e) => addEventListener(e, touch, { passive: true }));
  const focusTimer = setInterval(() => {
    const idle = performance.now() - lastInput > 60000;
    panels.forEach((q) => q.classList.toggle('unfocused', idle && !q.matches(':hover,:focus-within') && !(q === panels[0] && drawer.searching)));
  }, 2000);
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
  const offLang = onLang(() => { labels(); tabLabels(); applyFold(); });
  applyFold();
  load(); labels(); fit();
  if (quick) { history.replaceState(null, '', '#/press'); setTimeout(() => void quickDream(quick), reducedMotion() ? 0 : 700); }

  return () => {
    ro.disconnect(); offIssue(); offLang(); clearInterval(focusTimer); clearTimeout(idleT);
    ev.forEach((e) => { removeEventListener(e, wake); removeEventListener(e, touch); });
    removeEventListener('keydown', spaceDown); removeEventListener('keyup', spaceUp);
    document.removeEventListener('visibilitychange', vis);
    stage.destroy(); drawer.destroy(); inks.destroy(); ticket.destroy(); strip.destroy();
    atmosphere().sleep(false);
  };
}

import { pipeline } from '../riso/pipeline';
function pipelineRender(p: ReturnType<typeof currentPage>, w: number, shown: number[]) { return pipeline().render(p, w, { shown }); }
export type { Mode, ToolId };
