// After page 16: the sheets fan out, are jogged, folded, saddle-stitched (two staples), the seal is
// stamped on the cover. A skippable ceremony (click or Esc), instant under reduced motion.
import type { Issue } from '../model/types';
import { pageThumb } from '../press/thumbs';
import { sealSVG } from '../design/seal';
import { reducedMotion } from '../core/rng';
import { thud, tick } from '../core/sound';

export async function bindIssue(issue: Issue, host: HTMLElement): Promise<void> {
  if (reducedMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'binding';
  layer.setAttribute('role', 'status');
  layer.setAttribute('aria-label', 'binding the issue: fan, jog, fold, stitch, seal. Click to skip.');
  const W = Math.min(220, innerHeight * 0.32), H = W * 1.42;
  layer.innerHTML = `<div class="bind-stack" style="width:${W}px;height:${H}px"></div><p class="mono bind-cap">jog · fold · stitch · seal</p>`;
  host.append(layer);
  const stack = layer.querySelector('.bind-stack') as HTMLElement;
  const sheets = issue.pages.map((p, i) => {
    const d = document.createElement('div');
    d.className = 'bind-sheet';
    d.style.backgroundImage = `url(${pageThumb(p, 180)})`;
    d.style.zIndex = String(16 - i);
    stack.append(d);
    return d;
  });
  let skip = false;
  const onSkip = () => { skip = true; };
  layer.addEventListener('click', onSkip);
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip(); };
  addEventListener('keydown', esc);
  const wait = (ms: number) => new Promise<void>((r) => { const t0 = performance.now(); const f = () => (skip || performance.now() - t0 >= ms ? r() : requestAnimationFrame(f)); f(); });
  const anim = (el: HTMLElement, kf: Keyframe[], o: KeyframeAnimationOptions) => (skip ? null : el.animate(kf, { fill: 'forwards', ...o }));
  // fan out
  sheets.forEach((s, i) => anim(s, [{ transform: 'none' }, { transform: `translateX(${(i - 7.5) * W * 0.16}px) rotate(${(i - 7.5) * 3.2}deg)` }], { duration: 700, delay: i * 25, easing: 'cubic-bezier(.2,.7,.2,1)' }));
  await wait(1100);
  // jog: knocked together on the table
  sheets.forEach((s, i) => anim(s, [{ transform: `translateX(${(i - 7.5) * W * 0.16}px) rotate(${(i - 7.5) * 3.2}deg)` }, { transform: `translate(${(i % 3 - 1) * 1.5}px, ${(i % 2) * 1.5}px)` }], { duration: 420, easing: 'cubic-bezier(.6,0,.3,1)' }));
  await wait(450); tick(); await wait(120); tick();
  // fold in half along the spine
  anim(stack, [{ transform: 'none' }, { transform: 'perspective(1200px) rotateY(-28deg) scaleX(.62)' }], { duration: 700, easing: 'cubic-bezier(.45,.05,.2,1)' });
  await wait(720);
  // two staples
  for (const y of [0.28, 0.72]) {
    const s = document.createElement('i'); s.className = 'staple'; s.style.top = `${y * 100}%`; stack.append(s);
    anim(s, [{ transform: 'scaleY(2)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 160 }); thud(0.4);
    await wait(260);
  }
  // the seal on the cover
  const seal = document.createElement('div'); seal.className = 'bind-seal'; seal.innerHTML = sealSVG({ size: W * 0.26, seed: issue.seed % 97 + 3, doubleStrike: issue.seed % 3 === 0, rotate: (issue.seed % 9) - 4 });
  stack.append(seal);
  anim(seal, [{ transform: 'scale(1.5)', opacity: 0, filter: 'blur(3px)' }, { transform: 'scale(.94)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1, filter: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,0,.2,1)' });
  thud(1);
  await wait(900);
  anim(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
  await wait(400);
  removeEventListener('keydown', esc);
  layer.remove();
}
