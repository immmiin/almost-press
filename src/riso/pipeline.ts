// The page pipeline (WebGL2 context #2 of 2). Per plate: a grayscale coverage field → the effect stack
// (wash edges, misregistration, the ten tools as stored strokes) → screening (halftone / grain).
// Then plates are tinted and multiplied over rice paper; seals and sharp type print on top.
// Every parameter is in page millimetres, so screen and 300 dpi renders match.
import type { Page, Stroke } from '../model/types';
import { PAGE_W, PAGE_H, BLEED } from '../model/types';
import { renderPlates, FULL_W, FULL_H, type PlateSet } from './plates';
import { INK_BY_ID, rgb01 } from '../design/tokens';
import { hash } from '../core/rng';

const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;

const COMMON = `
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
`;

// uv is texture space: (0,0) top-left of the full sheet with bleed. mm = uv * sheet (mm).
const PLATE_FS = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D plate, m0, m1, m2;
uniform vec2 sheet; uniform vec2 off; uniform float pidx, seed, grainAmt, density, washAmt, angle, starve, mm2px;
uniform vec4 echo[8]; uniform int nEcho;
${COMMON}
vec2 toUV(vec2 mm){ return mm/sheet; }
float tone(vec2 t){ vec3 c = texture(plate, t).rgb; return max(c.r, max(c.g*.52, c.b)); }
float toneS(vec2 t){ vec3 c = texture(plate, t).rgb; return max(c.r, max(c.g*.52, c.b)); }
void main(){
  vec2 mm = uv*sheet;
  vec3 M0 = texture(m0, uv).rgb; // bleed, haze, wave
  vec3 M1 = texture(m1, uv).rgb; // pour, break, tube
  vec3 M2 = texture(m2, uv).rgb; // melt, dither, spare
  float bleed=M0.r, haze=M0.g, wave=M0.b, pour=M1.r, brk=M1.g, tube=M1.b, melt=M2.r, dith=M2.g;
  vec2 p = mm - off; // misregistration per plate
  // 波 wave: torn into horizontal waves; bands tear apart
  if(wave > .002){
    float band = floor(p.y/2.6);
    float tear = (h21(vec2(band, seed)) - .5) * 5.;
    p.x += wave * (sin(p.y*.55 + seed + pidx*.35)*3.2 + tear*step(.55, h21(vec2(band*1.7, seed+pidx))));
  }
  // 碎 break: macroblock tears and colour smears
  if(brk > .002){
    vec2 blk = floor(p/vec2(4.5,3.2));
    float r = h21(blk + seed*.13 + pidx*.07);
    if(r < brk*1.1){ p.x -= (h21(blk*1.3+2.)*14. - 3.)*brk; p.y += (h21(blk+7.)-.5)*3.*brk; }
    p.x += floor(fract(p.y*.7+seed)*3.)*.6*brk*step(.7, h21(vec2(floor(p.y*1.4),seed)));
  }
  // 融 melt: strong fluid displacement, things run into each other
  if(melt > .002){
    vec2 q = p*.09 + seed;
    p += (vec2(fbm(q), fbm(q+5.2)) - .5) * 16. * melt;
    p.y += melt*melt*6.*fbm(p*.05+seed);
  }
  // 反 echo: Droste recursion of an area into itself
  float echoTone = 0.;
  for(int i=0;i<8;i++){ if(i>=nEcho) break;
    vec4 e = echo[i]; vec2 d = p - e.xy; float r = length(d);
    if(r < e.z){
      float k = mix(.62, .5, e.w);
      // ripple copies: the content repeated inward, each smaller
      for(int j=1;j<5;j++){ float s = pow(k, float(j)); echoTone = max(echoTone, tone(toUV(e.xy + d/s)) * pow(.82, float(j)) * e.w * smoothstep(e.z, e.z*.7, r)); }
    }
  }
  vec2 t = toUV(p);
  // 瀑 pour: everything below the line pours down in luminous streaks (pixel-sort feel)
  float c;
  if(pour > .002){
    float col = floor(p.x*2.2);
    float len = pour * (24. + 60.*h21(vec2(col, seed))) ;
    float best = tone(t);
    for(int i=1;i<24;i++){
      float f = float(i)/23.;
      float s = tone(toUV(p - vec2(0., len*f)));
      best = max(best, s * (1. - f*.55) * mix(.82, 1., h21(vec2(col, float(i)))));
    }
    c = mix(tone(t), best, smoothstep(0., .35, pour));
  } else c = tone(t);
  // ink-wash edges: displaced, softened, soaking into fibres
  float wA = washAmt;
  if(wA > .001){
    vec2 w = (vec2(fbm(p*.42+seed+pidx), fbm(p*.42+3.1+pidx)) - .5) * .9 * wA;
    float cw = tone(toUV(p + w));
    float soft = 0.;
    for(int i=0;i<6;i++){ float a = float(i)*1.047 + seed; soft += tone(toUV(p + w + vec2(cos(a),sin(a))*.22*wA)); }
    soft /= 6.;
    c = mix(c, mix(cw, soft, .5), .85);
  }
  // 霞 haze / 滲 bleed / glow: blur taps whose radius grows with the masks
  float blurR = haze*4.2 + melt*2.5 + tube*1.4;
  if(blurR > .05 || bleed > .002){
    float acc = 0., mx = 0.;
    float fibre = fbm(vec2(p.x*.15, p.y*1.6) + seed);
    for(int i=0;i<16;i++){
      float a = float(i)*2.39996 + seed; float r = sqrt((float(i)+.5)/16.);
      vec2 dir = vec2(cos(a), sin(a));
      float s = tone(toUV(p + dir*r*blurR));
      acc += s;
      // bleed: dilation along fibre directions (anisotropic, stretched horizontally)
      vec2 bd = vec2(dir.x*1.9, dir.y*.55) * r * bleed * (3. + 4.*fibre);
      mx = max(mx, tone(toUV(p + bd)) * (1. - r*.45));
    }
    acc /= 16.;
    if(blurR > .05) c = mix(c, acc, clamp(blurR*.6, 0., 1.));
    if(bleed > .002){
      float bloom = mx * smoothstep(.2, .9, fibre + bleed*.6);
      // darker drying edge where the bloom stops
      float ring = smoothstep(.15, .45, bloom) * (1. - smoothstep(.45, .8, bloom));
      c = max(c, bloom*.8 + ring*.35*bleed);
    }
    // ghost doubles from repeated haze passes
    if(haze > .45) c = max(c, tone(toUV(p + vec2(2.4, -1.2)*(haze-.3))) * .5 * haze);
  }
  c = max(c, echoTone);
  // 映 tube: scanlines and chroma fringing (each plate shifts differently)
  if(tube > .002){
    float fr = (pidx - 1.5) * .9 * tube;
    float cf = tone(toUV(p + vec2(fr, 0.)));
    c = mix(c, max(c*.6, cf), tube);
    c *= 1. - tube*.45*(.5+.5*sin(mm.y*5.2));
  }
  // 點 dither: coarse pixels, posterised into big grainy fields
  if(dith > .002){
    vec2 cell = floor(mm/1.6);
    float pc = tone(toUV(cell*1.6 + .8 - off));
    float lv = floor(pc*3.99)/3.;
    float bayer = h21(cell + seed);
    float dc = step(bayer*.9, lv) * step(.08, pc);
    c = mix(c, max(lv*.85, dc), smoothstep(0., .4, dith));
  }
  c = clamp(c*density, 0., 1.);
  // screening: solids stay solid, intermediate tones become halftone dots at this plate's angle
  float ca = cos(angle), sa = sin(angle);
  vec2 hp = mat2(ca,-sa,sa,ca) * mm / 1.05;
  vec2 f = fract(hp) - .5;
  float d = length(f) * 1.414;
  float aa = max(.04, 1.4/(1.05*mm2px));
  float dot_ = 1. - smoothstep(sqrt(c) - aa, sqrt(c) + aa, d);
  float screened = c > .94 ? 1. : mix(dot_, c, .12);
  // grain + ink starvation: specks of missing ink, tiny dust specks of ink
  float g = h21(floor(mm*7.5) + seed + pidx*13.);
  float gn = vn(mm*.35 + seed + pidx*3.);
  screened *= 1. - grainAmt*.55*step(g, .22 + .25*gn);
  screened *= 1. - starve*smoothstep(.35, .9, fbm(vec2(mm.x*.08, mm.y*.6) + pidx*4. + seed));
  screened = max(screened, step(.9985, g)*grainAmt*.8);
  o = vec4(screened, c, 0., 1.);
}`;

const COMP_FS = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D p0, p1, p2, p3, over, m1;
uniform vec3 ink0, ink1, ink2, ink3; uniform vec4 shown; uniform int n;
uniform vec2 sheet; uniform float opac, seed, grainAmt, view, paperTone, mm2px;
${COMMON}
void main(){
  vec2 t = vec2(uv.x, 1. - uv.y);
  vec2 mm = t*sheet;
  // rice paper: warm white, formation clouds and fibres
  float form = fbm(mm*.06 + seed*.1);
  float fib = smoothstep(.62, .9, fbm(vec2(mm.x*.9, mm.y*.09) + 3.)) * .5 + smoothstep(.66, .92, fbm(vec2(mm.x*.08, mm.y*1.1) + 9.)) * .5;
  vec3 paper = vec3(.945,.925,.886) * (1. + (form-.5)*.04) - fib*.035*vec3(1.,1.05,1.2) * paperTone;
  float c0 = texture(p0, t).r * step(t.y, shown.x), c1 = texture(p1, t).r * step(t.y, shown.y);
  float c2 = texture(p2, t).r * step(t.y, shown.z), c3 = texture(p3, t).r * step(t.y, shown.w);
  if(view > .5){
    // plate view: each plate as grayscale (like Spectrolite)
    float g;
    if(view < 4.5){ int i = int(view) - 1; g = i==0?c0: i==1?c1: i==2?c2: c3; o = vec4(vec3(1.-g*.92)*vec3(.99,.985,.975), 1.); return; }
    // all plates tiled 2×2
    vec2 q = floor(t*2.); vec2 tt = fract(t*2.);
    int i = int(q.x + q.y*2.);
    g = i==0?texture(p0,tt).r: i==1?texture(p1,tt).r: i==2?texture(p2,tt).r: texture(p3,tt).r;
    if(i >= n) g = 0.;
    o = vec4(vec3(1.-g*.92)*vec3(.99,.985,.975) - step(.497, abs(tt.x-.5))*.3 - step(.497, abs(tt.y-.5))*.3, 1.); return;
  }
  vec3 col = paper;
  col *= mix(vec3(1.), ink0, c0*opac);
  if(n>1) col *= mix(vec3(1.), ink1, c1*opac);
  if(n>2) col *= mix(vec3(1.), ink2, c2*opac);
  if(n>3) col *= mix(vec3(1.), ink3, c3*opac);
  // tube glow: a soft white halo around what the tube touches
  float tube = texture(m1, t).b;
  if(tube > .002){
    float halo = 0.;
    for(int i=0;i<12;i++){ float a = float(i)*2.39996; float r = sqrt((float(i)+.5)/12.)*3.2;
      vec2 tt = t + vec2(cos(a),sin(a))*r/sheet; halo += texture(p0,tt).g + texture(p1,tt).g*.5; }
    halo /= 12.;
    col = mix(col, vec3(1.,1.,1.02), clamp(halo*tube*.85, 0., .7));
    col += vec3(.02,.03,.05)*tube*(.5+.5*sin(mm.y*5.2));
  }
  // overlay: seal (vermilion, hand stamped) and sharp type, premultiplied
  vec4 ov = texture(over, t);
  col *= (1. - ov.a) + ov.rgb;
  // paper grain over everything
  col += (h21(floor(mm*9.) + seed) - .5) * .045 * grainAmt;
  o = vec4(col, 1.);
}`;

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type FBO = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };

export interface RenderParams {
  view?: number; // 0 composite, 1..4 a single plate, 5 all plates
  shown?: number[]; // per plate 0..1 how far the plate has printed down the sheet
  extras?: boolean;
  exclude?: string;
}

class Pipeline {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  private plateP: Prog; private compP: Prog;
  private texPlates: WebGLTexture[] = []; private texOver: WebGLTexture; private texM: WebGLTexture[] = [];
  private fbos: FBO[] = [];
  private fboSets = new Map<string, FBO[]>();
  private maskCanvases = [0, 1, 2].map(() => document.createElement('canvas'));
  private lastPlateKey = ''; private lastMaskKey = '';
  lastPlates: PlateSet | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 is required for the press');
    this.gl = gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.plateP = this.prog(PLATE_FS); this.compP = this.prog(COMP_FS);
    const mk = () => { const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t); this.texParams(); return t; };
    this.texPlates = [0, 1, 2, 3].map(mk); this.texOver = mk(); this.texM = [0, 1, 2].map(mk);
    // empty 1×1 for unused plates
    for (const t of this.texPlates) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255])); }
  }
  private texParams() {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  private prog(fs: string): Prog {
    const gl = this.gl;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader'); return s; };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    const u: Prog['u'] = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i)!; u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }
  /** FBO sets are kept per size (screen page, thumbnails, 300 dpi) so alternating renders don't reallocate. */
  private fbo(i: number, w: number, h: number): FBO {
    const gl = this.gl;
    const key = `${w}x${h}`;
    let set = this.fboSets.get(key);
    if (!set) {
      if (this.fboSets.size >= 4) {
        const [k0, old] = this.fboSets.entries().next().value as [string, FBO[]];
        old.forEach((f) => { gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fb); });
        this.fboSets.delete(k0);
      }
      set = []; this.fboSets.set(key, set);
    }
    this.fbos = set;
    let f = set[i];
    if (f) return f;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    this.texParams();
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    f = { tex, fb, w, h }; set[i] = f;
    return f;
  }
  private upload(tex: WebGLTexture, src: HTMLCanvasElement) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  }

  /** Rasterise tool strokes into three RGB mask fields (additive: repetition strengthens). */
  private masks(strokes: Stroke[], w: number, h: number) {
    const mw = Math.max(64, Math.round(w / 2)), mh = Math.max(64, Math.round(h / 2));
    const ctxs = this.maskCanvases.map((c) => { if (c.width !== mw || c.height !== mh) { c.width = mw; c.height = mh; } const x = c.getContext('2d')!; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.fillStyle = '#000'; x.fillRect(0, 0, mw, mh); x.globalCompositeOperation = 'lighter'; return x; });
    const slot: Record<string, [number, number]> = { bleed: [0, 0], haze: [0, 1], wave: [0, 2], pour: [1, 0], break: [1, 1], tube: [1, 2], melt: [2, 0], dither: [2, 1] };
    const sx = mw / FULL_W, sy = mh / FULL_H;
    const P = (u: number, v: number): [number, number] => [(BLEED + u * PAGE_W) * sx, (BLEED + v * PAGE_H) * sy];
    for (const st of strokes) {
      const sl = slot[st.tool];
      if (!sl) continue;
      const ctx = ctxs[sl[0]];
      const col = (a: number) => sl[1] === 0 ? `rgba(255,0,0,${a})` : sl[1] === 1 ? `rgba(0,255,0,${a})` : `rgba(0,0,255,${a})`;
      const rad = Math.max(2, st.size * PAGE_W * sx);
      const pts = resample(st.pts, (st.size * 0.33));
      for (const [u, v] of pts) {
        const [x, y] = P(u, v);
        if (st.tool === 'pour') {
          const len = (0.2 + st.intensity * 0.55) * PAGE_H * sy;
          const g = ctx.createLinearGradient(0, y, 0, y + len);
          g.addColorStop(0, col(0)); g.addColorStop(0.06, col(0.5 * st.intensity)); g.addColorStop(0.7, col(0.42 * st.intensity)); g.addColorStop(1, col(0));
          ctx.fillStyle = g; ctx.fillRect(x - rad * 0.6, y, rad * 1.2, len);
        } else {
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
          const a = Math.min(1, 0.38 * st.intensity);
          g.addColorStop(0, col(a)); g.addColorStop(0.55, col(a * 0.75)); g.addColorStop(1, col(0));
          ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      }
    }
    this.maskCanvases.forEach((c, i) => this.upload(this.texM[i], c));
  }

  /** Render a page at a pixel width into this.canvas. Returns the canvas (valid until the next render). */
  render(page: Page, pxW: number, params: RenderParams = {}): HTMLCanvasElement {
    const gl = this.gl;
    const plateKey = JSON.stringify([page.objects, page.inks.length, page.ground, page.seed, page.setoff?.length, page.trail?.length, page.dreamLine, page.slug, page.strokes.filter((s) => s.tool === 'bokashi'), params.extras, params.exclude, Math.round(pxW)]);
    let ps = this.lastPlates;
    if (plateKey !== this.lastPlateKey || !ps) {
      ps = renderPlates(page, pxW, { extras: params.extras, exclude: params.exclude });
      applyBokashi(ps, page);
      ps.canvases.forEach((c, i) => this.upload(this.texPlates[i], c));
      this.upload(this.texOver, ps.overlay);
      this.lastPlateKey = plateKey; this.lastPlates = ps;
    }
    const strokes = page.strokes.filter((s) => s.tool !== 'bokashi');
    const maskKey = JSON.stringify([strokes, ps.w]);
    if (maskKey !== this.lastMaskKey) { this.masks(strokes, ps.w, ps.h); this.lastMaskKey = maskKey; }
    const { w, h } = ps;
    const n = ps.canvases.length;
    const seed = (hash(page.seed, page.n) % 1000) / 10;
    const mm2px = w / FULL_W;
    const echoes = page.strokes.filter((s) => s.tool === 'echo').slice(-8).map((s) => {
      let cx = 0, cy = 0; s.pts.forEach(([u, v]) => { cx += u; cy += v; }); cx /= s.pts.length; cy /= s.pts.length;
      let r = 0; s.pts.forEach(([u, v]) => { r = Math.max(r, Math.hypot((u - cx) * PAGE_W, (v - cy) * PAGE_H)); });
      return [BLEED + cx * PAGE_W, BLEED + cy * PAGE_H, r + s.size * PAGE_W, s.intensity];
    });
    const OFF = [[1, -0.55], [-0.8, 0.85], [0.35, 1], [-0.6, -0.9]];
    const ANG = [15, 75, 45, 0];
    // per-plate passes
    gl.useProgram(this.plateP.p);
    const U = this.plateP.u;
    gl.uniform2f(U.sheet, FULL_W, FULL_H);
    gl.uniform1f(U.seed, seed);
    gl.uniform1f(U.grainAmt, page.grain);
    gl.uniform1f(U.density, 0.55 + page.density * 0.6);
    gl.uniform1f(U.washAmt, 1);
    gl.uniform1f(U.mm2px, mm2px);
    gl.uniform1f(U.starve, page.drift.includes('ink-starve') ? 0.55 : 0);
    gl.uniform1i(U.nEcho, echoes.length);
    if (echoes.length) gl.uniform4fv(U.echo, new Float32Array(echoes.flat().concat(new Array((8 - echoes.length) * 4).fill(0))));
    const spike = page.drift.includes('misregister-spike') ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const f = this.fbo(i, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texPlates[i]); gl.uniform1i(U.plate, 0);
      for (let m = 0; m < 3; m++) { gl.activeTexture(gl.TEXTURE1 + m); gl.bindTexture(gl.TEXTURE_2D, this.texM[m]); gl.uniform1i(U['m' + m], 1 + m); }
      const jit = (hash(page.seed, i, 'mis') % 1000) / 1000 - 0.5;
      gl.uniform2f(U.off, OFF[i][0] * page.mis * spike * (1 + jit * 0.3), OFF[i][1] * page.mis * spike * (1 - jit * 0.3));
      gl.uniform1f(U.pidx, i);
      gl.uniform1f(U.angle, (ANG[i] * Math.PI) / 180);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // composite
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h);
    gl.useProgram(this.compP.p);
    const C = this.compP.u;
    for (let i = 0; i < 4; i++) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, i < n ? this.fbos[i].tex : this.texPlates[3]); gl.uniform1i(C['p' + i], i); }
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, this.texOver); gl.uniform1i(C.over, 4);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, this.texM[1]); gl.uniform1i(C.m1, 5);
    const inks = [0, 1, 2, 3].map((i) => rgb01(INK_BY_ID[page.inks[i] ?? page.inks[0]]?.hex ?? '#000000'));
    gl.uniform3fv(C.ink0, inks[0]); gl.uniform3fv(C.ink1, inks[1]); gl.uniform3fv(C.ink2, inks[2]); gl.uniform3fv(C.ink3, inks[3]);
    const shown = params.shown ?? [1, 1, 1, 1].map((v, i) => (page.printed && i >= page.platesPrinted ? 0 : v));
    gl.uniform4f(C.shown, shown[0] ?? 1, shown[1] ?? 1, shown[2] ?? 1, shown[3] ?? 1);
    gl.uniform1i(C.n, n);
    gl.uniform2f(C.sheet, FULL_W, FULL_H);
    gl.uniform1f(C.opac, 0.86);
    gl.uniform1f(C.seed, seed);
    gl.uniform1f(C.grainAmt, 0.4 + page.grain * 0.6);
    gl.uniform1f(C.view, params.view ?? 0);
    gl.uniform1f(C.paperTone, 1);
    gl.uniform1f(C.mm2px, mm2px);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return this.canvas;
  }

  /** Grayscale master of one plate after effects (for the plates export). Call right after render(). */
  readPlate(i: number): ImageData {
    const gl = this.gl;
    const f = this.fbos[i];
    const px = new Uint8Array(f.w * f.h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
    gl.readPixels(0, 0, f.w, f.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const out = new ImageData(f.w, f.h);
    // FBOs are stored top-row-first (texture space), so rows are already in image order
    for (let i2 = 0; i2 < f.w * f.h; i2++) { const v = 255 - px[i2 * 4]; out.data[i2 * 4] = out.data[i2 * 4 + 1] = out.data[i2 * 4 + 2] = v; out.data[i2 * 4 + 3] = 255; }
    return out;
  }
  invalidate() { this.lastPlateKey = ''; this.lastMaskKey = ''; }
}

function resample(pts: [number, number][], step: number): [number, number][] {
  if (pts.length < 2) return pts;
  const out: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const d = Math.hypot(bx - ax, (by - ay) * PAGE_H / PAGE_W);
    const n = Math.max(1, Math.ceil(d / Math.max(0.004, step)));
    for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
  }
  return out;
}

/** 暈 bokashi strokes add ink: a soft graded band of one ink, or two inks bleeding into each other. */
function applyBokashi(ps: PlateSet, page: Page) {
  const strokes = page.strokes.filter((s) => s.tool === 'bokashi');
  if (!strokes.length) return;
  const n = ps.canvases.length;
  for (const st of strokes) {
    const pts = resample(st.pts, st.size * 0.25);
    const draw = (plate: number, shift: number, a: number) => {
      const c = ps.canvases[plate % n].getContext('2d')!;
      c.save(); c.setTransform(ps.ppm, 0, 0, ps.ppm, BLEED * ps.ppm, BLEED * ps.ppm); c.globalCompositeOperation = 'lighter';
      const rad = st.size * PAGE_W;
      for (const [u, v] of pts) {
        const x = u * PAGE_W, y = v * PAGE_H + shift * rad;
        // ichimonji: a straight horizontal band — wide and flat rather than round
        const g = c.createLinearGradient(0, y - rad, 0, y + rad);
        g.addColorStop(0, 'rgba(0,0,255,0)'); g.addColorStop(0.5, `rgba(0,0,255,${(a * st.intensity * 0.22).toFixed(3)})`); g.addColorStop(1, 'rgba(0,0,255,0)');
        c.fillStyle = g; c.fillRect(x - rad * 1.6, y - rad, rad * 3.2, rad * 2);
      }
      c.restore();
    };
    draw(st.plate ?? 0, st.plate2 !== undefined ? -0.45 : 0, 1);
    if (st.plate2 !== undefined) draw(st.plate2, 0.45, 1);
  }
}

let inst: Pipeline | null = null;
export function pipeline(): Pipeline { return inst ?? (inst = new Pipeline()); }
export type { Pipeline };
