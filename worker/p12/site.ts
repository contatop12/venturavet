// As páginas do site que passam pelo Worker. Tudo o que não é do Rankeando sai do jeito que o build fez (arquivos estáticos):
//   /blog/                   a página do site, com os posts do Rankeando no meio por data e as categorias deles como chips
//   /blog/<slug>/            um post do Rankeando (D1), no layout de post do site
//   /blog/categoria/<slug>/  uma categoria do Rankeando
//   /sitemap.xml, /feed.xml  os do site com os posts e as categorias do Rankeando
//   /AAAA/MM/DD/<slug>/      um post do site cujo conteúdo o Rankeando trocou (contrato v3, tabela p12_substituicoes): a página é montada com a troca
//   /, /category/*, e as páginas de post  os cartões de um post trocado mostram o título novo
// Sem posts do Rankeando e sem trocas, toda página é a estática. Se o D1 ou o kit falharem, a página estática sai (os posts do Rankeando
// só faltam até o banco voltar); só a página de um post trocado diz "indisponível" em vez de mostrar o texto antigo.
import { SLUG } from './contrato';
import { SITE_URL } from './constantes';
import { trocasComCache } from './cache-trocas';
import { prepararConteudo } from './conteudo';
import {
  comTrocaNoCartao, comTrocaNoPost, comTrocaNoResumo, idDoIndice, postDoSiteComTroca, trocaDoPublisher, trocasPorId, urlDoPostDoPublisher,
  type DadosDoPostDoSite, type FonteDoSite, type IndiceDoSite,
} from './posts';
import {
  blogMesclado, cartaoHtml, familiaDaCategoria, feedMesclado, paginaDaCategoria, paginaDoPost, sitemapMesclado, slugsDoPost, trocarCartoes, POR_PAGINA,
  type CartaoDoRankeando, type ChipDeCategoria,
} from './render';
import { D1Store, type CategoriaComPosts, type Resumo, type Substituicao } from './store';

export type SiteEnv = { ASSETS: Fetcher; DB: D1Database };

type Kit = { categorias: { slug: string; nome: string }[]; graphBase: unknown[]; iconeRelogio: string; indice: IndiceDoSite[]; cards: Record<string, string> };

const asset = (env: SiteEnv, origin: string, path: string) => env.ASSETS.fetch(new Request(new URL(path, origin)));
const log = (message: string, e: unknown) => console.error({ message, error: e instanceof Error ? e.message : String(e) });
// Sem cache no navegador: um slug antigo pode virar outro post depois.
const redirect = (location: string) => new Response(null, { status: 301, headers: { location, 'cache-control': 'no-cache' } });
/** A página 404 do site (not_found_handling), com o status 404. */
const naoExiste = (env: SiteEnv, origin: string) => asset(env, origin, '/p12-nao-existe/');

/** Slugs de uma só parte que o blog usa para outra coisa: um post do Rankeando não pode tomá-los. */
const RESERVADOS = new Set(['categoria', 'page']);

// O kit só muda com um deploy, e um deploy começa isolates novos.
let kitDoDeploy: Kit | null = null;
async function carregarKit(env: SiteEnv, origin: string): Promise<Kit> {
  if (kitDoDeploy) return kitDoDeploy;
  const [config, indice, cards] = await Promise.all(['config.json', 'posts.json', 'cards.json'].map((f) => asset(env, origin, `/p12-kit/${f}`)));
  if (!config.ok || !indice.ok || !cards.ok) throw new Error(`kit do Rankeando indisponível (${config.status}, ${indice.status}, ${cards.status})`);
  const c = (await config.json()) as Omit<Kit, 'indice' | 'cards'>;
  kitDoDeploy = { ...c, indice: (await indice.json()) as IndiceDoSite[], cards: (await cards.json()) as Record<string, string> };
  return kitDoDeploy;
}

/** Os posts do site para os eventos de post do contrato v3: o índice do kit e os dados de cada post (/p12-kit/dados/<slug>.json). */
export function fonteDoSite(env: SiteEnv, origin: string): FonteDoSite {
  return {
    indice: async () => (await carregarKit(env, origin)).indice,
    dados: async (slug) => {
      if (!SLUG.test(slug)) return null;
      const r = await asset(env, origin, `/p12-kit/dados/${slug}.json`);
      if (!r.ok) {
        await r.body?.cancel();
        return null;
      }
      return (await r.json()) as DadosDoPostDoSite;
    },
  };
}

export const categoriasDoSite = async (env: SiteEnv, origin: string) => (await carregarKit(env, origin)).categorias;

/** Verdadeiro quando o slug já é de um post do site (ou de uma rota do blog). Falha se o kit não carregar: o webhook responde 503 (repete) e não 409 (final). */
export async function slugDoSite(env: SiteEnv, origin: string, slug: string): Promise<boolean> {
  if (RESERVADOS.has(slug)) return true;
  return (await carregarKit(env, origin)).indice.some((p) => p.slug === slug);
}

/** O que uma requisição precisa mais de uma vez: as trocas, lidas do D1 no máximo uma vez. */
type Contexto = { request: Request; env: SiteEnv; url: URL; trocas: () => Promise<Substituicao[]> };
function contexto(request: Request, env: SiteEnv): Contexto {
  const url = new URL(request.url);
  let lidas: Promise<Substituicao[]> | undefined;
  return {
    request, env, url,
    // Em cache (isolate 60 s, depois a Cache API do colo, depois o D1). Sem a tabela (migração 0005 ainda não aplicada) ou com o D1 fora, nada é trocado e nada é guardado.
    trocas: () => (lidas ??= trocasComCache(() => new D1Store(env.DB).substituicoes(), (e) => log('p12: trocas indisponíveis, o site sai como foi construído', e))),
  };
}

/** Uma página montada a partir de outra, com os cabeçalhos dessa outra (_headers: segurança e cache). */
function pagina(corpo: string, modelo: Response, request: Request): Response {
  const headers = new Headers(modelo.headers);
  for (const h of ['content-length', 'content-encoding', 'etag', 'last-modified']) headers.delete(h);
  return new Response(request.method === 'HEAD' ? null : corpo, { status: 200, headers });
}

const indisponivel = () =>
  new Response('Página temporariamente indisponível. Tente de novo em instantes.', {
    status: 503,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '60' },
  });

/** Os posts do Rankeando como as páginas os mostram: com a troca, se tiverem. */
async function lerPublisher(c: Contexto, store: D1Store) {
  const [brutos, categorias, trocas] = await Promise.all([store.resumos(), store.categorias(), c.trocas()]);
  const mapa = trocasPorId(trocas);
  const resumos: Resumo[] = brutos.map((r) => comTrocaNoResumo(r, trocaDoPublisher(mapa, r.id)));
  const cartoes = async (ids: string[]) => (await store.cartoes(ids)).map((x) => comTrocaNoCartao(x, trocaDoPublisher(mapa, x.id)));
  return { resumos, categorias, mapa, cartoes };
}

const cartaoDoRankeando = (c: Awaited<ReturnType<Awaited<ReturnType<typeof lerPublisher>>['cartoes']>>[number], categorias: CategoriaComPosts[]): CartaoDoRankeando => ({
  ...c, cats: slugsDoPost(categorias, c.categoria?.slug ?? null),
});

/** Categorias do Rankeando que têm post (a própria ou alguma filha), para os chips. A mãe conta os posts das filhas. */
function chipsDasCategorias(categorias: CategoriaComPosts[]): ChipDeCategoria[] {
  return categorias
    .filter((c) => !c.pai)
    .map((c) => ({ slug: c.slug, nome: c.nome, posts: familiaDaCategoria(categorias, c.slug).reduce((n, s) => n + (categorias.find((x) => x.slug === s)?.posts ?? 0), 0) }))
    .filter((c) => c.posts > 0);
}

// ---------------------------------------------------------------------------------------------------- /blog/

async function servirBlog(c: Contexto): Promise<Response> {
  const { env, url, request } = c;
  try {
    const { resumos, categorias, cartoes } = await lerPublisher(c, new D1Store(env.DB));
    const base = await env.ASSETS.fetch(request);
    if (base.status !== 200) return base;
    if (resumos.length) {
      const kit = await carregarKit(env, url.origin);
      const cs = (await cartoes(resumos.map((r) => r.id))).map((x) => cartaoDoRankeando(x, categorias));
      let html = await blogMesclado(await base.text(), {
        cartoes: cs.map((x) => ({ data: Date.parse(x.publicadoEm), html: cartaoHtml(x, kit.iconeRelogio, 'h2') })),
        chips: chipsDasCategorias(categorias).map((x) => ({ ...x })),
        totalGeral: kit.indice.length + resumos.length,
      });
      html = await comTrocasNosCartoes(c, html, kit);
      return pagina(html, base, request);
    }
    return await comTrocasNaPagina(c, base);
  } catch (e) {
    log('p12: /blog/ sem os posts do Rankeando (página estática)', e);
    return env.ASSETS.fetch(request);
  }
}

// -------------------------------------------------------------------------------- /blog/categoria/<slug>/

async function servirCategoria(c: Contexto, slug: string): Promise<Response> {
  const { env, url, request } = c;
  try {
    const { resumos, categorias, cartoes } = await lerPublisher(c, new D1Store(env.DB));
    const categoria = categorias.find((x) => x.slug === slug);
    const familia = new Set(familiaDaCategoria(categorias, slug));
    const daCategoria = resumos.filter((r) => r.categoria && familia.has(r.categoria));
    if (!categoria || !daCategoria.length) return await naoExiste(env, url.origin);
    const paginas = Math.ceil(daCategoria.length / POR_PAGINA);
    const bruto = url.searchParams.get('page');
    const numero = bruto === null ? 1 : /^[1-9]\d{0,3}$/.test(bruto) ? Number(bruto) : 0;
    if (!numero || numero > paginas) return await naoExiste(env, url.origin);
    const [base, kit] = await Promise.all([asset(env, url.origin, '/blog/'), carregarKit(env, url.origin)]);
    if (!base.ok) throw new Error(`/blog/ respondeu ${base.status}`);
    const cs = (await cartoes(daCategoria.slice((numero - 1) * POR_PAGINA, numero * POR_PAGINA).map((r) => r.id))).map((x) => cartaoDoRankeando(x, categorias));
    // A ordem da página é a das datas (o D1 não garante a ordem do IN)
    cs.sort((a, b) => (a.publicadoEm < b.publicadoEm ? 1 : a.publicadoEm > b.publicadoEm ? -1 : a.slug < b.slug ? -1 : 1));
    const mae = categoria.pai ? categorias.find((x) => x.slug === categoria.pai && !x.pai) : undefined;
    const html = await paginaDaCategoria(await base.text(), {
      categoria: { slug, nome: categoria.nome, descricao: categoria.descricao, mae: mae ? { slug: mae.slug, nome: mae.nome } : null },
      cartoes: cs.map((x) => cartaoHtml(x, kit.iconeRelogio, 'h2')),
      chips: chipsDasCategorias(categorias),
      total: daCategoria.length,
      numero,
      paginas,
      base: kit.graphBase,
      pagina1: kit.indice.length + resumos.length,
      ultimaAtualizacao: categoria.ultimaAtualizacao,
    });
    return pagina(html, base, request);
  } catch (e) {
    log('p12: categoria do Rankeando indisponível', e);
    return indisponivel();
  }
}

// --------------------------------------------------------------------------------------- /blog/<slug>/

/** O trecho "Continue lendo": os 3 posts mais novos (do site e do Rankeando) fora o próprio. */
async function relacionados(kit: Kit, resumos: Resumo[], cartoes: (ids: string[]) => Promise<Awaited<ReturnType<D1Store['cartoes']>>>, categorias: CategoriaComPosts[], fora: string) {
  const todos = [
    ...kit.indice.map((p) => ({ data: Date.parse(p.date), slug: p.slug, tipo: 'site' as const, id: '' })),
    ...resumos.map((r) => ({ data: Date.parse(r.publicadoEm), slug: r.slug, tipo: 'publisher' as const, id: r.id })),
  ]
    .filter((p) => p.slug !== fora)
    .sort((a, b) => b.data - a.data)
    .slice(0, 3);
  const doRankeando = new Map((await cartoes(todos.filter((t) => t.tipo === 'publisher').map((t) => t.id))).map((x) => [x.id, x]));
  return todos.flatMap((t) => {
    if (t.tipo === 'site') return kit.cards[t.slug] ? [kit.cards[t.slug]] : [];
    const c = doRankeando.get(t.id);
    return c ? [cartaoHtml(cartaoDoRankeando(c, categorias), kit.iconeRelogio, 'h3')] : [];
  });
}

/** O post do Rankeando em /blog/<slug>/, um 301 até ele (slug antigo ou endereço sem a barra: `canonico` falso), ou null. */
async function servirPost(c: Contexto, slug: string, canonico: boolean): Promise<Response | null> {
  const { request, env, url } = c;
  const store = new D1Store(env.DB);
  let post: Awaited<ReturnType<D1Store['post']>>;
  try {
    post = await store.post(slug);
    if (!post) {
      const atual = await store.slugAtualDoAntigo(slug);
      return atual ? redirect(`/blog/${atual}/${url.search}`) : null;
    }
  } catch (e) {
    log('p12: consulta do post do Rankeando falhou', e);
    return null;
  }
  if (!canonico) return redirect(`/blog/${slug}/${url.search}`);
  try {
    const [modelo, kit, publisher] = await Promise.all([asset(env, url.origin, '/p12-kit/post/'), carregarKit(env, url.origin), lerPublisher(c, store)]);
    if (!modelo.ok) throw new Error(`modelo de post respondeu ${modelo.status}`);
    const final = comTrocaNoPost(post, trocaDoPublisher(publisher.mapa, post.id));
    const cat = final.categoria;
    const trilha = [
      { name: 'Blog', path: '/blog/' },
      ...(cat?.pai && cat.pai_nome ? [{ name: cat.pai_nome, path: `/blog/categoria/${cat.pai}/` }] : []),
      ...(cat ? [{ name: cat.nome, path: `/blog/categoria/${cat.slug}/` }] : []),
      { name: final.titulo },
    ];
    const html = await paginaDoPost({
      modelo: await modelo.text(),
      post: final,
      conteudo: await prepararConteudo(final.conteudo_html),
      url: urlDoPostDoPublisher(slug),
      origem: 'publisher',
      base: kit.graphBase,
      trilha,
      categoria: cat ? { href: `/blog/categoria/${cat.slug}/`, nome: cat.nome } : null,
      secoes: cat ? [cat.nome] : [],
      relacionados: await relacionados(kit, publisher.resumos, publisher.cartoes, publisher.categorias, slug),
      autorHtml: `<span>Por ${esc(final.assinatura?.nome ?? final.autor)}</span>`,
      autor: { tipo: final.assinatura?.tipo === 'empresa' ? 'Organization' : 'Person', nome: final.assinatura?.nome ?? final.autor },
    });
    return pagina(html, modelo, request);
  } catch (e) {
    log('p12: post do Rankeando indisponível', e);
    return indisponivel();
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------- posts do site com o conteúdo trocado

const POST_DO_SITE = /^\/(20\d\d)\/(\d\d)\/(\d\d)\/([^/]+)\/$/;

/** A página de um post do site que tem troca, montada com ela; null quando não tem (sai a estática). */
async function paginaDoPostDoSiteTrocado(c: Contexto, slug: string): Promise<Response | null> {
  const { request, env, url } = c;
  const trocas = await c.trocas();
  if (!trocas.length) return null;
  try {
    const kit = await carregarKit(env, url.origin);
    const entrada = kit.indice.find((p) => p.slug === slug && p.path === url.pathname);
    const troca = entrada ? trocas.find((t) => t.idNoSite === idDoIndice(entrada)) : undefined;
    if (!entrada || !troca) return null;
    const [base, dados] = await Promise.all([env.ASSETS.fetch(request), fonteDoSite(env, url.origin).dados(slug)]);
    if (base.status !== 200 || !dados) throw new Error(`página ou dados do post do site indisponíveis (${base.status}, ${dados ? 'ok' : 'sem dados'})`);
    const cat = kit.categorias.find((x) => x.slug === dados.primary) ?? null;
    const post = postDoSiteComTroca(dados, idDoIndice(entrada), troca, cat);
    const trilha = [{ name: 'Blog', path: '/blog/' }, ...(cat ? [{ name: cat.nome, path: `/category/${cat.slug}/` }] : []), { name: post.titulo }];
    let html = await paginaDoPost({
      modelo: await base.text(),
      post,
      conteudo: await prepararConteudo(troca.conteudoHtml),
      url: SITE_URL + dados.path,
      origem: 'site',
      base: kit.graphBase,
      trilha,
      categoria: cat ? { href: `/category/${cat.slug}/`, nome: cat.nome } : null,
      secoes: dados.categories.map((s) => kit.categorias.find((x) => x.slug === s)?.nome ?? s),
      autorHtml: '<span>Por <a href="/quem-somos/">Equipe Ventura Vet</a></span>',
      autor: { tipo: 'Organization', nome: dados.author, url: `${SITE_URL}/quem-somos/` },
      capaDaPagina: dados.capa?.url ?? null,
    });
    html = await comTrocasNosCartoes(c, html, kit);
    return pagina(html, base, request);
  } catch (e) {
    // A troca é o conteúdo que o Rankeando confirmou: se não der para montá-la, diga isso (repete) em vez de mostrar o texto antigo.
    log('p12: post do site trocado indisponível', e);
    return indisponivel();
  }
}

/** Os cartões do site (lista, home, "Continue lendo") mostram o título da troca. */
async function comTrocasNosCartoes(c: Contexto, html: string, kit: Kit): Promise<string> {
  const trocas = await c.trocas();
  if (!trocas.length) return html;
  const titulos = new Map<string, string>();
  const porId = new Map(trocas.map((t) => [t.idNoSite, t]));
  for (const p of kit.indice) {
    const t = porId.get(idDoIndice(p));
    if (t) titulos.set(p.path, t.titulo);
  }
  return titulos.size ? trocarCartoes(html, titulos) : html;
}

/** Uma página estática que carrega cartões de posts: com trocas, o título novo; sem, a própria página. */
async function comTrocasNaPagina(c: Contexto, res: Response): Promise<Response> {
  if (res.status !== 200 || !res.headers.get('content-type')?.includes('text/html')) return res;
  try {
    if (!(await c.trocas()).length) return res;
    const kit = await carregarKit(c.env, c.url.origin);
    return pagina(await comTrocasNosCartoes(c, await res.text(), kit), res, c.request);
  } catch (e) {
    log('p12: trocas não aplicadas, sai a página estática', e);
    return c.env.ASSETS.fetch(c.request);
  }
}

// ------------------------------------------------------------------------------------ sitemap e feed

async function servirSitemap(c: Contexto): Promise<Response> {
  const { env, request } = c;
  try {
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 200) return res;
    const { resumos, categorias } = await lerPublisher(c, new D1Store(env.DB));
    const kit = await carregarKit(env, c.url.origin);
    const trocas = new Map((await c.trocas()).map((t) => [t.idNoSite, t]));
    const trocasDoSite = new Map<string, string>();
    for (const p of kit.indice) {
      const t = trocas.get(idDoIndice(p));
      if (t) trocasDoSite.set(SITE_URL + p.path, t.atualizadoEm);
    }
    if (!resumos.length && !trocasDoSite.size) return res;
    const ultima = (slug: string) => {
      const familia = new Set(familiaDaCategoria(categorias, slug));
      return resumos.filter((r) => r.categoria && familia.has(r.categoria)).map((r) => r.atualizadoEm).sort().at(-1) ?? null;
    };
    const xml = sitemapMesclado(await res.text(), {
      posts: resumos.map((r) => ({ slug: r.slug, atualizadoEm: r.atualizadoEm })),
      categorias: categorias.flatMap((x) => { const u = ultima(x.slug); return u ? [{ slug: x.slug, ultima: u }] : []; }),
      trocasDoSite,
    });
    return pagina(xml, res, request);
  } catch (e) {
    log('p12: sitemap sem os posts do Rankeando (arquivo estático)', e);
    return env.ASSETS.fetch(request);
  }
}

async function servirFeed(c: Contexto): Promise<Response> {
  const { env, request } = c;
  try {
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 200) return res;
    const { resumos, categorias } = await lerPublisher(c, new D1Store(env.DB));
    const kit = await carregarKit(env, c.url.origin);
    const trocas = new Map((await c.trocas()).map((t) => [t.idNoSite, t]));
    const trocasDoSite = new Map<string, { titulo: string; descricao: string | null }>();
    for (const p of kit.indice) {
      const t = trocas.get(idDoIndice(p));
      if (t) trocasDoSite.set(SITE_URL + p.path, { titulo: t.titulo, descricao: t.seoDescricao || null });
    }
    if (!resumos.length && !trocasDoSite.size) return res;
    const xml = feedMesclado(await res.text(), {
      posts: resumos.map((r) => ({ slug: r.slug, titulo: r.titulo, descricao: r.resumo, publicadoEm: r.publicadoEm, categoria: categorias.find((x) => x.slug === r.categoria)?.nome ?? null })),
      trocasDoSite,
    });
    return pagina(xml, res, request);
  } catch (e) {
    log('p12: feed sem os posts do Rankeando (arquivo estático)', e);
    return env.ASSETS.fetch(request);
  }
}

// -------------------------------------------------------------------------------------------- roteador

export async function servirSite(request: Request, env: SiteEnv): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);
  const c = contexto(request, env);
  const { pathname } = c.url;
  try {
    // O kit é do build: nenhum visitante o vê
    if (pathname.startsWith('/p12-kit/') || pathname === '/p12-kit') return await naoExiste(env, c.url.origin);
    if (pathname === '/blog/') return await servirBlog(c);
    if (pathname === '/sitemap.xml') return await servirSitemap(c);
    if (pathname === '/feed.xml') return await servirFeed(c);

    const cat = /^\/blog\/categoria\/([^/]+)(\/?)$/.exec(pathname);
    if (cat && SLUG.test(cat[1])) return cat[2] === '/' ? await servirCategoria(c, cat[1]) : redirect(`${pathname}/${c.url.search}`);

    const post = /^\/blog\/([^/]+?)(\/?)$/.exec(pathname);
    if (post && SLUG.test(post[1]) && !RESERVADOS.has(post[1])) {
      const r = await servirPost(c, post[1], post[2] === '/');
      if (r) return r;
    }

    const doSite = POST_DO_SITE.exec(pathname);
    if (doSite) {
      const trocada = await paginaDoPostDoSiteTrocado(c, doSite[4]);
      if (trocada) return trocada;
    }

    const res = await env.ASSETS.fetch(request);
    // Páginas com cartões de posts: um post do site trocado mostra o título novo
    if (pathname === '/' || pathname.startsWith('/category/') || doSite) return await comTrocasNaPagina(c, res);
    return res;
  } catch (e) {
    log('p12: erro no Worker, sai a página estática', e);
    return env.ASSETS.fetch(request);
  }
}

