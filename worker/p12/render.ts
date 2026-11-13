// Marcação das páginas que o Worker monta com os posts do Rankeando e dos que ele troca (contrato v3). Nada aqui inventa layout:
// as páginas partem de páginas reais do site (o post-modelo do kit, /blog/, a página do próprio post) e só trocam os campos.
// HTMLRewriter só existe no Worker; as funções puras (cartão, trilha, JSON-LD, sumário) rodam nos testes.
import { SITE_NAME, SITE_URL, readingMinutes } from './constantes';
import type { Assinatura, PostP12 } from './contrato';
import type { Cartao, CategoriaComPosts } from './store';

// ---------------------------------------------------------------------------------------------------------- texto

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** JSON dentro de <script>: todo "<" vira \u003c (o texto vem de artigo e </script> fecharia a tag). */
export const jsonEmScript = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const fmtSP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric', day: 'numeric' });

/** "13 de nov. de 2026", como o site mostra, no horário de São Paulo. */
export function dataBr(iso: string): string {
  const p = Object.fromEntries(fmtSP.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${Number(p.day)} de ${MESES[Number(p.month) - 1]} de ${p.year}`;
}

const https = (u: string | null): URL | null => {
  if (!u) return null;
  try {
    const x = new URL(u);
    return x.protocol === 'https:' ? x : null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------------------------------- sumário

export type TocItem = { depth: 2 | 3; text: string; slug: string };
export type Conteudo = { html: string; toc: TocItem[] };

/** Sumário a partir dos títulos do corpo: os dois níveis de cima, como 2 e 3. */
export function toc(headings: { depth: number; text: string; slug: string }[]): TocItem[] {
  const inBody = headings.filter((h) => h.depth >= 2);
  if (!inBody.length) return [];
  const top = Math.min(...inBody.map((h) => h.depth));
  return inBody.filter((h) => h.depth <= top + 1).map((h) => ({ depth: (h.depth === top ? 2 : 3) as 2 | 3, text: h.text, slug: h.slug }));
}

/** O sumário do site: só os títulos de nível 2, e só quando há mais de dois (a regra do post.html). */
export function sumarioHtml(itens: TocItem[]): string {
  const h2 = itens.filter((t) => t.depth === 2);
  if (h2.length <= 2) return '';
  return `<nav class="toc" aria-label="Neste artigo"><p class="toc__title">Neste artigo</p><ol>${h2.map((t) => `<li><a href="#${esc(t.slug)}">${esc(t.text)}</a></li>`).join('')}</ol></nav>`;
}

// ----------------------------------------------------------------------------------------------- assinatura

/** A caixa "Escrito por" do fim do post (campo opcional `post.assinatura`). Todo texto é escapado; foto e link só em https. */
export function caixaAssinatura(a: Assinatura): string {
  const pessoa = a.tipo === 'pessoa';
  const foto = https(a.foto_url);
  const link = https(a.link_url);
  const cargo = [a.funcao.trim(), a.registro.trim()].filter(Boolean).map(esc).join(' · ');
  const bio = a.curriculo.trim() ? esc(a.curriculo.trim()).replace(/\r\n|\r|\n/g, '<br>') : '';
  const rotulo = pessoa ? 'Escrito por' : 'Publicado por';
  return (
    `<aside class="rankeando-assinatura" aria-label="${rotulo} ${esc(a.nome)}">` +
    (foto ? `<img class="rankeando-assinatura__foto" src="${esc(foto.href)}" alt="${esc(a.nome)}" width="88" height="88" loading="lazy" decoding="async">` : '') +
    `<div class="rankeando-assinatura__texto"><p class="rankeando-assinatura__rotulo">${rotulo}</p>` +
    `<p class="rankeando-assinatura__nome">${esc(a.nome)}</p>` +
    (cargo ? `<p class="rankeando-assinatura__cargo">${cargo}</p>` : '') +
    (bio ? `<p class="rankeando-assinatura__bio">${bio}</p>` : '') +
    (link ? `<p class="rankeando-assinatura__link"><a href="${esc(link.href)}" rel="noopener">${pessoa ? 'Conheça a formação completa' : 'Saiba mais'}</a></p>` : '') +
    '</div></aside>'
  );
}

// -------------------------------------------------------------------------------------------------- cartões

export type CartaoDoRankeando = Cartao & { cats: string[] };

/** O cartão do site (o mesmo markup de postCard no build) para um post do Rankeando. */
export function cartaoHtml(c: CartaoDoRankeando, relogio: string, titulo: 'h2' | 'h3' = 'h3'): string {
  const capa = c.capa && https(c.capa.url);
  return (
    `<article class="post-card" data-cats="${esc(c.cats.join(' '))}" data-title="${esc(c.titulo.toLowerCase())}" data-date="${esc(c.publicadoEm)}">` +
    `<a class="post-card__link" href="/blog/${esc(c.slug)}/">` +
    (capa ? `<picture class="post-card__media"><img src="${esc(capa.href)}" width="720" height="450" alt="" loading="lazy" decoding="async"></picture>` : '') +
    `<span class="post-card__body"><span class="post-card__cat">${esc(c.categoria?.nome ?? 'Blog')}</span>` +
    `<${titulo} class="post-card__title">${esc(c.titulo.replace(/\.+$/, ''))}</${titulo}>` +
    `<span class="post-card__meta"><time datetime="${esc(c.publicadoEm)}">${dataBr(c.publicadoEm)}</time><span>${relogio} ${c.minutos} min de leitura</span></span></span></a></article>`
  );
}

/** Os slugs de uma categoria e das suas subcategorias (a página da mãe lista os posts das filhas). */
export function familiaDaCategoria(categorias: { slug: string; pai: string | null }[], slug: string): string[] {
  const topo = new Set(categorias.filter((c) => !c.pai).map((c) => c.slug));
  return [slug, ...categorias.filter((c) => c.pai === slug && topo.has(slug)).map((c) => c.slug)];
}

/** Os slugs que um post leva em `data-cats`: a categoria dele e, se for subcategoria, a mãe. */
export function slugsDoPost(categorias: { slug: string; pai: string | null }[], slug: string | null): string[] {
  if (!slug) return [];
  const pai = categorias.find((c) => c.slug === slug)?.pai;
  return pai ? [slug, pai] : [slug];
}

// ------------------------------------------------------------------------------------------------ trilhas

export type Passo = { name: string; path?: string };

/** `<nav class="crumbs">` do site (o conteúdo; o <nav> já existe na página). */
export function trilhaHtml(passos: Passo[]): string {
  const todos: Passo[] = [{ name: 'Início', path: '/' }, ...passos];
  return `<ol>${todos.map((p, i) => (i === todos.length - 1 ? `<li><span aria-current="page">${esc(p.name)}</span></li>` : `<li><a href="${esc(p.path ?? '/')}">${esc(p.name)}</a></li>`)).join('')}</ol>`;
}

const abs = (p: string) => (p.startsWith('http') ? p : SITE_URL + p);

export function breadcrumbLd(url: string, passos: Passo[]) {
  const todos: Passo[] = [{ name: 'Início', path: '/' }, ...passos];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#trilha`,
    itemListElement: todos.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, ...(p.path || i === todos.length - 1 ? { item: p.path ? abs(p.path) : url } : {}) })),
  };
}

// ------------------------------------------------------------------------------------------------ JSON-LD

export type DadosDoPost = {
  url: string;
  titulo: string;
  descricao: string;
  seoTitulo: string;
  publicadoEm: string;
  atualizadoEm: string;
  capaUrl: string | null;
  secoes: string[];
  palavras: number;
  minutos: number;
  autor: { tipo: 'Person' | 'Organization'; nome: string; url?: string };
  trilha: Passo[];
  faq: Record<string, unknown> | null;
};

/** O grafo da página de um post: os nós comuns do site, a página, a trilha e o BlogPosting. O FAQPage vai à parte (segunda <script>). */
export function grafoDoPost(base: unknown[], d: DadosDoPost): string {
  const ORG = `${SITE_URL}/#organizacao`;
  const graph = [
    ...base,
    {
      '@type': 'WebPage',
      '@id': `${d.url}#pagina`,
      url: d.url,
      name: d.seoTitulo,
      description: d.descricao,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': ORG },
      inLanguage: 'pt-BR',
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.answer'] },
      breadcrumb: { '@id': `${d.url}#trilha` },
      ...(d.capaUrl ? { primaryImageOfPage: { '@type': 'ImageObject', url: d.capaUrl } } : {}),
    },
    breadcrumbLd(d.url, d.trilha),
    {
      '@type': 'BlogPosting',
      '@id': `${d.url}#artigo`,
      headline: d.titulo.slice(0, 110),
      description: d.descricao,
      ...(d.capaUrl ? { image: [d.capaUrl] } : {}),
      datePublished: d.publicadoEm,
      dateModified: d.atualizadoEm,
      author: { '@type': d.autor.tipo, name: d.autor.nome, ...(d.autor.url ? { url: d.autor.url } : {}), ...(d.autor.tipo === 'Organization' ? { parentOrganization: { '@id': ORG } } : {}) },
      publisher: { '@id': ORG },
      mainEntityOfPage: { '@id': `${d.url}#pagina` },
      isPartOf: { '@id': `${SITE_URL}/blog/#blog` },
      ...(d.secoes.length ? { articleSection: d.secoes } : {}),
      wordCount: d.palavras,
      timeRequired: `PT${d.minutos}M`,
      inLanguage: 'pt-BR',
    },
  ];
  return jsonEmScript({ '@context': 'https://schema.org', '@graph': graph });
}

/** O FAQPage do post (já pronto, vindo do Rankeando), numa <script> própria. Vazio quando o post não tem FAQ. */
export const scriptDoFaq = (faq: Record<string, unknown> | null) => (faq ? `<script type="application/ld+json">${jsonEmScript(faq)}</script>` : '');

// ------------------------------------------------------------------------------------- páginas (HTMLRewriter)

const passar = (html: string, r: HTMLRewriter) => r.transform(new Response(html)).text();

const meta = (r: HTMLRewriter, seletor: string, valor: string | null, atributo = 'content') =>
  r.on(seletor, { element(el) { if (valor === null) el.remove(); else el.setAttribute(atributo, valor); } });

/** Troca o que descreve a página (título, descrição, endereço, imagem social) nas tags do <head>. */
function cabecalho(r: HTMLRewriter, o: { seoTitulo: string; descricao: string; url: string; imagem: string | null; imagemAlt: string; tipoOg?: string }) {
  r.on('title', { element(el) { el.setInnerContent(esc(o.seoTitulo), { html: true }); } });
  meta(r, 'meta[name="description"]', o.descricao);
  meta(r, 'meta[property="og:title"]', o.seoTitulo);
  meta(r, 'meta[name="twitter:title"]', o.seoTitulo);
  meta(r, 'meta[property="og:description"]', o.descricao);
  meta(r, 'meta[name="twitter:description"]', o.descricao);
  meta(r, 'link[rel="canonical"]', o.url, 'href');
  meta(r, 'meta[property="og:url"]', o.url);
  if (o.imagem) {
    meta(r, 'meta[property="og:image"]', o.imagem);
    meta(r, 'meta[name="twitter:image"]', o.imagem);
    meta(r, 'meta[property="og:image:alt"]', o.imagemAlt);
    // O tamanho e o tipo da imagem do Rankeando não são conhecidos: sai o que descrevia a imagem social do site.
    for (const s of ['width', 'height', 'type']) meta(r, `meta[property="og:image:${s}"]`, null);
  }
}

/** O JSON-LD da página: a primeira <script ld+json> leva o grafo novo, e a do FAQ (se houver) vem logo depois dela. */
function jsonLd(r: HTMLRewriter, grafo: string, faq: string) {
  let primeira = true;
  r.on('script[type="application/ld+json"]', {
    element(el) {
      if (!primeira) { el.remove(); return; }
      primeira = false;
      el.setInnerContent(grafo, { html: true });
      if (faq) el.after(faq, { html: true });
    },
  });
}

export type OpcoesPagina = {
  /** A página-base (modelo do kit ou a própria página do post), já como texto. */
  modelo: string;
  post: PostP12;
  conteudo: Conteudo;
  url: string;
  /** Rankeando: monta capa, categoria, trilha e "Continue lendo". Site (post trocado): só troca texto, SEO e corpo. */
  origem: 'publisher' | 'site';
  base: unknown[];
  trilha: Passo[];
  categoria: { href: string; nome: string } | null;
  secoes: string[];
  relacionados?: string[];
  autorHtml: string;
  capaDaPagina?: string | null;
  autor: DadosDoPost['autor'];
};

const INICIO_CORPO = /(<div class="prose article__body" data-article[^>]*>)([\s\S]*?)(<aside class="article__note")/;

/** A página de um post (do Rankeando, ou do site com o conteúdo trocado) a partir da página-base. */
export async function paginaDoPost(o: OpcoesPagina): Promise<string> {
  if (!INICIO_CORPO.test(o.modelo)) throw new Error('p12: corpo do post não encontrado na página-base');
  const p = o.post;
  const md = p.conteudo_markdown || o.conteudo.html.replace(/<[^>]+>/g, ' ');
  const minutos = readingMinutes(md);
  const palavras = md.split(/\s+/).filter(Boolean).length;
  const imagem = o.origem === 'publisher' ? (https(p.capa?.url ?? null)?.href ?? null) : (o.capaDaPagina ?? null);
  const descricao = p.seo.descricao || p.resumo;
  const seoTitulo = p.seo.titulo;
  const caixa = p.assinatura ? caixaAssinatura(p.assinatura) : '';

  // O corpo: tudo entre a abertura do texto e a nota final é trocado (a nota, com o WhatsApp da clínica, fica).
  const comCorpo = o.modelo.replace(INICIO_CORPO, (_m, ini: string, _velho: string, fim: string) => `${ini}${o.conteudo.html}${caixa}${fim}`);

  const r = new HTMLRewriter();
  cabecalho(r, { seoTitulo, descricao, url: o.url, imagem, imagemAlt: p.capa?.alt || p.titulo });
  meta(r, 'meta[property="article:published_time"]', p.publicado_em);
  meta(r, 'meta[property="article:modified_time"]', p.atualizado_em);
  if (o.origem === 'publisher') {
    let primeiraSecao = true;
    r.on('meta[property="article:section"]', { element(el) { if (o.secoes[0] && primeiraSecao) { el.setAttribute('content', o.secoes[0]); primeiraSecao = false; } else el.remove(); } });
  }
  jsonLd(r, grafoDoPost(o.base, {
    url: o.url, titulo: p.titulo, descricao, seoTitulo, publicadoEm: p.publicado_em, atualizadoEm: p.atualizado_em, capaUrl: imagem, secoes: o.secoes, palavras, minutos,
    autor: o.autor, trilha: o.trilha, faq: p.faq_jsonld,
  }), scriptDoFaq(p.faq_jsonld));

  r.on('nav.crumbs', { element(el) { el.setInnerContent(trilhaHtml(o.trilha), { html: true }); } });
  r.on('a.article__cat', {
    element(el) {
      if (!o.categoria) { el.remove(); return; }
      el.setAttribute('href', o.categoria.href);
      el.setInnerContent(o.categoria.nome);
    },
  });
  r.on('h1', { element(el) { el.setInnerContent(p.titulo); } });
  r.on('p.article__lede', { element(el) { el.setInnerContent(p.resumo || descricao); } });
  const atualizado = p.atualizado_em.slice(0, 10) !== p.publicado_em.slice(0, 10) ? `Atualizado em ${dataBr(p.atualizado_em)}` : '';
  r.on('p.article__meta', {
    element(el) {
      el.setInnerContent(`${o.autorHtml}<time datetime="${esc(p.publicado_em)}">${dataBr(p.publicado_em)}</time><span>${minutos} min de leitura</span><span>${esc(atualizado)}</span>`, { html: true });
    },
  });
  // O sumário: troca ou tira
  const sumario = sumarioHtml(o.conteudo.toc);
  r.on('nav.toc', { element(el) { if (sumario) el.replace(sumario, { html: true }); else el.remove(); } });
  // Compartilhar: os endereços do post
  const alvo = encodeURIComponent(o.url);
  r.on('a.share__btn[href^="https://wa.me/"]', { element(el) { el.setAttribute('href', `https://wa.me/?text=${encodeURIComponent(`${p.titulo} — ${o.url}`)}`); } });
  r.on('a.share__btn[href^="https://www.facebook.com/sharer/"]', { element(el) { el.setAttribute('href', `https://www.facebook.com/sharer/sharer.php?u=${alvo}`); } });

  if (o.origem === 'publisher') {
    // Capa (a segunda faixa .wrap--article do artigo é a da imagem) e "Continue lendo"
    r.on('article > div.wrap--article', {
      element(el) {
        if (imagem) el.setInnerContent(`<picture class="article__cover"><img src="${esc(imagem)}" alt="${esc(p.capa?.alt || p.titulo)}" width="1200" height="675" loading="eager" decoding="async" fetchpriority="high"></picture>`, { html: true });
      },
    });
    r.on('section.related .post-grid', { element(el) { el.setInnerContent((o.relacionados ?? []).join(''), { html: true }); } });
    r.on('section.related', { element(el) { if (!o.relacionados?.length) el.remove(); } });
  }
  return passar(comCorpo, r);
}

export type ChipDeCategoria = { slug: string; nome: string; posts: number };

/** Um chip do filtro do blog (o markup de x-blog-grid). */
export const chipHtml = (c: ChipDeCategoria, href: string, atual = false) =>
  `<li><a class="chip" href="${esc(href)}"${atual ? ' aria-current="page"' : ''} data-filter="${esc(c.slug)}">${esc(c.nome)} <span>${c.posts}</span></a></li>`;

/**
 * /blog/ com os posts do Rankeando no meio dos do site, por data, e as categorias deles como chips. A página do site não muda no resto.
 */
export async function blogMesclado(
  pagina: string,
  o: { cartoes: { data: number; html: string }[]; chips: ChipDeCategoria[]; totalGeral: number },
): Promise<string> {
  const pendentes = [...o.cartoes].sort((a, b) => b.data - a.data);
  const existentes = new Set<string>();
  const r = new HTMLRewriter();
  r.on('[data-blog-grid] article.post-card', {
    element(el) {
      const data = Date.parse(el.getAttribute('data-date') ?? '');
      while (pendentes.length && (Number.isNaN(data) || pendentes[0].data > data)) el.before(pendentes.shift()!.html, { html: true });
    },
  });
  r.on('[data-blog-grid]', {
    element(el) {
      el.onEndTag((fim) => {
        if (pendentes.length) fim.before(pendentes.splice(0).map((c) => c.html).join(''), { html: true });
      });
    },
  });
  r.on('a.chip[data-filter=""] span', { element(el) { el.setInnerContent(String(o.totalGeral)); } });
  r.on('a.chip[data-filter]', { element(el) { existentes.add(el.getAttribute('data-filter') ?? ''); } });
  r.on('ul.chips', {
    element(el) {
      el.onEndTag((fim) => {
        const novos = o.chips.filter((c) => !existentes.has(c.slug));
        if (novos.length) fim.before(novos.map((c) => chipHtml(c, `/blog/categoria/${c.slug}/`)).join(''), { html: true });
      });
    },
  });
  return passar(pagina, r);
}

export const POR_PAGINA = 12;

/** Os links de página da categoria (?page=N): só aparecem com mais de uma página. */
export function paginacaoHtml(base: string, pagina: number, total: number): string {
  if (total <= 1) return '';
  const href = (n: number) => (n === 1 ? base : `${base}?page=${n}`);
  const itens: string[] = [];
  if (pagina > 1) itens.push(`<a class="chip" href="${href(pagina - 1)}" rel="prev">Anterior</a>`);
  for (let n = 1; n <= total; n++) itens.push(n === pagina ? `<a class="chip" href="${href(n)}" aria-current="page">${n}</a>` : `<a class="chip" href="${href(n)}">${n}</a>`);
  if (pagina < total) itens.push(`<a class="chip" href="${href(pagina + 1)}" rel="next">Próxima</a>`);
  return `<nav class="chips" aria-label="Páginas" style="margin-top:2rem">${itens.join('')}</nav>`;
}

/** A página de uma categoria do Rankeando (/blog/categoria/<slug>/), a partir da página /blog/ do site. */
export async function paginaDaCategoria(
  pagina: string,
  o: {
    categoria: { slug: string; nome: string; descricao: string | null; mae: { slug: string; nome: string } | null };
    cartoes: string[];
    chips: ChipDeCategoria[];
    total: number;
    numero: number;
    paginas: number;
    base: unknown[];
    pagina1: number;
    ultimaAtualizacao: string | null;
  },
): Promise<string> {
  const { categoria: c } = o;
  const path = `/blog/categoria/${c.slug}/`;
  const url = SITE_URL + path;
  const descricao = c.descricao?.trim() || `${c.nome}: artigos do blog da ${SITE_NAME}, com dicas de saúde e bem-estar para cães e gatos.`;
  const titulo = `${c.nome} | Blog ${SITE_NAME}`;
  const trilha: Passo[] = [{ name: 'Blog', path: '/blog/' }, ...(c.mae ? [{ name: c.mae.nome, path: `/blog/categoria/${c.mae.slug}/` }] : []), { name: c.nome }];
  const grafo = jsonEmScript({
    '@context': 'https://schema.org',
    '@graph': [
      ...o.base,
      { '@type': 'CollectionPage', '@id': `${url}#pagina`, url, name: titulo, description: descricao, isPartOf: { '@id': `${SITE_URL}/#website` }, about: { '@id': `${SITE_URL}/#organizacao` }, inLanguage: 'pt-BR', breadcrumb: { '@id': `${url}#trilha` } },
      breadcrumbLd(url, trilha),
    ],
  });
  const r = new HTMLRewriter();
  cabecalho(r, { seoTitulo: titulo, descricao, url, imagem: null, imagemAlt: SITE_NAME });
  jsonLd(r, grafo, '');
  r.on('nav.crumbs', { element(el) { el.setInnerContent(trilhaHtml(trilha), { html: true }); } });
  r.on('h1', { element(el) { el.setInnerContent(c.nome); } });
  r.on('p.page-hero__lede', { element(el) { el.setInnerContent(c.descricao?.trim() || `${o.total} ${o.total === 1 ? 'artigo' : 'artigos'} da equipe Ventura Vet sobre ${c.nome.toLowerCase()}.`); } });
  r.on('ul.chips', {
    element(el) {
      el.setInnerContent(
        `<li><a class="chip" href="/blog/" data-filter="">Todos <span>${o.pagina1}</span></a></li>` + o.chips.map((x) => chipHtml(x, `/blog/categoria/${x.slug}/`, x.slug === c.slug)).join(''),
        { html: true },
      );
    },
  });
  r.on('[data-blog-grid]', {
    element(el) {
      el.setInnerContent(o.cartoes.join(''), { html: true });
      el.after(paginacaoHtml(path, o.numero, o.paginas), { html: true });
    },
  });
  return passar(pagina, r);
}

// ----------------------------------------------------------------------------------- sitemap, feed e cartões

const URL_SITEMAP = (loc: string, lastmod: string, prioridade: string, freq: string) =>
  `<url><loc>${esc(loc)}</loc><lastmod>${lastmod.slice(0, 10)}</lastmod><changefreq>${freq}</changefreq><priority>${prioridade}</priority></url>`;

/** O sitemap do site com os posts do Rankeando e as categorias que têm post; o lastmod dos posts do site trocados vira o da troca. */
export function sitemapMesclado(
  xml: string,
  o: { posts: { slug: string; atualizadoEm: string }[]; categorias: { slug: string; ultima: string }[]; trocasDoSite: Map<string, string> },
): string {
  let saida = xml;
  for (const [loc, lastmod] of o.trocasDoSite) {
    saida = saida.replace(new RegExp(`(<loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc><lastmod>)[^<]*(</lastmod>)`), `$1${lastmod.slice(0, 10)}$2`);
  }
  const novos = [
    ...o.posts.map((p) => URL_SITEMAP(`${SITE_URL}/blog/${p.slug}/`, p.atualizadoEm, '0.6', 'yearly')),
    ...o.categorias.map((c) => URL_SITEMAP(`${SITE_URL}/blog/categoria/${c.slug}/`, c.ultima, '0.4', 'weekly')),
  ].join('\n');
  return novos ? saida.replace('</urlset>', `${novos}\n</urlset>`) : saida;
}

const ITEM = /<item>[\s\S]*?<\/item>/g;

/** O RSS com os posts do Rankeando, do mais novo ao mais velho, no máximo 30; o título e a descrição de um post do site trocado vêm da troca. */
export function feedMesclado(
  xml: string,
  o: { posts: { slug: string; titulo: string; descricao: string; publicadoEm: string; categoria: string | null }[]; trocasDoSite: Map<string, { titulo: string; descricao: string | null }> },
): string {
  const itens = (xml.match(ITEM) ?? []).map((item) => {
    const loc = /<link>([^<]*)<\/link>/.exec(item)?.[1] ?? '';
    const t = o.trocasDoSite.get(loc);
    const trocado = t ? item.replace(/<title>[^<]*<\/title>/, `<title>${esc(t.titulo)}</title>`).replace(/<description>[^<]*<\/description>/, t.descricao ? `<description>${esc(t.descricao)}</description>` : '$&') : item;
    return { data: Date.parse(/<pubDate>([^<]*)<\/pubDate>/.exec(item)?.[1] ?? '') || 0, xml: trocado };
  });
  const novos = o.posts.map((p) => ({
    data: Date.parse(p.publicadoEm),
    xml: `<item><title>${esc(p.titulo)}</title><link>${SITE_URL}/blog/${p.slug}/</link><guid isPermaLink="true">${SITE_URL}/blog/${p.slug}/</guid><pubDate>${new Date(p.publicadoEm).toUTCString()}</pubDate><description>${esc(p.descricao)}</description>${p.categoria ? `<category>${esc(p.categoria)}</category>` : ''}</item>`,
  }));
  const todos = [...itens, ...novos].sort((a, b) => b.data - a.data).slice(0, 30).map((i) => i.xml).join('\n');
  const abertura = xml.search(ITEM);
  const fecho = xml.lastIndexOf('</item>') + '</item>'.length;
  if (abertura < 0) return xml.replace('</channel>', `${todos}\n</channel>`);
  return `${xml.slice(0, abertura)}${todos}${xml.slice(fecho)}`;
}

/** Um título de cartão do site trocado: o markup dos cartões vem do build, a troca só muda o texto do título. */
export async function trocarCartoes(pagina: string, tituloPorCaminho: Map<string, string>): Promise<string> {
  let atual: string | null = null;
  const r = new HTMLRewriter();
  r.on('article.post-card', { element() { atual = null; } });
  r.on('a.post-card__link', { element(el) { atual = tituloPorCaminho.get(el.getAttribute('href') ?? '') ?? null; } });
  r.on('.post-card__title', { element(el) { if (atual !== null) el.setInnerContent(atual.replace(/\.+$/, '')); } });
  return passar(pagina, r);
}
