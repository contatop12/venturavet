/**
 * Ponto de entrada. Módulos essenciais rodam já; os específicos de página
 * são importados sob demanda (code splitting) só quando o elemento existe.
 * Cada módulo roda isolado: um erro em um não impede os demais.
 */
import { initHeader } from './modules/header';
import { initReveal } from './modules/reveal';
import { initScrollFx } from './modules/scrollfx';
import { initCountUp } from './modules/countup';
import { initAnalytics } from './modules/analytics';
import { initPrefetch } from './modules/prefetch';
import { initFaq } from './modules/faq';
import { initMarquee } from './modules/marquee';
import { initMagnetic } from './modules/magnetic';
import { captureAttribution } from './modules/attribution';
import { $, $$ } from './modules/dom';

declare global {
  interface Window { __vvReady?: boolean }
}

const safe = (name: string, fn: () => void) => {
  try {
    fn();
  } catch (err) {
    console.error(`[ventura] falha em ${name}`, err);
  }
};

// A revelação ao rolar vem primeiro: é ela que torna visível o conteúdo animado.
safe('reveal', initReveal);
// Sinaliza ao failsafe do <head> que o JS rodou (senão ele remove .js e mostra tudo sem animação)
window.__vvReady = true;

safe('attribution', captureAttribution);
safe('header', initHeader);
safe('scrollfx', initScrollFx);
safe('countup', initCountUp);
safe('faq', initFaq);
safe('marquee', initMarquee);
safe('magnetic', initMagnetic);
safe('prefetch', initPrefetch);
safe('analytics', initAnalytics);

const lazy: [string, () => Promise<{ default: () => void }>][] = [
  ['[data-svc-index]', () => import('./modules/svc-preview')],
  ['[data-tabs]', () => import('./modules/tabs')],
  ['[data-map]', () => import('./modules/map')],
  ['[data-yt]', () => import('./modules/youtube')],
  ['video[data-autoplay]', () => import('./modules/video')],
  ['[data-blog-grid]', () => import('./modules/blog')],
  ['[data-article]', () => import('./modules/article')],
  ['[data-contact-form]', () => import('./modules/contact')],
];
for (const [sel, load] of lazy) {
  if ($(sel)) load().then((m) => safe(sel, m.default)).catch((err) => console.error(`[ventura] falha ao carregar ${sel}`, err));
}

// Ano corrente em elementos marcados (caso o HTML esteja em cache antigo)
$$('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));
