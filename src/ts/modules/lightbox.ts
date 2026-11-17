import { $$ } from './dom';

/**
 * Galerias (.gallery) com ampliação: clique, toque, Enter ou Espaço abrem a foto em tela cheia;
 * setas (tela e teclado) e deslizar navegam; Esc ou o X fecham. O <dialog> é criado só aqui.
 */
export default function initLightbox() {
  const items = $$<HTMLImageElement>('.gallery img');
  if (!items.length) return;

  const svg = (d: string) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Foto ampliada');
  dlg.innerHTML = `<div class="lightbox__stage"><img alt=""></div><p class="lightbox__cap" aria-live="polite"></p>
<button class="lightbox__btn lightbox__close" type="button" aria-label="Fechar">${svg('M18 6 6 18M6 6l12 12')}</button>
<button class="lightbox__btn lightbox__prev" type="button" aria-label="Foto anterior">${svg('m15 18-6-6 6-6')}</button>
<button class="lightbox__btn lightbox__next" type="button" aria-label="Próxima foto">${svg('m9 18 6-6-6-6')}</button>`;
  document.body.appendChild(dlg);
  const img = dlg.querySelector('img')!;
  const cap = dlg.querySelector('.lightbox__cap')!;
  let group: HTMLImageElement[] = [];
  let i = 0;
  let opener: HTMLElement | null = null;

  const show = (n: number) => {
    i = (n + group.length) % group.length;
    const src = group[i];
    // Maior versão disponível no srcset (as galerias carregam miniaturas)
    const set = src.closest('picture')?.querySelector('source[type="image/webp"]')?.getAttribute('srcset') ?? '';
    const best = set.split(',').map((c) => c.trim().split(' ')[0]).filter(Boolean).pop();
    img.src = best || src.currentSrc || src.src;
    img.alt = src.alt;
    cap.textContent = `${src.alt} (${i + 1} de ${group.length})`;
  };
  const open = (el: HTMLImageElement) => {
    group = [...(el.closest('.gallery')?.querySelectorAll<HTMLImageElement>('img') ?? [el])];
    opener = el;
    show(group.indexOf(el));
    dlg.showModal();
    document.documentElement.classList.add('atend-open');
  };

  items.forEach((el) => {
    el.dataset.zoom = '';
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Ampliar foto: ${el.alt}`);
    el.addEventListener('click', () => open(el));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el); }
    });
  });

  dlg.querySelector('.lightbox__close')!.addEventListener('click', () => dlg.close());
  dlg.querySelector('.lightbox__prev')!.addEventListener('click', () => show(i - 1));
  dlg.querySelector('.lightbox__next')!.addEventListener('click', () => show(i + 1));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
  // Deslizar para os lados no celular
  let x0 = 0;
  let swiped = false;
  dlg.addEventListener('pointerdown', (e) => { x0 = e.clientX; swiped = false; });
  dlg.addEventListener('pointerup', (e) => {
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 50) { swiped = true; show(dx < 0 ? i + 1 : i - 1); }
  });
  // Clique fora da foto fecha (exceto quando foi um gesto de deslizar)
  dlg.addEventListener('click', (e) => {
    if (swiped) { swiped = false; return; }
    if ((e.target as HTMLElement).classList.contains('lightbox__stage') || e.target === dlg) dlg.close();
  });
  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('atend-open');
    opener?.focus({ preventScroll: true });
  });
}
