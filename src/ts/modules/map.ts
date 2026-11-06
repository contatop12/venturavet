import { $$ } from './dom';

/** Google Maps só é carregado quando o mapa se aproxima da tela (economiza ~1 MB). */
export default function initMap() {
  const maps = $$('[data-map]');
  const load = (el: HTMLElement) => {
    if (el.querySelector('iframe:not(noscript iframe)')) return;
    const f = document.createElement('iframe');
    f.src = el.dataset.map!;
    f.title = el.dataset.mapTitle ?? 'Mapa';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.allowFullscreen = true;
    el.appendChild(f);
  };
  if (!('IntersectionObserver' in window)) return maps.forEach(load);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      load(e.target as HTMLElement);
    });
  }, { rootMargin: '400px 0px' });
  maps.forEach((m) => io.observe(m));
}
