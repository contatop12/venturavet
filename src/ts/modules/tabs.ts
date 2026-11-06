import { $$ } from './dom';

/** Abas acessíveis (WAI-ARIA): setas, Home/End; sem JS todos os painéis aparecem. */
export default function initTabs() {
  for (const root of $$('[data-tabs]')) {
    const panels = $$('.tabs__panel', root);
    const list = root.querySelector<HTMLElement>('.tabs__list');
    if (!list || !panels.length) continue;
    list.setAttribute('role', 'tablist');
    const tabs = panels.map((panel, i) => {
      const id = panel.id || `painel-${i}`;
      panel.id = id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tabs__tab';
      btn.id = `${id}-aba`;
      btn.textContent = panel.dataset.label ?? panel.querySelector('.tabs__heading')?.textContent ?? `Aba ${i + 1}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', btn.id);
      panel.tabIndex = 0;
      list.appendChild(btn);
      return btn;
    });
    const select = (i: number, focus = false) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
      tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const k = e.key;
        const n = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : null;
        if (n === null) return;
        e.preventDefault();
        select((n + tabs.length) % tabs.length, true);
      });
    });
    select(0);
  }
}
