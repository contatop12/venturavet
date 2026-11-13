/**
 * Auditoria do dist/: links internos quebrados, H1, title/description,
 * canonical, JSON-LD válido, imagens sem alt e duplicidades.
 *   npm run check
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import * as cheerio from 'cheerio';
import { paths } from './lib/paths.ts';

const files: string[] = [];
const walk = (d: string) => readdirSync(d).forEach((f) => { const p = join(d, f); if (statSync(p).isDirectory()) { if (p !== join(paths.dist, 'p12-kit')) walk(p); } else if (p.endsWith('.html')) files.push(p); });
walk(paths.dist);

const errors: string[] = [];
const warns: string[] = [];
const titles = new Map<string, string>();
const descs = new Map<string, string>();
const resolves = (href: string) => {
  const p = decodeURIComponent(href.split('#')[0].split('?')[0]);
  if (!p) return true;
  const f = join(paths.dist, p);
  return existsSync(f) && statSync(f).isFile() ? true : existsSync(join(f, 'index.html'));
};
const redirects = ['/feed/', '/banho-e-tosa-2/'];

for (const file of files) {
  const rel = '/' + relative(paths.dist, file).replace(/\\/g, '/');
  const html = readFileSync(file, 'utf8');
  const $ = cheerio.load(html);
  const noindex = /noindex/.test($('meta[name=robots]').attr('content') ?? '');
  const h1 = $('h1').length;
  if (h1 !== 1) errors.push(`${rel}: ${h1} <h1>`);
  const title = $('title').text();
  const desc = $('meta[name=description]').attr('content') ?? '';
  if (!noindex) {
    // Posts mantêm o título original do WordPress (ver seoTitle no build): podem passar de 70
    const isPost = /^\/20\d\d\/\d\d\/\d\d\//.test(rel);
    if (title.length < 25 || (!isPost && title.length > 70)) warns.push(`${rel}: title com ${title.length} caracteres`);
    if (desc.length < 110 || desc.length > 170) warns.push(`${rel}: description com ${desc.length} caracteres`);
    if (titles.has(title)) errors.push(`${rel}: title duplicado de ${titles.get(title)}`);
    if (descs.has(desc)) errors.push(`${rel}: description duplicada de ${descs.get(desc)}`);
    titles.set(title, rel);
    descs.set(desc, rel);
  }
  if (!$('link[rel=canonical]').attr('href')) errors.push(`${rel}: sem canonical`);
  // Todo HTML precisa carregar o JS principal (e só ele) como módulo; os chunks vêm por import()
  const mods = $('script[type="module"][src]').map((_, s) => $(s).attr('src')!).get();
  if (mods.length !== 1 || !/^\/assets\/main\.[\w-]+\.js$/.test(mods[0])) errors.push(`${rel}: script principal errado → ${mods.join(', ') || 'nenhum'}`);
  else if (!existsSync(join(paths.dist, mods[0]))) errors.push(`${rel}: script principal não existe → ${mods[0]}`);
  $('script[type="application/ld+json"]').each((_, s) => {
    try { JSON.parse($(s).html() ?? ''); } catch { errors.push(`${rel}: JSON-LD inválido`); }
  });
  $('img').each((_, img) => { if ($(img).attr('alt') === undefined) errors.push(`${rel}: <img> sem alt (${$(img).attr('src')})`); });
  $('a[href^="/"]').each((_, a) => {
    const href = $(a).attr('href')!;
    if (redirects.includes(href)) return;
    if (!resolves(href)) errors.push(`${rel}: link quebrado → ${href}`);
  });
  $('[id]').each((_, el) => {
    const id = $(el).attr('id')!;
    if ($(`[id="${id}"]`).length > 1) errors.push(`${rel}: id duplicado #${id}`);
  });
  $('a[href^="#"]').each((_, a) => {
    const id = $(a).attr('href')!.slice(1);
    if (id && !$(`[id="${id}"]`).length) errors.push(`${rel}: âncora sem destino #${id}`);
  });
}

const sizes = ['/index.html', '/clinica-veterinaria/index.html', '/blog/index.html']
  .map((p) => { const b = readFileSync(join(paths.dist, p)); return `${p}: ${(b.length / 1024).toFixed(0)} KB (${(gzipSync(b).length / 1024).toFixed(0)} KB gzip)`; });

console.log(`${files.length} páginas auditadas`);
console.log(sizes.join('\n'));
[...new Set(warns)].forEach((w) => console.log('⚠', w));
[...new Set(errors)].forEach((e) => console.log('✗', e));
if (errors.length) process.exit(1);
console.log('✓ sem erros');
