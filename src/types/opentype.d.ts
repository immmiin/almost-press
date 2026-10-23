declare module 'opentype.js' {
  export interface Path { toPathData(decimals?: number): string; getBoundingBox(): { x1: number; y1: number; x2: number; y2: number } }
  export interface Glyph { index: number; advanceWidth: number; getPath(x: number, y: number, size: number): Path }
  export interface Font {
    unitsPerEm: number; ascender: number; descender: number;
    charToGlyph(c: string): Glyph;
    getPath(text: string, x: number, y: number, size: number): Path;
    getAdvanceWidth(text: string, size: number): number;
  }
  export function parse(buf: ArrayBuffer): Font;
}
