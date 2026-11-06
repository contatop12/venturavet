import { $$, reducedMotion } from './dom';

/**
 * Avaliações em rolagem contínua. Pausa ao passar o mouse, focar ou tocar;
 * continua rolável manualmente (arrastar/scroll). Cópias são inertes para
 * leitores de tela não repetirem o conteúdo.
 */
export function initMarquee() {
  for (const vp of $$('[data-marquee]')) {
    const track = vp.firstElementChild as HTMLElement | null;
    if (!track) continue;
    if (reducedMotion()) continue;
    const originals = [...track.children];
    originals.forEach((li) => {
      const c = li.cloneNode(true) as HTMLElement;
      c.setAttribute('aria-hidden', 'true');
      c.inert = true;
      track.appendChild(c);
    });

    let paused = false;
    let visible = false;
    let pos = vp.scrollLeft;
    let last = 0;
    const speed = 0.035; // px por ms
    const half = () => track.scrollWidth / 2;

    const loop = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      if (!paused && visible) {
        pos += speed * dt;
        if (pos >= half()) pos -= half();
        vp.scrollLeft = pos;
      } else {
        pos = vp.scrollLeft;
      }
      requestAnimationFrame(loop);
    };
    const pause = () => (paused = true);
    const play = () => { paused = false; pos = vp.scrollLeft; };
    vp.addEventListener('pointerenter', pause);
    vp.addEventListener('pointerleave', play);
    vp.addEventListener('focusin', pause);
    vp.addEventListener('focusout', play);
    vp.addEventListener('touchstart', pause, { passive: true });
    vp.addEventListener('touchend', () => setTimeout(play, 2500), { passive: true });
    vp.addEventListener('scroll', () => { if (paused && vp.scrollLeft >= half()) vp.scrollLeft -= half(); }, { passive: true });

    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(vp);
    requestAnimationFrame(loop);
  }
}
