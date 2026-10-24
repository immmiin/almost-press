// Builds src/issues/issue-01.json — Issue 01, art-directed page by page, in the editor's own data model
// (objects, strokes, inks, seeds). Run: node scripts/run-ts.mjs ./scripts/build-issue-01.ts
import { writeFileSync } from 'node:fs';
import type { Issue, Page, PageObj, Stroke, GroundId } from '../src/model/types';
import type { ToolId } from '../src/press/toolDefs';

let uid = 0;
const id = () => 'a' + (uid++).toString(36);
const P = (...p: number[]) => p;
function o(key: string, x: number, y: number, s: number, ex: Partial<PageObj> = {}): PageObj {
  return { id: id(), kind: 'obj', key, x, y, s, r: 0, plates: [0, 1, 2], seed: 11 + uid * 7, ...ex };
}
function word(w: string, x: number, y: number, s: number, style: number, ex: Partial<PageObj> = {}): PageObj {
  return { id: id(), kind: 'word', key: w, style, x, y, s, r: 0, plates: [0, 1, 2], seed: 5 + uid, ...ex };
}
function helper(key: string, text: string, x: number, y: number, s: number, ex: Partial<PageObj> = {}): PageObj {
  return { id: id(), kind: 'helper', key, text, x, y, s, r: 0, plates: [0, 1, 2], seed: 3 + uid * 13, ...ex };
}
/** Inscription placed by its top-left corner (helpers are positioned by their centre). */
function ins(text: string, left: number, top: number, s: number, ex: Partial<PageObj> = {}): PageObj {
  const lines = text.split('\n');
  const bw = Math.max(40, Math.max(...lines.map((l) => l.length)) * 4.4), bh = lines.length * 9 + 2;
  const k = s / bw;
  return helper('inscription', text, left + s / 2, top + (bh * k) / 2, s, ex);
}
const seal = (x = 128, y = 189, s = 10, r = -3, seed = 3) => helper('seal', '殆', x, y, s, { r, seed });
function st(tool: ToolId, pts: [number, number][], size: number, intensity: number, ex: Partial<Stroke> = {}): Stroke {
  return { tool, pts, size, intensity, seed: 100 + uid++, ...ex };
}
const line = (u0: number, v0: number, u1: number, v1: number, n = 6): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => [u0 + (u1 - u0) * i / n, v0 + (v1 - v0) * i / n]);
function page(n: number, inks: string[], ground: GroundId, objects: PageObj[], strokes: Stroke[] = [], ex: Partial<Page> = {}): Page {
  return { n, inks, ground, objects, strokes, mis: 0.3, density: 0.82, grain: 0.55, seed: 1000 + n * 37, printed: true, platesPrinted: inks.length, drift: [], layout: 'art-directed', ...ex };
}

const pages: Page[] = [];

// 1 · Cover. Vast rice paper, bokashi peach band at the top, the press's name in three scripts (ALMOST PRESS wide and
// flat, 거의 인쇄소 as a heavy block, ほぼ印刷所 vertical), the issue number on a second small seal, a small crisp clock. Dawn.
pages.push(page(1, ['forange', 'mint', 'lmauve'], 'rice', [
  helper('title', '', 72, 100, 128, { plates: P(1, 0, 2) }),
  o('clock', 30, 170, 22, { plates: P(2, 1, 0), r: -4 }),
  helper('stretch', 'ISSUE #0001', 96, 176, 62, { plates: P(0, 1, 2) }),
  ins('16pp · A5 · risograph · 3 inks\nseed #0001 · dawn → moonlight', 66, 186, 44),
  helper('date', '二〇二六', 141, 52, 3.4),
  helper('issueSeal', '0001', 112, 22, 9, { r: 3, seed: 5 }),
  seal(130, 22, 13, -4, 3),
], [st('bokashi', line(-0.05, 0.03, 1.05, 0.03, 8), 0.15, 0.3, { plate: 0 }), st('bokashi', line(-0.05, 0.09, 1.05, 0.09, 8), 0.1, 0.25, { plate: 2 })], { mis: 0.25, grain: 0.5 }));

// 2 · Crisp kitchen: table, teacup, toast, a small wall clock, lots of empty space, a tiny inscription. Peach Mist.
pages.push(page(2, ['forange', 'lmauve', 'seafoam'], 'rice', [
  o('clock', 104, 58, 16, { plates: P(2, 0, 1) }),
  o('table', 70, 150, 58),
  o('teacup', 58, 124, 15, { plates: P(1, 0, 2) }),
  o('toast', 82, 124, 14, { plates: P(0, 2, 1) }),
  ins('the kitchen at 6:40\nsweep the floor', 16, 34, 24),
  seal(130, 190, 9, 2, 5),
], [], { mis: 0.28 }));

// 3 · A swan sits at the table. First vertical Japanese line. The clock is a bit bigger.
pages.push(page(3, ['forange', 'lmauve', 'seafoam'], 'rice', [
  o('clock', 100, 52, 24, { plates: P(2, 0, 1) }),
  o('table', 72, 152, 60),
  o('swan', 46, 134, 34, { flip: true, plates: P(1, 2, 0) }),
  o('teacup', 82, 126, 14, { plates: P(1, 0, 2) }),
  helper('vja', '白鳥が台所にいる', 134, 96, 7.2, { plates: P(2, 0, 1) }),
  ins('someone was already\nsitting there', 14, 180, 26),
  seal(124, 190, 9, -6, 7),
], [], { mis: 0.32 }));

// 4 · The clock is as big as a house; ink blooms from its rim into the floor. A heavy block: 遅れた (late). Dawn.
pages.push(page(4, ['fpink', 'orchid', 'mint'], 'horizon', [
  o('clock', 78, 98, 128, { plates: P(1, 2, 0) }),
  o('table', 112, 172, 30, { plates: P(1, 0, 2) }),
  helper('hangul', '遅れた', 52, 182, 60, { plates: P(0, 1, 2), r: -3 }),
  ins('p.04 · late\n遅れた', 108, 24, 24),
  seal(132, 192, 9, 4, 9),
], [st('bleed', line(0.2, 0.74, 0.86, 0.76, 10), 0.1, 0.95), st('bleed', [[0.32, 0.8], [0.6, 0.82]], 0.07, 0.8, { plate: 0 })], { seed: 1188, mis: 0.38 }));

// 5 · The floor turns into pool tiles under a celadon bokashi; the swan floats; a ladder. Celadon.
pages.push(page(5, ['seafoam', 'llime', 'sky'], 'pool', [
  o('ladder', 118, 136, 44, { plates: P(2, 0, 1) }),
  o('swan', 62, 150, 40, { plates: P(1, 2, 0) }),
  o('clock', 40, 60, 52, { plates: P(0, 2, 1), opacity: 0.9 }),
  ins('the water was warm\n水はぬるかった', 92, 36, 30),
  seal(128, 191, 9, -2, 11),
], [st('bokashi', line(-0.05, 0.1, 1.05, 0.1, 8), 0.18, 0.55, { plate: 0 }), st('bokashi', line(-0.05, 0.4, 1.05, 0.42, 8), 0.1, 0.5, { plate: 1 })], { seed: 1221, mis: 0.4 }));

// 6 · Mist: stairs rise into fog; twelve swans fade from crisp to washed out.
// one stream of swans receding toward the stairs: crisp and large in front, smaller, fainter and hazier into the fog
const swans6: PageObj[] = Array.from({ length: 12 }, (_, i) => {
  const k = i / 11;
  return o('swan', 22 + k * 76 + Math.sin(k * Math.PI * 2.2) * 30, 184 - k * 70, 21 - k * 12, { opacity: 1 - k * 0.62, blur: k * 0.7, plates: P(1, 2, 0), flip: i % 3 === 1 });
});
pages.push(page(6, ['seafoam', 'cornflower', 'llime'], 'horizon', [
  o('stairs', 94, 74, 78, { plates: P(1, 0, 2) }),
  o('clock', 118, 30, 40, { opacity: 0.6, plates: P(0, 1, 2) }),
  ...swans6,
  ins('twelve of them\n十二羽', 14, 30, 22),
  seal(132, 192, 9, 3, 13),
], [
  st('haze', line(0.4, 0.2, 0.95, 0.34, 6), 0.2, 0.95), st('haze', line(0.1, 0.42, 0.95, 0.46, 6), 0.14, 0.7),
  st('haze', line(0.5, 0.66, 1.0, 0.7, 6), 0.12, 0.6), st('bokashi', line(-0.05, 0.38, 1.05, 0.4, 8), 0.12, 0.32, { plate: 2 }),
], { seed: 1259, mis: 0.42 }));

// 7 · Haze: the whole kitchen soft-focus; only tiny mono labels stay sharp around the shapes.
pages.push(page(7, ['seafoam', 'cornflower', 'llime'], 'rice', [
  o('table', 72, 148, 76),
  o('teacup', 56, 116, 20, { plates: P(1, 0, 2) }),
  o('clock', 96, 58, 62, { plates: P(2, 0, 1) }),
  o('chair', 30, 150, 40, { plates: P(1, 2, 0) }),
  o('swan', 118, 140, 34, { plates: P(1, 2, 0) }),
  ins('table · 机', 60, 176, 22), ins('cup', 42, 104, 6),
  ins('clock · 時計', 112, 24, 16), ins('chair', 14, 126, 7), ins('swan?', 112, 118, 8),
  seal(132, 192, 9, -3, 15),
], [st('haze', line(0.05, 0.25, 0.95, 0.3, 10), 0.3, 1), st('haze', line(0.05, 0.6, 0.95, 0.7, 10), 0.3, 1), st('haze', line(0.1, 0.45, 0.9, 0.45, 8), 0.22, 0.8)], { seed: 1296, mis: 0.45 }));

// 8–9 · Spread: the horizon stands vertical; everything ghosted double; giant vertical Japanese across both. Wisteria.
const ghostPair = (b: PageObj, dx: number, dy: number): PageObj[] => [b, { ...b, id: id(), x: b.x + dx, y: b.y + dy, opacity: 0.38, seed: b.seed + 1 }];
pages.push(page(8, ['violet', 'lmauve', 'mint'], 'rice', [
  ...ghostPair(o('table', 96, 70, 56, { r: -90, plates: P(1, 0, 2) }), 6, -5),
  ...ghostPair(o('swan', 104, 150, 40, { r: -90, plates: P(1, 2, 0) }), -5, 6),
  helper('vja', '時計が', 136, 82, 22, { plates: P(0, 1, 2) }),
  ins('the floor is a wall now', 12, 184, 28),
  seal(18, 30, 9, -8, 17),
], [st('bokashi', line(0.86, -0.05, 0.86, 1.05, 14), 0.05, 0.45, { plate: 1 }), st('haze', line(0.6, 0.2, 0.6, 0.8, 6), 0.1, 0.75)], { seed: 1333, mis: 0.5 }));
pages.push(page(9, ['violet', 'lmauve', 'mint'], 'rice', [
  ...ghostPair(o('clock', 52, 78, 70, { r: -90, plates: P(2, 0, 1) }), 6, 5),
  ...ghostPair(o('teacup', 40, 156, 22, { r: -90, plates: P(1, 0, 2) }), 5, -4),
  helper('vja', '大きくなる', 12, 104, 22, { plates: P(0, 1, 2) }),
  ins('and bigger', 96, 30, 16),
  seal(128, 191, 9, 5, 19),
], [st('bokashi', line(0.1, -0.05, 0.1, 1.05, 14), 0.05, 0.45, { plate: 1 }), st('haze', line(0.4, 0.2, 0.4, 0.8, 6), 0.1, 0.75)], { seed: 1370, mis: 0.5 }));

// 10 · Wave: the room tears into horizontal waves; the clock face ripples like water.
pages.push(page(10, ['violet', 'fpink', 'mint'], 'checker', [
  o('clock', 74, 84, 96, { plates: P(2, 0, 1) }),
  o('table', 50, 160, 50),
  o('swan', 112, 164, 30, { plates: P(1, 2, 0) }),
  helper('stretch', 'LATE', 74, 30, 60, { plates: P(1, 0, 2) }),
  seal(130, 192, 9, -2, 21),
], [st('wave', line(0.1, 0.4, 0.9, 0.42, 8), 0.24, 1), st('wave', line(0.05, 0.72, 0.95, 0.76, 8), 0.16, 0.7), st('wave', line(0.2, 0.14, 0.8, 0.14, 6), 0.08, 0.5)], { seed: 1407, mis: 0.55 }));

// 11 · Pour: the stairs pour down as a luminous pixel-sorted waterfall, fluorescent on pale lilac (Senju).
pages.push(page(11, ['fpink', 'lmauve', 'aqua'], 'wash', [
  o('stairs', 76, 46, 104, { plates: P(0, 2, 1) }),
  o('swan', 104, 176, 22, { plates: P(2, 1, 0), opacity: 0.8 }),
  helper('vja', '流れる', 136, 60, 6.4, { plates: P(0, 1, 2) }),
  seal(18, 190, 9, 6, 23),
], [st('pour', line(0.12, 0.3, 0.88, 0.3, 10), 0.2, 1), st('pour', line(0.25, 0.42, 0.8, 0.42, 8), 0.14, 0.9), st('bleed', [[0.5, 0.95]], 0.18, 0.6, { plate: 2 })], { seed: 1444, mis: 0.5, density: 0.9 }));

// 12 · Break: objects turn into their names and the names break into soft datamosh blocks.
pages.push(page(12, ['violet', 'forange', 'mint'], 'rice', [
  word('chair', 46, 50, 70, 1, { r: -4 }), word('いす', 104, 72, 50, 0, { plates: P(1, 0, 2) }), word('椅子', 58, 104, 52, 2, { plates: P(2, 1, 0) }),
  word('clock', 98, 130, 66, 3), word('時計', 40, 152, 44, 5, { plates: P(1, 2, 0) }), word('白鳥', 104, 170, 44, 4, { plates: P(2, 0, 1) }),
  o('teacup', 128, 32, 16),
  seal(130, 194, 9, 2, 25),
], [st('break', line(0.1, 0.3, 0.9, 0.36, 8), 0.2, 1), st('break', line(0.2, 0.64, 0.95, 0.8, 8), 0.2, 0.9), st('wave', line(0.0, 0.5, 1.0, 0.5, 6), 0.06, 0.4)], { seed: 1481, mis: 0.6 }));

// 13 · Tube: a glowing white swan silhouette with scanlines on a pale moonwater wash; "白鳥 in the 台所". Moonwater.
pages.push(page(13, ['cornflower', 'orchid', 'llime'], 'wash', [
  o('swan', 74, 110, 116, { fx: 'hole', plates: P(0, 1, 2) }),
  o('clock', 116, 40, 26, { opacity: 0.5, plates: P(1, 0, 2) }),
  helper('stretch', '白鳥 in the 台所', 74, 176, 92, { plates: P(1, 0, 2) }),
  seal(128, 194, 9, -5, 27),
], [st('tube', line(0.1, 0.5, 0.9, 0.5, 6), 0.42, 1), st('bokashi', line(-0.05, 0.06, 1.05, 0.06, 8), 0.12, 0.35, { plate: 1 })], { seed: 1518, mis: 0.55, groundPlate: 0 }));

// 14 · Echo + ink starvation: the clock repeats into itself; streaks; misregistration; ghosts of earlier pages.
pages.push(page(14, ['cornflower', 'orchid', 'llime'], 'rice', [
  o('clock', 74, 96, 120, { plates: P(1, 0, 2) }),
  ins('again · また', 14, 182, 24),
  seal(126, 190, 9, 8, 29),
], [st('echo', [[0.5, 0.44], [0.56, 0.46]], 0.26, 1), st('pour', line(0.1, 0.7, 0.9, 0.7, 6), 0.08, 0.5)], { seed: 1555, mis: 1.4, drift: ['ink-starve', 'misregister-spike'] }));

// 15 · Melt: everything dissolves into a wet abstract painting with floating dot patterns (Purcell); a faint clock circle remains.
pages.push(page(15, ['cornflower', 'fpink', 'llime', 'lmauve'], 'wash', [
  o('clock', 72, 92, 112, { opacity: 0.35, plates: P(0, 3, 2) }),
  o('swan', 50, 150, 50, { plates: P(1, 2, 0) }),
  o('table', 104, 150, 56, { plates: P(2, 1, 0) }),
  o('stairs', 110, 60, 46, { plates: P(1, 0, 2) }),
  // dot patterns floating over the washes (Purcell)
  helper('dots', '', 36, 58, 58, { plates: P(0, 1, 2), seed: 41 }),
  helper('dots', '', 118, 112, 44, { plates: P(1, 0, 2), seed: 57 }),
  helper('dots', '', 58, 172, 40, { plates: P(0, 1, 2), seed: 73, r: 18 }),
  helper('dots', '', 128, 30, 26, { plates: P(1, 0, 2), seed: 89 }),
  seal(130, 193, 9, -3, 31),
], [st('melt', line(0.1, 0.3, 0.9, 0.4, 8), 0.3, 1), st('melt', line(0.1, 0.7, 0.9, 0.75, 8), 0.3, 1), st('bleed', line(0.2, 0.5, 0.8, 0.55, 6), 0.2, 0.9), st('bokashi', line(-0.05, 0.92, 1.05, 0.9, 8), 0.14, 0.45, { plate: 3 })], { seed: 1592, mis: 0.7 }));

// 16 · Back cover: luminous abstraction, one seal, colophon in tiny type.
pages.push(page(16, ['cornflower', 'fpink', 'llime', 'lmauve'], 'wash', [
  o('clock', 74, 80, 70, { opacity: 0.18, plates: P(0, 3, 2) }),
  ins('ALMOST PRESS · Issue #0001 · seed #0001\n\n“I was late for a swim, but the pool was in my grandmother’s kitchen\nand the clock kept getting bigger.”\ninks: fluorescent orange, mint, light mauve, light lime, seafoam, sky blue,\ncornflower, orchid, violet, fluorescent pink, aqua\ndrift: bleed, mist, haze, horizon, wave, pour, break, tube, echo, melt\nALMOST PRESS · 거의 인쇄소 · ほぼ印刷所', 12, 160, 100),
  seal(74, 128, 16, -2, 33),
], [st('melt', line(0.1, 0.4, 0.9, 0.45, 8), 0.34, 1), st('bokashi', line(-0.05, 0.1, 1.05, 0.12, 8), 0.18, 0.4, { plate: 3 }), st('bleed', [[0.5, 0.4]], 0.3, 0.8, { plate: 2 }), st('melt', line(0.2, 0.7, 0.8, 0.66, 6), 0.2, 0.8)], { seed: 1629, mis: 0.6, groundPlate: 0 }));

// set-off: each page carries a faint mirrored ghost of the one before
for (let i = 1; i < pages.length; i++) pages[i].setoff = pages[i - 1].objects.filter((q) => q.kind !== 'helper' && !q.fx).map((q) => ({ ...q, id: id() }));
// page 14: ghosts of earlier pages too
pages[13].setoff = [...(pages[13].setoff ?? []), ...pages[2].objects.filter((q) => q.kind === 'obj').map((q) => ({ ...q, id: id(), opacity: 1.6 })), ...pages[6].objects.filter((q) => q.kind === 'obj').map((q) => ({ ...q, id: id(), opacity: 1.2 }))];

const issue: Issue = {
  id: 'issue-01', seed: 1, lang: 'en', fixed: true, bound: true, keepsake: 'clock', keepsakeS: 26, current: 15, forgotten: [],
  dream: 'I was late for a swim, but the pool was in my grandmother’s kitchen and the clock kept getting bigger.',
  pages,
};
writeFileSync('src/issues/issue-01.json', JSON.stringify(issue, null, 1));
console.log('issue-01.json', pages.length, 'pages');
