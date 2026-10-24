// "The press remembers": what happens on a new sheet right after the drum feeds it, so a visitor can read what the
// machine carried over. The faint mirrored set-off of the sheet before appears, inherited objects fly from that
// sheet on the rod to their new place and wear a tiny printed tag for two seconds ("remembered wrong ×3.2"), the
// forgotten ones drift into the dish, and the drift cards are stamped as small slips beside the page (they stay
// listed in the slug). Also here: the slips the press lays beside the page and the first-time job ticket.
import type { Issue, Page, PageObj } from '../model/types';
import type { Stage } from './stage';
import type { Strip } from './strip';
import { inkThumb } from './thumbs';
import { slip, washi } from '../design/materials';
import { isTool } from '../print/drift';
import { reducedMotion } from '../core/rng';
import { thud, tick, rustle } from '../core/sound';
import { tAll } from '../core/i18n';

const wait = (ms: number, skip: () => boolean = () => false) => new Promise<void>((res) => {
  if (ms <= 0) return res();
  const t0 = performance.now();
  const f = () => (skip() || performance.now() - t0 >= ms ? res() : requestAnimationFrame(f));
  f();
});
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Box (mm) the ink thumbnail of an object shows: thumbs print the 200-unit box at 140 of 144 mm. */
const thumbBox = (o: PageObj) => (o.kind === 'helper' ? 144 : o.s * 144 / 140);
/** Rough height (mm) of what is drawn, for placing a tag just above it. */
const drawnHalf = (o: PageObj) => (o.kind === 'obj' ? o.s * 0.36 : o.kind === 'word' ? o.s * 0.22 : o.s * 0.4);

/** A small torn slip laid beside the page for a while. (x, y) in the host's local px; anchor: centre-top. */
export function noteSlip(host: HTMLElement, html: string, x: number, y: number, ms = 2600, seed = 7): HTMLElement {
  const s = slip('div', seed, html, 'note-slip');
  s.setAttribute('role', 'status');
  s.style.left = `${x}px`; s.style.top = `${y}px`; s.style.translate = '-50% 0';
  s.style.rotate = `${((seed * 37) % 7) - 3}deg`;
  host.append(s);
  if (!reducedMotion()) s.animate([{ opacity: 0, transform: 'translateY(-6px) scale(1.06)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.3,.7,.2,1)' });
  setTimeout(() => { const a = reducedMotion() ? null : s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' }); if (a) a.onfinish = () => s.remove(); else s.remove(); }, ms);
  return s;
}

/** Card label as printed on its slip: tools carry the intensity ("WAVE 0.4"), the rest their name. */
export const cardLabel = (card: string, k: number) => (isTool(card) ? `${card.toUpperCase()}<i>${k.toFixed(1)}</i>` : card.replace(/-/g, ' ').toUpperCase());

/** Where there is room beside the page (local px of the host): right of it, else left, else along the top. */
function besidePage(host: HTMLElement, stage: Stage, want: number): { x: number; y: number; side: 'right' | 'left' | 'top' } {
  const h = host.getBoundingClientRect(), s = stage.sheet.getBoundingClientRect();
  if (h.right - s.right >= want + 22) return { x: s.right - h.left + 16, y: s.top - h.top + 34, side: 'right' };
  if (s.left - h.left >= want + 36) return { x: s.left - h.left - want - 16, y: s.top - h.top + 34, side: 'left' };
  return { x: s.left - h.left + 8, y: s.top - h.top + 8, side: 'top' };
}

/** The drift cards of a sheet as slips beside the page. */
export function driftColumn(host: HTMLElement, stage: Stage, page: Page, animate: boolean) {
  host.querySelector('.drift-col')?.remove();
  if (!page.drift.length) return;
  const col = document.createElement('div');
  col.className = 'drift-col';
  col.setAttribute('aria-label', `drift: ${page.drift.join(', ')}`);
  const k = page.driftK ?? 0.5;
  const [en, ja] = tAll('drift');
  col.innerHTML = `<span class="h">${en} · ${ja}</span>` + page.drift.map((c, i) => `<div class="drift-card slip" style="rotate:${((i * 53) % 9) - 4}deg">${cardLabel(c, k)}</div>`).join('');
  host.append(col);
  const pos = besidePage(host, stage, 136);
  Object.assign(col.style, { left: `${pos.x}px`, top: `${pos.y}px` });
  if (pos.side === 'top') { col.style.gridAutoFlow = 'column'; col.style.gap = '6px'; (col.firstElementChild as HTMLElement).style.display = 'none'; }
  if (!animate || reducedMotion()) return;
  col.querySelectorAll<HTMLElement>('.drift-card').forEach((c, i) => {
    c.animate([{ opacity: 0, transform: 'scale(1.7) rotate(-6deg)', filter: 'blur(2px)' }, { opacity: 1, transform: 'scale(.94)', filter: 'none', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 160 * i, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'backwards' });
    setTimeout(() => thud(0.22), 160 * i + 200);
  });
}

export interface RememberCtx { notes: HTMLElement; flyLayer: HTMLElement; stage: Stage; strip: Strip; issue: Issue; prev: Page; prevIdx: number; page: Page }

/** The 2.5 s sequence on a freshly fed sheet. Resolves when the sheet is editable (tags linger a little longer). */
export async function remember(c: RememberCtx): Promise<void> {
  const { stage, strip, page, prev, notes, flyLayer } = c;
  const memo = page.memo;
  if (!memo) return;
  const rm = reducedMotion();
  let skip = rm;
  const isSkip = () => skip;
  const onSkip = (e: Event) => { if (e instanceof KeyboardEvent && e.key !== 'Escape') return; skip = true; };
  addEventListener('keydown', onSkip); stage.el.addEventListener('pointerdown', onSkip);
  const nb = notes.getBoundingClientRect();
  const local = (cx: number, cy: number): [number, number] => [cx - nb.left, cy - nb.top];

  if (memo.level === 'off') {
    const s = stage.sheet.getBoundingClientRect();
    noteSlip(notes, `memory off · <b>a blank sheet</b>`, ...local(s.left + s.width / 2, s.top + 18), 2400, 3);
    driftColumn(notes, stage, page, false);
    removeEventListener('keydown', onSkip); stage.el.removeEventListener('pointerdown', onSkip);
    return;
  }

  const hide = new Set(memo.tags.map((t) => t.id));
  // 1 · the sheet arrives with only its ground, seal and type, and the mirrored set-off of the sheet before, a little
  // stronger; everything else appears when the carried objects land (copies made by drift appear with their originals)
  void hide;
  const preview: Page = { ...page, objects: page.objects.filter((o) => o.kind === 'helper'), setoff: page.setoff?.map((o) => ({ ...o, opacity: (o.opacity ?? 1) * 2.4 })) };
  stage.el.classList.add('remembering');
  stage.setPage(preview);
  const fromR = strip.leafRect(c.prevIdx) ?? new DOMRect(innerWidth / 2, innerHeight - 60, 30, 42);
  const fx = fromR.left + fromR.width / 2, fy = fromR.top + fromR.height / 2;
  if (!rm) stage.canvas.animate([{ opacity: 0.35, filter: 'blur(1.5px)' }, { opacity: 1, filter: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,.7,.2,1)' });
  const banner = rm ? null : noteSlip(notes, `${tAll('remembers')[0]} · <span lang="ja">${tAll('remembers')[1]}</span>`, ...local(stage.sheet.getBoundingClientRect().left + stage.sheet.getBoundingClientRect().width / 2, stage.sheet.getBoundingClientRect().top - 2), 2300, 11);
  void banner;
  await wait(320, isSkip);

  // 2 · inherited objects fly from the previous sheet on the rod to their new place
  const flights: { img: HTMLImageElement; anim: Animation | null }[] = [];
  const objs = memo.tags.map((t) => page.objects.find((q) => q.id === t.id)).filter(Boolean) as PageObj[];
  const urls = await Promise.all(objs.map((o) => inkThumb(o.kind === 'obj' ? { key: o.key, wrong: o.wrong } : o, page.inks, 160)));
  let longest = 0;
  objs.forEach((o, i) => {
    if (skip) return;
    const img = new Image(); img.src = urls[i]; img.className = 'mem-fly'; img.alt = '';
    const size = thumbBox(o) * stage.mm;
    img.style.width = `${size}px`;
    flyLayer.append(img);
    const [tx, ty] = stage.toClient(o.x, o.y);
    const k0 = Math.max(0.08, (fromR.width * 0.7) / size);
    const flip = o.flip ? -1 : 1;
    const at = (x: number, y: number, k: number, r: number) => `translate(${(x - size / 2).toFixed(1)}px, ${(y - size / 2).toFixed(1)}px) rotate(${r}deg) scale(${(k * flip).toFixed(3)}, ${k.toFixed(3)})`;
    const midX = (fx + tx) / 2, midY = Math.min(fy, ty) - 80 - i * 14;
    const dur = 820, delay = i * 110;
    longest = Math.max(longest, dur + delay);
    const anim = img.animate([
      { transform: at(fx, fy, k0, 0), opacity: 0.2 },
      { transform: at(midX, midY, (k0 + 1) / 2, o.r * 0.5), opacity: 1, offset: 0.5 },
      { transform: at(tx, ty, 1, o.r), opacity: 1 },
    ], { duration: dur, delay, easing: 'cubic-bezier(.35,.05,.25,1)', fill: 'both' });
    setTimeout(() => !skip && tick(), delay + dur - 60);
    flights.push({ img, anim });
  });

  // 3 · the forgotten ones drift from the same sheet into the dish
  const dishR = strip.dish.getBoundingClientRect();
  const forgot = prev.objects.filter((o) => memo.forgot.includes(o.id));
  const fUrls = await Promise.all(forgot.slice(0, 6).map((o) => inkThumb(o.kind === 'obj' ? { key: o.key, wrong: o.wrong } : o, prev.inks, 96)));
  forgot.slice(0, 6).forEach((o, i) => {
    if (skip) return;
    const img = new Image(); img.src = fUrls[i]; img.className = 'mem-fly'; img.alt = '';
    const size = 40;
    img.style.width = `${size}px`;
    flyLayer.append(img);
    const dx = dishR.left + dishR.width * (0.25 + (i % 4) * 0.17), dy = dishR.top + dishR.height * 0.45;
    const anim = img.animate([
      { transform: `translate(${fx - size / 2}px, ${fy - size / 2}px) scale(.5) rotate(0deg)`, opacity: 0.9 },
      { transform: `translate(${(fx + dx) / 2 - size / 2}px, ${Math.min(fy, dy) - 70}px) scale(.8) rotate(${(i % 2 ? -1 : 1) * 40}deg)`, opacity: 0.9, offset: 0.45 },
      { transform: `translate(${dx - size / 2}px, ${dy - size / 2}px) scale(.55) rotate(${(i % 2 ? -1 : 1) * 110}deg)`, opacity: 0.85 },
    ], { duration: 980, delay: 180 + i * 90, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' });
    flights.push({ img, anim });
    longest = Math.max(longest, 180 + i * 90 + 980);
  });
  if (forgot.length) setTimeout(() => !skip && rustle(0.5), 900);

  await wait(Math.min(longest, 1500), isSkip);
  if (!stage.el.isConnected) { flights.forEach((f) => f.img.remove()); removeEventListener('keydown', onSkip); return; }
  // the real sheet replaces the preview under the landed objects
  stage.setPage(page);
  stage.el.classList.remove('remembering');
  await frame(); await frame();
  for (const f of flights) {
    if (rm || skip) { f.img.remove(); continue; }
    f.img.animate([{ opacity: f.img.style.opacity || 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).onfinish = () => f.img.remove();
  }
  strip.render(c.issue);

  // 4 · tiny printed tags for two seconds
  objs.forEach((o, i) => {
    const t = memo.tags.find((q) => q.id === o.id)!;
    const [cx, cy] = stage.toClient(o.x, o.y - drawnHalf(o));
    const [x, y] = local(cx, cy);
    const tag = document.createElement('span');
    tag.className = `mem-tag${t.tag.startsWith('keepsake') ? ' keep' : ''}`;
    tag.textContent = t.tag;
    tag.style.left = `${Math.max(60, Math.min(nb.width - 60, x))}px`;
    tag.style.top = `${Math.max(2, y - 22)}px`;
    tag.style.rotate = `${((i * 41) % 7) - 3}deg`;
    notes.append(tag);
    if (!rm) tag.animate([{ opacity: 0, transform: 'scale(1.25)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: i * 70, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'backwards' });
    setTimeout(() => { const a = rm ? null : tag.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); if (a) a.onfinish = () => tag.remove(); else tag.remove(); }, 2000 + i * 70);
  });
  if (forgot.length) {
    const tag = document.createElement('span');
    tag.className = 'mem-tag forgot';
    tag.textContent = forgot.length > 1 ? `forgotten ×${forgot.length}` : 'forgotten';
    Object.assign(tag.style, { position: 'fixed', left: `${dishR.left + dishR.width / 2}px`, top: `${dishR.top - 14}px` });
    flyLayer.append(tag);
    setTimeout(() => tag.remove(), 2000);
  }
  // 5 · drift cards are stamped as small slips beside the page
  driftColumn(notes, stage, page, !skip);
  removeEventListener('keydown', onSkip); stage.el.removeEventListener('pointerdown', onSkip);
  await wait(skip ? 0 : 200 + page.drift.length * 160);
}

/** The first-time guide: a job ticket taped beside the first sheet. Each line gets a red check when done; it peels
 *  off after the first print and never comes back. */
export class Guide {
  el: HTMLElement;
  private steps: HTMLElement[];
  static wanted() { try { return localStorage.getItem('ap.guide') !== 'done'; } catch { return false; } }
  constructor(private host: HTMLElement) {
    const t = slip('div', 29, `<h3>job ticket · 作業票</h3>
      <p><i>1</i><span>Stamp things from the drawer</span><b class="chk" aria-hidden="true">済</b></p>
      <p><i>2</i><span>Rub them with a seal tool</span><b class="chk" aria-hidden="true">済</b></p>
      <p><i>3</i><span>Hold PRINT</span><b class="chk" aria-hidden="true">済</b></p>`, 'job-ticket');
    t.setAttribute('role', 'note');
    t.setAttribute('aria-label', 'first sheet: 1 stamp things from the drawer, 2 rub them with a seal tool, 3 hold PRINT');
    t.append(washi(44, { left: '38%', top: '-9px' }, 64));
    this.el = t;
    this.steps = [...t.querySelectorAll('p')];
    host.append(t);
  }
  place(stage: Stage) {
    // beside the first sheet: the right margin (no drift slips on sheet 1), else the left, else over the page's top
    const h = this.host.getBoundingClientRect(), s = stage.sheet.getBoundingClientRect();
    const w = 190;
    let x = s.right - h.left + 10, y = s.top - h.top + 56, r = 2;
    if (h.right - s.right < w + 12) { x = s.left - h.left - w - 18; r = -2.5; }
    if (x < 26) { x = Math.max(6, s.left - h.left + 10); y = s.top - h.top + 10; r = -1.5; }
    Object.assign(this.el.style, { left: `${x}px`, top: `${y}px`, rotate: `${r}deg`, width: `${Math.min(w, s.width - 20)}px` });
  }
  mark(i: number) {
    const p = this.steps[i];
    if (!p || p.classList.contains('done')) return;
    p.classList.add('done');
    thud(0.3);
  }
  peel() {
    try { localStorage.setItem('ap.guide', 'done'); } catch { /* private mode: it simply shows again */ }
    this.mark(2);
    const el = this.el;
    if (reducedMotion()) { el.remove(); return; }
    rustle(0.8);
    el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(-30px,-90px) rotate(-18deg)', opacity: 0, filter: 'blur(2px)' }], { duration: 700, delay: 500, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }).onfinish = () => el.remove();
  }
}
