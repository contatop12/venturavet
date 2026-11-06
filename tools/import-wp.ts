/**
 * Importa os posts do blog do WordPress atual (venturavet.com.br) para
 * content/posts/*.json, baixando as imagens para src/assets/img/blog/.
 *
 * Uso: npm run import:wp
 * Ferramenta de migração: roda uma vez; o conteúdo gerado é versionado.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const ORIGIN = 'https://venturavet.com.br';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_POSTS = join(ROOT, 'content/posts');
const OUT_IMG = join(ROOT, 'src/assets/img/blog');
const UA = 'Mozilla/5.0 (compatible; VenturaVetMigration/1.0)';

const CATEGORY_NAMES: Record<string, string> = {
  clinica: 'Clínica',
  'day-use': 'Day Use',
  'dicas-e-curiosidades': 'Dicas e curiosidades',
  hotel: 'Hotel',
  'pet-shop': 'Pet Shop',
  'sem-categoria': 'Sem categoria',
};

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function exists(p: string) {
  try { await access(p); return true; } catch { return false; }
}

async function download(url: string, dest: string) {
  if (await exists(dest)) return;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

function imgExt(url: string) {
  const e = extname(new URL(url).pathname).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(e) ? (e === '.jpeg' ? '.jpg' : e) : '.jpg';
}

/** Remove o sufixo de tamanho do WP (-400x250) e -scaled para pegar o original. */
function originalImage(url: string) {
  return url.replace(/-\d+x\d+(?=\.\w+$)/, '').replace(/-scaled(?=\.\w+$)/, '-scaled');
}

function cleanText(s: string) {
  return s.replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
}

async function importPost(url: string) {
  const html = await get(url);
  const $ = cheerio.load(html);
  const path = new URL(url).pathname;
  const slug = path.split('/').filter(Boolean).pop()!;

  const title = cleanText($('h1.entry-title').first().text() || $('meta[property="og:title"]').attr('content')?.replace(/ - Ventura$/, '') || slug);
  const description = cleanText($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '');
  const datePublished = $('meta[property="article:published_time"]').attr('content') || '';
  const dateModified = $('meta[property="article:modified_time"]').attr('content') || datePublished;
  const ogImage = $('meta[property="og:image"]').attr('content');

  const categories = new Set<string>();
  $('a[rel~="category"]').each((_, a) => {
    const m = ($(a).attr('href') || '').match(/\/category\/([^/]+)/);
    if (m) categories.add(m[1]);
  });

  let image: string | null = null;
  if (ogImage) {
    image = `blog/${slug}${imgExt(ogImage)}`;
    await download(ogImage, join(OUT_IMG, `${slug}${imgExt(ogImage)}`)).catch((e) => { console.warn('img', e.message); image = null; });
  }

  const $c = cheerio.load($('.entry-content').first().html() || '', null, false);
  $c('script, style, noscript, form, .sharedaddy, .et_social_inline, button').remove();

  // YouTube -> fachada leve
  $c('iframe').each((_, el) => {
    const src = $c(el).attr('src') || $c(el).attr('data-src') || $c(el).attr('data-lazy-src') || '';
    const m = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/);
    $c(el).replaceWith(m ? `<x-youtube id="${m[1]}" title="${title.replace(/"/g, '&quot;')}"></x-youtube>` : '');
  });

  // Imagens internas
  let n = 0;
  const imgs = $c('img').toArray();
  for (const el of imgs) {
    const $img = $c(el);
    const raw = $img.attr('data-lazy-src') || $img.attr('data-src') || $img.attr('src') || '';
    if (!raw || raw.startsWith('data:')) { $img.remove(); continue; }
    const abs = new URL(raw, ORIGIN).href;
    const src = originalImage(abs);
    const name = `${slug}-${++n}${imgExt(src)}`;
    try {
      await download(src, join(OUT_IMG, name)).catch(() => download(abs, join(OUT_IMG, name)));
      const alt = cleanText($img.attr('alt') || '') || title;
      $img.replaceWith(`<x-img src="blog/${name}" alt="${alt.replace(/"/g, '&quot;')}" sizes="(min-width: 760px) 720px, 100vw"></x-img>`);
    } catch (e) {
      console.warn('img', (e as Error).message);
      $img.remove();
    }
  }

  // Desembrulha wrappers e limpa atributos
  $c('div, span, section, font, center').each((_, el) => { $c(el).replaceWith($c(el).contents()); });
  $c('h1').each((_, el) => { el.tagName = 'h2'; });
  $c('*').each((_, el) => {
    if (el.type !== 'tag') return;
    const keep: Record<string, string[]> = { a: ['href'], 'x-img': ['src', 'alt', 'sizes'], 'x-youtube': ['id', 'title'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] };
    const allowed = keep[el.tagName] || [];
    for (const attr of Object.keys(el.attribs)) if (!allowed.includes(attr)) $c(el).removeAttr(attr);
  });
  $c('a').each((_, el) => {
    const href = $c(el).attr('href') || '';
    if (href.startsWith(ORIGIN)) {
      $c(el).attr('href', href.slice(ORIGIN.length) || '/');
    } else if (/^https?:/.test(href)) {
      $c(el).attr({ target: '_blank', rel: 'noopener noreferrer' });
    }
  });
  $c('p, li, h2, h3, h4, strong, em, b').each((_, el) => {
    const $el = $c(el);
    if (!cleanText($el.text()) && !$el.find('x-img, x-youtube').length) $el.remove();
  });
  $c('b').each((_, el) => { el.tagName = 'strong'; });
  $c('i').each((_, el) => { el.tagName = 'em'; });

  const content = ($c.html() || '').replace(/&nbsp;/g, ' ').replace(/\n{2,}/g, '\n').trim();
  const words = cleanText($c.root().text()).split(' ').length;

  const post = {
    slug,
    path,
    title,
    description,
    datePublished,
    dateModified,
    categories: [...categories],
    image,
    words,
    content,
  };
  await writeFile(join(OUT_POSTS, `${slug}.json`), JSON.stringify(post, null, 2) + '\n');
  return post;
}

async function main() {
  await mkdir(OUT_POSTS, { recursive: true });
  await mkdir(OUT_IMG, { recursive: true });
  const sm = await get(`${ORIGIN}/post-sitemap.xml`);
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /\/\d{4}\/\d{2}\/\d{2}\//.test(u));
  console.log(`${urls.length} posts encontrados`);
  const queue = [...urls];
  let done = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const url = queue.shift()!;
      try {
        const p = await importPost(url);
        console.log(`[${++done}/${urls.length}] ${p.slug} (${p.words} palavras)`);
      } catch (e) {
        console.error('FALHOU', url, (e as Error).message);
      }
    }
  }));
  await writeFile(join(ROOT, 'content/categories.json'), JSON.stringify(CATEGORY_NAMES, null, 2) + '\n');
}

main();
