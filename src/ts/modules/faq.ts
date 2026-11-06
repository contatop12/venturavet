import { $$, reducedMotion } from './dom';

/**
 * Acordeão de FAQ com <details>. Onde o CSS ::details-content não anima,
 * anima a altura via Web Animations; também garante o comportamento
 * exclusivo (name="...") em navegadores mais antigos.
 */
export function initFaq() {
  const items = $$<HTMLDetailsElement>('details.faq__item');
  if (!items.length) return;
  const nativeAnim = CSS.supports('selector(::details-content)');
  const exclusive = 'name' in HTMLDetailsElement.prototype;

  for (const d of items) {
    const summary = d.querySelector('summary')!;
    const body = d.querySelector<HTMLElement>('.faq__answer')!;
    summary.addEventListener('click', (e) => {
      if (!exclusive && !d.open) {
        const group = d.getAttribute('name');
        if (group) items.filter((o) => o !== d && o.open && o.getAttribute('name') === group).forEach((o) => (o.open = false));
      }
      if (nativeAnim || reducedMotion()) return;
      e.preventDefault();
      if (d.open) {
        const a = body.animate([{ height: `${body.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
        a.onfinish = () => (d.open = false);
      } else {
        d.open = true;
        body.animate([{ height: '0px', opacity: 0 }, { height: `${body.offsetHeight}px`, opacity: 1 }], { duration: 400, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  }

  // Abre a pergunta indicada na URL (#pergunta-x) — útil para links de resposta
  const id = location.hash.slice(1);
  const target = id ? document.getElementById(id) : null;
  if (target instanceof HTMLDetailsElement) target.open = true;
}
