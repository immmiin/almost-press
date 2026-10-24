// Hidden design-system sheet: #/system. Every token and material on one long sheet of rice paper.
import { UI, INKS, PRESETS, DREAM_TIMES, INK_BY_ID } from '../design/tokens';
import { sealSVG } from '../design/seal';
import { deckle } from '../design/paper';
import { washi, slip, stampButton, knob, enamelButton, slotSwitch } from '../design/materials';
import { Vial } from '../design/vial';
import { TOOLS } from '../press/toolDefs';

export default function system(root: HTMLElement) {
  root.innerHTML = `<main class="sys">
  <header class="sys-head">
    <h1 class="sys-title"><span class="sys-en">ALMOST PRESS</span><span class="sys-ko">거의 인쇄소</span><span class="sys-ja vert">ほぼ印刷所</span></h1>
    <p class="mono">design system sheet · hidden · #/system</p>
  </header>
  <section class="sys-sec" id="s-color"><h2 class="mono-up">01 colour · ui &amp; mist</h2><div class="sys-swatches" id="ui"></div></section>
  <section class="sys-sec"><h2 class="mono-up">02 riso ink library (multiply)</h2><div class="sys-inks" id="inks"></div>
    <h3 class="mono-up">presets</h3><div class="sys-presets" id="presets"></div>
    <h3 class="mono-up">dream time</h3><div class="sys-times" id="times"></div></section>
  <section class="sys-sec"><h2 class="mono-up">03 type</h2><div class="sys-type" id="type"></div></section>
  <section class="sys-sec"><h2 class="mono-up">04 paper · vellum · washi · slips</h2><div class="sys-mat" id="mat"></div></section>
  <section class="sys-sec"><h2 class="mono-up">05 seal 殆</h2><div class="sys-seals" id="seals"></div></section>
  <section class="sys-sec"><h2 class="mono-up">06 seal-stamp tools</h2><div class="sys-stamps vellum" id="stamps"></div></section>
  <section class="sys-sec"><h2 class="mono-up">07 ink vials · knobs · switch · print</h2><div class="sys-ctl" id="ctl"></div></section>
</main>`;
  const $ = (id: string) => root.querySelector('#' + id) as HTMLElement;

  $('ui').innerHTML = Object.entries(UI).map(([k, v]) => `<figure class="sw"><i style="background:${v}"></i><figcaption class="mono">${k}<br>${v}</figcaption></figure>`).join('');
  $('inks').innerHTML = INKS.map((i) => `<figure class="ink"><i style="background:${i.hex}"></i><i style="background:${i.hex}"></i><figcaption class="mono">${i.name}${i.metallic ? ' ≈' : ''}<br>${i.hex}</figcaption></figure>`).join('');
  $('presets').innerHTML = PRESETS.map((p) => `<div class="preset slip-mini"><span class="dots">${p.inks.map((id) => `<i style="background:${INK_BY_ID[id].hex}"></i>`).join('')}</span><span class="mono">${p.name}</span></div>`).join('');
  $('times').innerHTML = DREAM_TIMES.map((d) => `<div class="time" style="background:linear-gradient(180deg,${d.mist.join(',')})"><span class="vert ja">${d.ja}</span><span class="mono">${d.en}</span></div>`).join('');
  $('type').innerHTML = [
    ['Shippori Mincho B1', 'var(--f-display)', '夢の印刷所 ALMOST PRESS', 34],
    ['Gowun Batang', 'var(--f-ko)', '거의 인쇄소', 30],
    ['Bodoni Moda Italic', 'var(--f-accent);font-style:italic', 'almost, remembered', 34],
    ['Dela Gothic One', 'var(--f-heavy-ja)', '殆ど 白鳥 台所', 34],
    ['Black Han Sans', 'var(--f-heavy-ko)', '거의 인쇄소', 36],
    ['Rubik Mono One (stretched)', 'var(--f-wide);display:inline-block;transform:scaleX(1.6);transform-origin:left', 'PLATE', 24],
    ['IBM Plex Mono', 'var(--f-mono)', 'p.07 · fpink/orchid/mint · mis 2.4 · #0427', 11],
    ['IBM Plex Sans KR', 'var(--f-body)', 'Body text, 本文.', 14],
    ['DotGothic16', 'var(--f-pixel)', 'PAPER JAM 紙づまり', 18],
    ['Bagel Fat One', '"Bagel Fat One"', 'grandma', 34],
    ['Do Hyeon', '"Do Hyeon"', 'swim', 34],
  ].map(([n, f, s, z]) => `<div class="tline"><span class="mono">${n}</span><span style="font-family:${f};font-size:${z}px;line-height:1.2">${s}</span></div>`).join('');

  // materials
  const mat = $('mat');
  const sheet = document.createElement('div');
  sheet.className = 'sheet sys-sheet';
  sheet.innerHTML = `<span class="mono">rice paper 和紙 · deckled</span>`;
  const sw = document.createElement('div'); sw.className = 'sheet-wrap'; sw.append(sheet); mat.append(sw);
  deckle(sheet, 4, 'deckle', 4);
  const vel = document.createElement('div');
  vel.className = 'vellum sys-vellum';
  vel.innerHTML = `<span class="mono">vellum · tracing paper over the mist</span>`;
  const vw = document.createElement('div'); vw.className = 'vellum-wrap sys-vw'; vw.append(vel); mat.append(vw);
  deckle(vel, 8, 'deckle', 2.5);
  vw.append(washi(1, { left: '-14px', top: '-6px' }), washi(2, { right: '-10px', bottom: '8px' }));
  const slips = document.createElement('div'); slips.className = 'sys-slips';
  ['Start tonight’s dream', 'Unroll Issue 01', 'About the press'].forEach((s, i) => {
    const w = document.createElement('div'); w.className = 'sheet-wrap'; w.style.position = 'relative';
    const sl = slip('button', 20 + i, `<span class="ja" style="font-size:18px">${s}</span>`);
    w.append(sl, washi(30 + i, { left: '40%', top: '-8px' }, 52));
    slips.append(w);
  });
  mat.append(slips);

  // seals
  $('seals').innerHTML = [
    sealSVG({ size: 120, seed: 3, label: 'seal 殆' }),
    sealSVG({ size: 96, seed: 5, doubleStrike: true, rotate: -7 }),
    sealSVG({ size: 72, seed: 9, mode: 'line', rotate: 4 }),
    sealSVG({ chars: '0427', size: 56, seed: 11, label: 'issue 0427' }),
    sealSVG({ chars: '印刷', size: 56, seed: 13, mode: 'line', gaps: 1.5 }),
  ].map((s) => `<div class="sealbox">${s}</div>`).join('');

  // stamps
  const st = $('stamps');
  TOOLS.forEach((tool, i) => {
    const b = stampButton(tool.char, tool.en, i + 1);
    if (i === 0) b.setAttribute('aria-pressed', 'true');
    b.addEventListener('click', () => { st.querySelectorAll('.stamp').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
    st.append(b);
  });
  deckle(st, 21, 'deckle', 2);

  // controls
  const ctl = $('ctl');
  const vials = document.createElement('div'); vials.className = 'sys-vials';
  ['fpink', 'orchid', 'mint', 'sunflower'].forEach((id, i) => {
    const v = new Vial(INK_BY_ID[id].hex, 0.9 - i * 0.18, INK_BY_ID[id].name);
    v.el.addEventListener('pointerenter', () => v.slosh(0.7));
    v.el.addEventListener('click', () => { v.setLevel(v.level - 0.1); });
    vials.append(v.el);
    setTimeout(() => v.bubble(), 600 + i * 300);
  });
  ctl.append(vials);
  const knobs = document.createElement('div'); knobs.className = 'sys-knobs';
  knobs.append(knob('misreg.', 0.4, () => {}), knob('density', 0.8, () => {}), knob('grain', 0.6, () => {}), knob('drift', 0.5, () => {}));
  ctl.append(knobs);
  ctl.append(slotSwitch('side effects', [['mild', 'mild'], ['normal', 'normal'], ['wild', 'wild']], 'normal', () => {}));
  const pb = enamelButton('PRINT', 'hold');
  let fill = 0, raf = 0;
  const tick = () => { fill = Math.min(1, fill + 0.012); pb.style.setProperty('--fill', String(fill)); if (fill < 1) raf = requestAnimationFrame(tick); };
  pb.addEventListener('pointerdown', () => { pb.classList.add('held'); fill = 0; tick(); });
  addEventListener('pointerup', () => { pb.classList.remove('held'); cancelAnimationFrame(raf); });
  ctl.append(pb);

  const style = document.createElement('style');
  style.textContent = SYS_CSS;
  root.append(style);
}

const SYS_CSS = `
.sys{max-width:1180px;margin:0 auto;padding:48px 32px 120px;display:grid;gap:56px}
.sys-head{display:flex;align-items:flex-end;gap:28px}
.sys-title{margin:0;display:flex;align-items:flex-start;gap:18px}
.sys-en{font:400 54px/1 var(--f-wide);transform:scaleX(1.5) scaleY(.7);transform-origin:left;display:inline-block;margin-right:140px;letter-spacing:-.02em}
.sys-ko{font:400 44px/1 var(--f-heavy-ko);margin-top:22px}
.sys-ja{font:800 26px/1 var(--f-display);letter-spacing:.2em}
.sys-sec{display:grid;gap:16px}
.sys-sec h2,.sys-sec h3{margin:0;color:var(--soft)}
.sys-swatches,.sys-inks{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:14px}
.sw,.ink{margin:0;display:grid;gap:6px}
.sw i{display:block;height:56px;box-shadow:inset 0 0 0 .5px rgba(59,58,64,.2)}
.ink{position:relative}.ink i{display:block;height:44px;width:70%;mix-blend-mode:multiply;opacity:.9}.ink i+i{position:absolute;left:30%;top:14px}
.ink figcaption{margin-top:16px}
.sys-presets{display:flex;flex-wrap:wrap;gap:10px}
.preset{display:flex;gap:8px;align-items:center;padding:6px 10px;background:var(--pearl);box-shadow:var(--shadow-sheet)}
.dots{display:flex}.dots i{width:16px;height:16px;border-radius:50%;margin-left:-5px;mix-blend-mode:multiply}.dots i:first-child{margin-left:0}
.sys-times{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.time{height:160px;display:flex;justify-content:space-between;padding:10px}
.time .ja{font-size:22px;letter-spacing:.2em}
.sys-type{display:grid;gap:10px}.tline{display:grid;grid-template-columns:200px 1fr;align-items:baseline;gap:16px;border-top:.5px solid rgba(59,58,64,.2);padding-top:8px}
.sys-mat{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}
.sys-sheet{height:300px;padding:20px}
.sys-vw{position:relative}.sys-vellum{height:220px;padding:20px}
.sys-slips{grid-column:1/-1;display:flex;gap:36px;flex-wrap:wrap}
.sys-seals{display:flex;gap:36px;align-items:center;flex-wrap:wrap}
.sys-stamps{display:flex;gap:14px;padding:22px 20px;flex-wrap:wrap;width:max-content;max-width:100%}
.sys-ctl{display:flex;gap:48px;align-items:center;flex-wrap:wrap}
.sys-vials{display:flex;gap:12px;align-items:flex-end}.sys-vials .vial{width:44px}
.sys-knobs{display:flex;gap:10px}
`;
