import { $, $$ } from './dom';

/** Artigo: destaque da seção atual no sumário e botão "copiar link". */
export default function initArticle() {
  const links = $$<HTMLAnchorElement>('.toc a');
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.remove('is-active'));
        map.get(e.target.id)?.classList.add('is-active');
      }
    }, { rootMargin: '-20% 0px -70% 0px' });
    $$('[data-article] h2[id]').forEach((h) => io.observe(h));
  }

  const copy = $<HTMLButtonElement>('[data-copy-link]');
  copy?.addEventListener('click', async () => {
    const url = location.href.split('#')[0];
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: document.title, url });
      else await navigator.clipboard.writeText(url);
      copy.classList.add('is-copied');
      copy.setAttribute('aria-label', 'Link copiado');
      setTimeout(() => { copy.classList.remove('is-copied'); copy.setAttribute('aria-label', 'Copiar link do artigo'); }, 2000);
    } catch { /* usuário cancelou */ }
  });
}
