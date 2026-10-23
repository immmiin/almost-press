// The object index: 100 code-drawn objects with EN / KO / JA names and aliases.
import { home } from './home';
import { table } from './table';
import { sky } from './sky';
import { nature } from './nature';
import { creature } from './creature';
import { thing } from './thing';
import { body } from './body';
import { place } from './place';
import { JA } from './ja';
import type { ObjDef, Category, Part } from '../riso/parts';

export interface Obj extends ObjDef { key: string; ja: string; jaAl: string[]; no: number }
const ALL: Record<string, ObjDef> = { ...home, ...table, ...sky, ...nature, ...creature, ...thing, ...body, ...place };
export const OBJ: Record<string, Obj> = {};
Object.entries(ALL).forEach(([key, o], i) => {
  const ja = JA[key] ?? [];
  OBJ[key] = { ...o, key, ja: ja[0] ?? o.en, jaAl: ja, no: i + 1 };
});
export const KEYS = Object.keys(OBJ);
export const CATS: Category[] = ['home', 'table', 'sky', 'nature', 'creature', 'thing', 'body', 'place'];
export const CAT_CHARS: Record<Category, string> = { home: '家', table: '卓', sky: '空', nature: '庭', creature: '生', thing: '物', body: '体', place: '所' };

const partCache = new Map<string, Part[]>();
/** Parts of an object (cached; all drawings are deterministic). */
export function partsOf(key: string): Part[] {
  let p = partCache.get(key);
  if (!p) { p = OBJ[key].d(); partCache.set(key, p); }
  return p;
}
export function nameOf(key: string, lang: 'en' | 'ko' | 'ja') {
  const o = OBJ[key];
  return lang === 'ko' ? o.ko : lang === 'ja' ? o.ja : o.en;
}
