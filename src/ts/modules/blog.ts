import { $, $$ } from './dom';

type VTDocument = Document & { startViewTransition?: (cb: () => void) => unknown };

/** Blog: busca instantânea e filtro por categoria sem recarregar (com View Transitions). */
export default function initBlog() {
  const grid = $('[data-blog-grid]');
  const input = $<HTMLInputElement>('[data-blog-search]');
  const empty = $('[data-blog-empty]');
  if (!grid) return;
  const cards = $$('.post-card', grid);
  const chips = $$<HTMLAnchorElement>('.chip[data-filter]');
  const onBlogIndex = location.pathname === '/blog/';
  let cat = chips.find((c) => c.getAttribute('aria-current') === 'page')?.dataset.filter ?? '';
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const apply = () => {
    const q = norm(input?.value.trim() ?? '');
    let shown = 0;
    for (const c of cards) {
      const okCat = !cat || (c.dataset.cats ?? '').split(' ').includes(cat);
      const okQ = !q || norm(c.dataset.title ?? '').includes(q) || norm(c.textContent ?? '').includes(q);
      c.hidden = !(okCat && okQ);
      if (!c.hidden) shown++;
    }
    if (empty) empty.hidden = shown > 0;
  };
  const withTransition = (fn: () => void) => {
    const d = document as VTDocument;
    if (d.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) d.startViewTransition(fn);
    else fn();
  };

  let t: number | undefined;
  input?.addEventListener('input', () => {
    clearTimeout(t);
    t = window.setTimeout(() => withTransition(apply), 120);
  });

  // Na página /blog/ os chips filtram no lugar; nas categorias, navegam normalmente.
  if (onBlogIndex) {
    chips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        cat = chip.dataset.filter ?? '';
        chips.forEach((c) => (c === chip ? c.setAttribute('aria-current', 'page') : c.removeAttribute('aria-current')));
        withTransition(apply);
      });
    });
  }
  cards.forEach((c, i) => ((c as HTMLElement).style.viewTransitionName = `post-${i}`));
}
