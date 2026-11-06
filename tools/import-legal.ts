/**
 * Importa os textos de Política de Privacidade e Termos de Uso do site
 * WordPress atual para content/legal/*.html (HTML limpo). Uso único.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const pages = ['politica-de-privacidade', 'termos-de-uso'];

await mkdir(join(ROOT, 'content/legal'), { recursive: true });
for (const slug of pages) {
  const html = await (await fetch(`https://venturavet.com.br/${slug}/`, { headers: { 'user-agent': 'Mozilla/5.0 (VenturaVetMigration)' } })).text();
  const $ = cheerio.load(html);
  const main = $('#main-content').length ? $('#main-content') : $('body');
  const out: string[] = [];
  main.find('h1, h2, h3, h4, p, li').each((_, el) => {
    const $el = $(el);
    if ($el.closest('header, footer, nav, .et_pb_contact_form, .ti-widget').length) return;
    if (el.tagName !== 'li' && $el.parents('li').length) return;
    const text = $el.text().replace(/\s+/g, ' ').trim();
    if (!text || el.tagName === 'h1') return;
    const clean = text.replace(/^[–-]\s*/, '');
    const tag = el.tagName === 'h1' ? 'h2' : el.tagName;
    out.push(tag === 'li' || /^[–-]\s/.test(text) ? `<li>${clean}</li>` : `<${tag}>${clean}</${tag}>`);
  });
  const body = out.join('\n').replace(/(?:<li>.*<\/li>\n?)+/g, (m) => `<ul>\n${m.trim()}\n</ul>\n`);
  await writeFile(join(ROOT, `content/legal/${slug}.html`), body + '\n');
  console.log(slug, out.length, 'blocos');
}
