// The object drawer: a vellum sheet taped to the mist. Search in EN/KO/JA, eight categories as vertical
// labels, objects as rubber stamps (soft focus; the one under the cursor comes sharp). Also grounds and
// type & marks. Sometimes an object appears twice: the twin is slightly wrong and stamps the wrong version.
import { OBJ, KEYS, CATS, CAT_CHARS, nameOf } from '../objects';
import { objectThumb } from './thumbs';
import { t, tA, getLang, onLang } from '../core/i18n';
import { GROUNDS } from '../riso/grounds';
import { HELPERS } from '../type/helpers';
import { deckle } from '../design/paper';
import { washi } from '../design/materials';
import { rng } from '../core/rng';
import type { StampItem } from './stage';
import type { GroundId } from '../model/types';

type Cat = 'all' | (typeof CATS)[number] | 'ground' | 'type';

export class Drawer {
  el: HTMLElement;
  private grid: HTMLElement;
  private cats: HTMLElement;
  private q = '';
  private cat: Cat = 'all';
  private inks: string[] = [];
  private twinSeed = 1;
  onPick: (it: StampItem) => void = () => {};
  onGround: (g: GroundId) => void = () => {};
  currentGround: GroundId = 'rice';
  private offLang: () => void;

  constructor() {
    const wrap = document.createElement('section');
    wrap.className = 'drawer-wrap vellum-wrap';
    wrap.setAttribute('aria-label', tA('a_drawer'));
    wrap.innerHTML = `<div class="drawer vellum"><div class="drawer-head"><label class="sr" for="dsearch"></label><input id="dsearch" class="ruled drawer-search" type="search" autocomplete="off"></div><div class="drawer-body"><nav class="drawer-cats" role="tablist"></nav><div class="drawer-grid" role="tabpanel"></div></div></div>`;
    this.el = wrap;
    const sheet = wrap.querySelector('.drawer') as HTMLElement;
    deckle(sheet, 41, 'deckle', 2.5);
    wrap.append(washi(3, { left: '18px', top: '-7px' }, 64), washi(6, { right: '-14px', bottom: '40px', transform: 'rotate(84deg)' }, 58));
    this.grid = wrap.querySelector('.drawer-grid')!;
    this.cats = wrap.querySelector('.drawer-cats')!;
    const input = wrap.querySelector('input')!;
    input.addEventListener('input', () => { this.q = input.value.trim().toLowerCase(); this.renderGrid(true); });
    this.cats.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      this.cat = b.dataset.c as Cat; this.renderCats(); this.renderGrid(true);
    });
    this.cats.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const bs = [...this.cats.querySelectorAll('button')]; const i = bs.indexOf(document.activeElement as HTMLButtonElement);
      const nx = bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length]; nx.focus(); nx.click(); e.preventDefault();
    });
    this.grid.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      if (b.dataset.g) { this.currentGround = b.dataset.g as GroundId; this.onGround(this.currentGround); this.renderGrid(); return; }
      if (b.dataset.h) { this.onPick({ kind: 'helper', id: b.dataset.h }); return; }
      this.onPick({ kind: 'obj', key: b.dataset.k!, wrong: b.dataset.w ? +b.dataset.w : undefined });
      b.animate([{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
    });
    this.offLang = onLang(() => { this.labels(); this.renderCats(); this.renderGrid(); });
    this.labels();
    this.renderCats();
  }
  destroy() { this.offLang(); }
  private labels() {
    const input = this.el.querySelector('input')!;
    input.placeholder = t('search');
    (this.el.querySelector('label') as HTMLElement).textContent = tA('search');
  }
  setInks(inks: string[], twinSeed: number) {
    if (inks.join() === this.inks.join() && twinSeed === this.twinSeed) return;
    this.inks = inks.slice(); this.twinSeed = twinSeed; this.renderGrid();
  }
  private renderCats() {
    const items: [Cat, string][] = [['all', '全'], ...CATS.map((c) => [c, CAT_CHARS[c]] as [Cat, string]), ['ground', '地'], ['type', '字']];
    this.cats.innerHTML = items.map(([c, ch]) => `<button type="button" role="tab" data-c="${c}" aria-selected="${c === this.cat}" tabindex="${c === this.cat ? 0 : -1}"><span class="cat-ch">${ch}</span><span class="cat-l">${t(c === 'ground' ? 'ground' : c === 'type' ? 'helpers' : c)}</span></button>`).join('');
  }
  private matches(key: string) {
    const o = OBJ[key];
    if (this.cat !== 'all' && o.c !== this.cat) return false;
    const q = this.q;
    if (!q) return true;
    return o.en.toLowerCase().includes(q) || o.ko.includes(q) || o.ja.includes(q) || o.al.some((a) => a.includes(q)) || o.jaAl.some((a) => a.includes(q));
  }
  renderGrid(fade = false) {
    const lang = getLang();
    const doIt = () => {
      if (this.cat === 'ground') {
        this.grid.innerHTML = GROUNDS.map((g) => `<button type="button" class="dgnd" data-g="${g.id}" aria-pressed="${g.id === this.currentGround}"><span class="dgnd-ch">${g.char}</span><span class="mono">${lang === 'ja' ? g.ja : g.en}</span></button>`).join('');
        return;
      }
      if (this.cat === 'type') {
        this.grid.innerHTML = HELPERS.map((h) => `<button type="button" class="dstamp dhelp" data-h="${h.id}" aria-label="${lang === 'ja' ? h.ja : h.en}"><span class="dhelp-ch">${h.char}</span><span class="dcap mono">${lang === 'ja' ? h.ja : h.en}</span></button>`).join('');
        return;
      }
      const keys = KEYS.filter((k) => this.matches(k));
      if (!keys.length) { this.grid.innerHTML = `<p class="drawer-empty mono">${t('empty')}</p>`; return; }
      // the twin: one object shows up twice, slightly wrong
      const r = rng(this.twinSeed);
      const twinAt = !this.q && keys.length > 6 && r() < 0.8 ? Math.floor(r() * keys.length) : -1;
      const list: { key: string; wrong?: number }[] = [];
      keys.forEach((k, i) => { list.push({ key: k }); if (i === twinAt) list.push({ key: k, wrong: 0.6 }); });
      this.grid.innerHTML = list.map(({ key, wrong }) => {
        const o = OBJ[key];
        const label = nameOf(key, lang);
        return `<button type="button" class="dstamp" data-k="${key}" ${wrong ? `data-w="${wrong}"` : ''} aria-label="${o.en} · ${o.ja}"><img alt="" loading="lazy" decoding="async" data-src="${key}" ${wrong ? `data-wrong="${wrong}"` : ''}><span class="dcap"><span class="dno mono">${String(o.no).padStart(3, '0')}</span><span class="dnm">${label}</span></span></button>`;
      }).join('');
      this.fillThumbs();
    };
    if (fade && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.grid.animate([{ filter: 'blur(0)', opacity: 1 }, { filter: 'blur(6px)', opacity: 0.3 }], { duration: 140, easing: 'ease-in' }).onfinish = () => {
        doIt(); this.grid.animate([{ filter: 'blur(6px)', opacity: 0.3 }, { filter: 'blur(0)', opacity: 1 }], { duration: 260, easing: 'ease-out' });
      };
    } else doIt();
  }
  /** Thumbnails are printed lazily in small batches so the drawer opens instantly. */
  private fillThumbs() {
    const imgs = [...this.grid.querySelectorAll<HTMLImageElement>('img[data-src]')];
    const inks = this.inks;
    let i = 0;
    const batch = () => {
      const end = Math.min(imgs.length, i + 8);
      for (; i < end; i++) { const im = imgs[i]; im.src = objectThumb({ key: im.dataset.src!, wrong: im.dataset.wrong ? +im.dataset.wrong : undefined }, inks, 112); }
      if (i < imgs.length) requestAnimationFrame(batch);
    };
    batch();
  }
}
