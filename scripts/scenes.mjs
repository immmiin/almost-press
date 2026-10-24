// Interactive screenshots of the built site (no server: requests to http://press.local/ are answered from dist/).
// Usage: node scripts/scenes.mjs <scene> <outdir> [w] [h]
// Scenes drive the real UI with the mouse: stamping, a tool stroke, hold-to-print, the press remembering, Fall asleep …
import { chromium } from 'playwright-core';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const [scene = 'remember', out = '.shots/scenes', w = '1440', h = '900'] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, acceptDownloads: true });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.route('http://press.local/**', async (r) => {
  let p = new URL(r.request().url()).pathname;
  if (p.endsWith('/')) p += 'index.html';
  try { await r.fulfill({ body: await readFile(join('dist', decodeURIComponent(p))), contentType: types[extname(p)] ?? 'application/octet-stream' }); }
  catch { await r.fulfill({ status: 404, body: 'nf' }); }
});
const sleep = (ms) => page.waitForTimeout(ms);
const shot = async (name) => { await page.screenshot({ path: join(out, `${name}-${w}.png`) }); console.log('shot', name); };
const box = async (sel) => (await page.locator(sel).first().boundingBox());
const sheetAt = async (u, v) => { const b = await box('.stage-sheet'); return [b.x + b.width * u, b.y + b.height * v]; };
const go = async (route, wait = 2500, fresh = true) => {
  await page.goto('http://press.local/' + route, { waitUntil: 'load' });
  if (fresh) await page.evaluate(() => { localStorage.clear(); });
  await page.goto('http://press.local/' + route, { waitUntil: 'load' });
  await sleep(wait);
};
const narrow = +w < 900;
const openSheet = async (s) => { if (!narrow) return; await page.click(`.sheet-tabs [data-s="${s}"]`); await sleep(250); };
const closeSheet = async () => { if (!narrow) return; const s = await page.evaluate(() => document.querySelector('.press')?.dataset.sheet); if (s) { await page.click(`.sheet-tabs [data-s="${s}"]`); await sleep(200); } };
const stamp = async (key, u, v, hold = 250) => {
  await openSheet('drawer');
  await page.click(`.dstamp[data-k="${key}"]`); await sleep(80);
  await closeSheet();
  const [x, y] = await sheetAt(u, v);
  await page.mouse.move(x, y); await page.mouse.down(); await sleep(hold); await page.mouse.up(); await sleep(150);
};
const stroke = async (tool, pts) => {
  await openSheet('tools');
  await page.click(`.tools [data-tool="${tool}"]`); await sleep(80);
  await closeSheet();
  const [x0, y0] = await sheetAt(...pts[0]);
  await page.mouse.move(x0, y0); await page.mouse.down();
  for (const p of pts.slice(1)) { const [x, y] = await sheetAt(...p); await page.mouse.move(x, y, { steps: 12 }); }
  await sleep(300); await page.mouse.up(); await sleep(200);
  await page.keyboard.press('Escape');
};
const holdPrint = async (ms) => { const b = await box('.enamel'); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await sleep(ms); await page.mouse.up(); };

try {
  if (scene === 'press') {
    await go('#/press?new=1&seed=427', 3500);
    await shot('press-empty');
    await stamp('clock', 0.34, 0.33); await stamp('teacup', 0.64, 0.56); await stamp('swan', 0.36, 0.7, 900);
    await page.keyboard.press('Escape'); await sleep(300);
    await shot('press-stamped');
    await stroke('wave', [[0.15, 0.62], [0.5, 0.64], [0.85, 0.66]]);
    await sleep(400);
    await shot('press-stroke');
  } else if (scene === 'remember') {
    await go('#/press?new=1&seed=427', 3500);
    await stamp('clock', 0.34, 0.33); await stamp('teacup', 0.64, 0.56); await stamp('swan', 0.36, 0.7); await stamp('chair', 0.7, 0.78);
    await page.keyboard.press('Escape');
    await stroke('bleed', [[0.3, 0.4], [0.5, 0.42]]);
    await holdPrint(1500); // two of three plates
    await sleep(250); await shot('print-partial');
    await sleep(2200); await shot('remember-a');
    await sleep(600); await shot('remember-b');
    await sleep(1400); await shot('remember-tags');
    await sleep(2400); await shot('remember-c');
    // a second sheet, all plates
    await stamp('moon', 0.6, 0.2);
    await page.keyboard.press('Escape');
    await holdPrint(3400);
    await sleep(2500); await shot('remember-d');
    await sleep(700); await shot('remember-e');
    await sleep(1300); await shot('remember-tags2');
    await sleep(2400); await shot('remember-f');
  } else if (scene === 'sleep') {
    await go('#/press?new=1&seed=427', 3500);
    await stamp('clock', 0.34, 0.33); await stamp('swan', 0.5, 0.66); await page.keyboard.press('Escape');
    await page.click('.sleep-slip'); await sleep(500); await shot('sleep-ask');
    await page.click('.ask-slip .run-yes'); await sleep(4000); await shot('sleep-mid');
    await sleep(14000); await shot('sleep-bound');
  } else if (scene === 'dreamfor') {
    await go('#/gate', 3000);
    await page.fill('.g-dream input', 'a swan in the kitchen and the clock kept getting bigger');
    await shot('gate-dream');
    await page.keyboard.press('Enter');
    await sleep(6000); await shot('dreamfor-mid');
    await sleep(14000); await shot('dreamfor-bound');
  } else if (scene === 'gate') {
    await go('#/gate', 3500); await shot('gate');
  } else if (scene === 'reader') {
    await go('#/reader?issue=01', 6000); await shot('reader');
    await page.click('[data-m="booklet"]'); await sleep(1500); await shot('reader-booklet');
  } else if (scene === 'export') {
    await go('#/export?issue=01', 3500); await shot('export');
  } else if (scene === 'colophon') {
    await go('#/colophon', 3000); await shot('colophon');
  }
} finally {
  if (logs.length) console.log(logs.join('\n'));
  await browser.close();
}
