/**
 * Ponto de entrada. Módulos essenciais rodam já; os específicos de página
 * são importados sob demanda (code splitting) só quando o elemento existe.
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
import { $, $$ } from './modules/dom';

initHeader();
initReveal();
initScrollFx();
initCountUp();
initFaq();
initMarquee();
initMagnetic();
initPrefetch();
initAnalytics();

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
for (const [sel, load] of lazy) if ($(sel)) load().then((m) => m.default());

// Ano corrente em elementos marcados (caso o HTML esteja em cache antigo)
$$('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));
