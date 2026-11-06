export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Executa quando o navegador estiver ocioso (fallback para setTimeout). */
export function idle(fn: () => void, timeout = 2000) {
  if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout });
  else setTimeout(fn, 200);
}

/** Observa a entrada na viewport uma única vez. */
export function onVisible(els: Element[], cb: (el: Element) => void, opts: IntersectionObserverInit = { rootMargin: '0px 0px -10% 0px' }) {
  if (!('IntersectionObserver' in window)) return els.forEach(cb);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      cb(e.target);
    }
  }, opts);
  els.forEach((el) => io.observe(el));
}
