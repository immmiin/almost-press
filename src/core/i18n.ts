// UI language: English default, Korean and Japanese. Labels can drift between languages as an issue progresses.
export type Lang = 'en' | 'ko' | 'ja';
export const LANGS: Lang[] = ['en', 'ko', 'ja'];

type Dict = Record<string, [string, string, string]>;
const D: Dict = {
  press: ['press', '인쇄소', '印刷所'],
  title: ['ALMOST PRESS', '거의 인쇄소', 'ほぼ印刷所'],
  zine: ['A Day I Almost Remember', '거의 기억나는 하루', 'ほとんど覚えている一日'],
  start: ['Start tonight’s dream', '오늘 밤의 꿈을 시작', '今夜の夢をはじめる'],
  unroll: ['Unroll Issue 01', '제1호 펼치기', '第一号をひらく'],
  about: ['About the press', '인쇄소에 대하여', '印刷所について'],
  drawer: ['stamps', '도장', '判子'],
  search: ['search: swan, 고래, 時計…', '찾기: swan, 고래, 時計…', 'さがす: swan, 고래, 時計…'],
  inks: ['inks', '잉크', 'インク'],
  tools: ['tools', '도구', '道具'],
  print: ['PRINT', '인쇄', '刷る'],
  hold: ['hold to print', '누르고 있기', '長押し'],
  dream: ['the dream, one line', '꿈 한 줄', '夢をひとこと'],
  sound: ['sound', '소리', '音'],
  on: ['on', '켜짐', '入'],
  off: ['off', '꺼짐', '切'],
  plate: ['plate', '판', '版'],
  plates: ['plate view', '판 보기', '版を見る'],
  mis: ['misreg.', '어긋남', 'ずれ'],
  density: ['density', '농도', '濃度'],
  grain: ['grain', '입자', '粒'],
  drift: ['drift', '표류', '漂い'],
  side: ['side effects', '부작용', '副作用'],
  mild: ['mild', '약', '弱'],
  normal: ['normal', '보통', '中'],
  wild: ['wild', '강', '強'],
  forgotten: ['forgotten', '잊힌 것', '忘れもの'],
  reprint: ['Reprint this page', '이 쪽 다시 찍기', 'この頁を刷り直す'],
  ground: ['ground', '바탕', '地'],
  helpers: ['type & marks', '글자와 표식', '文字としるし'],
  page: ['page', '쪽', '頁'],
  issue: ['issue', '호', '号'],
  run: ['Run the edition', '부수 찍기', '刷り上げる'],
  booklet: ['booklet', '책자', '冊子'],
  scroll: ['hand scroll', '두루마리', '絵巻'],
  colophon: ['colophon', '판권', '奥付'],
  back: ['back to the press', '인쇄소로', '印刷所へ'],
  gate: ['gate', '문', '門'],
  lock: ['lock language', '언어 고정', '言語を固定'],
  keepJam: ['Keep the jam', '걸린 채로 두기', '紙づまりを残す'],
  reprintJam: ['Reprint', '다시 찍기', '刷り直す'],
  start_btn: ['START', '시작', '開始'],
  empty: ['nothing answers to that. write it in the dream and it prints as type.', '그런 도장은 없어요. 꿈에 쓰면 글자로 찍혀요.', 'その判子はない。夢に書けば文字として刷られる。'],
  all: ['all', '전부', '全部'],
  home: ['home', '집', '家'],
  table: ['table', '식탁', '食卓'],
  sky: ['sky', '하늘', '空'],
  nature: ['garden & sea', '정원과 바다', '庭と海'],
  creature: ['creatures', '생물', '生きもの'],
  thing: ['things', '물건', 'もの'],
  body: ['body', '몸', '体'],
  place: ['places', '장소', '場所'],
};
let lang: Lang = (localStorage.getItem('ap.lang') as Lang) || 'en';
let locked = localStorage.getItem('ap.lock') === '1';
const listeners = new Set<() => void>();
/** 0..1 how much labels drift away from the chosen language. */
let driftAmount = 0;
let driftSeed = 1;

export const getLang = () => lang;
export const isLocked = () => locked;
export function setLang(l: Lang) {
  lang = l; localStorage.setItem('ap.lang', l);
  document.documentElement.lang = l === 'ko' ? 'ko' : l === 'ja' ? 'ja' : 'en';
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
  if (!locked && driftAmount > 0 && h(key) < driftAmount * 0.45) li = (li + 1 + Math.floor(h(key + '·') * 2)) % 3;
  return e[li];
}
export const tA = (key: string) => (D[key] ? D[key][LANGS.indexOf(lang)] : key);
export const tAll = (key: string) => D[key] ?? [key, key, key];
document.documentElement.lang = lang === 'ko' ? 'ko' : lang === 'ja' ? 'ja' : 'en';
