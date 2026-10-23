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
    strokes: [], dreamLine: 'I was late for a swim, but the pool was in my grandmother’s kitchen', slug: 'p.03 · 三 · 셋 · forange/lmauve/seafoam · mis 0.5 · #0427 · dawn',
  };
}

export default function specimen(root: HTMLElement) {
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
  draw();
  onFontsLoaded(draw);
  const grid = root.querySelector('#grid')!;
  for (const key of KEYS) {
    const p: Page = { ...samplePage(), ground: 'rice', objects: [{ id: key, kind: 'obj', key, x: 74, y: 105, s: 150, r: 0, plates: [0, 1, 2], seed: 1 }], dreamLine: '', slug: OBJ[key].en + ' · ' + OBJ[key].ko + ' · ' + OBJ[key].ja };
    const src = pipeline().render(p, 192);
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.style.width = '96px';
    c.getContext('2d')!.drawImage(src, 0, 0);
    grid.append(c);
  }
}
