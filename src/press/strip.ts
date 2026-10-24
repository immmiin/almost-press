// Bottom of the bench: the 16 sheets hanging from a scroll rod, the Forgotten dish, the PRINT button.
import type { Issue, PageObj } from '../model/types';
import { pageThumb, objectThumb } from './thumbs';
import { enamelButton, slip } from '../design/materials';
import { t, tA, tAll, onLang } from '../core/i18n';
import { kanjiNum } from './util';

export class Strip {
  el: HTMLElement;
  rod: HTMLElement;
  dish: HTMLElement;
  print: HTMLButtonElement;
  /** under PRINT: "hold to print", then the plates as they land */
  count: HTMLElement;
  private thumbs = new Map<string, string>();
  /** Fall asleep (眠る): the press dreams the remaining sheets */
  sleep: HTMLButtonElement;
  onOpen: (i: number) => void = () => {};
  onSleep: () => void = () => {};
  /** Print this sheet as a single poster (刷 on a printed sheet, or right-click it) */
  onPoster: (i: number) => void = () => {};
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
    this.sleep = slip('button', 66, '', 'sleep-slip') as HTMLButtonElement;
    this.sleep.addEventListener('click', () => this.onSleep());
    el.querySelector('.print-wrap')!.prepend(this.sleep);
    this.rod.addEventListener('click', (e) => {
      const p = (e.target as HTMLElement).closest('.leaf-print') as HTMLElement | null;
      if (p) { this.onPoster(+p.dataset.i!); return; }
      const b = (e.target as HTMLElement).closest('button'); if (!b || b.disabled) return;
      this.onOpen(+b.dataset.i!);
    });
    this.rod.addEventListener('contextmenu', (e) => {
      const b = (e.target as HTMLElement).closest('.leaf') as HTMLButtonElement | null;
      if (!b || !b.classList.contains('printed')) return;
      e.preventDefault(); this.onPoster(+b.dataset.i!);
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
    const [sEn, sJa] = tAll('sleep');
    this.sleep.innerHTML = `<span class="ja" aria-hidden="true">眠る</span><span>${t('sleep') === sJa ? sEn : t('sleep')}</span>`;
    this.sleep.setAttribute('aria-label', `${tA('sleep')} — ${tA('sleepAsk')}`);
    this.dish.setAttribute('aria-label', tA('forgotten'));
  }
  invalidate(i: number) { this.thumbs.delete(String(i)); }
  /** Where a sheet hangs on the rod (client px). */
  leafRect(i: number): DOMRect | null { return (this.rod.querySelector(`[data-i="${i}"] .leaf-sheet`) as HTMLElement | null)?.getBoundingClientRect() ?? null; }
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
      const poster = p?.printed ? `<button type="button" class="leaf-print" data-i="${i}" aria-label="${tA('poster')} ${i + 1} (A5 PDF with bleed + PNG)" title="${tA('poster')} · A5 PDF + PNG">刷</button>` : '';
      html.push(`<div class="leaf-wrap" role="listitem"><button type="button" class="leaf${cur ? ' cur' : ''}${p?.printed ? ' printed' : ''}${blank ? ' blank' : ''}" data-i="${i}" ${p?.printed || cur ? '' : 'disabled'} aria-label="${label}" aria-current="${cur}"><span class="leaf-clip"></span><span class="leaf-sheet">${img}</span><span class="leaf-n">${i + 1}</span><span class="leaf-k" aria-hidden="true">${kanjiNum(i + 1)}</span></button>${poster}</div>`);
    }
    this.rod.innerHTML = html.join('');
    const f = issue.forgotten.slice(-14);
    const off = issue.forgotten.length - f.length;
    this.dish.innerHTML = `<svg class="dish-svg" viewBox="0 0 160 52" aria-hidden="true"><ellipse cx="80" cy="30" rx="76" ry="19" fill="#EFEAE3" stroke="#3B3A40" stroke-opacity=".35"/><ellipse cx="80" cy="27" rx="62" ry="13" fill="#E4EDE7"/><ellipse cx="80" cy="27" rx="62" ry="13" fill="none" stroke="#3B3A40" stroke-opacity=".15"/><path d="M30 34 Q80 48 130 34" stroke="#62A8E5" stroke-opacity=".35" fill="none" stroke-width="1.2"/></svg>` +
      f.map((o, i) => `<button type="button" class="dish-item" data-f="${off + i}" style="left:${18 + (i % 7) * 17 + (i >= 7 ? 8 : 0)}%;top:${i >= 7 ? 46 : 20}%;transform:rotate(${((i * 47) % 40) - 20}deg)" aria-label="forgotten: ${o.kind === 'obj' ? o.key : o.key}"><img alt="" src="${objectThumb(o.kind === 'obj' ? { key: o.key, wrong: o.wrong } : o, issue.pages[issue.current].inks, 64)}"></button>`).join('');
  }
}
