// The editor's data model. Everything is stored as data (no baked pixels) in page units:
// millimetres on the A5 trim (148 × 210), origin top-left; the 3 mm bleed extends beyond.
// Tool strokes use normalised trim coordinates (u, v in 0..1) so screen and 300 dpi renders match.
import type { ToolId } from '../press/toolDefs';

export const PAGE_W = 148, PAGE_H = 210, BLEED = 3;

export type GroundId = 'rice' | 'bokashi' | 'horizon' | 'pool' | 'sea' | 'cloud' | 'checker' | 'wash' | 'machine';
export type HelperId = 'vja' | 'hangul' | 'stretch' | 'inscription' | 'date' | 'seal' | 'issueSeal' | 'slug' | 'title';

export interface PageObj {
  id: string;
  kind: 'obj' | 'word' | 'helper';
  /** object key, the word itself, or helper id */
  key: string;
  /** helpers: text content */
  text?: string;
  /** word treatment 0..5 */
  style?: number;
  x: number; y: number; // centre, mm
  s: number; // width of the 200-unit object box, mm
  r: number; // degrees
  flip?: boolean;
  /** ink role (0..2 in the drawings) → plate index (0..3) */
  plates: number[];
  seed: number;
  opacity?: number;
  /** how the object came to be: side effects and inherited marks */
  fx?: 'trail' | 'hole' | 'copy' | 'setoff' | 'wrong' | 'shadow' | 'floor';
  /** 0..1 crumple; creases reveal a pattern */
  crumple?: number;
  /** pattern revealed by crumple / mutation */
  pattern?: number;
  /** slightly wrong variant (the twin / duplicate) */
  wrong?: number;
  /** tool-like effect applied to the object only (from drift: haze, ghost) */
  blur?: number;
}

export interface Stroke {
  tool: ToolId;
  pts: [number, number][]; // u, v
  size: number; // brush radius, fraction of trim width
  intensity: number; // 0..1
  seed: number;
  plate?: number; // bokashi: ink plate
  plate2?: number; // bokashi futa-iro: second ink
}

export interface Page {
  n: number; // 1..16
  inks: string[]; // ink ids, 1..4 plates
  ground: GroundId;
  objects: PageObj[];
  strokes: Stroke[];
  mis: number; // misregistration, mm
  density: number; // 0..1
  grain: number; // 0..1
  seed: number;
  /** printed state */
  printed: boolean;
  platesPrinted: number; // < inks.length when released early
  drift: string[]; // drift card ids applied by the machine
  layout?: string;
  /** cursor ink trail over the paper (u,v points), prints with the page */
  trail?: [number, number][];
  /** snapshot of the page as it came out of the drum (for "Reprint this page") */
  origin?: string;
  /** set-off ghost of the previous page: its objects, mirrored and faint */
  setoff?: PageObj[];
  jam?: boolean;
  /** the dream sentence as printed on this page (language drift applied) */
  dreamLine?: string;
  /** slug: page number in three languages, inks, misregistration, drift cards, dream time, seed */
  slug?: string;
}

export interface Issue {
  id: string;
  seed: number; // 0..9999, the issue number
  dream: string;
  lang: 'en' | 'ko' | 'ja';
  keepsake?: string; // object key
  pages: Page[];
  current: number; // index 0..15
  forgotten: PageObj[];
  bound?: boolean;
  fixed?: boolean; // Issue 01: art-directed, read only data source
}
