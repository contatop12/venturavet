import { $, $$, finePointer, reducedMotion } from './dom';

/** Índice de serviços: prévia da foto do serviço seguindo o cursor (desktop). */
export default function initSvcPreview() {
  const list = $('[data-svc-index]');
  if (!list || !finePointer() || window.innerWidth < 961) return;
  const items = $$('.svc-index__item', list);
  const box = document.createElement('div');
  box.className = 'svc-preview';
  box.setAttribute('aria-hidden', 'true');
  const pics = items.map((it) => {
    const pic = it.querySelector('picture')!.cloneNode(true) as HTMLElement;
    pic.className = '';
    pic.querySelector('img')!.loading = 'eager';
    box.appendChild(pic);
    return pic;
  });
  document.body.appendChild(box);

  let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
  const smooth = reducedMotion() ? 1 : 0.16;
  const tick = () => {
    x += (tx - x) * smooth;
    y += (ty - y) * smooth;
    box.style.setProperty('--x', `${x.toFixed(1)}px`);
    box.style.setProperty('--y', `${y.toFixed(1)}px`);
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0;
  };
  const move = (e: PointerEvent) => {
    tx = e.clientX + 24;
    ty = e.clientY - box.offsetHeight / 2;
    if (!box.classList.contains('is-on')) { x = tx; y = ty; }
    if (!raf) raf = requestAnimationFrame(tick);
  };

  items.forEach((it, i) => {
    it.addEventListener('pointerenter', () => {
      pics.forEach((p, j) => p.classList.toggle('is-active', i === j));
      box.classList.add('is-on');
    });
  });
  list.addEventListener('pointermove', move);
  list.addEventListener('pointerleave', () => box.classList.remove('is-on'));
  window.addEventListener('scroll', () => box.classList.remove('is-on'), { passive: true });
}
