import { $, $$ } from './dom';

/**
 * Seletor de atendimento (<dialog id="atendimento">).
 * Os botões usam Invoker Commands (commandfor/command="show-modal"); aqui fica o reforço
 * para navegadores sem suporte, o fechamento ao clicar fora/escolher uma opção e a medição.
 */
export function initAtendimento() {
  const dialog = $<HTMLDialogElement>('[data-atend]');
  if (!dialog) return;
  const native = 'command' in HTMLButtonElement.prototype;
  let opener: HTMLElement | null = null;

  const push = (event: string, extra: Record<string, unknown> = {}) => {
    (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event, page_path: location.pathname, ...extra });
  };

  $$<HTMLButtonElement>('[data-atendimento]').forEach((btn) => {
    btn.addEventListener('click', () => {
      opener = btn;
      if (!native && !dialog.open) dialog.showModal();
      push('atendimento_open', { position: btn.dataset.pos });
    });
  });
  if (!native) $('[data-atend-close]', dialog)?.addEventListener('click', () => dialog.close());

  // Clique no fundo escurecido fecha o painel
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  // Escolher uma opção abre o WhatsApp em outra aba e fecha o painel
  $$('a[href*="wa.me"]', dialog).forEach((a) => a.addEventListener('click', () => setTimeout(() => dialog.close(), 150)));

  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
  dialog.addEventListener('toggle', () => document.documentElement.classList.toggle('atend-open', dialog.open));
}
