/**
 * Pré-carregamento de páginas internas. Navegadores com Speculation Rules
 * já pré-renderizam via <script type="speculationrules">; nos demais,
 * faz prefetch ao passar o mouse/tocar no link (intenção de clique).
 */
export function initPrefetch() {
  if (HTMLScriptElement.supports?.('speculationrules')) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return;
  const done = new Set<string>();
  const prefetch = (e: Event) => {
    const a = (e.target as HTMLElement).closest?.('a');
    if (!a || a.origin !== location.origin || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = a.href.split('#')[0];
    if (done.has(url) || url === location.href.split('#')[0] || /\.(pdf|xml|txt|jpg|png|webp|avif)$/.test(url)) return;
    done.add(url);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  };
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });
  document.addEventListener('focusin', prefetch);
}
