/**
 * Kit do Rankeando: o que o Worker precisa do build para montar as páginas dos posts que não saem do código
 * (/p12-kit/, nunca servido a visitantes; o Worker responde 404 ali).
 *   /p12-kit/post/index.html   página-modelo de um post, no layout real do site (o Worker troca os campos)
 *   /p12-kit/config.json       categorias do site, nós comuns do JSON-LD, ícone do cartão
 *   /p12-kit/posts.json        índice dos posts do site (contrato v3: posts.listar)
 *   /p12-kit/cards.json        HTML do cartão de cada post do site (listas e "Continue lendo")
 *   /p12-kit/dados/<slug>.json cada post do site como dado (contrato v3: post.ler, post.substituir)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import * as cheerio from 'cheerio';
import { paths } from './paths.ts';
import { categories } from './site.ts';
import { categoryName, getPosts, type Post } from './posts.ts';
import { abs, baseGraph, type PageMeta } from './seo.ts';
import { icon } from './icons.ts';
import { idDoPostDoSite } from '../../worker/p12/ids.ts';

type Built = { meta: PageMeta; html: string };

export const KIT_POST_PATH = '/p12-kit/post/';

/** O post de mentira que o build renderiza no layout real: o Worker troca cada campo pelo do post do Rankeando. */
export function kitModelPost(): Post {
  const iso = '2001-02-03T15:00:00+00:00';
  return {
    slug: 'p12-modelo',
    path: KIT_POST_PATH,
    title: 'P12TITULO',
    description: 'P12DESCRICAO',
    datePublished: iso,
    dateModified: iso,
    categories: ['clinica'],
    image: null,
    words: 600,
    readingMinutes: 3,
    content: '<p>P12CONTEUDO</p><h2>P12TOC1</h2><p>x</p><h2>P12TOC2</h2><p>x</p><h2>P12TOC3</h2><p>x</p>',
  };
}

const write = async (file: string, data: string) => {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, data);
};

/** Markdown simples do corpo (títulos, parágrafos, listas, citações): serve de texto de apoio para o Rankeando (busca, resumo, nota). */
export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(`<div id="r">${html}</div>`, null, false);
  const out: string[] = [];
  const inline = (el: cheerio.Cheerio<any>) => {
    const c = el.clone();
    c.find('a').each((_, a) => {
      const t = $(a).text().trim();
      const h = $(a).attr('href');
      $(a).replaceWith(h && t ? `[${t}](${h})` : t);
    });
    c.find('strong,b').each((_, b) => {
      const t = $(b).text();
      $(b).replaceWith(t ? `**${t}**` : '');
    });
    c.find('em,i').each((_, b) => {
      const t = $(b).text();
      $(b).replaceWith(t ? `*${t}*` : '');
    });
    return c.text().replace(/\s+/g, ' ').trim();
  };
  $('#r').children().each((_, node) => {
    const el = $(node);
    const tag = (node as unknown as { tagName: string }).tagName;
    if (/^h[1-6]$/.test(tag)) out.push(`${'#'.repeat(Math.max(2, Number(tag[1])))} ${inline(el)}`);
    else if (tag === 'ul' || tag === 'ol') {
      el.children('li').each((i, li) => {
        out.push(`${tag === 'ol' ? `${i + 1}.` : '-'} ${inline($(li))}`);
      });
    } else if (tag === 'blockquote') out.push(`> ${inline(el)}`);
    else {
      const t = inline(el);
      if (t) out.push(t);
    }
  });
  return out.join('\n\n');
}

export async function buildP12Kit(posts: Built[], pages: Built[]) {
  const dist = join(paths.dist, 'p12-kit');
  const index: Record<string, unknown>[] = [];
  const slugs = new Set<string>();
  const ids = new Set<string>();
  const byPath = new Map<string, string>();

  for (const b of posts) {
    const post = b.meta.post!;
    const id = idDoPostDoSite(post.slug);
    if (slugs.has(post.slug)) throw new Error(`p12-kit: slug repetido: ${post.slug}`);
    if (ids.has(id)) throw new Error(`p12-kit: id_no_site repetido: ${id}`);
    slugs.add(post.slug);
    ids.add(id);
    byPath.set(post.path, post.slug);
    const primary = post.categories.find((c) => c !== 'dicas-e-curiosidades') ?? post.categories[0] ?? 'sem-categoria';

    // O corpo como a página mostra: o conteúdo de [data-article] sem a nota final
    const $ = cheerio.load(b.html);
    const corpo = $('[data-article]').first().clone();
    corpo.find('aside.article__note').remove();
    const html = corpo.html()!.trim();
    const titulo = post.title.replace(/\.+$/, '');
    const dados = {
      slug: post.slug,
      path: post.path,
      title: titulo,
      date: new Date(post.datePublished).toISOString(),
      updated: new Date(post.dateModified || post.datePublished).toISOString(),
      categories: post.categories,
      primary,
      author: 'Equipe Ventura Vet',
      seoTitle: b.meta.title,
      seoDescription: b.meta.description,
      excerpt: post.description,
      capa: b.meta.image ? { url: abs(b.meta.image), alt: titulo } : null,
      markdown: htmlToMarkdown(html),
      html,
      words: post.words,
    };
    await write(join(dist, 'dados', `${post.slug}.json`), JSON.stringify(dados));
    index.push({ slug: post.slug, path: post.path, title: titulo, date: dados.date, updated: dados.updated, categories: post.categories, id, primary });
  }
  index.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.id).localeCompare(String(b.id)));

  // Cartões prontos (com as imagens já otimizadas), tirados da página do blog
  const blog = pages.find((p) => p.meta.path === '/blog/');
  if (!blog) throw new Error('p12-kit: página /blog/ não encontrada');
  const $b = cheerio.load(blog.html);
  const cards: Record<string, string> = {};
  $b('[data-blog-grid] .post-card').each((_, el) => {
    const slug = byPath.get($b(el).find('a.post-card__link').attr('href') ?? '');
    if (slug) cards[slug] = $b.html(el);
  });
  const faltam = [...slugs].filter((s) => !cards[s]);
  if (faltam.length) throw new Error(`p12-kit: sem cartão para ${faltam.join(', ')}`);

  const usadas = new Set(getPosts().flatMap((p) => p.categories));
  const config = {
    categorias: Object.keys(categories)
      .filter((c) => usadas.has(c))
      .map((slug) => ({ slug, nome: categoryName(slug) })),
    graphBase: baseGraph(),
    iconeRelogio: icon('clock'),
    total: index.length,
  };
  await write(join(dist, 'config.json'), JSON.stringify(config));
  await write(join(dist, 'posts.json'), JSON.stringify(index));
  await write(join(dist, 'cards.json'), JSON.stringify(cards));
}
