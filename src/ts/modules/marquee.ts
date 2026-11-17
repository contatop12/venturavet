import { $, $$ } from './dom';

/**
 * Avaliações: faixa rolável só por ação do visitante (as specs do cliente pedem leitura confortável,
 * sem carrossel automático). As setas avançam um cartão por vez; arrastar e rolar continuam valendo.
 */
export function initMarquee() {
  for (const vp of $$('[data-marquee]')) {
    const root = vp.closest('.reviews');
    const prev = root ? $<HTMLButtonElement>('[data-reviews-prev]', root as HTMLElement) : null;
    const next = root ? $<HTMLButtonElement>('[data-reviews-next]', root as HTMLElement) : null;
    const step = () => {
      const card = vp.querySelector('li');
      return card ? card.getBoundingClientRect().width + 20 : vp.clientWidth * 0.8;
    };
    const sync = () => {
      if (prev) prev.disabled = vp.scrollLeft < 4;
      if (next) next.disabled = vp.scrollLeft + vp.clientWidth >= vp.scrollWidth - 4;
    };
    prev?.addEventListener('click', () => vp.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => vp.scrollBy({ left: step(), behavior: 'smooth' }));
    vp.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });
    sync();
  }
}
