// Ink vials on a vellum sheet: plate slots 1–4, the ink library, presets, plate view, knobs, side effects.
import { INKS, INK_BY_ID, PRESETS } from '../design/tokens';
import { Vial } from '../design/vial';
import { knob, slotSwitch, washi } from '../design/materials';
import { deckle } from '../design/paper';
import { t, tA, onLang } from '../core/i18n';
import { getSide, setSide, type SideLevel } from './edits';
import { slosh } from '../core/sound';
import type { Page } from '../model/types';

export class InkPanel {
  el: HTMLElement;
  private slots: HTMLElement;
  private lib: HTMLElement;
  private vials: Vial[] = [];
  private page!: Page;
  activeSlot = 0;
  view = 0;
  drift = +(localStorage.getItem('ap.drift') ?? 0.6);
  levels: Record<string, number> = {};
  onChange: (why: string) => void = () => {};
  onView: (v: number) => void = () => {};
  onSlot: (i: number) => void = () => {};
  private offLang: () => void;
  private knobs!: HTMLElement;

  constructor() {
    const wrap = document.createElement('section');
    wrap.className = 'inks-wrap vellum-wrap';
    wrap.setAttribute('aria-label', tA('a_inks'));
    wrap.innerHTML = `<div class="inks vellum"><h2 class="mono-up inks-h"></h2><div class="inks-slots"></div><div class="inks-presets"></div><div class="inks-lib" role="listbox"></div><div class="inks-view"></div><div class="inks-knobs"></div><div class="inks-side"></div></div>`;
    this.el = wrap;
    deckle(wrap.querySelector('.inks')!, 77, 'deckle', 2.5);
    wrap.append(washi(9, { left: '40%', top: '-8px' }, 70), washi(12, { left: '-12px', bottom: '30%', transform: 'rotate(-80deg)' }, 54));
    this.slots = wrap.querySelector('.inks-slots')!;
    this.lib = wrap.querySelector('.inks-lib')!;
    this.lib.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      this.assign(this.activeSlot, b.dataset.ink!);
    });
    this.slots.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      if (b.dataset.add) { if (this.page.inks.length < 4) { this.page.inks.push(['seafoam', 'sunflower', 'cornflower', 'fpink'].find((x) => !this.page.inks.includes(x)) ?? 'lgray'); this.activeSlot = this.page.inks.length - 1; this.onChange('plates'); this.renderSlots(); } return; }
      if (b.dataset.rm) { if (this.page.inks.length > 1) { const i = +b.dataset.rm; this.page.inks.splice(i, 1); this.page.objects.forEach((o) => (o.plates = o.plates.map((p) => (p >= this.page.inks.length ? p % this.page.inks.length : p)))); this.activeSlot = 0; this.onChange('plates'); this.renderSlots(); } return; }
      this.activeSlot = +b.dataset.slot!; this.renderSlots(); this.onSlot(this.activeSlot);
      this.vials[this.activeSlot]?.slosh(0.6); slosh();
    });
    // drag a library ink onto a slot
    this.lib.addEventListener('pointerdown', (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      const id = b.dataset.ink!;
      const ghost = b.cloneNode(true) as HTMLElement; ghost.className = 'ink-drag'; document.body.append(ghost);
      let moved = false;
      const mv = (m: PointerEvent) => { moved = true; ghost.style.transform = `translate(${m.clientX - 10}px, ${m.clientY - 20}px)`; };
      const up = (u: PointerEvent) => {
        removeEventListener('pointermove', mv); removeEventListener('pointerup', up); ghost.remove();
        if (!moved) return;
        const el = document.elementFromPoint(u.clientX, u.clientY)?.closest('[data-slot]') as HTMLElement | null;
        if (el) this.assign(+el.dataset.slot!, id);
      };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
    this.offLang = onLang(() => this.renderAll());
  }
  destroy() { this.offLang(); }
  setPage(p: Page) { this.page = p; this.activeSlot = Math.min(this.activeSlot, p.inks.length - 1); this.renderAll(); }
  private assign(slot: number, id: string) {
    if (slot >= this.page.inks.length) return;
    this.page.inks[slot] = id;
    this.renderSlots();
    this.vials[slot]?.slosh(1); slosh();
    this.onChange('ink');
  }
  /** Drain vials: amounts per plate 0..1 of the page used. */
  drain(used: number[]) {
    this.page.inks.forEach((id, i) => { this.levels[id] = Math.max(0.08, (this.levels[id] ?? 0.92) - used[i] * 0.06); this.vials[i]?.setLevel(this.levels[id]); });
  }
  bubble() { this.vials.forEach((v, i) => setTimeout(() => v.bubble(), i * 400)); }
  renderAll() {
    (this.el.querySelector('.inks-h') as HTMLElement).textContent = t('inks');
    this.renderSlots();
    const pr = this.el.querySelector('.inks-presets')!;
    pr.innerHTML = PRESETS.map((p) => `<button type="button" class="preset-slip" data-p="${p.id}" aria-label="${p.name}: ${p.inks.map((i) => INK_BY_ID[i].name).join(', ')}"><span class="dots">${p.inks.map((i) => `<i style="background:${INK_BY_ID[i].hex}"></i>`).join('')}</span><span class="mono">${p.name}</span></button>`).join('');
    pr.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const p = PRESETS.find((x) => x.id === (b as HTMLElement).dataset.p)!;
      const extra = this.page.inks.slice(3);
      this.page.inks = [...p.inks, ...extra].slice(0, Math.max(3, this.page.inks.length));
      this.renderSlots(); this.vials.forEach((v) => v.slosh(0.8)); slosh(); this.onChange('preset');
    }));
    this.lib.innerHTML = INKS.map((i) => `<button type="button" role="option" class="lib-ink" data-ink="${i.id}" aria-label="${i.name}${i.metallic ? ' (metallic, approximate)' : ''}" title="${i.name}${i.metallic ? ' ≈' : ''}"><i style="background:${i.hex}"></i></button>`).join('');
    const view = this.el.querySelector('.inks-view')!;
    view.innerHTML = `<button type="button" class="view-btn mono" aria-pressed="${this.view > 0}">${t('plates')} · ${this.view === 0 ? '—' : this.view === 5 ? 'all' : this.view}</button>`;
    view.querySelector('button')!.addEventListener('click', () => {
      const n = this.page.inks.length;
      this.view = this.view === 0 ? 5 : this.view === 5 ? 1 : this.view >= n ? 0 : this.view + 1;
      this.onView(this.view); this.renderAll();
    });
    this.knobs = this.el.querySelector('.inks-knobs')!;
    this.knobs.innerHTML = '';
    const p = this.page;
    this.knobs.append(
      knob(tA('mis'), p.mis, (v) => { p.mis = v; this.onChange('knob'); }, { min: 0, max: 2.4, step: 0.05 }),
      knob(tA('density'), p.density, (v) => { p.density = v; this.onChange('knob'); }),
      knob(tA('grain'), p.grain, (v) => { p.grain = v; this.onChange('knob'); }),
      knob(tA('drift'), this.drift, (v) => { this.drift = v; localStorage.setItem('ap.drift', String(v)); }),
    );
    const side = this.el.querySelector('.inks-side')!;
    side.innerHTML = '';
    side.append(slotSwitch(tA('side'), [['mild', t('mild')], ['normal', t('normal')], ['wild', t('wild')]], getSide(), (v) => setSide(v as SideLevel)));
  }
  renderSlots() {
    const p = this.page;
    this.slots.innerHTML = '';
    this.vials = p.inks.map((id, i) => {
      const ink = INK_BY_ID[id];
      const v = new Vial(ink.hex, this.levels[id] ?? 0.92, `${t('plate')} ${i + 1}: ${ink.name}`);
      const b = document.createElement('div');
      b.className = 'slot';
      b.innerHTML = `<button type="button" class="slot-btn" data-slot="${i}" aria-pressed="${i === this.activeSlot}" aria-label="${tA('plate')} ${i + 1}: ${ink.name}"><span class="slot-n mono">${i + 1}</span></button><span class="slot-name mono">${ink.name}${ink.metallic ? ' ≈' : ''}</span>${p.inks.length > 1 ? `<button type="button" class="slot-rm mono" data-rm="${i}" aria-label="remove plate ${i + 1}">×</button>` : ''}`;
      b.querySelector('.slot-btn')!.prepend(v.el);
      v.el.addEventListener('pointerenter', () => v.slosh(0.35));
      this.slots.append(b);
      return v;
    });
    if (p.inks.length < 4) {
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'slot-add mono'; add.dataset.add = '1'; add.textContent = '+ ' + t('plate');
      this.slots.append(add);
    }
  }
}
