/**
 * Sprite SVG por página: cada página recebe inline só os ícones que usa
 * (zero requisições extras, nada de ícone que não aparece).
 * UI: Lucide (ISC). Marcas: Simple Icons (CC0). LinkedIn desenhado à mão.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths } from './paths.ts';

const lucideDir = join(paths.root, 'node_modules/lucide-static/icons');
const simpleDir = join(paths.root, 'node_modules/simple-icons/icons');

const BRAND = new Set(['whatsapp', 'instagram', 'facebook', 'youtube', 'google']);

const CUSTOM: Record<string, { viewBox: string; fill: boolean; body: string }> = {
  'star-fill': { viewBox: '0 0 24 24', fill: true, body: '<path d="M12 2.6l2.9 5.88 6.5.94-4.7 4.58 1.11 6.47L12 17.42l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.94z"/>' },
  'play-fill': { viewBox: '0 0 24 24', fill: true, body: '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>' },
  linkedin: {
    viewBox: '0 0 24 24',
    fill: true,
    body: '<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>',
  },
};

const memo = new Map<string, string>();

function symbol(name: string): string {
  if (memo.has(name)) return memo.get(name)!;
  let out: string;
  if (CUSTOM[name]) {
    const c = CUSTOM[name];
    out = `<symbol id="i-${name}" viewBox="${c.viewBox}" ${c.fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${c.body}</symbol>`;
  } else if (BRAND.has(name)) {
    const svg = readFileSync(join(simpleDir, `${name}.svg`), 'utf8');
    const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/, '');
    out = `<symbol id="i-${name}" viewBox="0 0 24 24" fill="currentColor">${body}</symbol>`;
  } else {
    let svg: string;
    try {
      svg = readFileSync(join(lucideDir, `${name}.svg`), 'utf8');
    } catch {
      throw new Error(`Ícone inexistente: ${name}`);
    }
    const body = svg
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      .replace(/\s*\/>/g, '/>')
      .replace(/\n\s*/g, '');
    out = `<symbol id="i-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`;
  }
  memo.set(name, out);
  return out;
}

export function icon(name: string, cls = '') {
  return `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
}

export function sprite(names: Iterable<string>) {
  const list = [...new Set(names)].sort();
  if (!list.length) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${list.map(symbol).join('')}</svg>`;
}
