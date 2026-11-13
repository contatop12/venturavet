// POST /api/p12/webhook: receives the Rankeando posts and categories and answers its reads (rankeando-blog/CONTRATO.md v3). The
// signature is checked first, with RANKEANDO_WEBHOOK_SECRET (or the old P12_WEBHOOK_SECRET) and the server
// clock only; then a repeated X-Rankeando-Entrega (or X-P12-Entrega) gets its stored answer; then the event is applied.
import { readBody } from '../body';
import { lerCabecalhoDoRankeando, verificarAssinatura } from './assinatura';
import { CONTRATO, RECURSOS, ERROS, erro, lerEvento, resposta, type PostP12, type Resposta } from './contrato';
import { acharEntrada, entradas, lerPostDaEntrada, paginaDePosts, urlDoPostDoPublisher, type FonteDoSite } from './posts';
import type { P12Store } from './store';

export const P12_WEBHOOK_PATH = '/api/p12/webhook';

/** The JSON of a whole post rarely passes 200 KB; D1 keeps rows up to 2 MB. */
const MAX_CORPO = 1_500_000;

/** One-segment paths the site uses without a page of its own (Worker routes, _redirects, WordPress). */

export type Dependencias = {
  /** `segredoDoRankeando(env)`: RANKEANDO_WEBHOOK_SECRET, or P12_WEBHOOK_SECRET when the new one is not set. */
  segredo: string | undefined;
  store: P12Store;
  /** The site's own (prerendered) posts, for the post events of contract v3. */
  site: FonteDoSite;
  /** True when the slug already belongs to a post of the site (one that did not come from Rankeando). */
  slugDoSite: (slug: string) => Promise<boolean>;
  /** The fixed categories of the site (the ones its own posts have), for `categorias.listar`. */
  categoriasDoSite: () => Promise<{ slug: string; nome: string }[]>;
  /** Unix seconds: the server clock in production. */
  agora: number;
  /** Called after a write that touched p12_substituicoes succeeded (not awaited): production clears the replacements cache. */
  aoMudarTrocas?: () => void | Promise<void>;
};

const json = (r: Resposta) => Response.json(r.corpo, { status: r.status, headers: { 'cache-control': 'no-store' } });
const salvo = (status: number, corpo: string) =>
  new Response(corpo, { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const urlDoPost = urlDoPostDoPublisher;

/** The batch succeeded: the replacements cache is stale. Never delays or fails the answer. */
function mudouTrocas(deps: Dependencias) {
  try {
    void Promise.resolve(deps.aoMudarTrocas?.()).catch(() => {});
  } catch {
    // the 60 s TTL ends it anyway
  }
}

const LEITURAS = new Set(['categorias.listar', 'posts.listar', 'post.ler']);
const NAO_EXISTE = () => erro(404, 'nao_encontrado', 'post não existe');

export async function handleP12Webhook(request: Request, deps: Dependencias): Promise<Response> {
  if (request.method !== 'POST') return json(erro(405, 'metodo_nao_permitido', 'use POST'));
  if (!deps.segredo) {
    console.error({ message: 'p12 webhook: RANKEANDO_WEBHOOK_SECRET (or P12_WEBHOOK_SECRET) not configured' });
    return json(erro(503, 'nao_configurado', 'o site ainda não tem a chave RANKEANDO_WEBHOOK_SECRET'));
  }
  const corpo = await readBody(request, MAX_CORPO);
  if (corpo === null) return json(erro(413, 'corpo_invalido', 'corpo maior que 1,5 MB'));

  const conferencia = await verificarAssinatura(deps.segredo, lerCabecalhoDoRankeando(request.headers, 'Assinatura'), corpo, deps.agora);
  if (conferencia === 'fora_do_horario') return json(ERROS.horario());
  if (conferencia !== 'ok') return json(ERROS.assinatura());

  const cabecalhoEvento = lerCabecalhoDoRankeando(request.headers, 'Evento');
  // The reads (categorias.listar, posts.listar, post.ler) only read: each request has a new delivery id and its answer is always fresh, never a kept one.
  const leitura = cabecalhoEvento !== null && LEITURAS.has(cabecalhoEvento);
  const entrega = lerCabecalhoDoRankeando(request.headers, 'Entrega') ?? '';
  if (!leitura && (!entrega || entrega.length > 300)) return json(ERROS.corpo('cabeçalho X-Rankeando-Entrega ausente ou inválido'));

  try {
    if (!leitura) {
      const anterior = await deps.store.entrega(entrega);
      if (anterior) return salvo(anterior.status, anterior.corpo);
    }

    const evento = lerEvento(corpo, cabecalhoEvento);
    if ('status' in evento) return json(evento);

    if (evento.evento === 'categorias.listar') {
      const todas = await deps.store.categorias();
      // The site's fixed categories (code) count too, unless the table already has the slug: "Importar do site" must see the real ones.
      const doBanco = new Set(todas.map((c) => c.slug));
      const fixas = (await deps.categoriasDoSite()).filter((c) => !doBanco.has(c.slug));
      const base = Math.max(-1, ...todas.map((c) => c.ordem));
      return json(resposta(200, {
        ok: true,
        categorias: [...todas.map((c) => ({
          slug: c.slug,
          nome: c.nome,
          ...(c.descricao ? { descricao: c.descricao } : {}),
          pai: c.pai,
          ordem: c.ordem,
          total_posts: c.posts,
        })), ...fixas.map((c, i) => ({ slug: c.slug, nome: c.nome, pai: null, ordem: base + 1 + i }))],
      }));
    }

    if (evento.evento === 'posts.listar') {
      const pagina = paginaDePosts(await entradas(deps.store, deps.site), evento);
      if (!pagina) return json(ERROS.corpo('cursor inválido: use o proximo_cursor que o site deu'));
      return json(resposta(200, { ok: true, posts: pagina.posts, total: pagina.total, proximo_cursor: pagina.proximo_cursor }));
    }
    if (evento.evento === 'post.ler') {
      const e = acharEntrada(await entradas(deps.store, deps.site), evento.id_no_site);
      if (!e) return json(NAO_EXISTE());
      const post = await lerPostDaEntrada(e, deps.store, deps.site);
      if (!post) throw new Error(`dados do post ${e.idNoSite} indisponíveis`);
      return json(resposta(200, { ok: true, ...post }));
    }

    const agora = new Date(deps.agora * 1000).toISOString();
    const nova = (r: Resposta) => ({ entrega, evento: evento.evento, status: r.status, corpo: JSON.stringify(r.corpo) });

    if (evento.evento === 'ping') {
      const r = resposta(200, { ok: true, desafio: evento.desafio, contrato: CONTRATO, recursos: [...RECURSOS] });
      await deps.store.salvarPing(nova(r), agora);
      return json(r);
    }
    if (evento.evento === 'categorias') {
      const r = resposta(200, { ok: true });
      // Merge mode (or no mode): every list is applied, item by item (an item older than the stored one is skipped by the store),
      // so a partial list that arrives late is not lost. Any other mode keeps the old rule: a list older than the last one changes nothing.
      const mescla = evento.modo === null || evento.modo === 'mesclar';
      const ultima = mescla ? null : await deps.store.categoriasAtualizadoEm();
      if (ultima && ultima > evento.atualizado_em) await deps.store.salvarEntrega(nova(r), agora);
      else await deps.store.salvarCategorias({ categorias: evento.categorias, atualizadoEm: evento.atualizado_em, entrega: nova(r), agora });
      return json(r);
    }
    if (evento.evento === 'categorias.remover') {
      const r = resposta(200, { ok: true });
      await deps.store.removerCategorias({ slugs: evento.slugs, entrega: nova(r), agora });
      return json(r);
    }
    if (evento.evento === 'post.substituir' || evento.evento === 'post.restaurar') {
      const e = acharEntrada(await entradas(deps.store, deps.site), evento.id_no_site);
      if (!e) return json(NAO_EXISTE());
      const r = resposta(200, { ok: true, url: e.url });
      if (evento.evento === 'post.restaurar') {
        await deps.store.restaurar(evento.id_no_site, nova(r), agora);
      } else {
        const t = evento.troca;
        await deps.store.substituir(
          { idNoSite: evento.id_no_site, titulo: t.titulo, conteudoHtml: t.conteudo_html, conteudoMarkdown: t.conteudo_markdown, seoTitulo: t.seo.titulo, seoDescricao: t.seo.descricao, seoPalavraChave: t.seo.palavra_chave, faqJsonld: t.faq_jsonld, atualizadoEm: t.atualizado_em },
          nova(r),
          agora,
        );
      }
      mudouTrocas(deps);
      return json(r);
    }
    if (evento.evento === 'post.remover') {
      const r = resposta(200, { ok: true });
      await deps.store.remover(evento.id, nova(r), agora);
      mudouTrocas(deps);
      return json(r);
    }
    const publicada = await publicar(evento.post, deps, agora, nova);
    mudouTrocas(deps);
    return json(publicada);
  } catch (e) {
    console.error({ message: 'p12 webhook: storage failed', entrega, error: e instanceof Error ? e.message : String(e) });
    return json(erro(503, 'indisponivel', 'banco do site indisponível; tente de novo'));
  }
}

async function publicar(
  post: PostP12,
  deps: Dependencias,
  agora: string,
  nova: (r: Resposta) => { entrega: string; evento: string; status: number; corpo: string },
): Promise<Resposta> {
  const { store } = deps;
  const atual = await store.porId(post.id);
  // A version older than what the site has (a retry arriving after a newer version, or after the post
  // was removed): answer success and keep the site as it is.
  const removido = atual ? null : await store.removidoEm(post.id);
  if ((atual && atual.atualizadoEm > post.atualizado_em) || (removido && removido > post.atualizado_em)) {
    const r = resposta(200, { ok: true, url: urlDoPost(atual?.slug ?? post.slug) });
    await store.salvarEntrega(nova(r), agora);
    return r;
  }
  if (await deps.slugDoSite(post.slug)) return ERROS.slugDoSite();
  const dono = await store.idDoSlug(post.slug);
  if (dono && dono !== post.id) return ERROS.slugDoPublisher();

  const antigos = new Set(atual?.slugsAntigos ?? []);
  if (atual && atual.slug !== post.slug) antigos.add(atual.slug);
  antigos.delete(post.slug);
  // Another post's old address now becomes this post: its 301 goes away.
  const liberar = (await store.donosDoSlugAntigo(post.slug)).filter((r) => r.id !== post.id);

  const r = resposta(200, { ok: true, url: urlDoPost(post.slug) });
  await store.gravar({ post, slugsAntigos: [...antigos], liberar, entrega: nova(r), agora });
  return r;
}
