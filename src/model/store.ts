// The current issue: created from a seed, persisted to localStorage, observable.
import type { Issue, Page, PageObj } from './types';
import { PRESETS } from '../design/tokens';
import { rng, hash } from '../core/rng';

const KEY = 'ap.issue.v1';
const listeners = new Set<(why: string) => void>();
let issue: Issue | null = null;
let saveT = 0;

export const onIssue = (f: (why: string) => void) => { listeners.add(f); return () => listeners.delete(f); };
export function emit(why = 'change') {
  listeners.forEach((f) => f(why));
  clearTimeout(saveT);
  saveT = window.setTimeout(save, 400);
}
function save() {
  if (!issue || issue.fixed) return;
  try { localStorage.setItem(KEY, JSON.stringify(issue)); } catch { /* storage full: keep running */ }
}

let uid = Date.now() % 100000;
export const newId = () => 'o' + (uid++).toString(36);

export function blankPage(n: number, seed: number, inks = PRESETS[0].inks.slice()): Page {
  return { n, inks, ground: n === 1 ? 'bokashi' : 'rice', objects: [], strokes: [], mis: 0.35, density: 0.8, grain: 0.55, seed: hash(seed, n) % 100000, printed: false, platesPrinted: 0, drift: [], trail: [] };
}

export function newIssue(seed = Math.floor(Math.random() * 10000), dream = ''): Issue {
  const r = rng(seed);
  const preset = PRESETS[Math.floor(r() * 5)];
  const first = blankPage(1, seed, preset.inks.slice());
  // page 1 arrives with the seal and a tiny inscription; everything else is stamped by hand
  first.objects.push(
    { id: newId(), kind: 'helper', key: 'seal', text: '殆', x: 128, y: 188, s: 11, r: (r() - 0.5) * 6, plates: [0, 1, 2], seed: seed % 997 },
    { id: newId(), kind: 'helper', key: 'inscription', text: `ALMOST PRESS · issue #${String(seed).padStart(4, '0')}\nほぼ印刷所 · 十六頁`, x: 26, y: 187, s: 30, r: 0, plates: [0, 1, 2], seed: 2 },
  );
  const is: Issue = { id: 'i' + seed + '-' + Date.now().toString(36), seed, dream, lang: 'en', pages: [first], current: 0, forgotten: [] };
  first.origin = JSON.stringify(stripOrigin(first));
  return is;
}
export function stripOrigin(p: Page) { const { origin: _o, ...rest } = p; void _o; return rest; }

export function getIssue(): Issue {
  if (issue) return issue;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { issue = migrate(JSON.parse(raw) as Issue); return issue; }
  } catch { /* corrupted: start over */ }
  issue = newIssue();
  return issue;
}
/** Issues saved before revision 01 carried the old zine title on page 1 and Korean numerals in the slug. */
function migrate(is: Issue): Issue {
  for (const p of is.pages) {
    for (const o of p.objects) if (o.kind === 'helper' && o.key === 'inscription' && /almost remember/i.test(o.text ?? '')) o.text = `ALMOST PRESS · issue #${String(is.seed).padStart(4, '0')}\nほぼ印刷所 · 十六頁`;
    p.slug = undefined; p.dreamLine = undefined;
  }
  return is;
}
export function setIssue(i: Issue) { issue = i; emit('issue'); }
export function currentPage(): Page { const i = getIssue(); return i.pages[i.current]; }
export function forget(objs: PageObj[]) { getIssue().forgotten.push(...objs.map((o) => ({ ...o, fx: undefined, opacity: 1 }))); emit('forgotten'); }
export const ISSUE_NO = (i: Issue) => '#' + String(i.seed).padStart(4, '0');
/** An issue is named only by the press and its number. */
export const issueName = (i: Pick<Issue, 'seed'>) => `ALMOST PRESS · Issue #${String(i.seed).padStart(4, '0')}`;
