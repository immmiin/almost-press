// Contact sheet of an Instagram zip (16 pages) → PNG. Usage: node scripts/contact.mjs in.zip out.png [cols] [from] [to]
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
const [zipPath, out, cols = '8', from = '1', to = '16'] = process.argv.slice(2);
const zip = await JSZip.loadAsync(await readFile(zipPath));
const imgs = [];
for (let i = +from; i <= +to; i++) imgs.push(await zip.file(`instagram-p${String(i).padStart(2, '0')}.png`).async('base64'));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const w = 1600, cw = w / +cols, ch = cw * 1.25;
const page = await browser.newPage({ viewport: { width: w, height: Math.ceil(imgs.length / +cols) * ch } });
await page.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(${cols},1fr)">${imgs.map((b) => `<img style="width:100%;display:block" src="data:image/png;base64,${b}">`).join('')}</body>`);
await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
