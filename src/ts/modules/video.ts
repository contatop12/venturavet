import { $$, reducedMotion } from './dom';

/** Vídeos decorativos: carregam e tocam só quando visíveis; pausam fora da tela. */
export default function initVideo() {
  const videos = $$<HTMLVideoElement>('video[data-autoplay]');
  if (reducedMotion()) return; // fica no pôster
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting) {
        if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
        v.play().catch(() => {});
      } else v.pause();
    }
  }, { rootMargin: '200px 0px' });
  videos.forEach((v) => io.observe(v));
}
