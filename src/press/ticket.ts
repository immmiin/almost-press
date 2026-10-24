// The job ticket on a torn slip: seal logo, issue number, dream sentence, language switch, sound.
import { sealSVG } from '../design/seal';
import { deckle } from '../design/paper';
import { washi } from '../design/materials';
import { t, tA, getLang, setLang, onLang, isLocked, setLocked, type Lang } from '../core/i18n';
import { soundOn, setSound } from '../core/sound';
import { go } from '../core/router';

export class Ticket {
  el: HTMLElement;
  input: HTMLInputElement;
  onDream: (text: string) => void = () => {};
  private offLang: () => void;
  private issueNo = '';

  constructor() {
    const wrap = document.createElement('header');
    wrap.className = 'ticket-wrap sheet-wrap';
    wrap.innerHTML = `<div class="ticket sheet pearl">
      <a class="ticket-seal" href="#/gate" aria-label="ALMOST PRESS — back to the gate">${sealSVG({ size: 38, seed: 3, doubleStrike: true })}</a>
      <div class="ticket-name"><span class="tn-en">ALMOST PRESS</span><span class="tn-ko">거의 인쇄소</span><span class="tn-ja">ほぼ印刷所</span></div>
      <div class="ticket-issue mono"></div>
      <form class="ticket-dream"><label class="mono ticket-dl" for="dream"></label><input id="dream" class="ruled" autocomplete="off" maxlength="160"></form>
      <div class="ticket-lang" role="group"></div>
      <button type="button" class="ticket-btn mono" data-a="lock"></button>
      <button type="button" class="ticket-btn mono" data-a="sound"></button>
      <button type="button" class="ticket-btn mono" data-a="colophon"></button>
    </div>`;
    this.el = wrap;
    const sheet = wrap.querySelector('.ticket') as HTMLElement;
    deckle(sheet, 5, 'torn', 4);
    wrap.append(washi(15, { left: '30%', top: '-6px' }, 60));
    this.input = wrap.querySelector('input')!;
    wrap.querySelector('form')!.addEventListener('submit', (e) => { e.preventDefault(); const v = this.input.value.trim(); if (v) this.onDream(v); });
    wrap.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      if (b.dataset.l) setLang(b.dataset.l as Lang);
      if (b.dataset.a === 'sound') { setSound(!soundOn()); this.render(); }
      if (b.dataset.a === 'lock') { setLocked(!isLocked()); }
      if (b.dataset.a === 'colophon') go('colophon');
    });
    this.offLang = onLang(() => this.render());
    this.render();
  }
  destroy() { this.offLang(); }
  setIssue(no: string) { this.issueNo = no; this.render(); }
  render() {
    const q = (s: string) => this.el.querySelector(s) as HTMLElement;
    q('.ticket-issue').innerHTML = `<span>${t('issue')}</span> <b>${this.issueNo}</b>`;
    q('.ticket-dl').textContent = t('dream');
    this.input.placeholder = t('dreamPh');
    this.input.setAttribute('aria-label', tA('dream'));
    const lang = getLang();
    q('.ticket-lang').setAttribute('aria-label', tA('a_lang'));
    q('.ticket-lang').innerHTML = (['en', 'ja'] as Lang[]).map((l) => `<button type="button" class="mono" data-l="${l}" aria-pressed="${l === lang}">${l === 'en' ? 'EN' : '日'}</button>`).join('');
    q('[data-a="sound"]').textContent = `${t('sound')} ${soundOn() ? t('on') : t('off')}`;
    q('[data-a="sound"]').setAttribute('aria-pressed', String(soundOn()));
    q('[data-a="lock"]').textContent = `${isLocked() ? '鎖' : '漂'} ${t('lock')}`;
    q('[data-a="lock"]').setAttribute('aria-pressed', String(isLocked()));
    q('[data-a="colophon"]').textContent = t('colophon');
  }
}
