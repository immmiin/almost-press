// Bottom of the bench: the 16 sheets hanging from a scroll rod, the Forgotten dish, the PRINT button.
import type { Issue, PageObj } from '../model/types';
import { pageThumb, objectThumb } from './thumbs';
import { enamelButton } from '../design/materials';
import { t, tA, onLang } from '../core/i18n';
import { kanjiNum } from './util';

export class Strip {
  el: HTMLElement;
  rod: HTMLElement;
  dish: HTMLElement;
  print: HTMLButtonElement;
  /** under PRINT: "hold to print", then the plates as they land */
  count: HTMLElement;
  private thumbs = new Map<string, string>();
  onOpen: (i: number) => void = () => {};
  onForgotten: (o: PageObj) => void = () => {};
  private offLang: () => void;
  private issue!: Issue;

  constructor() {
    const el = document.createElement('footer');
    el.className = 'bench';
    el.innerHTML = `<div class="rod-wrap"><div class="rod" role="list"></div></div>
      <div class="dish-wrap"><div class="dish" aria-label=""></div><span class="mono dish-l"></span></div>
      <div class="print-wrap"><div class="print-col"><span class="print-count mono" aria-live="polite"></span></div></div>`;
    this.el = el;
    this.rod = el.querySelector('.rod')!;
    this.dish = el.querySelector('.dish')!;
    this.print = enamelButton(t('print'), '');
    this.count = el.querySelector('.print-count')!;
    el.querySelector('.print-col')!.prepend(this.print);
    this.rod.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b || b.disabled) return;
      this.onOpen(+b.dataset.i!);
    });
    this.dish.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      const o = this.issue.forgotten[+b.dataset.f!]; if (o) this.onForgotten(o);
    });
    this.offLang = onLang(() => { this.labels(); if (this.issue) this.render(this.issue); });
    this.labels();
  }
  destroy() { this.offLang(); }
  private labels() {
    this.print.querySelector('.enamel-label')!.textContent = t('print');
    if (!this.print.classList.contains('held')) this.count.textContent = t('hold');
    this.print.setAttribute('aria-label', `${tA('print')} — ${tA('hold')} (space)`);
    (this.el.querySelector('.dish-l') as HTMLElement).textContent = t('forgotten');
    this.dish.setAttribute('aria-label', tA('forgotten'));
  }
  invalidate(i: number) { this.thumbs.delete(String(i)); }
  render(issue: Issue) {
    this.issue = issue;
    const html: string[] = [];
    for (let i = 0; i < 16; i++) {
      const p = issue.pages[i];
      const cur = i === issue.current;
      let img = '';
      if (p && (p.printed || cur)) {
        const k = String(i);
        if (p.printed && !this.thumbs.has(k)) this.thumbs.set(k, pageThumb(p, 64));
        img = p.printed ? `<img alt="" src="${this.thumbs.get(k)}">` : '';
      }
      const label = `${tA('page')} ${i + 1}${p?.printed ? '' : cur ? ' (on the press)' : ' (blank)'}`;
      const blank = !p || (!p.printed && !cur);
      html.push(`<button type="button" role="listitem" class="leaf${cur ? ' cur' : ''}${p?.printed ? ' printed' : ''}${blank ? ' blank' : ''}" data-i="${i}" ${p?.printed || cur ? '' : 'disabled'} aria-label="${label}" aria-current="${cur}"><span class="leaf-clip"></span><span class="leaf-sheet">${img}</span><span class="leaf-n">${i + 1}</span><span class="leaf-k" aria-hidden="true">${kanjiNum(i + 1)}</span></button>`);
    }
    this.rod.innerHTML = html.join('');
    const f = issue.forgotten.slice(-14);
    const off = issue.forgotten.length - f.length;
    this.dish.innerHTML = `<svg class="dish-svg" viewBox="0 0 160 52" aria-hidden="true"><ellipse cx="80" cy="30" rx="76" ry="19" fill="#EFEAE3" stroke="#3B3A40" stroke-opacity=".35"/><ellipse cx="80" cy="27" rx="62" ry="13" fill="#E4EDE7"/><ellipse cx="80" cy="27" rx="62" ry="13" fill="none" stroke="#3B3A40" stroke-opacity=".15"/><path d="M30 34 Q80 48 130 34" stroke="#62A8E5" stroke-opacity=".35" fill="none" stroke-width="1.2"/></svg>` +
      f.map((o, i) => `<button type="button" class="dish-item" data-f="${off + i}" style="left:${18 + (i % 7) * 17 + (i >= 7 ? 8 : 0)}%;top:${i >= 7 ? 46 : 20}%;transform:rotate(${((i * 47) % 40) - 20}deg)" aria-label="forgotten: ${o.kind === 'obj' ? o.key : o.key}"><img alt="" src="${objectThumb(o.kind === 'obj' ? { key: o.key, wrong: o.wrong } : o, issue.pages[issue.current].inks, 64)}"></button>`).join('');
  }
}
