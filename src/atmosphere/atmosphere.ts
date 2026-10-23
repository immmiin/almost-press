// The atmosphere layer behind every screen (WebGL2 context #1 of 2).
// A living bokashi mist (slow warped mesh gradient + ichimonji band + paper grain) and a cursor fluid:
// moving the cursor drags watercolour through the mist, clicking drops an ink bloom.
// The fluid is a small stable-fluids solver written for this project, after the structure of
// Pavel Dobryakov's MIT-licensed "WebGL Fluid Simulation" (credited in the Colophon).
import { DREAM_TIMES, rgb01, nightOf } from '../design/tokens';
import { reducedMotion } from '../core/rng';

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;

const NOISE = `
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }`;

const MIST_FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform vec3 c0,c1,c2,c3,glow; uniform vec3 ink0,ink1,ink2;
uniform float t, aspect, band, flash, sleep, dissolve;
uniform vec3 flashCol;
uniform sampler2D dye; uniform vec2 dyeTexel; uniform float useDye;
${NOISE}
void main(){
  vec2 q = vec2(uv.x*aspect, uv.y);
  float T = t*.018;
  // warped mesh gradient (bokashi): four soft colour points drifting
  vec2 w = vec2(fbm(q*1.3+T), fbm(q*1.3-T+4.1));
  vec2 r = q + (w-.5)*.55;
  vec2 p0 = vec2(.15*aspect+.1*sin(T*3.1), .85), p1 = vec2(.85*aspect, .78+.06*cos(T*2.3));
  vec2 p2 = vec2(.30*aspect, .12+.05*sin(T*1.7)), p3 = vec2(.78*aspect+.08*cos(T*2.7), .25);
  float w0 = 1./pow(distance(r,p0)+.2,2.6), w1 = 1./pow(distance(r,p1)+.2,2.6);
  float w2 = 1./pow(distance(r,p2)+.2,2.6), w3 = 1./pow(distance(r,p3)+.2,2.6);
  vec3 col = (c0*w0+c1*w1+c2*w2+c3*w3)/(w0+w1+w2+w3);
  // ichimonji bokashi: a straight graded band near the top
  float b = smoothstep(.0,.12, uv.y-.80) * (1.-smoothstep(.12,.3, uv.y-.80));
  col = mix(col, col*mix(vec3(1.),c3,.55), b*band);
  // 運霧 mist banks drifting sideways, separating near and far
  float m = fbm(vec2(q.x*1.8 - T*2., q.y*5.));
  col = mix(col, vec3(.985,.975,.965), smoothstep(.45,.9,m)*.35);
  // faint ink tones of the current page floating in the far mist
  float n1 = fbm(q*2.2 + vec2(T*1.3, -T)), n2 = fbm(q*2.6 - vec2(T, T*.7)+7.);
  col *= mix(vec3(1.), mix(vec3(1.), ink0, .10), smoothstep(.55,.8,n1));
  col *= mix(vec3(1.), mix(vec3(1.), ink1, .08), smoothstep(.6,.85,n2));
  // watercolour from the cursor: dye = absorbance, edges dry darker
  if(useDye > .5){
    vec3 d = texture(dye, uv).rgb;
    float l = length(texture(dye, uv+vec2(dyeTexel.x,0)).rgb) + length(texture(dye, uv-vec2(dyeTexel.x,0)).rgb)
            + length(texture(dye, uv+vec2(0,dyeTexel.y)).rgb) + length(texture(dye, uv-vec2(0,dyeTexel.y)).rgb);
    float edge = clamp(abs(l*.25 - length(d))*7., 0., .5);
    col *= exp(-d*1.25) * (1. - edge*.25);
  }
  // print flash: a soft bloom of one ink across the mist
  col = mix(col, col*mix(vec3(1.), flashCol, .55), flash*smoothstep(1.2,.1,distance(uv,vec2(.5,.45))));
  // fluorescent glow at moonlight
  col += glow*.06*smoothstep(.62,.95,fbm(q*1.5+T*.6))*(1.-sleep*.5);
  // paper grain
  float g = h21(gl_FragCoord.xy + fract(t*.37)*vec2(37.,91.));
  col += (g-.5)*.028;
  // watercolour dissolve between screens: a wet paper wash
  float dn = fbm(q*3.+3.3);
  float dm = dn*1.15-.08 + uv.y*.1;
  col = mix(col, vec3(.965,.95,.93), smoothstep(dm-.15, dm, dissolve*1.25) * step(.001, dissolve));
  o = vec4(col,1.);
}`;

// ---- fluid programs ----
const ADVECT = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D vel, src; uniform vec2 texel; uniform float dt, diss;
void main(){ vec2 c = uv - dt*texture(vel,uv).xy*texel; o = diss*texture(src,c); }`;
const SPLAT = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D tgt; uniform vec2 pt; uniform vec3 col; uniform float rad, aspect;
void main(){ vec2 d = uv-pt; d.x*=aspect; float g = exp(-dot(d,d)/rad); o = vec4(texture(tgt,uv).xyz + col*g, 1.); }`;
const DIV = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D vel; uniform vec2 texel;
void main(){ float L=texture(vel,uv-vec2(texel.x,0)).x, R=texture(vel,uv+vec2(texel.x,0)).x;
 float B=texture(vel,uv-vec2(0,texel.y)).y, T=texture(vel,uv+vec2(0,texel.y)).y; o=vec4(.5*(R-L+T-B),0,0,1); }`;
const PRESS = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D pr, dv; uniform vec2 texel;
void main(){ float L=texture(pr,uv-vec2(texel.x,0)).x, R=texture(pr,uv+vec2(texel.x,0)).x;
 float B=texture(pr,uv-vec2(0,texel.y)).x, T=texture(pr,uv+vec2(0,texel.y)).x;
 o=vec4((L+R+B+T-texture(dv,uv).x)*.25,0,0,1); }`;
const GRAD = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D pr, vel; uniform vec2 texel;
void main(){ float L=texture(pr,uv-vec2(texel.x,0)).x, R=texture(pr,uv+vec2(texel.x,0)).x;
 float B=texture(pr,uv-vec2(0,texel.y)).x, T=texture(pr,uv+vec2(0,texel.y)).x;
 o=vec4(texture(vel,uv).xy - .5*vec2(R-L,T-B), 0, 1); }`;
const CLEAR = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D src; uniform float k;
void main(){ o = k*texture(src,uv); }`;

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type FBO = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };
type DFBO = { read: FBO; write: FBO; swap(): void };

class Atmosphere {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  private mist!: Prog; private adv!: Prog; private spl!: Prog; private div!: Prog; private prs!: Prog; private grd!: Prog; private clr!: Prog;
  private fluidOK = false;
  private vel!: DFBO; private dye!: DFBO; private pressure!: DFBO; private divergence!: FBO;
  private cols = DREAM_TIMES[0].mist.map(rgb01);
  private target = this.cols.map((c) => c.slice() as [number, number, number]);
  private glowC = rgb01(DREAM_TIMES[0].glow); private glowT = this.glowC.slice() as [number, number, number];
  private inks: [number, number, number][] = [rgb01('#FF48B0'), rgb01('#BB76CF'), rgb01('#82D8D5')];
  private flash = 0; private flashCol: [number, number, number] = [1, 1, 1];
  private band = 1; private sleepT = 0; private sleepTarget = 0; private dissolveV = 0;
  private t = 0; private last = 0; private raf = 0; private running = false;
  private pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false, ci: 0 };
  private splats: { x: number; y: number; dx: number; dy: number; col: [number, number, number]; r: number }[] = [];
  private static = reducedMotion();
  private scale = 0.5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('no webgl2');
    this.gl = gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.mist = this.prog(MIST_FS);
    this.fluidOK = !!gl.getExtension('EXT_color_buffer_float') && !this.static;
    gl.getExtension('OES_texture_float_linear');
    if (this.fluidOK) {
      this.adv = this.prog(ADVECT); this.spl = this.prog(SPLAT); this.div = this.prog(DIV);
      this.prs = this.prog(PRESS); this.grd = this.prog(GRAD); this.clr = this.prog(CLEAR);
      this.vel = this.dfbo(128, 128 * 0.66);
      this.pressure = this.dfbo(128, 128 * 0.66);
      this.divergence = this.fbo(128, 128 * 0.66);
      this.dye = this.dfbo(512, 512 * 0.66);
    }
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => this.onMove(e), { passive: true });
    addEventListener('pointerdown', (e) => this.bloom(e.clientX / innerWidth, 1 - e.clientY / innerHeight), { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (m) => { this.static = m.matches; if (this.static) this.renderOnce(); else this.start(); });
    this.start();
  }

  private prog(fs: string): Prog {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    const u: Prog['u'] = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i)!; u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }
  private fbo(w: number, h: number): FBO {
    const gl = this.gl; w = Math.round(w); h = Math.round(h);
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h };
  }
  private dfbo(w: number, h: number): DFBO {
    const d = { read: this.fbo(w, h), write: this.fbo(w, h), swap() { const t = d.read; d.read = d.write; d.write = t; } };
    return d;
  }
  private resize() {
    const w = Math.max(2, Math.round(innerWidth * this.scale)), h = Math.max(2, Math.round(innerHeight * this.scale));
    this.canvas.width = w; this.canvas.height = h;
    if (this.static) this.renderOnce();
  }
  private onMove(e: PointerEvent) {
    const x = e.clientX / innerWidth, y = 1 - e.clientY / innerHeight;
    const p = this.pointer;
    p.dx = (x - p.x) * 6000 * 0.12; p.dy = (y - p.y) * 6000 * 0.12;
    p.x = x; p.y = y; p.moved = true;
    this.wake();
  }

  // ---------- public API ----------
  /** Dream time for a page 1..16: mist colours blend continuously through the night. */
  setPage(page: number) {
    const n = nightOf(page) * 3;
    const i = Math.min(2, Math.floor(n)), f = n - i;
    const A = DREAM_TIMES[i], B = DREAM_TIMES[i + 1];
    this.target = A.mist.map((c, k) => { const a = rgb01(c), b = rgb01(B.mist[k]); return a.map((v, j) => v + (b[j] - v) * f) as [number, number, number]; });
    const ga = rgb01(A.glow), gb = rgb01(B.glow);
    this.glowT = ga.map((v, j) => (v + (gb[j] - v) * f) * (page >= 13 ? 1 : 0.35)) as [number, number, number];
    if (this.static) { this.cols = this.target; this.renderOnce(); }
  }
  setInks(hexes: string[]) { this.inks = [0, 1, 2].map((i) => rgb01(hexes[i % hexes.length])); if (this.static) this.renderOnce(); }
  /** Soft flash of one ink across the mist (print). */
  flashInk(hex: string, amount = 1) { this.flashCol = rgb01(hex); this.flash = Math.max(this.flash, amount); this.wake(); }
  /** Drop a bloom of ink at a normalised point (y up). */
  bloom(x: number, y: number, hex?: string, size = 1) {
    if (!this.fluidOK || this.static) return;
    const c = hex ? rgb01(hex) : this.inks[this.pointer.ci++ % 3];
    const col = c.map((v) => (1 - v) * 0.5 * size) as [number, number, number];
    this.splats.push({ x, y, dx: 0, dy: 0, col, r: 0.0022 * size });
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + Math.random();
      this.splats.push({ x: x + Math.cos(a) * 0.012, y: y + Math.sin(a) * 0.012, dx: Math.cos(a) * 120 * size, dy: Math.sin(a) * 120 * size, col: col.map((v) => v * 0.25) as [number, number, number], r: 0.0009 * size });
    }
    this.wake();
  }
  /** 0 = clear, 1 = fully washed out (used by screen transitions). */
  setDissolve(v: number) { this.dissolveV = v; if (this.static) this.renderOnce(); }
  setBand(v: number) { this.band = v; }
  /** The press dozes: mist slows. */
  sleep(on: boolean) { this.sleepTarget = on ? 1 : 0; }
  wake() { this.sleepTarget = 0; }

  start() {
    if (this.static) { this.renderOnce(); return; }
    if (this.running || document.hidden) return;
    this.running = true; this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.033, (now - this.last) / 1000); this.last = now;
    this.sleepT += (this.sleepTarget - this.sleepT) * 0.02;
    this.t += dt * (1 - this.sleepT * 0.85);
    const k = 1 - Math.pow(0.02, dt / 2);
    this.cols = this.cols.map((c, i) => c.map((v, j) => v + (this.target[i][j] - v) * k) as [number, number, number]);
    this.glowC = this.glowC.map((v, j) => v + (this.glowT[j] - v) * k) as [number, number, number];
    this.flash *= Math.pow(0.25, dt);
    if (this.fluidOK) this.stepFluid(dt);
    this.drawMist();
    this.raf = requestAnimationFrame(this.frame);
  };
  private renderOnce() { this.cols = this.target; this.glowC = this.glowT; requestAnimationFrame(() => this.drawMist()); }

  private bindTex(prog: Prog, name: string, tex: WebGLTexture, unit: number) {
    const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(prog.u[name], unit);
  }
  private blit(target: FBO | null) {
    const gl = this.gl;
    if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, target.w, target.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  private splat(x: number, y: number, dx: number, dy: number, col: [number, number, number], r: number) {
    const gl = this.gl, P = this.spl;
    gl.useProgram(P.p);
    gl.uniform1f(P.u.aspect, innerWidth / innerHeight);
    gl.uniform2f(P.u.pt, x, y);
    gl.uniform1f(P.u.rad, r);
    this.bindTex(P, 'tgt', this.vel.read.tex, 0);
    gl.uniform3f(P.u.col, dx, dy, 0);
    this.blit(this.vel.write); this.vel.swap();
    this.bindTex(P, 'tgt', this.dye.read.tex, 0);
    gl.uniform3f(P.u.col, col[0], col[1], col[2]);
    gl.uniform1f(P.u.rad, r * 1.4);
    this.blit(this.dye.write); this.dye.swap();
  }
  private stepFluid(dt: number) {
    const gl = this.gl;
    const p = this.pointer;
    if (p.moved) {
      p.moved = false;
      const sp = Math.hypot(p.dx, p.dy);
      if (sp > 0.5) {
        const c = this.inks[Math.floor(this.t * 0.25) % 3];
        const amt = Math.min(0.09, sp * 0.0012);
        this.splat(p.x, p.y, p.dx, p.dy, c.map((v) => (1 - v) * amt) as [number, number, number], 0.0011);
      }
    }
    for (const s of this.splats.splice(0)) this.splat(s.x, s.y, s.dx, s.dy, s.col, s.r);
    const vt = [1 / this.vel.read.w, 1 / this.vel.read.h];
    // advect velocity
    gl.useProgram(this.adv.p);
    gl.uniform2f(this.adv.u.texel, vt[0], vt[1]);
    gl.uniform1f(this.adv.u.dt, dt);
    gl.uniform1f(this.adv.u.diss, 0.985);
    this.bindTex(this.adv, 'vel', this.vel.read.tex, 0);
    this.bindTex(this.adv, 'src', this.vel.read.tex, 1);
    this.blit(this.vel.write); this.vel.swap();
    // divergence + pressure
    gl.useProgram(this.div.p); gl.uniform2f(this.div.u.texel, vt[0], vt[1]);
    this.bindTex(this.div, 'vel', this.vel.read.tex, 0); this.blit(this.divergence);
    gl.useProgram(this.clr.p); gl.uniform1f(this.clr.u.k, 0.8);
    this.bindTex(this.clr, 'src', this.pressure.read.tex, 0); this.blit(this.pressure.write); this.pressure.swap();
    gl.useProgram(this.prs.p); gl.uniform2f(this.prs.u.texel, vt[0], vt[1]);
    this.bindTex(this.prs, 'dv', this.divergence.tex, 1);
    for (let i = 0; i < 16; i++) { this.bindTex(this.prs, 'pr', this.pressure.read.tex, 0); this.blit(this.pressure.write); this.pressure.swap(); }
    gl.useProgram(this.grd.p); gl.uniform2f(this.grd.u.texel, vt[0], vt[1]);
    this.bindTex(this.grd, 'pr', this.pressure.read.tex, 0); this.bindTex(this.grd, 'vel', this.vel.read.tex, 1);
    this.blit(this.vel.write); this.vel.swap();
    // advect dye; blooms fade over a few seconds
    gl.useProgram(this.adv.p);
    gl.uniform2f(this.adv.u.texel, vt[0], vt[1]);
    gl.uniform1f(this.adv.u.diss, Math.pow(0.55, dt));
    this.bindTex(this.adv, 'vel', this.vel.read.tex, 0);
    this.bindTex(this.adv, 'src', this.dye.read.tex, 1);
    this.blit(this.dye.write); this.dye.swap();
  }
  private drawMist() {
    const gl = this.gl, P = this.mist;
    gl.useProgram(P.p);
    const [a, b, c, d] = this.cols;
    gl.uniform3fv(P.u.c0, a); gl.uniform3fv(P.u.c1, b); gl.uniform3fv(P.u.c2, c); gl.uniform3fv(P.u.c3, d);
    gl.uniform3fv(P.u.glow, this.glowC);
    gl.uniform3fv(P.u.ink0, this.inks[0]); gl.uniform3fv(P.u.ink1, this.inks[1]); gl.uniform3fv(P.u.ink2, this.inks[2]);
    gl.uniform1f(P.u.t, this.static ? 40 : this.t + 40);
    gl.uniform1f(P.u.aspect, innerWidth / innerHeight);
    gl.uniform1f(P.u.band, this.band);
    gl.uniform1f(P.u.flash, this.flash);
    gl.uniform3fv(P.u.flashCol, this.flashCol);
    gl.uniform1f(P.u.sleep, this.sleepT);
    gl.uniform1f(P.u.dissolve, this.dissolveV);
    gl.uniform1f(P.u.useDye, this.fluidOK ? 1 : 0);
    if (this.fluidOK) {
      this.bindTex(P, 'dye', this.dye.read.tex, 0);
      gl.uniform2f(P.u.dyeTexel, 1 / this.dye.read.w, 1 / this.dye.read.h);
    }
    this.blit(null);
  }
}

let inst: Atmosphere | null = null;
/** Shared atmosphere. Returns a no-op stub if WebGL2 is unavailable (CSS gradient fallback). */
export function atmosphere(): Pick<Atmosphere, 'setPage' | 'setInks' | 'flashInk' | 'bloom' | 'setDissolve' | 'setBand' | 'sleep' | 'wake'> {
  if (inst) return inst;
  try { inst = new Atmosphere(document.getElementById('atmosphere') as HTMLCanvasElement); return inst; }
  catch (e) {
    console.warn('atmosphere fallback', e);
    document.body.style.background = 'linear-gradient(180deg,#F7C6D4,#F6F2EC 40%,#C4D8EC)';
    const noop = () => {};
    return { setPage: noop, setInks: noop, flashInk: noop, bloom: noop, setDissolve: noop, setBand: noop, sleep: noop, wake: noop };
  }
}

/** Watercolour dissolve between screens: wash the mist over, swap, wash back. */
export async function dissolveTo(swap: () => void, ms = 900) {
  const a = atmosphere();
  if (reducedMotion()) { swap(); return; }
  const app = document.getElementById('app')!;
  const anim = (from: number, to: number, d: number) => new Promise<void>((res) => {
    const t0 = performance.now();
    const f = (now: number) => {
      const k = Math.min(1, (now - t0) / d);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const v = from + (to - from) * e;
      a.setDissolve(v); app.style.opacity = String(1 - v);
      app.style.filter = v > 0.02 ? `blur(${(v * 6).toFixed(2)}px)` : '';
      if (k < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
  await anim(0, 1, ms / 2);
  swap();
  await anim(1, 0, ms / 2);
  app.style.filter = ''; app.style.opacity = '';
  a.setDissolve(0);
}
