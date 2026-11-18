import { $, $$ } from './dom';

/**
 * Faixas roláveis (avaliações e equipe): só por ação do visitante (as specs do cliente pedem leitura confortável,
 * sem carrossel automático). As setas avançam um cartão por vez; arrastar e rolar continuam valendo.
 * Raiz: `.reviews` (setas data-reviews-*) ou `[data-carousel]` (setas data-carousel-*).
 */
export function initMarquee() {
  for (const vp of $$('[data-marquee]')) {
    const root = vp.closest<HTMLElement>('.reviews, [data-carousel]');
    const prev = root ? $<HTMLButtonElement>('[data-reviews-prev], [data-carousel-prev]', root) : null;
    const next = root ? $<HTMLButtonElement>('[data-reviews-next], [data-carousel-next]', root) : null;
    const step = () => {
      const cards = vp.querySelectorAll('li');
      if (cards.length > 1) return cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
      return cards[0] ? cards[0].getBoundingClientRect().width + 20 : vp.clientWidth * 0.8;
    };
    const sync = () => {
      const fits = vp.scrollWidth <= vp.clientWidth + 4;
      root?.classList.toggle('is-static', fits);
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
