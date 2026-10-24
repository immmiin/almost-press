// Sharing an issue without a server: the issue's data (seed, objects, strokes, inks per sheet) is deflated with the
// browser's own CompressionStream and written into the URL hash as base64url. Anyone opening the link sees the issue
// in the Reader. When the data is too long for a link, it is saved as a small .almost file instead (the same bytes
// behind a short magic header), which the Reader opens by drag and drop.
import type { Issue, Page } from '../model/types';
import { refreshText } from '../print/loop';

/** Longest hash we hand out as a link (messaging apps and older browsers truncate very long URLs). */
export const MAX_LINK = 16000;
const MAGIC = 'ALMOST1\n';

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}
const b64url = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64url = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

/** Only what prints: no ids, no undo snapshot, no machine notes; numbers rounded to 1/100 mm. */
function compact(issue: Issue) {
  const page = (p: Page) => {
    const { origin: _o, memo: _m, slug: _s, dreamLine: _d, ...rest } = p;
    void _o; void _m; void _s; void _d;
    return rest;
  };
  const json = JSON.stringify({ v: 1, seed: issue.seed, dream: issue.dream, lang: issue.lang, keepsake: issue.keepsake, keepsakeS: issue.keepsakeS, pages: issue.pages.slice(0, 16).map(page) },
    (k, v) => (k === 'id' ? undefined : typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v));
  return new TextEncoder().encode(json);
}

export async function packIssue(issue: Issue): Promise<Uint8Array> { return pipe(compact(issue), new CompressionStream('deflate')); }
export async function encodeIssue(issue: Issue): Promise<string> { return b64url(await packIssue(issue)); }

function revive(raw: { seed: number; dream: string; lang?: Issue['lang']; keepsake?: string; keepsakeS?: number; pages: Page[] }): Issue {
  let n = 0;
  const id = () => 's' + (n++).toString(36);
  const pages = raw.pages.map((p) => ({ ...p, objects: p.objects.map((o) => ({ ...o, id: id() })), setoff: p.setoff?.map((o) => ({ ...o, id: id() })) }));
  const is: Issue = { id: `shared-${raw.seed}`, seed: raw.seed, dream: raw.dream ?? '', lang: raw.lang ?? 'en', keepsake: raw.keepsake, keepsakeS: raw.keepsakeS, pages, current: pages.length - 1, forgotten: [], bound: pages.length >= 16, fixed: true };
  is.pages.forEach((p) => refreshText(is, p));
  return is;
}
export async function decodeIssue(s: string): Promise<Issue> {
  const bytes = await pipe(unb64url(s), new DecompressionStream('deflate'));
  return revive(JSON.parse(new TextDecoder().decode(bytes)));
}

/** A .almost file: a magic line, then the deflated bytes. */
export async function almostFile(issue: Issue): Promise<Blob> {
  return new Blob([MAGIC, (await packIssue(issue)) as BlobPart], { type: 'application/octet-stream' });
}
export async function readAlmost(file: Blob): Promise<Issue> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const head = new TextDecoder().decode(buf.subarray(0, MAGIC.length));
  if (head !== MAGIC) {
    // a pasted link or bare hash saved as text also opens
    const text = new TextDecoder().decode(buf).trim();
    const m = text.match(/[?&]d=([A-Za-z0-9_-]+)/);
    return decodeIssue(m ? m[1] : text);
  }
  const bytes = await pipe(buf.subarray(MAGIC.length), new DecompressionStream('deflate'));
  return revive(JSON.parse(new TextDecoder().decode(bytes)));
}

/** A dropped issue too long for a link stays in memory for the Reader and the Export screen. */
let held: Issue | null = null;
export const holdIssue = (i: Issue) => { held = i; };
export const heldIssue = () => held;

/** The reader link for an issue, or null when it is too long to share as a link. */
export async function shareLink(issue: Issue): Promise<string | null> {
  const d = await encodeIssue(issue);
  const url = `${location.origin}${location.pathname}#/reader?d=${d}`;
  return url.length <= MAX_LINK ? url : null;
}
