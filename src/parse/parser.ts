// Dream sentence → objects + leftover words. English and Korean as in the reference; Japanese added:
// alias substring matching, longest alias first, particles は/が/を/に/で/の/へ/と/も stripped.
import { OBJ, KEYS } from '../objects';

// The reference used /[ㄱ-힝]/, which also spans kana and kanji; narrowed to Hangul so Japanese can be told apart.
export const KR = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
export const JA_RE = /[぀-ヿ㐀-鿿]/;
const KANA_ONLY = /^[぀-ヿ]+$/;
const PARTICLES = ['에서는', '에서', '으로', '에게', '한테', '까지', '부터', '처럼', '이랑', '랑', '하고', '은', '는', '이', '가', '을', '를', '에', '의', '도', '와', '과', '로', '만'];
const VERB_END = /(다|고|서|어|아|요|지|며|면|게|데|던|었|았|했|겠|죠|네)$/;
const EN_STOP = new Set('a an the and or but of in on at to from with was were is are be been being i my me we our us you your it its there their they them he she his her him this that these those then than into onto over under up down by for as so very just like had has have did do does not no out off all one two some what when where who why how about again only also still somehow suddenly kept felt seemed looked became got went came said blew saw ate ran flew fell made took gave held sat stood told knew thought found left met lost woke dreamt dream dreamed could would should can will saying something someone everything everyone nothing getting bigger'.split(' '));
const JA_PARTICLES = ['は', 'が', 'を', 'に', 'で', 'の', 'へ', 'と', 'も'];
const JA_TAIL = /(でした|だった|ました|ている|ていた|てた|った|した|して|です|ます|だ|た|て|く|い|る|う|ず)$/;

function matchObj(tok: string): string | null {
  let best: string | null = null, bl = 0;
  for (const key of KEYS) for (const a of OBJ[key].al) {
    let ok: boolean;
    if (KR.test(a)) ok = a.length >= 2 ? tok.startsWith(a) : tok === a || PARTICLES.some((p) => tok === a + p);
    else ok = tok === a || tok === a + 's' || tok === a + 'es';
    if (ok && a.length > bl) { best = key; bl = a.length; }
  }
  return best;
}
function wordCandidate(tok: string): string | null {
  if (KR.test(tok)) {
    let w = tok;
    for (const p of PARTICLES) { if (w.length > p.length + 1 && w.endsWith(p)) { w = w.slice(0, -p.length); break; } }
    if (w.length < 2 || w.length > 6 || VERB_END.test(w)) return null;
    return w;
  }
  if (!/^[a-z]+$/.test(tok) || tok.length < 3 || EN_STOP.has(tok) || /(ing|ed|ly)$/.test(tok)) return null;
  return tok;
}

/** All Japanese aliases, longest first. Single kana are skipped (they collide with particles). */
let JA_ALIASES: { a: string; key: string }[] | null = null;
function jaAliases() {
  if (!JA_ALIASES) {
    JA_ALIASES = [];
    for (const key of KEYS) for (const a of OBJ[key].jaAl) if (!(KANA_ONLY.test(a) && a.length < 2)) JA_ALIASES.push({ a, key });
    JA_ALIASES.sort((x, y) => y.a.length - x.a.length);
  }
  return JA_ALIASES;
}
/** Japanese run: scan for aliases (longest first); remaining pieces split on particles become word candidates. */
function parseJa(run: string, objs: string[], words: string[]) {
  const taken = new Array(run.length).fill(false);
  for (const { a, key } of jaAliases()) {
    let from = 0, i: number;
    while ((i = run.indexOf(a, from)) >= 0) {
      from = i + 1;
      if (taken.slice(i, i + a.length).some(Boolean)) continue;
      for (let j = i; j < i + a.length; j++) taken[j] = true;
      if (!objs.includes(key)) objs.push(key);
    }
  }
  let rest = '';
  for (let i = 0; i < run.length; i++) rest += taken[i] ? '|' : run[i];
  for (let piece of rest.split(new RegExp(`[|${JA_PARTICLES.join('')}、。]+`))) {
    piece = piece.replace(JA_TAIL, '');
    if (piece.length >= 2 && piece.length <= 6 && /[㐀-鿿゠-ヿ]/.test(piece) && !words.includes(piece)) words.push(piece);
  }
}

export interface Parsed { objs: string[]; words: string[] }
export function parse(text: string): Parsed {
  const objs: string[] = [], words: string[] = [];
  const toks = text.toLowerCase().split(/[\s,.!?…~"'“”‘’()[\]·]+/).filter(Boolean);
  for (const tok of toks) {
    if (JA_RE.test(tok) && !KR.test(tok)) { parseJa(tok, objs, words); continue; }
    const key = matchObj(tok);
    if (key) { if (!objs.includes(key)) objs.push(key); continue; }
    const c = wordCandidate(tok);
    if (c && !words.includes(c)) words.push(c);
  }
  return { objs, words };
}
