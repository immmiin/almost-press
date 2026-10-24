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

// Pages 1–8 are re-art-directed (revision 01): larger objects, extreme scale contrast, stronger bokashi bands, a
// vertical Japanese line as the axis of each page, and from page 3 on one tool effect already visible. They stay
// crisper than 9–16, but each works as a poster. They use the revision-01 tool gains (fxv 2); 9–16 keep theirs.
const R01 = { fxv: 2 } as const;
// 2 · Crisp kitchen: a huge table cropped by the bottom edge, a big teacup and toast, one tiny wall clock high on
// a peach wall band, the time running down the left as a vertical line. Peach Mist. No tool yet: crisp.
pages.push(page(2, ['forange', 'lmauve', 'seafoam'], 'rice', [
  o('clock', 112, 44, 13, { plates: P(2, 0, 1) }),
  o('table', 76, 164, 168),
  o('teacup', 50, 126, 62, { plates: P(1, 0, 2) }),
  o('toast', 108, 128, 42, { plates: P(0, 2, 1) }),
  helper('vja', '台所・六時四十分', 18, 74, 9.5, { plates: P(2, 0, 1) }),
  ins('the kitchen at 6:40\nsweep the floor', 96, 58, 30),
  seal(130, 191, 9, 2, 5),
], [st('bokashi', line(-0.05, 0.02, 1.05, 0.02, 8), 0.12, 0.55, { plate: 0 }), st('bokashi', line(-0.05, 0.3, 1.05, 0.31, 8), 0.12, 0.75, { plate: 1 })], { mis: 0.28, ...R01 }));

// 3 · A swan sits at the table, enormous; the clock is a little bigger; the first vertical Japanese line is the
// page's axis; ink blooms (滲) where the swan sits.
pages.push(page(3, ['forange', 'lmauve', 'seafoam'], 'rice', [
  o('clock', 118, 40, 22, { plates: P(2, 0, 1) }),
  o('table', 98, 186, 126),
  o('swan', 58, 118, 122, { flip: true, plates: P(1, 2, 0) }),
  o('teacup', 116, 142, 18, { plates: P(1, 0, 2) }),
  helper('vja', '白鳥が台所にいる', 137, 104, 11, { plates: P(2, 0, 1) }),
  ins('someone was already\nsitting there', 12, 182, 28),
  seal(124, 192, 9, -6, 7),
], [st('bokashi', line(-0.05, 0.02, 1.05, 0.02, 8), 0.14, 0.65, { plate: 1 }), st('bokashi', line(-0.05, 0.12, 1.05, 0.13, 8), 0.07, 0.5, { plate: 2 }),
  st('bleed', line(0.16, 0.74, 0.62, 0.75, 8), 0.07, 0.9)], { mis: 0.32, ...R01 }));

// 4 · The clock is as big as a house and runs off every edge; a table the size of a crumb; ink blooms (滲) from
// the rim into the floor; 遅れた (late) as a heavy block across the foot.
pages.push(page(4, ['fpink', 'orchid', 'mint'], 'horizon', [
  o('clock', 72, 90, 196, { plates: P(1, 2, 0) }),
  o('table', 128, 176, 20, { plates: P(1, 0, 2) }),
  helper('hangul', '遅れた', 70, 168, 120, { plates: P(0, 1, 2), r: -3 }),
  helper('vja', '家ほど大きい時計', 9, 78, 6.5, { plates: P(2, 0, 1) }),
  ins('p.04 · late\n遅れた', 104, 22, 24),
  seal(134, 193, 9, 4, 9),
], [st('bokashi', line(-0.05, 0.02, 1.05, 0.02, 8), 0.16, 0.7, { plate: 0 }),
  st('bleed', line(0.08, 0.68, 0.92, 0.71, 10), 0.09, 1), st('bleed', [[0.32, 0.76], [0.62, 0.79]], 0.07, 0.9, { plate: 0 })], { seed: 1188, mis: 0.38, ...R01 }));

// 5 · The floor is a pool under a heavy celadon bokashi; a ladder too big for the page; the swan a speck afloat;
// the water ripples (波).
pages.push(page(5, ['seafoam', 'llime', 'sky'], 'pool', [
  o('ladder', 130, 122, 132, { plates: P(2, 0, 1) }),
  o('clock', 46, 62, 74, { plates: P(0, 2, 1), opacity: 0.9 }),
  o('swan', 58, 150, 26, { plates: P(1, 2, 0) }),
  helper('vja', '水はぬるかった', 13, 120, 8, { plates: P(2, 0, 1) }),
  ins('the water was warm\nlate for a swim', 84, 26, 30),
  seal(128, 192, 9, -2, 11),
], [st('bokashi', line(-0.05, 0.06, 1.05, 0.06, 8), 0.22, 0.85, { plate: 0 }), st('bokashi', line(-0.05, 0.41, 1.05, 0.43, 8), 0.1, 0.7, { plate: 1 }),
  st('wave', line(0.04, 0.74, 0.78, 0.75, 8), 0.1, 0.75)], { seed: 1221, mis: 0.4, ...R01 }));

// 6 · Mist (霞): the stairs rise off the top edge into fog; twelve swans recede from one crisp and large in front to
// the last a washed-out speck at the foot of the stairs.
const swans6: PageObj[] = Array.from({ length: 12 }, (_, i) => {
  const k = i / 11;
  return o('swan', 28 + k * 64 + Math.sin(k * Math.PI * 2.2) * 26, 186 - k * 80, 50 * Math.pow(1 - k, 1.6) + 6, { opacity: 1 - k * 0.66, blur: k * 0.8, plates: P(1, 2, 0), flip: i % 3 === 1 });
});
pages.push(page(6, ['seafoam', 'cornflower', 'llime'], 'horizon', [
  o('stairs', 98, 66, 146, { plates: P(1, 0, 2) }),
  o('clock', 126, 24, 34, { opacity: 0.55, blur: 0.5, plates: P(0, 1, 2) }),
  ...swans6,
  helper('vja', '十二羽の白鳥', 11, 70, 8.5, { plates: P(2, 0, 1) }),
  ins('twelve of them', 14, 22, 22),
  seal(132, 193, 9, 3, 13),
], [
  st('haze', line(0.35, 0.16, 0.98, 0.32, 6), 0.2, 0.95), st('haze', line(0.1, 0.44, 0.95, 0.48, 6), 0.13, 0.7),
  st('bokashi', line(-0.05, 0.38, 1.05, 0.4, 8), 0.14, 0.7, { plate: 2 }), st('bokashi', line(-0.05, 0.02, 1.05, 0.02, 8), 0.12, 0.55, { plate: 0 }),
], { seed: 1259, mis: 0.42, ...R01 }));

// 7 · Haze (霞): the whole kitchen goes soft-focus — a clock too big for the wall, a chair, a cup, a swan; only the
// tiny mono labels stay sharp around the shapes.
pages.push(page(7, ['seafoam', 'cornflower', 'llime'], 'rice', [
  o('clock', 90, 48, 136, { plates: P(2, 0, 1) }),
  o('table', 72, 170, 124),
  o('chair', 20, 158, 58, { plates: P(1, 2, 0) }),
  o('teacup', 52, 132, 18, { plates: P(1, 0, 2) }),
  o('swan', 128, 152, 42, { plates: P(1, 2, 0) }),
  helper('vja', 'ぼやけた台所', 141, 104, 6.4, { plates: P(2, 0, 1) }),
  ins('table · 机', 62, 188, 20), ins('cup', 44, 118, 6),
  ins('clock · 時計', 104, 12, 18), ins('chair', 6, 124, 7), ins('swan?', 118, 126, 8),
  seal(132, 193, 9, -3, 15),
], [st('haze', line(0.05, 0.22, 0.95, 0.27, 10), 0.24, 0.9), st('haze', line(0.05, 0.66, 0.95, 0.74, 10), 0.24, 0.9), st('haze', line(0.1, 0.46, 0.9, 0.46, 8), 0.18, 0.7),
  st('bokashi', line(-0.05, 0.56, 1.05, 0.57, 8), 0.12, 0.6, { plate: 2 })], { seed: 1296, mis: 0.45, ...R01 }));

// 8–9 · Spread: the horizon stands vertical; everything ghosted double; giant vertical Japanese across both. Wisteria.
const ghostPair = (b: PageObj, dx: number, dy: number): PageObj[] => [b, { ...b, id: id(), x: b.x + dx, y: b.y + dy, opacity: 0.38, seed: b.seed + 1 }];
pages.push(page(8, ['violet', 'lmauve', 'mint'], 'rice', [
  ...ghostPair(o('table', 80, 66, 104, { r: -90, plates: P(1, 0, 2) }), 7, -6),
  ...ghostPair(o('swan', 86, 156, 70, { r: -90, plates: P(1, 2, 0) }), -6, 7),
  helper('vja', '時計が', 131, 100, 32, { plates: P(0, 1, 2) }),
  ins('the floor is a wall now', 10, 188, 30),
  seal(18, 26, 9, -8, 17),
], [st('bokashi', line(0.86, -0.05, 0.86, 1.05, 14), 0.07, 0.75, { plate: 1 }), st('bokashi', line(0.62, -0.05, 0.62, 1.05, 14), 0.04, 0.45, { plate: 2 }),
  st('haze', line(0.5, 0.6, 0.62, 0.92, 6), 0.12, 0.8)], { seed: 1333, mis: 0.5, ...R01 }));
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
// (on the re-art-directed pages the ghost stays a whisper, so the huge objects before don't take the page over)
for (let i = 1; i < pages.length; i++) pages[i].setoff = pages[i - 1].objects.filter((q) => q.kind !== 'helper' && !q.fx).map((q) => ({ ...q, id: id(), ...(i <= 7 ? { opacity: (q.opacity ?? 1) * 0.55 } : {}) }));
// page 14: ghosts of earlier pages too
// (page 14 stays exactly as it was: its ghosts are pages 3 and 7 as they were first drawn, before revision 01)
const ghost3: PageObj[] = [o('clock', 100, 52, 24, { plates: P(2, 0, 1) }), o('table', 72, 152, 60), o('swan', 46, 134, 34, { flip: true, plates: P(1, 2, 0) }), o('teacup', 82, 126, 14, { plates: P(1, 0, 2) })];
const ghost7: PageObj[] = [o('table', 72, 148, 76), o('teacup', 56, 116, 20, { plates: P(1, 0, 2) }), o('clock', 96, 58, 62, { plates: P(2, 0, 1) }), o('chair', 30, 150, 40, { plates: P(1, 2, 0) }), o('swan', 118, 140, 34, { plates: P(1, 2, 0) })];
pages[13].setoff = [...(pages[13].setoff ?? []), ...ghost3.map((q) => ({ ...q, id: id(), opacity: 1.6 })), ...ghost7.map((q) => ({ ...q, id: id(), opacity: 1.2 }))];

const issue: Issue = {
  id: 'issue-01', seed: 1, lang: 'en', fixed: true, bound: true, keepsake: 'clock', keepsakeS: 26, current: 15, forgotten: [],
  dream: 'I was late for a swim, but the pool was in my grandmother’s kitchen and the clock kept getting bigger.',
  pages,
};
writeFileSync('src/issues/issue-01.json', JSON.stringify(issue, null, 1));
console.log('issue-01.json', pages.length, 'pages');
