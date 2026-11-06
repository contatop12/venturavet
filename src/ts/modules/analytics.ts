declare const __GTM_ID__: string;
declare global {
  interface Window { dataLayer: unknown[] }
}

/**
 * Google Tag Manager carregado só após a primeira interação (ou 4 s ocioso):
 * mantém o carregamento inicial livre de scripts de terceiros.
 * Cliques em WhatsApp/telefone viram eventos para medir conversão.
 */
export function initAnalytics() {
  window.dataLayer = window.dataLayer || [];
  const id = __GTM_ID__;
  let loaded = false;
  const load = () => {
    if (loaded || !id) return;
    loaded = true;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
    document.head.appendChild(s);
  };
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
  const once = () => { load(); events.forEach((e) => removeEventListener(e, once)); };
  events.forEach((e) => addEventListener(e, once, { passive: true, once: true }));
  addEventListener('load', () => setTimeout(load, 4000));

  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-track]');
    if (!a) return;
    window.dataLayer.push({ event: `${a.dataset.track}_click`, link_url: a.href, link_text: a.textContent?.trim().slice(0, 80), page_path: location.pathname });
  });
}
