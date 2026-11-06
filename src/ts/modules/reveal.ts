import { $$, onVisible, reducedMotion } from './dom';

/**
 * Revelação ao rolar. Além dos [data-reveal] escritos no HTML, aplica
 * automaticamente em grupos repetidos (cards, etapas) com atraso escalonado.
 */
const AUTO = ['.card', '.exam', '.lab-group', '.svc-nav li', '.post-card', '.steps > li', '.svc-row', '.mvv > div', '.review', '.checklist li', '.pills li', '.timeline__item'];

export function initReveal() {
  if (reducedMotion()) return;
  for (const sel of AUTO) {
    $$(sel).forEach((el) => {
      if (el.hasAttribute('data-reveal')) return;
      const i = [...(el.parentElement?.children ?? [])].indexOf(el);
      el.setAttribute('data-reveal', '');
      el.style.setProperty('--i', String(Math.min(i, 6)));
    });
  }
  const els = $$('[data-reveal]');
  onVisible(els, (el) => el.classList.add('is-in'), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  // Segurança: nada fica invisível se o observer falhar (ex.: impressão)
  window.addEventListener('beforeprint', () => els.forEach((el) => el.classList.add('is-in')));
}
