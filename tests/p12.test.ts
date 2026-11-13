// Testes do recebimento do Rankeando (contrato v3): assinatura, eventos, entrega repetida, trocas, listagem e as partes puras das páginas.
// Rodar: npm test (node:test via tsx; nada de rede nem de Cloudflare). As páginas montadas com HTMLRewriter são conferidas no teste local com
// `wrangler dev` (ver README), porque HTMLRewriter só existe no Worker.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assinarCorpo, VETOR_DE_TESTE, verificarAssinatura } from '../worker/p12/assinatura';
import { lerEvento } from '../worker/p12/contrato';
import { idDoPostDoSite } from '../worker/p12/ids';
import { paginaDePosts, type FonteDoSite } from '../worker/p12/posts';
import { cartaoHtml, dataBr, feedMesclado, familiaDaCategoria, paginacaoHtml, sitemapMesclado, sumarioHtml, caixaAssinatura } from '../worker/p12/render';
import { handleP12Webhook, type Dependencias } from '../worker/p12/webhook';
import { MemoriaStore } from './memoria';

const SEGREDO = 'chave-de-teste-do-recebimento';
const AGORA = 1_800_000_000;

const site: FonteDoSite = {
  indice: async () => [
    { slug: 'post-antigo', path: '/2023/03/03/post-antigo/', title: 'Post antigo', date: '2023-03-03T12:00:00.000Z', updated: '2023-03-04T12:00:00.000Z', categories: ['clinica'], id: idDoPostDoSite('post-antigo'), primary: 'clinica' },
  ],
  dados: async (slug) =>
    slug === 'post-antigo'
      ? { slug, path: '/2023/03/03/post-antigo/', title: 'Post antigo', date: '2023-03-03T12:00:00.000Z', updated: '2023-03-04T12:00:00.000Z', categories: ['clinica'], primary: 'clinica', author: 'Equipe', seoTitle: 'Post antigo | Ventura', seoDescription: 'Descrição', excerpt: 'Resumo', capa: null, markdown: '# x', html: '<p>Original</p>' }
      : null,
};

function deps(store = new MemoriaStore()): Dependencias {
  return { segredo: SEGREDO, store, site, slugDoSite: async (s) => s === 'post-antigo', categoriasDoSite: async () => [{ slug: 'clinica', nome: 'Clínica' }], agora: AGORA };
}

async function enviar(d: Dependencias, evento: string, corpo: unknown, entrega: string, { t = AGORA, segredo = SEGREDO } = {}) {
  const texto = JSON.stringify(corpo);
  const req = new Request('https://venturavet.com.br/api/p12/webhook', {
    method: 'POST',
    headers: { 'X-Rankeando-Evento': evento, 'X-Rankeando-Entrega': entrega, 'X-Rankeando-Assinatura': await assinarCorpo(segredo, t, texto) },
    body: texto,
  });
  const res = await handleP12Webhook(req, d);
  return { status: res.status, corpo: (await res.json()) as Record<string, any> };
}

const post = (extra: Record<string, unknown> = {}) => ({
  id: 'art_1', slug: 'meu-post', titulo: 'Meu post', resumo: 'Resumo', conteudo_html: '<p>Corpo</p>', conteudo_markdown: 'Corpo', capa: null,
  seo: { titulo: 'Meu post | Ventura', descricao: 'Descrição do post', palavra_chave: 'post', canonical: null }, faq_jsonld: null, autor: 'Equipe',
  publicado_em: '2026-11-01T12:00:00.000Z', atualizado_em: '2026-11-01T12:00:00.000Z', categoria: null, ...extra,
});

test('a conferência de assinatura bate com o vetor do pacote', async () => {
  assert.equal(await verificarAssinatura(VETOR_DE_TESTE.segredo, VETOR_DE_TESTE.cabecalho, VETOR_DE_TESTE.corpo, VETOR_DE_TESTE.t), 'ok');
  assert.equal(await verificarAssinatura(VETOR_DE_TESTE.segredo, VETOR_DE_TESTE.cabecalho, VETOR_DE_TESTE.corpo + ' ', VETOR_DE_TESTE.t), 'assinatura_invalida');
  assert.equal(await verificarAssinatura(VETOR_DE_TESTE.segredo, VETOR_DE_TESTE.cabecalho, VETOR_DE_TESTE.corpo, VETOR_DE_TESTE.t + 301), 'fora_do_horario');
});

test('ping assinado devolve o desafio, o contrato 3 e os recursos; ping sem assinatura certa é 401', async () => {
  const d = deps();
  const ok = await enviar(d, 'ping', { evento: 'ping', contrato: 1, desafio: 'abc' }, 'ping-1');
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.corpo, { ok: true, desafio: 'abc', contrato: 3, recursos: ['categorias.listar', 'categorias.mesclar', 'posts.listar', 'post.ler', 'post.substituir', 'post.restaurar'] });
  const errada = await enviar(d, 'ping', { evento: 'ping', contrato: 1, desafio: 'abc' }, 'ping-2', { segredo: 'outra-chave' });
  assert.equal(errada.status, 401);
  assert.equal(errada.corpo.erro, 'assinatura_invalida');
  const velha = await enviar(d, 'ping', { evento: 'ping', contrato: 1, desafio: 'abc' }, 'ping-3', { t: AGORA - 400 });
  assert.equal(velha.status, 401);
  assert.equal(velha.corpo.erro, 'fora_do_horario');
});

test('sem segredo configurado o recebimento recusa (503), nunca aceita', async () => {
  const res = await handleP12Webhook(new Request('https://venturavet.com.br/api/p12/webhook', { method: 'POST', body: '{}' }), { ...deps(), segredo: undefined });
  assert.equal(res.status, 503);
});

test('post.publicar grava, repete a mesma resposta na entrega repetida e recusa slug de post do site (409)', async () => {
  const store = new MemoriaStore();
  const d = deps(store);
  const corpo = { evento: 'post.publicar', contrato: 2, post: post() };
  const a = await enviar(d, 'post.publicar', corpo, 'art_1:1');
  assert.equal(a.status, 200);
  assert.equal(a.corpo.url, 'https://venturavet.com.br/blog/meu-post/');
  assert.equal((await store.post('meu-post'))?.titulo, 'Meu post');
  // Entrega repetida: a mesma resposta, mesmo com um corpo diferente, e nada é gravado
  const b = await enviar(d, 'post.publicar', { ...corpo, post: post({ titulo: 'Outro' }) }, 'art_1:1');
  assert.deepEqual(b, a);
  assert.equal((await store.post('meu-post'))?.titulo, 'Meu post');
  const em_uso = await enviar(d, 'post.publicar', { evento: 'post.publicar', contrato: 2, post: post({ id: 'art_2', slug: 'post-antigo' }) }, 'art_2:1');
  assert.equal(em_uso.status, 409);
  assert.equal(em_uso.corpo.erro, 'slug_em_uso');
});

test('mudar o slug guarda o antigo para o 301 e post.remover apaga', async () => {
  const store = new MemoriaStore();
  const d = deps(store);
  await enviar(d, 'post.publicar', { evento: 'post.publicar', contrato: 2, post: post() }, 'art_1:1');
  await enviar(d, 'post.publicar', { evento: 'post.publicar', contrato: 2, post: post({ slug: 'slug-novo', atualizado_em: '2026-11-02T12:00:00.000Z' }) }, 'art_1:2');
  assert.equal(await store.slugAtualDoAntigo('meu-post'), 'slug-novo');
  const r = await enviar(d, 'post.remover', { evento: 'post.remover', contrato: 2, post: { id: 'art_1' } }, 'art_1:remover');
  assert.equal(r.status, 200);
  assert.equal(await store.post('slug-novo'), null);
});

test('categorias.listar traz as do banco e as fixas do site, sem apagar nada', async () => {
  const store = new MemoriaStore();
  const d = deps(store);
  await enviar(d, 'categorias', { evento: 'categorias', contrato: 2, modo: 'mesclar', atualizado_em: '2026-11-01T00:00:00.000Z', categorias: [{ slug: 'cuidados', nome: 'Cuidados', descricao: null, ordem: 0, atualizado_em: '2026-11-01T00:00:00.000Z' }] }, 'categorias:1');
  const r = await enviar(d, 'categorias.listar', { evento: 'categorias.listar', contrato: 2 }, 'categorias.listar:1:a');
  assert.deepEqual(r.corpo.categorias.map((c: { slug: string }) => c.slug), ['cuidados', 'clinica']);
});

test('posts.listar junta os posts do site e os do Rankeando, pagina com cursor e respeita desde/ate', async () => {
  const store = new MemoriaStore();
  const d = deps(store);
  await enviar(d, 'post.publicar', { evento: 'post.publicar', contrato: 2, post: post() }, 'art_1:1');
  await enviar(d, 'post.publicar', { evento: 'post.publicar', contrato: 2, post: post({ id: 'art_3', slug: 'terceiro', publicado_em: '2026-11-05T12:00:00.000Z', atualizado_em: '2026-11-05T12:00:00.000Z' }) }, 'art_3:1');
  const p1 = await enviar(d, 'posts.listar', { evento: 'posts.listar', contrato: 3, limite: 2 }, 'posts.listar:1:a');
  assert.deepEqual(p1.corpo.posts.map((p: { id_no_site: string }) => p.id_no_site), ['rk:art_3', 'rk:art_1']);
  assert.equal(p1.corpo.total, 3);
  assert.equal(p1.corpo.posts[0].origem, 'art_3');
  assert.equal(p1.corpo.posts[0].url, 'https://venturavet.com.br/blog/terceiro/');
  const p2 = await enviar(d, 'posts.listar', { evento: 'posts.listar', contrato: 3, limite: 2, cursor: p1.corpo.proximo_cursor }, 'posts.listar:1:b');
  assert.deepEqual(p2.corpo.posts.map((p: { id_no_site: string }) => p.id_no_site), ['site:post-antigo']);
  assert.equal(p2.corpo.posts[0].origem, null);
  assert.equal(p2.corpo.posts[0].url, 'https://venturavet.com.br/2023/03/03/post-antigo/');
  assert.equal(p2.corpo.proximo_cursor, null);
  const janela = await enviar(d, 'posts.listar', { evento: 'posts.listar', contrato: 3, limite: 50, desde: '2026-11-02T00:00:00Z' }, 'posts.listar:1:c');
  assert.equal(janela.corpo.total, 1);
  const ruim = await enviar(d, 'posts.listar', { evento: 'posts.listar', contrato: 3, limite: 2, cursor: 'lixo' }, 'posts.listar:1:d');
  assert.equal(ruim.status, 400);
  assert.equal(paginaDePosts([], { limite: 5, cursor: null, desde: null, ate: null })?.proximo_cursor, null);
});

test('post.substituir troca o conteúdo sem tocar no original; post.ler devolve o novo; post.restaurar desfaz', async () => {
  const store = new MemoriaStore();
  const d = deps(store);
  const id = 'site:post-antigo';
  const original = await enviar(d, 'post.ler', { evento: 'post.ler', contrato: 3, id_no_site: id }, 'post.ler:1:a');
  assert.equal(original.corpo.conteudo_html, '<p>Original</p>');
  const troca = { evento: 'post.substituir', contrato: 3, id_no_site: id, atualizado_em: '2026-11-10T10:00:00.000Z', post: { titulo: 'Título novo', conteudo_html: '<p>Novo</p>', conteudo_markdown: 'Novo', seo: { titulo: '', descricao: 'Descrição nova', palavra_chave: '' }, faq_jsonld: null } };
  const s = await enviar(d, 'post.substituir', troca, `substituir:${id}:h1`);
  assert.equal(s.status, 200);
  assert.equal(s.corpo.url, 'https://venturavet.com.br/2023/03/03/post-antigo/');
  const lido = await enviar(d, 'post.ler', { evento: 'post.ler', contrato: 3, id_no_site: id }, 'post.ler:1:b');
  assert.equal(lido.corpo.titulo, 'Título novo');
  assert.equal(lido.corpo.conteudo_html, '<p>Novo</p>');
  assert.equal(lido.corpo.atualizado_em, '2026-11-10T10:00:00.000Z');
  // SEO vazio quer dizer "use o do original"
  assert.equal(lido.corpo.seo.titulo, 'Post antigo | Ventura');
  assert.equal(lido.corpo.seo.descricao, 'Descrição nova');
  const lista = await enviar(d, 'posts.listar', { evento: 'posts.listar', contrato: 3, limite: 5 }, 'posts.listar:2:a');
  assert.equal(lista.corpo.posts[0].titulo, 'Título novo');
  assert.equal(lista.corpo.posts[0].slug, 'post-antigo');
  assert.equal(lista.corpo.posts[0].publicado_em, '2023-03-03T12:00:00.000Z');
  const r = await enviar(d, 'post.restaurar', { evento: 'post.restaurar', contrato: 3, id_no_site: id, atualizado_em: '2026-11-11T10:00:00.000Z' }, `restaurar:${id}:h2`);
  assert.equal(r.status, 200);
  const volta = await enviar(d, 'post.ler', { evento: 'post.ler', contrato: 3, id_no_site: id }, 'post.ler:1:c');
  assert.equal(volta.corpo.titulo, 'Post antigo');
  const outra = await enviar(d, 'post.restaurar', { evento: 'post.restaurar', contrato: 3, id_no_site: id, atualizado_em: '2026-11-11T10:00:00.000Z' }, `restaurar:${id}:h3`);
  assert.equal(outra.status, 200);
  const naoTem = await enviar(d, 'post.ler', { evento: 'post.ler', contrato: 3, id_no_site: 'site:nao-existe' }, 'post.ler:1:d');
  assert.equal(naoTem.status, 404);
  assert.equal(naoTem.corpo.erro, 'nao_encontrado');
});

test('contrato desconhecido, evento desconhecido e corpo inválido têm o erro do contrato', async () => {
  assert.equal((lerEvento('{"evento":"ping","contrato":9,"desafio":"x"}', null) as { corpo: { erro: string } }).corpo.erro, 'contrato_desconhecido');
  assert.equal((lerEvento('{"evento":"x","contrato":3}', null) as { corpo: { erro: string } }).corpo.erro, 'contrato_desconhecido');
  assert.equal((lerEvento('nao e json', null) as { corpo: { erro: string } }).corpo.erro, 'corpo_invalido');
});

test('o cartão, o sumário, a trilha e a caixa de assinatura escapam o texto e seguem o markup do site', () => {
  const cartao = cartaoHtml({ id: '1', slug: 's', titulo: 'A <b>"x"</b>.', resumo: '', autor: 'a', publicadoEm: '2026-11-13T01:00:00.000Z', capa: { url: 'https://app.rankeando.com.br/blog-img/x', alt: '' }, minutos: 3, categoria: { slug: 'c', nome: 'C & D' }, cats: ['c', 'mae'] }, '<svg></svg>');
  assert.match(cartao, /^<article class="post-card" data-cats="c mae" data-title="a &lt;b&gt;&quot;x&quot;&lt;\/b&gt;\." data-date="2026-11-13T01:00:00.000Z">/);
  assert.match(cartao, /<a class="post-card__link" href="\/blog\/s\/">/);
  assert.match(cartao, /<span class="post-card__cat">C &amp; D<\/span>/);
  assert.match(cartao, /<h3 class="post-card__title">A &lt;b&gt;&quot;x&quot;&lt;\/b&gt;<\/h3>/);
  // 13/11 01:00 UTC ainda é 12/11 em São Paulo
  assert.equal(dataBr('2026-11-13T01:00:00.000Z'), '12 de nov. de 2026');
  assert.equal(sumarioHtml([{ depth: 2, text: 'a', slug: 'a' }, { depth: 2, text: 'b', slug: 'b' }]), '');
  assert.match(sumarioHtml([2, 2, 2].map((depth, i) => ({ depth: depth as 2, text: `T${i}`, slug: `t${i}` }))), /<nav class="toc"[^>]*><p class="toc__title">Neste artigo<\/p><ol><li><a href="#t0">T0<\/a>/);
  const caixa = caixaAssinatura({ tipo: 'pessoa', nome: 'Dra. <Ana>', funcao: 'Veterinária', registro: 'CRMV 1', curriculo: 'Linha 1\nLinha 2', foto_url: 'http://inseguro/x.png', link_url: 'https://exemplo.com/ana' });
  assert.match(caixa, /class="rankeando-assinatura"/);
  assert.match(caixa, /Escrito por/);
  assert.match(caixa, /Dra\. &lt;Ana&gt;/);
  assert.match(caixa, /Veterinária · CRMV 1/);
  assert.match(caixa, /Linha 1<br>Linha 2/);
  assert.doesNotMatch(caixa, /inseguro/); // foto só em https
  assert.match(caixa, /<a href="https:\/\/exemplo.com\/ana" rel="noopener">Conheça a formação completa<\/a>/);
});

test('a página de categoria inclui as subcategorias da mãe e a paginação só aparece com mais de uma página', () => {
  const cats = [{ slug: 'mae', pai: null }, { slug: 'filha', pai: 'mae' }, { slug: 'outra', pai: null }];
  assert.deepEqual(familiaDaCategoria(cats, 'mae'), ['mae', 'filha']);
  assert.deepEqual(familiaDaCategoria(cats, 'filha'), ['filha']);
  assert.equal(paginacaoHtml('/blog/categoria/x/', 1, 1), '');
  const p = paginacaoHtml('/blog/categoria/x/', 2, 3);
  assert.match(p, /href="\/blog\/categoria\/x\/"/);
  assert.match(p, /href="\/blog\/categoria\/x\/\?page=3" rel="next"/);
});

test('o sitemap e o feed levam os posts do Rankeando e a troca de um post do site', () => {
  const sitemap = '<?xml version="1.0"?>\n<urlset><url><loc>https://venturavet.com.br/2023/03/03/post-antigo/</loc><lastmod>2023-03-04</lastmod></url>\n</urlset>\n';
  const saida = sitemapMesclado(sitemap, {
    posts: [{ slug: 'meu-post', atualizadoEm: '2026-11-01T12:00:00.000Z' }],
    categorias: [{ slug: 'cuidados', ultima: '2026-11-01T12:00:00.000Z' }],
    trocasDoSite: new Map([['https://venturavet.com.br/2023/03/03/post-antigo/', '2026-11-10T10:00:00.000Z']]),
  });
  assert.match(saida, /post-antigo\/<\/loc><lastmod>2026-11-10</);
  assert.match(saida, /<loc>https:\/\/venturavet.com.br\/blog\/meu-post\/<\/loc><lastmod>2026-11-01<\/lastmod>/);
  assert.match(saida, /<loc>https:\/\/venturavet.com.br\/blog\/categoria\/cuidados\/<\/loc>/);

  const feed = '<rss><channel><title>Blog</title>\n<item><title>Post antigo</title><link>https://venturavet.com.br/2023/03/03/post-antigo/</link><pubDate>Fri, 03 Mar 2023 12:00:00 GMT</pubDate><description>Velha</description></item>\n</channel></rss>';
  const f = feedMesclado(feed, {
    posts: [{ slug: 'meu-post', titulo: 'Meu post', descricao: 'Resumo', publicadoEm: '2026-11-01T12:00:00.000Z', categoria: 'Cuidados' }],
    trocasDoSite: new Map([['https://venturavet.com.br/2023/03/03/post-antigo/', { titulo: 'Título novo', descricao: 'Nova' }]]),
  });
  assert.ok(f.indexOf('Meu post') < f.indexOf('Título novo'), 'o mais novo vem primeiro');
  assert.match(f, /<title>Título novo<\/title>.*<description>Nova<\/description>/);
});
