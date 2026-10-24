// Synthesised print-shop sounds (WebAudio, no files). Off by default.
let ctx: AudioContext | null = null;
let on = localStorage.getItem('ap.sound') === '1';
export const soundOn = () => on;
export function setSound(v: boolean) { on = v; localStorage.setItem('ap.sound', v ? '1' : '0'); if (v) ac(); }
function ac() { if (!ctx) ctx = new AudioContext(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }

function noise(c: AudioContext, dur: number) {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b; return s;
}
/** Soft thud of a seal or stamp. */
export function thud(strength = 1) {
  if (!on) return; const c = ac(); const t = c.currentTime;
  const o = c.createOscillator(); const g = c.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * strength, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.25);
  const n = noise(c, 0.08); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
  const ng = c.createGain(); ng.gain.setValueAtTime(0.12 * strength, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  n.connect(f).connect(ng).connect(c.destination); n.start(t);
}
/** Paper rustle / tick. */
export function tick() {
  if (!on) return; const c = ac(); const t = c.currentTime;
  const n = noise(c, 0.04); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 2;
  const g = c.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  n.connect(f).connect(g).connect(c.destination); n.start(t);
}
/** Paper rustle: a few crinkles of filtered noise (stamping, peeling a slip). */
export function rustle(strength = 1) {
  if (!on) return; const c = ac(); const t = c.currentTime;
  const n = noise(c, 0.32); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.7;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
  // uneven crinkles: the envelope jumps a few times as fibres slide over each other
  for (let i = 0, x = t; i < 5; i++) { x += 0.025 + Math.random() * 0.05; g.gain.exponentialRampToValueAtTime((0.025 + Math.random() * 0.05) * strength, x); g.gain.exponentialRampToValueAtTime(0.004, x + 0.03); }
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  n.connect(f).connect(hp).connect(g).connect(c.destination); n.start(t); n.stop(t + 0.34);
}
/** Drum / roller hum while printing. Returns a stop function. */
export function roller(): () => void {
  if (!on) return () => {};
  const c = ac(); const t = c.currentTime;
  const n = noise(c, 6); n.loop = true;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 220; f.Q.value = 0.9;
  const o = c.createOscillator(); o.frequency.value = 55; const og = c.createGain(); og.gain.value = 0.05;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.25);
  n.connect(f).connect(g).connect(c.destination); o.connect(og).connect(g); n.start(t); o.start(t);
  return () => { const e = c.currentTime; g.gain.cancelScheduledValues(e); g.gain.setValueAtTime(g.gain.value, e); g.gain.exponentialRampToValueAtTime(0.0001, e + 0.3); n.stop(e + 0.35); o.stop(e + 0.35); };
}
/** Liquid slosh of a vial. */
export function slosh() {
  if (!on) return; const c = ac(); const t = c.currentTime;
  const n = noise(c, 0.3); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(260, t + 0.25);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  n.connect(f).connect(g).connect(c.destination); n.start(t);
}
