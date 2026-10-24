// Colophon: about the project, inks, fonts, seeds, the moodboard, credits and licences, in three languages,
// laid out like the inscriptions on a painting — small blocks of vertical and horizontal text around a large
// seal, with a lot of empty paper.
import './colophon.css';
import { sealSVG } from '../design/seal';
import { deckle } from '../design/paper';
import { washi } from '../design/materials';
import { INKS, PRESETS, INK_BY_ID } from '../design/tokens';
import { t, onLang } from '../core/i18n';
import { atmosphere } from '../atmosphere/atmosphere';
import { getIssue, ISSUE_NO } from '../model/store';
import { reducedMotion } from '../core/rng';
import { thud } from '../core/sound';

const FONTS: [string, string][] = [
  ['Shippori Mincho B1', 'display · 表題'], ['Gowun Batang', 'serif fallback'], ['Bodoni Moda Italic', 'accents'],
  ['Dela Gothic One', 'heavy blocks · 太字'], ['Black Han Sans', 'the brand block'], ['Rubik Mono One', 'STRETCHED LABELS'],
  ['IBM Plex Mono', 'tiny labels'], ['IBM Plex Sans KR', 'body · 本文'], ['DotGothic16', 'LCD · ドット'],
  ['Bagel Fat One', 'type objects'], ['Do Hyeon', 'type stamps'],
];

export default function colophon(root: HTMLElement) {
  const is = getIssue();
  const issue01Inks = ['forange', 'mint', 'lmauve', 'llime', 'seafoam', 'sky', 'cornflower', 'orchid', 'violet', 'fpink', 'aqua'].filter((id) => INK_BY_ID[id]);
  root.innerHTML = `<main class="colophon">
    <nav class="c-nav mono"><a href="#/gate">← ${t('gate')}</a><a href="#/press">${t('press')}</a><a href="#/reader?issue=01">${t('scroll')}</a></nav>
    <div class="c-sheet-wrap"><article class="c-sheet sheet" aria-label="colophon · 奥付">
      <h1 class="c-title"><span class="c-t-ja">奥付</span><span class="c-t-en">colophon</span></h1>
      <div class="c-seal" aria-hidden="true">${sealSVG({ size: 260, seed: 21, doubleStrike: true, rotate: -2.5 })}</div>

      <section class="c-blk c-about-en" lang="en"><h2 class="mono-up">the press</h2>
        <p>ALMOST PRESS is a dream print shop floating in ink-wash mist. A visitor prints one dream into a sixteen-page A5
        risograph zine, named only by its issue number. Every page starts as crisp, ordinary drawn objects; each edit makes them
        bleed, blur, pour, break and melt, until the last page is a soft painting with a seal and a few sharp words.</p>
        <p class="mono">SVA · graphic design · class project, ${new Date().getFullYear()}</p></section>

      <section class="c-blk c-about-ja vert" lang="ja"><p>ほぼ印刷所は、水墨の霞に浮かぶ夢の印刷所。夢をひとこと、十六頁のリソグラフの冊子に刷る。はじめの頁はくっきりと、刷るたびに滲み、ぼやけ、流れ、砕け、溶けて、最後には落款と小さな文字だけが残る。</p></section>

      <section class="c-blk c-inks"><h2 class="mono-up">inks · インク</h2>
        <ul>${INKS.map((i) => `<li class="mono"><i style="background:${i.hex}"></i>${i.name.toLowerCase()}${i.metallic ? ' *' : ''}</li>`).join('')}</ul>
        <p class="mono">multiplied on screen, as on the drum. * metallic is approximate.<br>presets: ${PRESETS.map((p) => p.name.toLowerCase()).join(' · ')}</p></section>

      <section class="c-blk c-fonts"><h2 class="mono-up">type · 書体</h2>
        <ul>${FONTS.map(([f, role]) => `<li><span style="font-family:'${f.replace(' Italic', '')}'${f.includes('Italic') ? ';font-style:italic' : ''}${f === 'Rubik Mono One' ? ';font-size:11px' : ''}">${f}</span><span class="mono">${role}</span></li>`).join('')}</ul>
        <p class="mono">all SIL Open Font License 1.1, via Google Fonts; outlines for type objects from the self-hosted TTFs.</p></section>

      <section class="c-blk c-seeds mono"><h2 class="mono-up">seeds · 種</h2>
        <p>issue 01 · #0001 · art-directed, fixed data<br>
        tonight · ${ISSUE_NO(is)} · p.${String(is.pages[is.current]?.n ?? 1).padStart(2, '0')}/16<br>
        every random choice in an issue comes from its seed; the same number prints the same issue.</p>
        <p>issue 01 inks · ${issue01Inks.map((id) => INK_BY_ID[id].name.toLowerCase()).join(' / ')}</p></section>

      <section class="c-blk c-mood mono"><h2 class="mono-up">moodboard · 参照</h2>
        <p>ABPPW riso poster torn into waves · soft-focus objects with tiny labels · a portrait behind vellum ·
        Marisa Purcell's wet paintings · crayon haze on torn slips · 24 solar-term riso posters · a pixel-sorted waterfall ·
        a CRT angel · dreamcore haze · pixel-sorted flowers · a noise-dissolved poster · lilac pop art.<br>
        ink wash: splashed ink · graded wash · mist · empty space · inscription · seal (水墨 · 潑墨 · 渲染 · 雲霧 · 余白 · 画題 · 落款) —
        ぼかし (一文字 · 二色 · あてなし) — 千住博の滝 — 絵巻.</p></section>

      <section class="c-blk c-credits mono"><h2 class="mono-up">credits · 制作</h2>
        <p>concept, art direction, the hundred drawings and the dream: the student (SVA).<br>
        built in code, every image drawn and processed in the browser — no image models, no paid services.</p>
        <p>matter-js (MIT) · opentype.js (MIT) · jsPDF (MIT) · JSZip (MIT) · Vite (MIT) · TypeScript (Apache-2.0)<br>
        cursor watercolour: a small stable-fluids solver written for this press, after Jos Stam's <i>Stable Fluids</i> (1999)
        and the approach of Pavel Dobryakov's WebGL Fluid Simulation (MIT).<br>
        shaders (mist, grain, bokashi, halftone, dither, the ten tools): raw WebGL2, written here.</p></section>

      <p class="c-date mono vert" aria-hidden="true">二〇二六 · 十月 · 殆 · ALMOST PRESS · 거의 인쇄소 · ほぼ印刷所</p>
      <p class="c-hand ja vert" aria-hidden="true">夢をひとこと刷る</p>
    </article></div>
  </main>`;
  const sheet = root.querySelector('.c-sheet') as HTMLElement;
  deckle(sheet, 71, 'deckle', 5);
  const wrap = root.querySelector('.c-sheet-wrap') as HTMLElement;
  wrap.append(washi(12, { left: '18%', top: '-7px' }, 90), washi(15, { right: '9%', bottom: '-6px' }, 76));
  const offLang = onLang(() => {
    const a = root.querySelectorAll('.c-nav a');
    a[0].textContent = `← ${t('gate')}`; a[1].textContent = t('press'); a[2].textContent = t('scroll');
  });
  atmosphere().setPage(9);
  atmosphere().setInks(['#C9B6E4', '#F7C6D4', '#CFE6D2']);
  // the one orchestrated moment: the seal is pressed
  const seal = root.querySelector('.c-seal') as HTMLElement;
  if (!reducedMotion()) {
    seal.animate([{ transform: 'scale(1.5)', opacity: 0, filter: 'blur(4px)' }, { transform: 'scale(.95)', opacity: 1, offset: 0.7, filter: 'blur(0)' }, { transform: 'scale(1)', opacity: 1 }], { duration: 700, delay: 500, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'backwards' });
    setTimeout(() => { thud(1); const r = seal.getBoundingClientRect(); atmosphere().bloom((r.left + r.width / 2) / innerWidth, 1 - (r.top + r.height / 2) / innerHeight, '#F7C6D4', 0.8); }, 990);
  }
  return () => offLang();
}
