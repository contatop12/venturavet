import { $$, finePointer, reducedMotion } from './dom';

/** CTA principal "magnético": acompanha levemente o cursor (só mouse). */
export function initMagnetic() {
  if (!finePointer() || reducedMotion()) return;
  for (const el of $$('[data-magnetic]')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.18;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  }
}
