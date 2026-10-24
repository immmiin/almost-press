// Reads a recorded reel back in Chrome: video size and duration. Usage: node scripts/probe-video.mjs <file>…
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const p = await b.newPage();
for (const f of process.argv.slice(2)) {
  await p.goto('file://' + f);
  const r = await p.evaluate(async () => {
    const v = document.querySelector('video'); if (!v) return 'no video';
    await new Promise((res) => (v.readyState >= 1 ? res() : v.addEventListener('loadedmetadata', res, { once: true })));
    let d = v.duration;
    if (!isFinite(d)) { v.currentTime = 1e6; await new Promise((res) => v.addEventListener('durationchange', res, { once: true })); d = v.duration; }
    return { w: v.videoWidth, h: v.videoHeight, duration: d, rawDuration: isFinite(v.duration) };
  });
  console.log(f.split('/').pop(), JSON.stringify(r));
}
await b.close();
