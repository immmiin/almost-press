// Colour tokens. UI / atmosphere colours, the riso ink library, presets and dream time.

export const UI = {
  pearl: '#F6F2EC', // 진주
  rice: '#F1ECE2', // 한지
  peach: '#F7C6D4', // 도화
  mauve: '#E6B5C9',
  wisteria: '#C9B6E4', // 등꽃
  lilac: '#A88BC9',
  celadon: '#CFE6D2', // 청자
  mugwort: '#B7CFA6', // 쑥
  mist: '#C4D8EC', // 안개
  moonwater: '#A9C6E8',
  sumi: '#3B3A40', // 먹
  softInk: '#77737C',
  vermilion: '#E5483E', // 주
  fluoPink: '#FF48B0',
  fluoGreen: '#44D62C',
  cornflower: '#62A8E5',
} as const;

export interface Ink { id: string; name: string; hex: string; metallic?: boolean }

export const INKS: Ink[] = [
  { id: 'fpink', name: 'Fluorescent Pink', hex: '#FF48B0' },
  { id: 'lmauve', name: 'Light Mauve', hex: '#E6B5C9' },
  { id: 'orchid', name: 'Orchid', hex: '#BB76CF' },
  { id: 'violet', name: 'Violet', hex: '#9D7AD2' },
  { id: 'purple', name: 'Purple', hex: '#765BA7' },
  { id: 'burgundy', name: 'Burgundy', hex: '#914E72' },
  { id: 'bred', name: 'Bright Red', hex: '#F15060' },
  { id: 'scarlet', name: 'Scarlet', hex: '#F65058' },
  { id: 'forange', name: 'Fluorescent Orange', hex: '#FF7477' },
  { id: 'orange', name: 'Orange', hex: '#FF6C2F' },
  { id: 'sunflower', name: 'Sunflower', hex: '#FFB511' },
  { id: 'yellow', name: 'Yellow', hex: '#FFE800' },
  { id: 'llime', name: 'Light Lime', hex: '#E3ED55' },
  { id: 'fgreen', name: 'Fluorescent Green', hex: '#44D62C' },
  { id: 'green', name: 'Green', hex: '#00A95C' },
  { id: 'seafoam', name: 'Seafoam', hex: '#62C2B1' },
  { id: 'mint', name: 'Mint', hex: '#82D8D5' },
  { id: 'teal', name: 'Teal', hex: '#00838A' },
  { id: 'smokyteal', name: 'Smoky Teal', hex: '#5F8289' },
  { id: 'aqua', name: 'Aqua', hex: '#5EC8E5' },
  { id: 'sky', name: 'Sky Blue', hex: '#4982CF' },
  { id: 'cornflower', name: 'Cornflower', hex: '#62A8E5' },
  { id: 'blue', name: 'Blue', hex: '#0078BF' },
  { id: 'mblue', name: 'Medium Blue', hex: '#3255A4' },
  { id: 'federal', name: 'Federal Blue', hex: '#3D5588' },
  { id: 'brown', name: 'Brown', hex: '#925F52' },
  { id: 'gold', name: 'Metallic Gold', hex: '#AC936E', metallic: true },
  { id: 'lgray', name: 'Light Gray', hex: '#88898A' },
  { id: 'black', name: 'Black', hex: '#000000' },
];

export const INK_BY_ID: Record<string, Ink> = Object.fromEntries(INKS.map((i) => [i.id, i]));

export interface Preset { id: string; name: string; inks: string[] }
export const PRESETS: Preset[] = [
  { id: 'dawn', name: 'Dawn', inks: ['fpink', 'orchid', 'mint'] },
  { id: 'celadon', name: 'Celadon', inks: ['seafoam', 'llime', 'sky'] },
  { id: 'wisteria', name: 'Wisteria', inks: ['violet', 'lmauve', 'mint'] },
  { id: 'moonwater', name: 'Moonwater', inks: ['cornflower', 'orchid', 'llime'] },
  { id: 'peachmist', name: 'Peach Mist', inks: ['forange', 'lmauve', 'seafoam'] },
  { id: 'sumi', name: 'Sumi', inks: ['black', 'lgray', 'scarlet'] },
];

/** Dream time: four bands of the night, each with mist colours (always light). */
export interface DreamTime { id: 'dawn' | 'day' | 'dusk' | 'moon'; en: string; ko: string; ja: string; mist: string[]; glow: string }
export const DREAM_TIMES: DreamTime[] = [
  { id: 'dawn', en: 'dawn', ko: '새벽', ja: '夜明け', mist: ['#F7C6D4', '#F6F2EC', '#F3D9CF', '#E6B5C9'], glow: '#FF48B0' },
  { id: 'day', en: 'day', ko: '낮', ja: '昼', mist: ['#CFE6D2', '#C4D8EC', '#F1ECE2', '#B7CFA6'], glow: '#44D62C' },
  { id: 'dusk', en: 'dusk', ko: '해질녘', ja: '夕暮れ', mist: ['#C9B6E4', '#E6B5C9', '#F1E6EE', '#A88BC9'], glow: '#FF48B0' },
  { id: 'moon', en: 'moonlight', ko: '달빛', ja: '月明かり', mist: ['#A9C6E8', '#C9B6E4', '#DCE6F4', '#B9A6DA'], glow: '#62A8E5' },
];
/** Page number 1–16 → dream time band. */
export const dreamTimeOf = (page: number): DreamTime => DREAM_TIMES[Math.min(3, Math.max(0, Math.floor((page - 1) / 4)))];
/** Continuous 0..1 through the night for a page (used to blend mist colours). */
export const nightOf = (page: number) => Math.min(1, Math.max(0, (page - 1) / 15));

export const FONTS = {
  display: '"Shippori Mincho B1", "Gowun Batang", serif',
  ko: '"Gowun Batang", serif',
  accent: '"Bodoni Moda", serif',
  heavyJa: '"Dela Gothic One", sans-serif',
  heavyKo: '"Black Han Sans", sans-serif',
  wide: '"Rubik Mono One", monospace',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
  body: '"IBM Plex Sans KR", "Apple SD Gothic Neo", sans-serif',
  pixel: '"DotGothic16", monospace',
  fat: '"Bagel Fat One", sans-serif',
  tall: '"Do Hyeon", sans-serif',
} as const;

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgb01 = (hex: string) => hexToRgb(hex).map((v) => v / 255) as [number, number, number];
export function mixHex(a: string, b: string, t: number) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
