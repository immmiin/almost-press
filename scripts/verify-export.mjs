// Run the edition headlessly from dist/ (no server: requests are answered from disk), hold START, answer a
// paper jam if one comes, catch the downloads, then read the files back and print the numbers.
// Usage: node scripts/verify-export.mjs [issue=01] [kind=all] [jam=reprint|keep]
import { chromium } from 'playwright-core';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import JSZip from 'jszip';
import { inspectPdf, summarise } from '../src/export/inspect.ts';

const [issue = '01', kind = 'all', jamAnswer = 'reprint'] = process.argv.slice(2);
const out = '.shots/edition';
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.route('http://press.local/**', async (r) => {
  let p = new URL(r.request().url()).pathname;
  if (p.endsWith('/')) p += 'index.html';
  try { await r.fulfill({ body: await readFile(join('dist', decodeURIComponent(p))), contentType: types[extname(p)] ?? 'application/octet-stream' }); }
  catch { await r.fulfill({ status: 404, body: 'nf' }); }
});
const saved = [];
page.on('download', async (d) => { const f = join(out, d.suggestedFilename()); await d.saveAs(f); saved.push(f); });
const t0 = Date.now();
await page.goto(`http://press.local/#/export?issue=${issue}&kind=${kind}${process.env.JAM ? `&jam=${process.env.JAM}` : ""}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
await page.waitForTimeout(1800);
const box = await page.locator('.x-start').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up();
let midShot = false, jamSeen = false;
const tRun = Date.now();
for (;;) {
  const st = await page.evaluate(() => ({ state: document.querySelector('.export')?.dataset.state, count: document.querySelector('.x-lcd-count')?.textContent, done: !!window.__edition }));
  if (st.done) break;
  if (st.state === 'jam' && !jamSeen) {
    jamSeen = true;
    await page.screenshot({ path: join(out, '..', 'export-jam.png') });
    await page.click(jamAnswer === 'keep' ? '.x-keep' : '.x-reprint');
  }
  if (!midShot && st.count === '08/16') { midShot = true; await page.screenshot({ path: join(out, '..', 'export-run.png') }); }
  if (Date.now() - tRun > 10 * 60000) throw new Error('timeout');
  await page.waitForTimeout(250);
}
const edition = await page.evaluate(() => window.__edition);
await page.waitForTimeout(400 * 6);
await page.screenshot({ path: join(out, '..', 'export-done.png') });
console.log(`run: ${((Date.now() - tRun) / 1000).toFixed(1)} s (page load ${((tRun - t0) / 1000).toFixed(1)} s) · jam page ${edition.jamPage} · kept ${edition.jamKept}`);
for (const r of edition.results) console.log(`in-browser · ${r.name} · ${(r.size / 1048576).toFixed(1)} MB${r.summary ? ' · ' + r.summary : ''}`);
console.log(logs.filter((l) => /error|warn/i.test(l)).join('\n'));
await browser.close();

// ---- read the files back from disk ----
const png = (b) => `${b.readUInt32BE(16)}×${b.readUInt32BE(20)}`;
async function readZip(buf, label) {
  const zip = await JSZip.loadAsync(buf);
  const sizes = {};
  for (const [name, f] of Object.entries(zip.files)) {
    if (f.dir) continue;
    const b = Buffer.from(await f.async('uint8array'));
    if (name.endsWith('.pdf')) console.log(`${label}/${name}: ${summarise(inspectPdf(new Uint8Array(b)))}`);
    else if (name.endsWith('.zip')) await readZip(b, `${label}/${name}`);
    else if (name.endsWith('.png')) { const k = `${name.includes('stamp') ? 'stamp&type' : name.includes('plate') ? 'plate' : 'image'} ${png(b)}`; sizes[k] = (sizes[k] ?? 0) + 1; }
    else console.log(`${label}/${name}: ${b.length} bytes`);
  }
  for (const [k, n] of Object.entries(sizes)) console.log(`${label}: ${n} × ${k} png`);
}
for (const f of saved) {
  const b = await readFile(f);
  if (f.endsWith('.pdf')) console.log(`${f}: ${summarise(inspectPdf(new Uint8Array(b)))}`);
  else if (f.endsWith('.zip')) await readZip(b, f);
}
await writeFile(join(out, 'report.json'), JSON.stringify(edition, null, 2));
