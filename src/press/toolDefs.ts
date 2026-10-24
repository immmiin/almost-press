// The ten transformation tools (section 9). Each is a seal stamp with one kanji.
export type ToolId = 'bleed' | 'bokashi' | 'haze' | 'wave' | 'pour' | 'break' | 'tube' | 'echo' | 'melt' | 'dither';
export interface ToolDef { id: ToolId; char: string; en: string; ja: string; note: string; size: number }
export const TOOLS: ToolDef[] = [
  { id: 'bleed', char: '滲', en: 'bleed', ja: 'にじみ', note: 'ink blooms along the fibres', size: 0.09 },
  { id: 'bokashi', char: '暈', en: 'bokashi', ja: 'ぼかし', note: 'a graded band of ink', size: 0.16 },
  { id: 'haze', char: '霞', en: 'haze', ja: 'かすみ', note: 'soft focus, ghost doubles', size: 0.14 },
  { id: 'wave', char: '波', en: 'wave', ja: 'なみ', note: 'torn into horizontal waves', size: 0.14 },
  { id: 'pour', char: '瀑', en: 'pour', ja: 'たき', note: 'everything below pours down', size: 0.1 },
  { id: 'break', char: '碎', en: 'break', ja: 'くだけ', note: 'macroblock tears and smears', size: 0.12 },
  { id: 'tube', char: '映', en: 'tube', ja: 'ブラウン管', note: 'scanlines, fringe, glow', size: 0.16 },
  { id: 'echo', char: '反', en: 'echo', ja: 'こだま', note: 'the area repeats into itself', size: 0.14 },
  { id: 'melt', char: '融', en: 'melt', ja: 'とける', note: 'things melt into each other', size: 0.12 },
  { id: 'dither', char: '點', en: 'dither', ja: 'てん', note: 'coarse dots, flat fields', size: 0.14 },
];
export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, ToolDef>;
