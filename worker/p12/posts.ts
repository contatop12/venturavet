// Posts of the blog as Rankeando contract v3 sees them (`posts.listar`, `post.ler`, `post.substituir`, `post.restaurar`): the site's own posts
// (written in the code, prerendered at build: data in /p12-kit/, see src/pages/p12-kit/) and the Rankeando ones (D1), one list, each with a
// stable `id_no_site` (worker/p12/ids.ts). A replacement (table p12_substituicoes) is applied here and by the pages (site.ts): the original is never edited.
import { SITE_URL, readingMinutes } from './constantes';
import type { PostP12 } from './contrato';
import { idDoPostDoPublisher, idDoPostDoSite } from './ids';
import type { Cartao, P12Store, Resumo, Substituicao } from './store';

/** A site post in the index /p12-kit/posts.json (the build writes `id`, `updated` and `primary`; older builds lack them). */
export type IndiceDoSite = { slug: string; path: string; title: string; date: string; categories?: string[]; id?: string; updated?: string; primary?: string };
/** /p12-kit/dados/<slug>.json: everything the Worker needs of a site post that the pages do not carry as data (src/pages/p12-kit/dados/). */
export type DadosDoPostDoSite = {
  slug: string;
  /** Caminho público do post (/AAAA/MM/DD/slug/). */
  path: string;
  title: string;
  date: string;
  updated: string;
  categories: string[];
  primary: string;
  author: string;
  seoTitle: string | null;
  seoDescription: string | null;
  excerpt: string;
  capa: { url: string; alt: string };
  markdown: string;
  /** The article body as the page shows it (no `<h1>`: the title is the page hero). */
  html: string;
};
export interface FonteDoSite {
  indice(): Promise<IndiceDoSite[]>;
  dados(slug: string): Promise<DadosDoPostDoSite | null>;
}

/** A post of the blog, whatever its origin, as `posts.listar` shows it (the replacement, if any, already applied). */
export type Entrada = {
  idNoSite: string;
  slug: string;
  /** Endereço público completo (https). */
  url: string;
  titulo: string;
  publicadoEm: string;
  atualizadoEm: string;
  categoriaSlug: string | null;
  /** The Rankeando id of a post Rankeando published; null for a site post. */
  origem: string | null;
  tipo: 'site' | 'publisher';
  troca: Substituicao | null;
};

/** Endereço de um post do Rankeando (o do contrato: /blog/<slug>/). */
export const urlDoPostDoPublisher = (slug: string) => `${SITE_URL}/blog/${slug}/`;
export const urlDoPostDoSite = (path: string) => `${SITE_URL}${path}`;
const iso = (s: string) => new Date(s).toISOString();

export const idDoIndice = (p: IndiceDoSite) => p.id ?? idDoPostDoSite(p.slug);

/** Every post of the blog, newest first (ties by `id_no_site`). A Rankeando post whose slug the site took since is not on the site, so it is left out. */
export async function entradas(store: P12Store, site: FonteDoSite): Promise<Entrada[]> {
  const [indice, resumos, trocas] = await Promise.all([site.indice(), store.resumos(), store.substituicoes()]);
  const porId = new Map(trocas.map((t) => [t.idNoSite, t]));
  const slugsDoSite = new Set(indice.map((p) => p.slug));
  const doSite = indice.map((p): Entrada => {
    const id = idDoIndice(p);
    const t = porId.get(id) ?? null;
    return {
      idNoSite: id, slug: p.slug, url: urlDoPostDoSite(p.path), titulo: t?.titulo ?? p.title, publicadoEm: iso(p.date), atualizadoEm: t?.atualizadoEm ?? iso(p.updated ?? p.date),
      categoriaSlug: p.primary ?? p.categories?.[0] ?? null, origem: null, tipo: 'site', troca: t,
    };
  });
  const doPublisher = resumos
    .filter((r) => !slugsDoSite.has(r.slug))
    .map((r): Entrada => {
      const id = idDoPostDoPublisher(r.id);
      const t = porId.get(id) ?? null;
      return {
        idNoSite: id, slug: r.slug, url: urlDoPostDoPublisher(r.slug), titulo: t?.titulo ?? r.titulo, publicadoEm: iso(r.publicadoEm), atualizadoEm: t?.atualizadoEm ?? iso(r.atualizadoEm),
        categoriaSlug: r.categoria, origem: r.id, tipo: 'publisher', troca: t,
      };
    });
  return [...doSite, ...doPublisher].sort((a, b) => (a.publicadoEm < b.publicadoEm ? 1 : a.publicadoEm > b.publicadoEm ? -1 : a.idNoSite < b.idNoSite ? -1 : a.idNoSite > b.idNoSite ? 1 : 0));
}

// ------------------------------------------------------------------------------------------ posts.listar

const MAX_RESPOSTA_LISTA = 60_000;
/** The cursor says where the last post of the page sits in the order: its publication date and its id. */
const cursorDe = (e: Entrada) => {
  const bytes = new TextEncoder().encode(`${e.publicadoEm}|${e.idNoSite}`);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
function lerCursor(c: string): { publicadoEm: string; idNoSite: string } | null {
  try {
    const bin = atob(c.replace(/-/g, '+').replace(/_/g, '/'));
    const texto = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
    const i = texto.indexOf('|');
    return i > 0 && !Number.isNaN(Date.parse(texto.slice(0, i))) && texto.slice(0, i) === new Date(texto.slice(0, i)).toISOString() ? { publicadoEm: texto.slice(0, i), idNoSite: texto.slice(i + 1) } : null;
  } catch {
    return null;
  }
}

export type PedidoDeLista = { limite: number; cursor: string | null; desde: number | null; ate: number | null };
export type PaginaDePosts = { posts: Record<string, unknown>[]; total: number; proximo_cursor: string | null };

/** One page of the list, or null for a cursor this site did not give. */
export function paginaDePosts(todas: Entrada[], q: PedidoDeLista): PaginaDePosts | null {
  const janela = todas.filter((e) => {
    const t = Date.parse(e.publicadoEm);
    return (q.desde === null || t >= q.desde) && (q.ate === null || t <= q.ate);
  });
  let inicio = 0;
  if (q.cursor !== null) {
    const c = lerCursor(q.cursor);
    if (!c) return null;
    // First post after the one the cursor names: older, or the same date with a later id.
    inicio = janela.findIndex((e) => e.publicadoEm < c.publicadoEm || (e.publicadoEm === c.publicadoEm && e.idNoSite > c.idNoSite));
    if (inicio < 0) inicio = janela.length;
  }
  let fim = Math.min(inicio + q.limite, janela.length);
  const item = (e: Entrada) => ({
    id_no_site: e.idNoSite, slug: e.slug, url: e.url, titulo: e.titulo, publicado_em: e.publicadoEm, atualizado_em: e.atualizadoEm,
    categoria_slug: e.categoriaSlug, origem: e.origem,
  });
  let posts = janela.slice(inicio, fim).map(item);
  // The answer may not pass 64 KB: a page of very long titles is cut short (the cursor still points after the last post given).
  while (posts.length > 1 && JSON.stringify(posts).length > MAX_RESPOSTA_LISTA) {
    fim--;
    posts = posts.slice(0, -1);
  }
  return { posts, total: janela.length, proximo_cursor: fim < janela.length && fim > inicio ? cursorDe(janela[fim - 1]) : null };
}

// ----------------------------------------------------------------------------------------- post.ler

/** What `post.ler` answers (beside `ok`): the post as the site shows it today, the replacement applied. */
export type PostLido = {
  id_no_site: string;
  slug: string;
  url: string;
  titulo: string;
  conteudo_html: string;
  publicado_em: string;
  atualizado_em: string;
  conteudo_markdown: string;
  seo: { titulo: string; descricao: string; palavra_chave: string };
  faq_jsonld: Record<string, unknown> | null;
  capa?: { url: string; alt: string };
};

/** The entry with this `id_no_site`, or null (the id is not on the site). */
export const acharEntrada = (todas: Entrada[], idNoSite: string) => todas.find((e) => e.idNoSite === idNoSite) ?? null;

/** The post of an entry as `post.ler` gives it, or null when its data is missing (the build data of a site post, the D1 row). */
export async function lerPostDaEntrada(e: Entrada, store: P12Store, site: FonteDoSite): Promise<PostLido | null> {
  const t = e.troca;
  if (e.tipo === 'site') {
    const d = await site.dados(e.slug);
    if (!d) return null;
    return {
      id_no_site: e.idNoSite, slug: e.slug, url: e.url, titulo: t?.titulo ?? d.title,
      conteudo_html: t ? t.conteudoHtml : d.html, publicado_em: iso(d.date), atualizado_em: t?.atualizadoEm ?? iso(d.updated),
      conteudo_markdown: t ? t.conteudoMarkdown : d.markdown,
      seo: { titulo: t?.seoTitulo || d.seoTitle || d.title, descricao: t?.seoDescricao || d.seoDescription || d.excerpt, palavra_chave: t?.seoPalavraChave ?? '' },
      faq_jsonld: t ? t.faqJsonld : null,
      capa: d.capa,
    };
  }
  const reg = await store.porId(e.origem!);
  const p = reg ? await store.post(reg.slug) : null;
  if (!p) return null;
  const q = comTrocaNoPost(p, t);
  return {
    id_no_site: e.idNoSite, slug: q.slug, url: urlDoPostDoPublisher(q.slug), titulo: q.titulo, conteudo_html: q.conteudo_html, publicado_em: q.publicado_em,
    atualizado_em: q.atualizado_em, conteudo_markdown: q.conteudo_markdown,
    seo: { titulo: q.seo.titulo, descricao: q.seo.descricao, palavra_chave: q.seo.palavra_chave ?? '' },
    faq_jsonld: q.faq_jsonld, ...(q.capa ? { capa: q.capa } : {}),
  };
}

// ------------------------------------------------------------------- the replacement, applied

/** A Rankeando post with its replacement (if any) in place of its content, SEO and FAQ. Slug, dates, category, cover and author stay. */
export function comTrocaNoPost(p: PostP12, t: Substituicao | null | undefined): PostP12 {
  if (!t) return p;
  return {
    ...p,
    titulo: t.titulo,
    resumo: t.seoDescricao || p.resumo,
    conteudo_html: t.conteudoHtml,
    conteudo_markdown: t.conteudoMarkdown,
    seo: { ...p.seo, titulo: t.seoTitulo || p.seo.titulo, descricao: t.seoDescricao || p.seo.descricao, palavra_chave: t.seoPalavraChave || p.seo.palavra_chave },
    faq_jsonld: t.faqJsonld,
    atualizado_em: t.atualizadoEm,
  };
}

export function comTrocaNoResumo(r: Resumo, t: Substituicao | null | undefined): Resumo {
  return t ? { ...r, titulo: t.titulo, resumo: t.seoDescricao || r.resumo, atualizadoEm: t.atualizadoEm } : r;
}

export function comTrocaNoCartao(c: Cartao, t: Substituicao | null | undefined): Cartao {
  return t ? { ...c, titulo: t.titulo, resumo: t.seoDescricao || c.resumo, minutos: t.conteudoMarkdown ? readingMinutes(t.conteudoMarkdown) : c.minutos } : c;
}

/** The replacements by `id_no_site`. */
export const trocasPorId = (trocas: Substituicao[]) => new Map(trocas.map((t) => [t.idNoSite, t]));

/** The replacement of a Rankeando post (D1 id), if it has one. */
export const trocaDoPublisher = (trocas: Map<string, Substituicao>, idDoPost: string) => trocas.get(idDoPostDoPublisher(idDoPost)) ?? null;

/**
 * A site post as the Rankeando post template renders it (its page when a replacement exists): the replacement's content, title and SEO over the
 * site's own date, author, cover and category. An empty SEO field keeps the original's (the site's own title gets the usual " | <site>" suffix).
 */
export function postDoSiteComTroca(d: DadosDoPostDoSite, idNoSite: string, t: Substituicao, categoria: { slug: string; nome: string } | null): PostP12 {
  const descricao = t.seoDescricao || d.seoDescription || d.excerpt;
  return {
    id: idNoSite,
    slug: d.slug,
    titulo: t.titulo,
    resumo: descricao,
    conteudo_html: t.conteudoHtml,
    conteudo_markdown: t.conteudoMarkdown,
    capa: d.capa,
    seo: { titulo: t.seoTitulo || d.seoTitle || d.title, descricao, palavra_chave: t.seoPalavraChave || null, canonical: null },
    faq_jsonld: t.faqJsonld,
    autor: d.author,
    publicado_em: iso(d.date),
    atualizado_em: t.atualizadoEm,
    categoria: categoria ? { slug: categoria.slug, nome: categoria.nome, descricao: null, pai: null } : null,
    assinatura: null,
  };
}
