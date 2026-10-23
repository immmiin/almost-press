// Read a generated PDF back: page count, page sizes (mm) and embedded image pixel sizes.
// jsPDF compresses streams only, so the object dictionaries are plain text and a small scan is enough.
// Pure (no DOM), so the verification script can use it in Node as well.
export interface PdfFacts { pages: number; sizesMM: string[]; images: string[] }

export function inspectPdf(bytes: Uint8Array): PdfFacts {
  let s = '';
  for (let i = 0; i < bytes.length; i += 65536) s += String.fromCharCode(...bytes.subarray(i, i + 65536));
  // drop stream bodies so binary data never matches
  s = s.replace(/(?<!end)stream\r?\n[\s\S]*?endstream/g, 'stream endstream');
  const pages = (s.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
  const pt2mm = (v: number) => Math.round((v / 72) * 25.4 * 10) / 10;
  const sizesMM = [...s.matchAll(/\/MediaBox\s*\[\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*\]/g)]
    .map((m) => `${pt2mm(+m[3] - +m[1])}×${pt2mm(+m[4] - +m[2])}`);
  const images = s.split(/\d+\s+0\s+obj/).filter((o) => /\/Subtype\s*\/Image/.test(o)).map((o) => {
    const w = /\/Width\s+(\d+)/.exec(o)?.[1], h = /\/Height\s+(\d+)/.exec(o)?.[1];
    return `${w}×${h}`;
  });
  return { pages, sizesMM, images };
}

/** "16 pages · 154×216 mm · 16 images 1819×2551 px" */
export function summarise(f: PdfFacts): string {
  const uniq = (a: string[]) => [...new Set(a)];
  return `${f.pages} pages · ${uniq(f.sizesMM).join(', ')} mm · ${f.images.length} images ${uniq(f.images).join(', ')} px`;
}
