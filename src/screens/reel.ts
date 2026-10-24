// Reel recorder: a 1080×1920 vertical video of the 16 sheets passing one by one through the mist (time flows right to
// left, as on the hand scroll), recorded in the browser with MediaRecorder from a canvas: .webm, and .mp4 too when the
// browser can encode it. Nothing leaves the browser.
import type { Issue, Page } from '../model/types';
import { pipeline } from '../riso/pipeline';
import { loadOutlineFonts } from '../type/outlines';
import { DREAM_TIMES, dreamTimeOf, nightOf } from '../design/tokens';
import { sealSVG } from '../design/seal';
import { kanjiNum } from '../press/util';
import { BLEED } from '../model/types';
import { FULL_W } from '../riso/plates';

export const REEL_W = 1080, REEL_H = 1920;
const INTRO = 1.3, PER = 1.0, OUTRO = 1.2;
export const reelSeconds = (n: number) => INTRO + n * PER + OUTRO;

export interface ReelRun { canvas: HTMLCanvasElement; cancel: () => void; done: Promise<{ name: string; blob: Blob }[]> }

const pickType = (types: string[]) => types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
export const canRecord = () => typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream && !!pickType(['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']);

const svgImage = (svg: string) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
const mixHex = (a: string, b: string, t: number) => {
  const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};

export async function recordReel(issue: Issue, pages: Page[], onProgress: (t: number, label: string) => void): Promise<ReelRun> {
  await loadOutlineFonts();
  await document.fonts.ready;
  pipeline().invalidate();
  // the sheets, trimmed (no bleed), printed once through the same pipeline
  const sheets: ImageBitmap[] = [];
  for (const p of pages) {
    const src = pipeline().render(p, 900);
    const bl = BLEED * (src.width / FULL_W);
    sheets.push(await createImageBitmap(src, bl, bl, src.width - bl * 2, src.height - bl * 2));
    onProgress(0, `printing the reel’s sheets ${String(sheets.length).padStart(2, '0')}/${pages.length}`);
    await new Promise((r) => requestAnimationFrame(r));
  }
  const seal = await svgImage(sealSVG({ size: 120, seed: issue.seed % 97 + 3, rotate: -3 }));
  // fine grain over everything, like the paper and the mist on screen
  const grain = document.createElement('canvas'); grain.width = grain.height = 256;
  { const g = grain.getContext('2d')!; const d = g.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 18; } g.putImageData(d, 0, 0); }

  const canvas = document.createElement('canvas');
  canvas.width = REEL_W; canvas.height = REEL_H;
  const x = canvas.getContext('2d')!;
  const n = sheets.length;
  const total = reelSeconds(n);
  const no = String(issue.seed).padStart(4, '0');
  const SW = 860, SH = Math.round(SW * sheets[0].height / sheets[0].width);
  const blobs = [0.12, 0.47, 0.81, 0.33].map((s, i) => ({ s, i }));

  const draw = (t: number) => {
    // which sheet is on show: each one rests, then glides out to the left as the next arrives from the right
    const f = Math.max(0, Math.min(n - 1, (t - INTRO) / PER));
    const k = Math.floor(f), u = f - k;
    const glide = u < 0.42 ? 0 : (1 - Math.cos(Math.PI * (u - 0.42) / 0.58)) / 2;
    const pos = k + glide;
    // the mist follows the dream time of the sheet on show
    const night = nightOf(Math.round(pos) + 1) * 3;
    const bi = Math.min(2, Math.floor(night)), bt = night - bi;
    const A = DREAM_TIMES[bi].mist, B = DREAM_TIMES[bi + 1].mist;
    const g = x.createLinearGradient(0, 0, 0, REEL_H);
    [0, 1, 2, 3].forEach((i) => g.addColorStop(i / 3, mixHex(A[i], B[i], bt)));
    x.globalAlpha = 1; x.fillStyle = g; x.fillRect(0, 0, REEL_W, REEL_H);
    for (const b of blobs) {
      const c = mixHex(A[(b.i + 1) % 4], B[(b.i + 2) % 4], bt);
      const cx = REEL_W * (0.5 + 0.42 * Math.sin(t * 0.21 + b.s * 9)), cy = REEL_H * (0.15 + 0.7 * ((b.s + t * 0.018 * (b.i % 2 ? 1 : -1)) % 1 + 1) % 1);
      const r = 520 + 160 * Math.sin(t * 0.3 + b.i);
      const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, c.replace('rgb', 'rgba').replace(')', ',.75)')); rg.addColorStop(1, c.replace('rgb', 'rgba').replace(')', ',0)'));
      x.fillStyle = rg; x.fillRect(0, 0, REEL_W, REEL_H);
    }
    // the sheets
    const intro = Math.min(1, t / INTRO);
    for (let i = Math.max(0, k - 1); i <= Math.min(n - 1, k + 2); i++) {
      const d = i - pos;
      if (Math.abs(d) > 1.25) continue;
      const cx = REEL_W / 2 + d * 1000, cy = REEL_H / 2 + 40 + Math.abs(d) * 30;
      const sc = (1 - Math.min(0.14, Math.abs(d) * 0.12)) * (i === 0 ? 0.9 + 0.1 * intro : 1);
      x.save();
      x.translate(cx, cy); x.rotate((d * 3.2 + (i % 2 ? -0.6 : 0.5)) * Math.PI / 180); x.scale(sc, sc);
      x.globalAlpha = i === 0 ? Math.min(1, t / (INTRO * 0.7)) : 1;
      x.shadowColor = 'rgba(80,70,110,.28)'; x.shadowBlur = 50; x.shadowOffsetY = 26;
      x.drawImage(sheets[i], -SW / 2, -SH / 2, SW, SH);
      x.restore();
    }
    // tiny sharp type over the soft image
    x.globalAlpha = 1; x.shadowColor = 'transparent';
    x.fillStyle = '#3B3A40';
    x.font = '30px "IBM Plex Mono", monospace';
    x.textAlign = 'left';
    x.fillText(`ALMOST PRESS · Issue #${no}`, 90, 150);
    x.font = '800 30px "Shippori Mincho B1", serif';
    x.fillText('ほぼ印刷所', 90, 198);
    const shown = pages[Math.round(pos)];
    const dt = dreamTimeOf(shown.n);
    x.font = '28px "IBM Plex Mono", monospace';
    x.fillText(`p.${String(shown.n).padStart(2, '0')}/16 · ${dt.en}`, 90, REEL_H - 150);
    x.font = '800 30px "Shippori Mincho B1", serif';
    x.fillText(`第${kanjiNum(shown.n)}頁 · ${dt.ja}`, 90, REEL_H - 102);
    x.globalAlpha = 0.95;
    if (seal.naturalWidth) x.drawImage(seal, REEL_W - 90 - 110, REEL_H - 210, 110, 110);
    // grain, and the last sheet fading back into the mist
    x.globalAlpha = 1;
    x.fillStyle = x.createPattern(grain, 'repeat')!; x.fillRect(0, 0, REEL_W, REEL_H);
    const end = Math.max(0, (t - (total - OUTRO * 0.8)) / (OUTRO * 0.8));
    if (end > 0) { x.globalAlpha = end * 0.85; x.fillStyle = mixHex(A[1], B[1], bt); x.fillRect(0, 0, REEL_W, REEL_H); x.globalAlpha = 1; if (seal.naturalWidth) x.drawImage(seal, REEL_W / 2 - 80, REEL_H / 2 - 80, 160, 160); }
  };

  const stream = canvas.captureStream(30);
  const types = [pickType(['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']), pickType(['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4'])].filter(Boolean) as string[];
  const recs = types.map((type) => {
    const chunks: Blob[] = [];
    let r: MediaRecorder;
    try { r = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 }); } catch { return null; }
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise<Blob>((res) => { r.onstop = () => res(new Blob(chunks, { type: type.split(';')[0] })); });
    return { r, type, stopped };
  }).filter(Boolean) as { r: MediaRecorder; type: string; stopped: Promise<Blob> }[];
  let cancelled = false;
  draw(0);
  recs.forEach((q) => q.r.start(250));
  const done = new Promise<{ name: string; blob: Blob }[]>((resolve) => {
    const t0 = performance.now();
    const tickF = () => {
      const t = (performance.now() - t0) / 1000;
      if (cancelled) { recs.forEach((q) => q.r.state !== 'inactive' && q.r.stop()); sheets.forEach((s) => s.close()); resolve([]); return; }
      draw(Math.min(total, t));
      const f = Math.max(0, Math.min(n, Math.floor((t - INTRO) / PER) + 1));
      onProgress(Math.min(1, t / total), `recording ${String(f).padStart(2, '0')}/${n} · ${Math.ceil(Math.max(0, total - t))} s`);
      if (t < total + 0.25) { requestAnimationFrame(tickF); return; }
      recs.forEach((q) => q.r.stop());
      Promise.all(recs.map((q) => q.stopped)).then((bl) => {
        sheets.forEach((s) => s.close());
        resolve(bl.map((blob, i) => ({ name: `almost-press-${no}-reel.${recs[i].type.includes('mp4') ? 'mp4' : 'webm'}`, blob })));
      });
    };
    requestAnimationFrame(tickF);
  });
  return { canvas, cancel: () => { cancelled = true; }, done };
}
