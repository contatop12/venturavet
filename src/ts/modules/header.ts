import { $, $$ } from './dom';

/** Cabeçalho: estado ao rolar, esconder/mostrar, menu mobile e submenu acessível. */
export function initHeader() {
  const header = $('[data-header]');
  const btn = $<HTMLButtonElement>('[data-menu-btn]');
  const nav = $('[data-nav]');
  const float = $('[data-wa-float]');
  if (!header) return;

  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    const open = document.documentElement.classList.contains('menu-open');
    if (!open && !header.contains(document.activeElement)) header.classList.toggle('is-hidden', y > 420 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove('is-hidden');
    float?.classList.toggle('is-compact', y > 600);
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();

  // Menu mobile
  const setMenu = (open: boolean) => {
    document.documentElement.classList.toggle('menu-open', open);
    btn?.setAttribute('aria-expanded', String(open));
    const label = btn?.querySelector('.sr-only');
    if (label) label.textContent = open ? 'Fechar menu' : 'Abrir menu';
    if (open) nav?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });
  };
  btn?.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.documentElement.classList.contains('menu-open')) { setMenu(false); btn?.focus(); }
    $$('.nav__has-sub.is-open').forEach((li) => closeSub(li));
  });
  nav?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setMenu(false);
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (m) => m.matches && setMenu(false));

  // Submenu (botão dedicado, funciona por toque e teclado)
  const closeSub = (li: Element) => {
    li.classList.remove('is-open');
    li.querySelector('.nav__toggle')?.setAttribute('aria-expanded', 'false');
  };
  $$('.nav__toggle').forEach((t) => {
    t.addEventListener('click', () => {
      const li = t.closest('.nav__has-sub')!;
      const open = !li.classList.contains('is-open');
      li.classList.toggle('is-open', open);
      t.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', (e) => {
    $$('.nav__has-sub.is-open').forEach((li) => { if (!li.contains(e.target as Node)) closeSub(li); });
  });
}
