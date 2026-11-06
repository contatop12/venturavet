import { $$ } from './dom';

/** Fachada leve de YouTube: o player (~800 KB) só carrega ao clicar. */
export default function initYouTube() {
  for (const a of $$<HTMLAnchorElement>('[data-yt]')) {
    a.addEventListener('pointerover', () => {
      if (document.querySelector('link[href="https://www.youtube-nocookie.com"]')) return;
      const l = document.createElement('link');
      l.rel = 'preconnect';
      l.href = 'https://www.youtube-nocookie.com';
      document.head.appendChild(l);
    }, { once: true });
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${a.dataset.yt}?autoplay=1&rel=0`;
      f.title = a.querySelector('img')?.alt ?? 'Vídeo';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      a.replaceChildren(f);
      a.removeAttribute('href');
    });
  }
}
