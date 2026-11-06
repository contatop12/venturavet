import { $$, onVisible, reducedMotion } from './dom';

/** Números que contam até o valor final ao entrar na tela. */
export function initCountUp() {
  if (reducedMotion()) return;
  const els = $$('[data-count]');
  onVisible(els, (el) => {
    const end = Number((el as HTMLElement).dataset.count);
    if (!Number.isFinite(end)) return;
    const dur = Math.min(1600, 600 + end * 8);
    const t0 = performance.now();
    const fmt = new Intl.NumberFormat('pt-BR');
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt.format(Math.round(end * eased));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  }, { threshold: 0.6 });
}
