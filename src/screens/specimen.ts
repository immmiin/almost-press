// Hidden engine specimen: #/specimen — a page through the full pipeline, its plates, and all 100 objects.
import { pipeline } from '../riso/pipeline';
import { KEYS, OBJ } from '../objects';
import type { Page, PageObj } from '../model/types';
import { PRESETS } from '../design/tokens';
import { onFontsLoaded } from '../type/outlines';

export function samplePage(): Page {
  const o = (key: string, x: number, y: number, s: number, extra: Partial<PageObj> = {}): PageObj => ({ id: key + x, kind: 'obj', key, x, y, s, r: 0, plates: [0, 1, 2], seed: x | 0, ...extra });
  return {
    n: 3, inks: PRESETS[4].inks, ground: 'pool', mis: 0.5, density: 0.8, grain: 0.6, seed: 427, printed: false, platesPrinted: 0, drift: [],
    objects: [o('table', 74, 150, 70), o('teacup', 66, 118, 20), o('clock', 110, 60, 38), o('swan', 40, 150, 40, { flip: true }),
      { id: 'w', kind: 'word', key: 'grandma', style: 0, x: 74, y: 30, s: 80, r: -4, plates: [0, 1, 2], seed: 3 },
      { id: 'v', kind: 'helper', key: 'vja', text: '白鳥のいる台所', x: 136, y: 70, s: 6, r: 0, plates: [1, 0, 2], seed: 1 },
      { id: 'i', kind: 'helper', key: 'inscription', text: 'sweep the floor\nmop the floor', x: 30, y: 100, s: 28, r: 0, plates: [0, 1, 2], seed: 1 },
      { id: 'sl', kind: 'helper', key: 'seal', text: '殆', x: 130, y: 186, s: 11, r: 3, plates: [0, 1, 2], seed: 5 }],
    strokes: [], dreamLine: 'I was late for a swim, but the pool was in my grandmother’s kitchen', slug: 'p.03 · 三 · forange/lmauve/seafoam · mis 0.5 · #0427 · dawn',
  };
}

import { loadIssue } from '../issues/load';
export default async function specimen(root: HTMLElement) {
  const qq = new URLSearchParams(location.hash.split('?')[1] ?? '');
  if (qq.get('issue')) {
    const is = await loadIssue(qq.get('issue')!);
    const from = +(qq.get('from') ?? 1), to = +(qq.get('to') ?? 16), w = +(qq.get('w') ?? 330);
    root.innerHTML = `<main style="padding:10px;display:flex;flex-wrap:wrap;gap:10px"></main>`;
    const m = root.querySelector('main')!;
    const go = () => { m.innerHTML = ''; for (const p of is.pages.filter((p) => p.n >= from && p.n <= to)) { const src = pipeline().render(p, w * 1.5, { view: +(qq.get('view') ?? 0) }); const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.style.width = w + 'px'; c.getContext('2d')!.drawImage(src, 0, 0); m.append(c); } };
    go(); onFontsLoaded(() => { pipeline().invalidate(); go(); });
    return;
  }
  root.innerHTML = `<main style="padding:24px;display:grid;gap:24px"><div style="display:flex;gap:16px;align-items:flex-start" id="row"></div><div id="grid" style="display:grid;grid-template-columns:repeat(auto-fill,96px);gap:6px"></div></main>`;
  const row = root.querySelector('#row')!;
  const page = samplePage();
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '');
  if (q.get('tool')) page.strokes.push({ tool: q.get('tool') as never, pts: [[0.2, 0.45], [0.5, 0.5], [0.8, 0.55]], size: 0.18, intensity: +(q.get('i') ?? 1), seed: 1, plate: 0, plate2: 2 });
  const draw = () => {
    row.innerHTML = '';
    for (const view of [0, 5]) {
      const c = document.createElement('canvas');
      const src = pipeline().render(page, 560, { view });
      c.width = src.width; c.height = src.height; c.style.width = '420px';
      c.getContext('2d')!.drawImage(src, 0, 0);
      row.append(c);
    }
  };
  if (q.get('tools')) {
    row.innerHTML = '';
    for (const tool of ['bleed', 'bokashi', 'haze', 'wave', 'pour', 'break', 'tube', 'echo', 'melt', 'dither']) {
      const p = samplePage();
      p.ground = 'rice';
      const pts: [number, number][] = tool === 'echo' ? [[0.7, 0.28], [0.78, 0.3]] : tool === 'pour' ? [[0.3, 0.55], [0.75, 0.55]] : [[0.15, 0.62], [0.5, 0.66], [0.85, 0.7]];
      p.strokes.push({ tool: tool as never, pts, size: tool === 'echo' ? 0.16 : 0.2, intensity: 1, seed: 1, plate: 1, plate2: 2 });
      const src = pipeline().render(p, 360);
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.style.width = '230px'; c.title = tool;
      c.getContext('2d')!.drawImage(src, 0, 0);
      row.append(c);
    }
    (row as HTMLElement).style.flexWrap = 'wrap';
    return;
  }
  draw();
  onFontsLoaded(draw);
  const grid = root.querySelector('#grid')!;
  for (const key of KEYS) {
    const p: Page = { ...samplePage(), ground: 'rice', objects: [{ id: key, kind: 'obj', key, x: 74, y: 105, s: 150, r: 0, plates: [0, 1, 2], seed: 1 }], dreamLine: '', slug: OBJ[key].en + ' · ' + OBJ[key].ja };
    const src = pipeline().render(p, 192);
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.style.width = '96px';
    c.getContext('2d')!.drawImage(src, 0, 0);
    grid.append(c);
  }
}
