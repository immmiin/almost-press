// The edition: real 300 dpi renders through the same WebGL pipeline, and the files.
//  · Zine PDF: A5 (148×210 mm), 16 pages, 3 mm bleed → each page 1819×2551 px. With and without crop marks.
//  · Spreads PDF: cover, 2–3 … 14–15, back.
//  · Plates zip: one grayscale 300 dpi PNG per ink per page (after effects) + the stamp & type layer + ink list.
//  · Instagram: 1080×1350 PNG per page.
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { pipeline } from '../riso/pipeline';
import { FULL_W, FULL_H } from '../riso/plates';
import { PAGE_W, PAGE_H, BLEED, type Issue, type Page } from '../model/types';
import { loadOutlineFonts } from '../type/outlines';
import { INK_BY_ID } from '../design/tokens';
import { dreamTimeOf } from '../design/tokens';

export const DPI = 300;
export const PX_W = Math.round((FULL_W / 25.4) * DPI); // 1819
export const PX_H = Math.round(FULL_H * (PX_W / FULL_W)); // 2551

export type Kind = 'zine' | 'spreads' | 'plates' | 'instagram' | 'all';
export interface Progress { (done: number, total: number, label: string, page?: number, plate?: number): void }

/** Make sure every font used on pages is ready (outlines for type objects, web fonts for canvas text). */
export async function fontsReady() {
  await loadOutlineFonts();
  const fams = ['12px "IBM Plex Mono"', '12px "IBM Plex Sans KR"', '800 12px "Shippori Mincho B1"', '12px "Gowun Batang"', '12px "Black Han Sans"', '12px "Rubik Mono One"', '12px "Dela Gothic One"', '12px "Bagel Fat One"', 'italic 12px "Bodoni Moda"', '12px "DotGothic16"', '12px "Do Hyeon"'];
  await Promise.all(fams.map((f) => document.fonts.load(f, '殆あ가A').catch(() => null)));
  await document.fonts.ready;
  pipeline().invalidate();
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((r) => c.toBlob((b) => r(b!), type, q));
const blobBytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

/** A rendered page. Only the JPEG is kept (16 RGBA canvases at 300 dpi would hold ~300 MB); spreads and
 *  Instagram images decode it again when they need pixels. */
export interface Rendered { jpeg: Uint8Array; blob: Blob; thumb: string; plates?: { name: string; png: Blob }[]; stamp?: Blob }

const decode = (r: Rendered) => createImageBitmap(r.blob);

/** Render one page at 300 dpi including bleed. */
export async function renderPage300(page: Page, withPlates: boolean): Promise<Rendered> {
  const src = pipeline().render(page, PX_W);
  const blob = await toBlob(src, 'image/jpeg', 0.93);
  // a small proof for the tray, cut from the trim area
  const tc = document.createElement('canvas'); tc.width = 120; tc.height = Math.round(120 * PAGE_H / PAGE_W);
  const bl = BLEED * (src.width / FULL_W);
  tc.getContext('2d')!.drawImage(src, bl, bl, src.width - bl * 2, src.height - bl * 2, 0, 0, tc.width, tc.height);
  const out: Rendered = { jpeg: await blobBytes(blob), blob, thumb: tc.toDataURL('image/jpeg', 0.8) };
  if (withPlates) {
    out.plates = [];
    for (let i = 0; i < page.inks.length; i++) {
      const img = pipeline().readPlate(i);
      const pc = document.createElement('canvas'); pc.width = img.width; pc.height = img.height;
      pc.getContext('2d')!.putImageData(img, 0, 0);
      const ink = INK_BY_ID[page.inks[i]];
      out.plates.push({ name: `p${String(page.n).padStart(2, '0')}-plate${i + 1}-${ink.id}.png`, png: await toBlob(pc, 'image/png') });
    }
    // the hand-stamped seal and sharp type layer
    const ov = pipeline().lastPlates?.overlay;
    if (ov) {
      const sc = document.createElement('canvas'); sc.width = ov.width; sc.height = ov.height;
      const x = sc.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, sc.width, sc.height); x.drawImage(ov, 0, 0);
      out.stamp = await toBlob(sc, 'image/png');
    }
  }
  return out;
}

/** Crop marks drawn in the slug area around a bleed image placed at (ox, oy). */
function cropMarks(pdf: jsPDF, ox: number, oy: number, w = PAGE_W, h = PAGE_H) {
  pdf.setLineWidth(0.12); pdf.setDrawColor(0, 0, 0);
  const x0 = ox + BLEED, y0 = oy + BLEED, x1 = x0 + w, y1 = y0 + h, g = BLEED + 1.5, L = 6;
  for (const [x, y, dx, dy] of [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]] as const) {
    pdf.line(x + dx * g, y, x + dx * (g + L), y);
    pdf.line(x, y + dy * g, x, y + dy * (g + L));
  }
  // registration targets at the middle of each side
  const reg = (cx: number, cy: number) => { pdf.circle(cx, cy, 1.6); pdf.line(cx - 3, cy, cx + 3, cy); pdf.line(cx, cy - 3, cx, cy + 3); };
  reg((x0 + x1) / 2, y0 - g - 3.5); reg((x0 + x1) / 2, y1 + g + 3.5); reg(x0 - g - 3.5, (y0 + y1) / 2); reg(x1 + g + 3.5, (y0 + y1) / 2);
}

export function zinePDF(issue: Issue, pages: Rendered[], marks: boolean): Blob {
  const M = marks ? 12 : 0; // slug margin for crop marks
  const fw = FULL_W + M * 2, fh = FULL_H + M * 2;
  const pdf = new jsPDF({ unit: 'mm', format: [fw, fh], orientation: 'portrait', compress: true });
  pdf.setProperties({ title: `A Day I Almost Remember · #${String(issue.seed).padStart(4, '0')}`, subject: 'ALMOST PRESS · 거의 인쇄소 · ほぼ印刷所', creator: 'ALMOST PRESS', keywords: 'risograph zine A5 bleed 3mm' });
  pages.forEach((r, i) => {
    if (i) pdf.addPage([fw, fh], 'portrait');
    pdf.addImage(r.jpeg, 'JPEG', M, M, FULL_W, FULL_H, `pg${i}`, 'NONE');
    if (marks) {
      cropMarks(pdf, M, M);
      pdf.setFontSize(5); pdf.setTextColor(60, 58, 64);
      pdf.text(`ALMOST PRESS · #${String(issue.seed).padStart(4, '0')} · p.${String(i + 1).padStart(2, '0')}/16 · A5 148×210 · bleed 3mm · ${issue.pages[i].inks.map((id) => INK_BY_ID[id].name).join(' / ')}`, M, fh - 4);
    }
  });
  return pdf.output('blob');
}

/** Spreads: cover (right half), 2–3 … 14–15, back (left half). Each spread is 2×148 + bleed. */
export async function spreadsPDF(issue: Issue, pages: Rendered[]): Promise<Blob> {
  const SW = PAGE_W * 2 + BLEED * 2, SH = FULL_H;
  const pdf = new jsPDF({ unit: 'mm', format: [SW, SH], orientation: 'landscape', compress: true });
  pdf.setProperties({ title: `A Day I Almost Remember · spreads · #${String(issue.seed).padStart(4, '0')}`, creator: 'ALMOST PRESS' });
  const pxPerMM = PX_W / FULL_W;
  const spreads: [number | null, number | null][] = [[null, 0]];
  for (let i = 1; i < 15; i += 2) spreads.push([i, i + 1]);
  spreads.push([15, null]);
  const c = document.createElement('canvas');
  c.width = Math.round(SW * pxPerMM); c.height = PX_H;
  const x = c.getContext('2d')!;
  for (let si = 0; si < spreads.length; si++) {
    const [l, r] = spreads[si];
    if (si) pdf.addPage([SW, SH], 'landscape');
    x.fillStyle = '#F1ECE2'; x.fillRect(0, 0, c.width, c.height);
    const bl = Math.round(BLEED * pxPerMM), tw = Math.round(PAGE_W * pxPerMM);
    // left page keeps its outer (left) bleed, right page keeps its outer (right) bleed
    if (l !== null) { const b = await decode(pages[l]); x.drawImage(b, 0, 0, bl + tw, PX_H, 0, 0, bl + tw, PX_H); b.close(); }
    if (r !== null) { const b = await decode(pages[r]); x.drawImage(b, bl, 0, tw + bl, PX_H, bl + tw, 0, tw + bl, PX_H); b.close(); }
    pdf.addImage(await blobBytes(await toBlob(c, 'image/jpeg', 0.92)), 'JPEG', 0, 0, SW, SH, `sp${si}`, 'NONE');
    await nextFrame();
  }
  return pdf.output('blob');
}

/** 1080×1350 per page: the page on its own sheet in the mist. */
export async function instagram(issue: Issue, pages: Rendered[]): Promise<{ name: string; png: Blob }[]> {
  const out: { name: string; png: Blob }[] = [];
  for (let i = 0; i < pages.length; i++) {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    const x = c.getContext('2d')!;
    const dt = dreamTimeOf(i + 1);
    const g = x.createLinearGradient(0, 0, 0, 1350);
    dt.mist.forEach((m, k) => g.addColorStop(k / (dt.mist.length - 1), m));
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
    const h = 1180, w = Math.round(h * (PAGE_W / PAGE_H));
    const ox = (1080 - w) / 2, oy = 62;
    const bl = BLEED * (PX_W / FULL_W);
    x.shadowColor = 'rgba(90,80,120,.25)'; x.shadowBlur = 30; x.shadowOffsetY = 14;
    const bm = await decode(pages[i]);
    x.drawImage(bm, bl, bl, PX_W - bl * 2, PX_H - bl * 2, ox, oy, w, h);
    bm.close();
    x.shadowColor = 'transparent';
    x.fillStyle = '#3B3A40'; x.font = '15px "IBM Plex Mono", monospace';
    x.fillText(`ALMOST PRESS · A Day I Almost Remember · #${String(issue.seed).padStart(4, '0')} · p.${String(i + 1).padStart(2, '0')}/16`, ox, oy + h + 52);
    out.push({ name: `instagram-p${String(i + 1).padStart(2, '0')}.png`, png: await toBlob(c, 'image/png') });
    await nextFrame();
  }
  return out;
}

export function inkList(issue: Issue): string {
  const lines = [`ALMOST PRESS · A Day I Almost Remember · issue #${String(issue.seed).padStart(4, '0')}`, `dream: ${issue.dream}`, '', 'page · plate · ink · hex'];
  issue.pages.forEach((p) => p.inks.forEach((id, i) => lines.push(`p.${String(p.n).padStart(2, '0')} · plate ${i + 1} · ${INK_BY_ID[id].name}${INK_BY_ID[id].metallic ? ' (metallic, approximate on screen)' : ''} · ${INK_BY_ID[id].hex}`)));
  lines.push('', 'stamp & type layer: the seal (vermilion, hand stamped) and the tiny sharp type, printed last.', 'Masters are grayscale: black = full ink.');
  return lines.join('\n');
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

export interface RunOpts {
  /** page index that jams (-1: none) and how the operator answers: true = keep the crumpled sheet */
  jamPage?: number;
  onJam?: (i: number) => Promise<boolean>;
  /** fires as each sheet is really rendered */
  onPage?: (i: number, r: Rendered, page: Page) => void;
  /** every file as it is made (also the ones that end up inside the 'all' zip) */
  onFile?: (name: string, blob: Blob) => void;
}

/** A jammed sheet: every object comes out crumpled, the creases showing another pattern. */
export function jammed(p: Page): Page {
  return { ...p, objects: p.objects.map((o) => (o.kind === 'helper' ? o : { ...o, crumple: Math.max(o.crumple ?? 0, 0.65), pattern: (o.pattern ?? 0) + 1 })), jam: true };
}

/** The whole run. */
export async function runEdition(issue: Issue, kind: Kind, progress: Progress, opts: RunOpts = {}): Promise<{ name: string; blob: Blob }[]> {
  await fontsReady();
  const needPlates = kind === 'plates' || kind === 'all';
  const rendered: Rendered[] = [];
  const name = `almost-press-${String(issue.seed).padStart(4, '0')}`;
  for (let i = 0; i < 16; i++) {
    let p = issue.pages[i];
    if (i === opts.jamPage && opts.onJam && (await opts.onJam(i))) p = jammed(p);
    progress(i, 16, 'render', i + 1);
    await nextFrame();
    const r = await renderPage300(p, needPlates);
    rendered.push(r);
    opts.onPage?.(i, r, p);
    progress(i + 1, 16, 'render', i + 1);
  }
  const files: { name: string; blob: Blob }[] = [];
  progress(16, 16, 'pdf');
  await nextFrame();
  if (kind === 'zine' || kind === 'all') {
    files.push({ name: `${name}-zine-A5-bleed.pdf`, blob: zinePDF(issue, rendered, false) });
    await nextFrame();
    files.push({ name: `${name}-zine-A5-cropmarks.pdf`, blob: zinePDF(issue, rendered, true) });
  }
  if (kind === 'spreads' || kind === 'all') { await nextFrame(); files.push({ name: `${name}-spreads.pdf`, blob: await spreadsPDF(issue, rendered) }); }
  if (needPlates) {
    const zip = new JSZip();
    const dir = zip.folder('masters')!;
    rendered.forEach((r, i) => { r.plates?.forEach((pl) => dir.file(pl.name, pl.png)); if (r.stamp) dir.file(`p${String(i + 1).padStart(2, '0')}-stamp-and-type.png`, r.stamp); });
    zip.file('inks.txt', inkList(issue));
    files.push({ name: `${name}-plates.zip`, blob: await zip.generateAsync({ type: 'blob', compression: 'STORE' }) });
  }
  if (kind === 'instagram' || kind === 'all') {
    const ig = await instagram(issue, rendered);
    const zip = new JSZip();
    ig.forEach((f) => zip.file(f.name, f.png));
    files.push({ name: `${name}-instagram.zip`, blob: await zip.generateAsync({ type: 'blob', compression: 'STORE' }) });
  }
  files.forEach((f) => opts.onFile?.(f.name, f.blob));
  if (kind === 'all') {
    const zip = new JSZip();
    files.forEach((f) => zip.file(f.name, f.blob));
    return [{ name: `${name}-edition.zip`, blob: await zip.generateAsync({ type: 'blob', compression: 'STORE' }) }];
  }
  return files;
}
