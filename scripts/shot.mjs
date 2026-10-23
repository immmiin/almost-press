// Screenshot the built site without running a server: every request to http://press.local/
// is answered straight from dist/. Usage: node scripts/shot.mjs "#/route" out.png [w] [h] [waitMs] [js]
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const [route = '', out = '.shots/shot.png', w = '1440', h = '900', wait = '2500', js = ''] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.route('http://press.local/**', async (r) => {
  let p = new URL(r.request().url()).pathname;
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(join('dist', decodeURIComponent(p)));
    await r.fulfill({ body, contentType: types[extname(p)] ?? 'application/octet-stream' });
  } catch { await r.fulfill({ status: 404, body: 'nf' }); }
});
await page.goto('http://press.local/' + route, { waitUntil: 'load' });
await page.waitForTimeout(+wait);
if (js) { const res = await page.evaluate(js); if (res !== undefined) console.log('eval:', typeof res === 'string' ? res : JSON.stringify(res)); await page.waitForTimeout(800); }
await page.screenshot({ path: out });
console.log(logs.join('\n'));
await browser.close();
