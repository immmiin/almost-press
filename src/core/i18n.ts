// UI language: English default, switchable to Japanese. Labels can drift between the two as an issue progresses.
// The only Korean on the site is the brand name 거의 인쇄소 (the dream input still reads Korean).
export type Lang = 'en' | 'ja';
export const LANGS: Lang[] = ['en', 'ja'];

type Dict = Record<string, [string, string]>;
const D: Dict = {
  press: ['press', '印刷所'],
  title: ['ALMOST PRESS', 'ほぼ印刷所'],
  start: ['Start tonight’s dream', '今夜の夢をはじめる'],
  unroll: ['Unroll Issue 01', '第一号をひらく'],
  about: ['About the press', '印刷所について'],
  drawer: ['stamps', '判子'],
  search: ['search: swan, 時計…', 'さがす: swan, 時計…'],
  inks: ['inks', 'インク'],
  tools: ['tools', '道具'],
  print: ['PRINT', '刷る'],
  hold: ['hold to print', '長押し'],
  dream: ['the dream, one line', '夢をひとこと'],
  dreamPh: ['a swan in the kitchen…', '台所の白鳥…'],
  sound: ['sound', '音'],
  on: ['on', '入'],
  off: ['off', '切'],
  plate: ['plate', '版'],
  plates: ['plate view', '版を見る'],
  mis: ['misreg.', 'ずれ'],
  density: ['density', '濃度'],
  grain: ['grain', '粒'],
  drift: ['drift', '漂い'],
  side: ['side effects', '副作用'],
  mild: ['mild', '弱'],
  normal: ['normal', '中'],
  wild: ['wild', '強'],
  memory: ['memory', '記憶'],
  m_off: ['off', '無'],
  m_gentle: ['gentle', '淡'],
  forgotten: ['forgotten', '忘れもの'],
  reprint: ['Reprint this page', 'この頁を刷り直す'],
  ground: ['ground', '地'],
  helpers: ['type & marks', '文字としるし'],
  page: ['page', '頁'],
  issue: ['issue', '号'],
  run: ['Run the edition', '刷り上げる'],
  booklet: ['booklet', '冊子'],
  scroll: ['hand scroll', '絵巻'],
  colophon: ['colophon', '奥付'],
  back: ['back to the press', '印刷所へ'],
  gate: ['gate', '門'],
  lock: ['lock language', '言語を固定'],
  keepJam: ['Keep the jam', '紙づまりを残す'],
  reprintJam: ['Reprint', '刷り直す'],
  start_btn: ['START', '開始'],
  empty: ['nothing answers to that. write it in the dream and it prints as type.', 'その判子はない。夢に書けば文字として刷られる。'],
  all: ['all', '全部'],
  a_drawer: ['object drawer', '判子の引き出し'],
  a_inks: ['inks and plates', 'インクと版'],
  a_fwd: ['bring forward', '前へ'],
  a_bwd: ['send back', '後ろへ'],
  a_page: ['the page: click an object to select it, Tab cycles objects, arrow keys nudge', '頁: 判子を押して選ぶ、Tab で順に、矢印で動かす'],
  a_lang: ['language', '言語'],
  unrolling: ['unrolling…', 'ひらいています…'],
  cover: ['cover', '表紙'],
  backcover: ['back cover', '裏表紙'],
  prevSpread: ['previous spread', '前の見開き'],
  nextSpread: ['next spread', '次の見開き'],
  x_zine: ['Zine PDF', 'ジン PDF'],
  x_spreads: ['Spreads PDF', '見開き PDF'],
  x_plates: ['Plates (masters)', '版 (マスター)'],
  x_instagram: ['Instagram images', 'インスタグラム画像'],
  x_all: ['All', '全部'],
  x_hold: ['hold START', 'START を長押し'],
  x_jam: ['paper jam', '紙づまり'],
  x_files: ['the edition', '刷り上がり'],
  x_again: ['Run again', 'もう一度刷る'],
  x_skip: ['skip', 'とばす'],
  x_reader: ['back to the scroll', '絵巻へ'],
  home: ['home', '家'],
  table: ['table', '食卓'],
  sky: ['sky', '空'],
  nature: ['garden & sea', '庭と海'],
  creature: ['creatures', '生きもの'],
  thing: ['things', 'もの'],
  body: ['body', '体'],
  place: ['places', '場所'],
  newIssue: ['+ new issue', '新しい号'],
  sleep: ['Fall asleep', '眠る'],
  sleepAsk: ['the press will dream the remaining sheets', '残りの頁は印刷所が夢に見る'],
  sleepYes: ['Dream them', '夢に見る'],
  sleepNo: ['Stay awake', '起きている'],
  dreamFor: ['Dream it for me', '夢を刷ってもらう'],
  dreamForPh: ['one sentence: a swan in the kitchen…', 'ひとこと: 台所の白鳥…'],
  poster: ['Print this sheet', 'この頁を刷る'],
  share: ['Share this issue', 'この号を共有'],
  reel: ['Record a reel', 'リールを撮る'],
  open: ['Open a .almost file', '.almost を開く'],
  bound: ['bound · sixteen sheets', '製本 · 十六頁'],
  remembers: ['the press remembers', '印刷所は覚えている'],
  collapse: ['fold away', 'たたむ'],
  expand: ['unfold', 'ひらく'],
};
const stored = localStorage.getItem('ap.lang');
let lang: Lang = stored === 'ja' ? 'ja' : 'en';
let locked = localStorage.getItem('ap.lock') === '1';
const listeners = new Set<() => void>();
/** 0..1 how much labels drift away from the chosen language. */
let driftAmount = 0;
let driftSeed = 1;

export const getLang = () => lang;
export const isLocked = () => locked;
export function setLang(l: Lang) {
  lang = l; localStorage.setItem('ap.lang', l);
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}
export function setLocked(v: boolean) { locked = v; localStorage.setItem('ap.lock', v ? '1' : '0'); listeners.forEach((f) => f()); }
export function setLabelDrift(amount: number, seed: number) { driftAmount = amount; driftSeed = seed; listeners.forEach((f) => f()); }
export const onLang = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };

function h(s: string) { let x = driftSeed; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return ((x >>> 0) % 1000) / 1000; }
/** Translate a key. Accessible names should use `tA` (never drifts). */
export function t(key: string): string {
  const e = D[key];
  if (!e) return key;
  let li = LANGS.indexOf(lang);
  if (!locked && driftAmount > 0 && h(key) < driftAmount * 0.45) li = 1 - li;
  return e[li];
}
export const tA = (key: string) => (D[key] ? D[key][LANGS.indexOf(lang)] : key);
/** Both languages of a key: [en, ja]. */
export const tAll = (key: string): [string, string] => D[key] ?? [key, key];
document.documentElement.lang = lang;
