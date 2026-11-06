import { $, $$, reducedMotion } from './dom';

/**
 * Um único laço de rolagem (rAF) para todos os efeitos ligados ao scroll:
 * barra de progresso, parallax, faixa de especialidades, linha do day care
 * e preenchimento da linha do tempo. Só escreve variáveis CSS.
 */
export function initScrollFx() {
  const bar = $('[data-progress]');
  const motion = !reducedMotion();
  const parallax = motion ? $$('[data-parallax]') : [];
  const ticker = motion ? $('[data-ticker]') : null;
  const draws = $$('[data-draw-scroll]');
  const timelines = $$('[data-timeline]');
  const article = $('[data-article]');

  let vh = window.innerHeight;
  window.addEventListener('resize', () => { vh = window.innerHeight; schedule(); }, { passive: true });

  const progressOf = (el: Element, start = 0.85, end = 0.35) => {
    const r = el.getBoundingClientRect();
    const total = r.height + vh * (start - end);
    return Math.min(1, Math.max(0, (vh * start - r.top) / total));
  };

  const frame = () => {
    queued = false;
    const y = window.scrollY;
    if (bar) {
      const p = article ? progressOf(article, 0.3, 0.9) : y / Math.max(1, document.documentElement.scrollHeight - vh);
      bar.style.setProperty('--p', p.toFixed(4));
    }
    for (const el of parallax) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const k = Number(el.dataset.parallax ?? 0.1);
      el.style.setProperty('--py', `${((r.top + r.height / 2 - vh / 2) * -k).toFixed(1)}px`);
    }
    if (ticker) {
      const r = ticker.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) ticker.style.setProperty('--tx', `${(-(y * 0.35) % (ticker.scrollWidth / 2)).toFixed(1)}px`);
    }
    for (const path of draws) path.style.setProperty('--p', progressOf(path.closest('section') ?? path, 0.9, 0.5).toFixed(4));
    for (const tl of timelines) {
      const p = progressOf(tl, 0.65, 0.65);
      tl.style.setProperty('--p', p.toFixed(4));
      const fillY = tl.getBoundingClientRect().top + tl.offsetHeight * p;
      tl.querySelectorAll<HTMLElement>('.timeline__item').forEach((it) => it.classList.toggle('is-past', it.getBoundingClientRect().top + 24 <= fillY));
    }
  };

  let queued = false;
  const schedule = () => {
    if (!queued) { queued = true; requestAnimationFrame(frame); }
  };
  window.addEventListener('scroll', schedule, { passive: true });
  schedule();
}
