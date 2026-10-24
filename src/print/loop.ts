// The core loop: print a page, feed the drum, bring out the next sheet — misremembered by the machine.
import type { Issue, Page, PageObj, Memory, Memo } from '../model/types';
import { PAGE_W } from '../model/types';
import { blankPage, newId, stripOrigin } from '../model/store';
import { rng, hash, pick, shuffle, clamp } from '../core/rng';
import { PRESETS, INK_BY_ID, dreamTimeOf } from '../design/tokens';
import { drawCards, applyCard, type Card } from './drift';
import { applyLayout, LAYOUTS, type Layout } from './layouts';
import { OBJ, KEYS, nameOf } from '../objects';
import { kanjiNum } from '../press/util';
import { makeHelper, makeStamp } from '../press/edits';
import { parse } from '../parse/parser';

/** Dream time presets per band; the machine leans toward them as the night goes on. */
const BAND_PRESETS = [['dawn', 'peachmist'], ['celadon', 'peachmist'], ['wisteria', 'dawn'], ['moonwater', 'wisteria']];

/** Language drift: object words in the dream sentence swap into the other languages as pages go on. */
export function driftSentence(dream: string, n: number, seed: number, extra = 0): string {
  if (!dream) return '';
  const r = rng(seed);
  const p = clamp((n - 2) / 14 + extra, 0, 0.9);
  const words = dream.split(/(\s+)/);
  return words.map((w) => {
    const m = w.match(/^([^A-Za-z가-힣぀-鿿]*)([A-Za-z가-힣぀-鿿']+)(.*)$/);
    if (!m) return w;
    const tok = m[2].toLowerCase().replace(/'s$/, '');
    const key = KEYS.find((k) => OBJ[k].al.includes(tok) || OBJ[k].al.includes(tok.replace(/s$/, '')));
    if (!key || r() > p) return w;
    // the machine drifts into Japanese or back into English; Korean only ever comes from what the visitor typed
    const lang = pick(r, ['ja', 'ja', 'en'] as const);
    return m[1] + nameOf(key, lang).toLowerCase() + m[3];
  }).join('');
}

export function slugOf(issue: Issue, page: Page): string {
  const r = rng(hash(issue.seed, page.n, 'slug'));
  const misprint = r() < 0.12 ? `${page.n}½` : String(page.n).padStart(2, '0');
  const dt = dreamTimeOf(page.n);
  const inks = page.inks.map((i) => INK_BY_ID[i]?.name.toLowerCase()).join('/');
  return `p.${misprint} · ${kanjiNum(page.n)} · ${inks} · mis ${page.mis.toFixed(2)} · ${page.drift.length ? page.drift.join(', ') : 'no drift'} · ${dt.ja} ${dt.en} · #${String(issue.seed).padStart(4, '0')}`;
}
/** Refresh the page's printed text (dream line + slug). */
export function refreshText(issue: Issue, page: Page) {
  page.dreamLine = driftSentence(issue.dream, page.n, hash(issue.seed, page.n, 'lang'), page.drift.includes('language-drift') ? 0.3 : 0);
  page.slug = slugOf(issue, page);
}

/** Commit the print: plates printed so far stay as they are (an early release prints only some plates). */
export function commitPrint(issue: Issue, page: Page, plates: number) {
  page.printed = true;
  page.platesPrinted = clamp(plates, 1, page.inks.length);
  if (page.n === 1 && !issue.keepsake) {
    const first = page.objects.find((o) => o.kind === 'obj' && !o.fx);
    if (first) { issue.keepsake = first.key; issue.keepsakeS = first.s; }
  }
}

/** How strongly each memory setting carries things over. */
const MEMORY: Record<Exclude<Memory, 'off'>, { inherit: [number, number]; jitter: number; keep: number; drift: number; back: number }> = {
  gentle: { inherit: [1, 2], jitter: 0.45, keep: 0.06, drift: 0.5, back: 0.15 },
  normal: { inherit: [2, 3], jitter: 1, keep: 0.14, drift: 1, back: 0.3 },
  wild: { inherit: [3, 4], jitter: 1.5, keep: 0.22, drift: 1.5, back: 0.6 },
};

/** How a carried object came out, compared with what it was on the sheet before. */
export function describeMemory(o: PageObj, was: PageObj): string {
  const f = o.s / Math.max(0.01, was.s);
  const d = ((((o.r - was.r) % 360) + 540) % 360) - 180;
  if (o.kind === 'word' && was.kind !== 'word') return 'remembered as a word';
  if (o.kind === 'obj' && o.key !== was.key) return `remembered as ${(OBJ[o.key]?.en ?? o.key).toLowerCase()}`;
  if (Math.abs(d) > 130) return 'remembered upside down';
  if (Math.abs(d) > 55) return 'remembered sideways';
  if (f > 1.6 || f < 0.6) return `remembered wrong ×${f.toFixed(1)}`;
  if (!!o.flip !== !!was.flip) return 'remembered backwards';
  return 'remembered';
}

/** The next sheet, already carrying what the machine misremembers. `memory` sets how much it carries:
 *  off = a blank sheet; gentle / normal / wild = more objects, more drift, a faster-growing keepsake.
 *  `dream`: the press is dreaming the sheets by itself (Fall asleep, Dream it for me) and may stamp the
 *  dream's objects again when a sheet runs thin. Every choice derives from the issue seed. */
export function nextPage(issue: Issue, driftKnob: number, memory: Memory = 'normal', opts: { dream?: boolean } = {}): Page {
  const prev = issue.pages[issue.pages.length - 1];
  const n = prev.n + 1;
  const seed = hash(issue.seed, n);
  const r = rng(seed);
  const band = Math.min(3, Math.floor((n - 1) / 4));
  // inks drift toward the dream time
  let inks = prev.inks.slice();
  if (r() < 0.55 || (n - 1) % 4 === 0) { const id = pick(r, BAND_PRESETS[band]); inks = PRESETS.find((p) => p.id === id)!.inks.slice(); }
  if (n >= 9 && inks.length < 4 && r() < 0.5) inks.push(pick(r, ['fpink', 'cornflower', 'fgreen', 'sunflower'].filter((x) => !inks.includes(x))));
  const page = blankPage(n, issue.seed, inks);
  page.seed = seed % 100000;
  const memo: Memo = { level: memory, tags: [], forgot: [] };
  page.memo = memo;
  const seal = () => page.objects.push({ ...makeHelper(page, 'seal', 128 + (r() - 0.5) * 6, 186 + (r() - 0.5) * 4, hash(seed, 'seal') % 1e5), s: 10 });
  if (memory === 'off') {
    // memory off: every sheet starts blank (the dream time still moves on)
    seal();
    refreshText(issue, page);
    page.origin = JSON.stringify(stripOrigin(page));
    return page;
  }
  const M = MEMORY[memory];
  page.ground = prev.ground === 'rice' && r() < 0.4 ? 'machine' : r() < 0.5 ? prev.ground : 'machine';
  page.mis = clamp(prev.mis + (r() - 0.3) * 0.15, 0.2, 1.6);
  page.grain = clamp(prev.grain + (r() - 0.4) * 0.08, 0.3, 1);
  // Exquisite Corpse: a few objects inherited, misremembered; the rest are forgotten into the dish
  const pool = prev.objects.filter((o) => !o.fx && o.kind !== 'helper' && o.key !== issue.keepsake);
  const inherit = shuffle(r, pool).slice(0, M.inherit[0] + (r() < 0.5 ? M.inherit[1] - M.inherit[0] : 0));
  const was = new Map<string, PageObj>();
  page.objects = inherit.map((o) => {
    const j = M.jitter;
    const c: PageObj = { ...o, id: newId(), x: clamp(o.x + (r() - 0.5) * 30 * j, 10, PAGE_W - 10), y: clamp(o.y + (r() - 0.5) * 24 * j, 20, 195), s: o.s * (1 + (r() * 0.45 - 0.2) * j), r: o.r + (r() - 0.5) * 14 * j, flip: r() < 0.25 * j ? !o.flip : o.flip, plates: [0, 1, 2].map((i) => (i + Math.floor(r() * 3)) % inks.length), opacity: 1, crumple: 0, wrong: r() < 0.2 * j ? 0.4 : o.wrong };
    was.set(c.id, o);
    return c;
  });
  const forgotten = pool.filter((o) => !inherit.includes(o));
  memo.forgot = forgotten.map((o) => o.id);
  // something forgotten earlier may come back, mutated
  if (issue.forgotten.length && r() < M.back) {
    const i = Math.floor(r() * issue.forgotten.length);
    const back = issue.forgotten.splice(i, 1)[0];
    const b: PageObj = { ...back, id: newId(), x: 20 + r() * 108, y: 60 + r() * 110, wrong: clamp((back.wrong ?? 0) + 0.5), plates: [0, 1, 2].map((q) => q % inks.length) };
    page.objects.push(b);
    memo.tags.push({ id: b.id, tag: 'came back, changed' });
  }
  issue.forgotten.push(...forgotten.map((o) => ({ ...o, id: newId(), fx: undefined, opacity: 1, crumple: 0 })));
  if (issue.forgotten.length > 60) issue.forgotten.splice(0, issue.forgotten.length - 60);
  // the keepsake, a little bigger every page
  let keep: PageObj | undefined;
  if (issue.keepsake) {
    const base = issue.keepsakeS ?? 30;
    const prevK = prev.objects.find((o) => o.key === issue.keepsake && !o.fx);
    keep = { id: newId(), kind: 'obj', key: issue.keepsake, x: prevK ? prevK.x : 40 + r() * 70, y: prevK ? prevK.y : 70 + r() * 60, s: base * (1 + M.keep * (n - 1)), r: (r() - 0.5) * 6, plates: [0, 1, 2].map((q) => q % inks.length), seed: hash(seed, 'keep') % 1e5 };
    page.objects.push(keep);
  }
  // the press dreams: a thin sheet gets the dream's own objects stamped again
  if (opts.dream && issue.dream && page.objects.length < 3) {
    const have = new Set(page.objects.map((o) => o.key));
    const want = parse(issue.dream).objs.filter((k) => !have.has(k));
    for (const k of shuffle(r, want).slice(0, 3 - page.objects.length)) {
      const d = makeStamp(page, k, 24 + r() * 100, 50 + r() * 120, 0.85, hash(seed, k) % 1e6);
      d.s *= 0.8;
      page.objects.push(d);
      memo.tags.push({ id: d.id, tag: 'dreamed again' });
    }
  }
  // set-off: a faint mirrored ghost of the previous page
  page.setoff = prev.objects.filter((o) => !o.fx && o.kind !== 'helper').map((o) => ({ ...o, id: newId() }));
  // layout template, then drift cards; never the same template twice in a row; the full-bleed wash is rarer;
  // gentle memory keeps to the calm templates (no huge close-ups)
  const calm = memory === 'gentle' ? ['closeup', 'wash', 'softtype'] : [];
  const opts2 = LAYOUTS.filter((l) => l !== prev.layout && !calm.includes(l) && (l !== 'wash' || r() < 0.45));
  const layout: Layout = pick(r, opts2);
  page.layout = layout;
  applyLayout(layout, page, r, keep?.id);
  const { cards, k } = drawCards(r, n, driftKnob * M.drift);
  for (const c of cards) applyCard(c, { r, page, k, earlier: issue.pages.slice(0, -1), lang: issue.lang });
  page.drift = [...new Set([...page.drift, ...cards])] as Card[];
  page.driftK = k;
  seal();
  // what came out of the drum, compared with what went in
  for (const [id, w] of was) { const o = page.objects.find((q) => q.id === id); if (o) memo.tags.push({ id, tag: describeMemory(o, w), src: w.id }); }
  if (keep && page.objects.includes(keep)) memo.tags.push({ id: keep.id, tag: 'keepsake · larger', src: prev.objects.find((o) => o.key === issue.keepsake && !o.fx)?.id });
  refreshText(issue, page);
  page.origin = JSON.stringify(stripOrigin(page));
  return page;
}

/** "Reprint this page": back to how it came out of the drum. */
export function reprint(page: Page): Page {
  if (!page.origin) return page;
  const o = JSON.parse(page.origin) as Page;
  return { ...o, origin: page.origin, printed: false, platesPrinted: 0 };
}

/** Coverage per plate (0..1) roughly, to drain the vials. */
export function inkUse(page: Page): number[] {
  const use = page.inks.map(() => 0.1);
  for (const o of page.objects) for (const p of new Set(o.plates)) if (use[p] !== undefined) use[p] += (o.s / PAGE_W) * 0.25;
  return use.map((u) => clamp(u));
}
