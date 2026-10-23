// Ports the 100 object drawings verbatim from references/dream-object-index.html into src/objects/<category>.ts.
import { readFile, writeFile } from 'node:fs/promises';
const html = await readFile('references/dream-object-index.html', 'utf8');
const lines = html.split('\n');
const start = lines.findIndex((l) => l.startsWith('const OBJ={')) + 1;
const end = lines.findIndex((l) => l.startsWith('const KEYS=')) - 1; // the '};' line
const body = lines.slice(start, end);
const files = {}; let cat = null;
const map = { home: 'home', table: 'table', sky: 'sky', 'garden & sea': 'nature', creatures: 'creature', things: 'thing', body: 'body', places: 'place' };
for (const l of body) {
  const m = l.match(/^\/\* (.+) \*\/$/);
  if (m) { cat = map[m[1]]; files[cat] = []; continue; }
  files[cat].push(l);
}
for (const [c, ls] of Object.entries(files)) {
  let txt = ls.join('\n').replace('const p=a=>{', 'const p=(a:number)=>{') // only a type annotation
  txt = txt.replace(/\}\s*$/, '},').replace(/\},,$/, '},');
  if (!txt.trimEnd().endsWith(',')) txt += ',';
  const src = `// Ported verbatim from references/dream-object-index.html (category: ${c}). Do not redraw.
/* eslint-disable */
import { s, t, k, C, E, R, D, DE, G, L, LB, RING, RINGE, SH, star, range, WAVE, type ObjDef } from '../riso/parts';
void s; void t; void k; void C; void E; void R; void D; void DE; void G; void L; void LB; void RING; void RINGE; void SH; void star; void range; void WAVE;
export const ${c}: Record<string, ObjDef> = {
${txt}
};
`;
  await writeFile(`src/objects/${c}.ts`, src);
  console.log(c, (txt.match(/^[a-z]+:\{c:/gm) || []).length);
}
