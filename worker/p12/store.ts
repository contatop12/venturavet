// Storage of the Rankeando posts, categories, deliveries and post replacements (migrations/0001_p12_posts.sql, 0002_p12_categorias.sql, 0003_p12_assinatura_e_subcategorias.sql, 0005_p12_substituicoes.sql). The webhook and the
// blog pages use the P12Store interface; D1Store is the production one (tests use an in-memory one).
import { readingMinutes } from './constantes';
import type { Assinatura, CategoriaDoPost, CategoriaP12, Capa, PostP12 } from './contrato';
import { idDoPostDoPublisher } from './ids';

/** A delivery answered with success: the exact answer to repeat. */
export type EntregaSalva = { status: number; corpo: string };
export type NovaEntrega = { entrega: string; evento: string; status: number; corpo: string };
/** What the webhook needs to know about a stored post. */
export type Registro = { id: string; slug: string; slugsAntigos: string[]; atualizadoEm: string };
/** A post in date order (listing merge, RSS, search, sitemap). */
export type Resumo = { id: string; slug: string; titulo: string; resumo: string; publicadoEm: string; atualizadoEm: string; categoria: string | null };
/** A category with the number of published posts it has (its own, not its subcategories') and when the newest of them was updated. */
export type CategoriaComPosts = CategoriaP12 & { posts: number; ultimaAtualizacao: string | null };
/** What a post card shows. */
export type Cartao = {
  id: string; slug: string; titulo: string; resumo: string; autor: string; publicadoEm: string; capa: Capa | null; minutos: number;
  categoria: { slug: string; nome: string } | null;
};

/**
 * The content Rankeando put in place of a post's own (contract v3, `post.substituir`), one row per `id_no_site`. The original post is never
 * edited: every page of the site shows this row instead. Empty `seo*` fields mean "keep the original's".
 */
export type Substituicao = {
  idNoSite: string;
  titulo: string;
  conteudoHtml: string;
  conteudoMarkdown: string;
  seoTitulo: string;
  seoDescricao: string;
  seoPalavraChave: string;
  /** The FAQPage JSON-LD, or null (no FAQ). */
  faqJsonld: Record<string, unknown> | null;
  atualizadoEm: string;
};

export interface P12Store {
  entrega(entrega: string): Promise<EntregaSalva | null>;
  /** Keeps a ping's answer (and forgets pings older than a day: their ids are random). */
  salvarPing(entrega: NovaEntrega, agora: string): Promise<void>;
  porId(id: string): Promise<Registro | null>;
  idDoSlug(slug: string): Promise<string | null>;
  /** Posts that keep `slug` among their old slugs (301s). */
  donosDoSlugAntigo(slug: string): Promise<Registro[]>;
  /**
   * Writes the post (unless the stored version is newer), takes `slug` out of the old slugs of `liberar`,
   * forgets a previous removal (so a later `<id>:remover` applies again) and keeps the answer, atomically.
   */
  gravar(g: { post: PostP12; slugsAntigos: string[]; liberar: Registro[]; entrega: NovaEntrega; agora: string }): Promise<void>;
  /** Writes nothing but the answer (a stale version of a post the site already has newer). */
  salvarEntrega(entrega: NovaEntrega, agora: string): Promise<void>;
  /** When the post was removed (its `<id>:remover` delivery), while it stays removed. */
  removidoEm(id: string): Promise<string | null>;
  remover(id: string, entrega: NovaEntrega, agora: string): Promise<void>;
  /** `atualizado_em` of the last category list applied, or null. */
  categoriasAtualizadoEm(): Promise<string | null>;
  /**
   * Upsert only: creates or updates each category sent by slug (name, description, order, parent, which stays when the item has no `pai` field; an item whose own `atualizado_em`
   * is older than the stored one is skipped) and keeps the list's
   * `atualizado_em` and the answer, atomically. It never deletes a category that did not come (they may have been created on the site).
   */
  salvarCategorias(c: { categorias: CategoriaP12[]; atualizadoEm: string; entrega: NovaEntrega; agora: string }): Promise<void>;
  /**
   * Deletes only these categories: their posts stay, without category, and their subcategories become top-level.
   * Slugs that do not exist are ignored. Keeps the answer, atomically.
   */
  removerCategorias(r: { slugs: string[]; entrega: NovaEntrega; agora: string }): Promise<void>;
  /** The categories in order, with their post counts (the ones without a post included). */
  categorias(): Promise<CategoriaComPosts[]>;
  /** Every post, newest first (ties by slug). */
  resumos(): Promise<Resumo[]>;
  /** Every replacement row (a handful: Rankeando replaces posts one at a time, after a person confirms). */
  substituicoes(): Promise<Substituicao[]>;
  /** Writes (or, when the stored one is newer, keeps) the replacement of a post and the answer, atomically. */
  substituir(s: Substituicao, entrega: NovaEntrega, agora: string): Promise<void>;
  /** Deletes the replacement of a post (no row: nothing changes) and keeps the answer, atomically. */
  restaurar(idNoSite: string, entrega: NovaEntrega, agora: string): Promise<void>;
  cartoes(ids: string[]): Promise<Cartao[]>;
  post(slug: string): Promise<PostP12 | null>;
  /** The current slug of the post that used to live at `slug`. */
  slugAtualDoAntigo(slug: string): Promise<string | null>;
}

const UM_DIA = 24 * 60 * 60 * 1000;

type Linha = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  conteudo_html: string;
  conteudo_markdown: string;
  capa_url: string | null;
  capa_alt: string | null;
  seo_titulo: string;
  seo_descricao: string;
  seo_palavra_chave: string | null;
  seo_canonical: string | null;
  faq_jsonld: string | null;
  autor: string;
  publicado_em: string;
  atualizado_em: string;
  slugs_antigos: string;
  categoria_slug?: string | null;
  categoria_nome?: string | null;
  categoria_descricao?: string | null;
  categoria_pai?: string | null;
  categoria_pai_nome?: string | null;
  assinatura?: string | null;
};

// A post's category lives in p12_post_categoria (post_id -> categoria_slug), so migration 0002 only adds tables.
const COM_CATEGORIA = `LEFT JOIN p12_post_categoria pc ON pc.post_id = p.id LEFT JOIN p12_categorias c ON c.slug = pc.categoria_slug`;
// The parent category of the post's category (subcategories are one level deep), for the post page trail.
// Only a top-level parent counts (same rule as the lists: a cycle or a second level is a top-level category), so the trail never links a page that 404s.
const COM_PAI = `LEFT JOIN p12_categorias cp ON cp.slug = c.pai_slug AND cp.pai_slug IS NULL AND cp.slug <> c.slug`;

const capa = (url: string | null, alt: string | null): Capa | null => (url ? { url, alt: alt ?? '' } : null);
const registro = (l: Pick<Linha, 'id' | 'slug' | 'slugs_antigos' | 'atualizado_em'>): Registro => ({
  id: l.id,
  slug: l.slug,
  slugsAntigos: JSON.parse(l.slugs_antigos) as string[],
  atualizadoEm: l.atualizado_em,
});

const categoriaDoPost = (l: Linha): CategoriaDoPost => ({
  slug: l.categoria_slug!, nome: l.categoria_nome!, descricao: l.categoria_descricao ?? null, pai: l.categoria_pai ?? null, pai_nome: l.categoria_pai_nome ?? null,
});

/** The stored signature, or null (a post stored before migration 0003, or one that came without it). Bad JSON counts as none. */
function assinaturaDoBanco(json: string | null | undefined): Assinatura | null {
  if (!json) return null;
  try {
    const a = JSON.parse(json) as Assinatura;
    return a && typeof a === 'object' && typeof a.nome === 'string' ? a : null;
  } catch {
    return null;
  }
}

export class D1Store implements P12Store {
  constructor(private readonly db: D1Database) {}

  private novaEntrega(e: NovaEntrega, agora: string) {
    return this.db
      .prepare('INSERT OR IGNORE INTO p12_entregas (entrega, evento, status, corpo, recebido_em) VALUES (?, ?, ?, ?, ?)')
      .bind(e.entrega, e.evento, e.status, e.corpo, agora);
  }

  async entrega(entrega: string) {
    return this.db.prepare('SELECT status, corpo FROM p12_entregas WHERE entrega = ?').bind(entrega).first<EntregaSalva>();
  }

  async salvarPing(e: NovaEntrega, agora: string) {
    const ontem = new Date(Date.parse(agora) - UM_DIA).toISOString();
    await this.db.batch([
      this.novaEntrega(e, agora),
      this.db.prepare("DELETE FROM p12_entregas WHERE evento = 'ping' AND recebido_em < ?").bind(ontem),
    ]);
  }

  async salvarEntrega(e: NovaEntrega, agora: string) {
    await this.novaEntrega(e, agora).run();
  }

  async removidoEm(id: string) {
    return this.db.prepare('SELECT recebido_em FROM p12_entregas WHERE entrega = ?').bind(`${id}:remover`).first<string>('recebido_em');
  }

  async porId(id: string) {
    const l = await this.db.prepare('SELECT id, slug, slugs_antigos, atualizado_em FROM p12_posts WHERE id = ?').bind(id).first<Linha>();
    return l ? registro(l) : null;
  }

  async idDoSlug(slug: string) {
    return this.db.prepare('SELECT id FROM p12_posts WHERE slug = ?').bind(slug).first<string>('id');
  }

  async donosDoSlugAntigo(slug: string) {
    const { results } = await this.db
      .prepare('SELECT p.id, p.slug, p.slugs_antigos, p.atualizado_em FROM p12_posts p, json_each(p.slugs_antigos) j WHERE j.value = ?')
      .bind(slug)
      .all<Linha>();
    return results.map(registro);
  }

  async gravar({ post: p, slugsAntigos, liberar, entrega, agora }: Parameters<P12Store['gravar']>[0]) {
    await this.db.batch([
      ...liberar.map((r) =>
        this.db.prepare('UPDATE p12_posts SET slugs_antigos = ? WHERE id = ?').bind(JSON.stringify(r.slugsAntigos.filter((s) => s !== p.slug)), r.id),
      ),
      this.db
        .prepare(
          `INSERT INTO p12_posts (id, slug, titulo, resumo, conteudo_html, conteudo_markdown, capa_url, capa_alt, seo_titulo,
             seo_descricao, seo_palavra_chave, seo_canonical, faq_jsonld, autor, publicado_em, atualizado_em, slugs_antigos, recebido_em, assinatura)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET slug = excluded.slug, titulo = excluded.titulo, resumo = excluded.resumo,
             conteudo_html = excluded.conteudo_html, conteudo_markdown = excluded.conteudo_markdown, capa_url = excluded.capa_url,
             capa_alt = excluded.capa_alt, seo_titulo = excluded.seo_titulo, seo_descricao = excluded.seo_descricao,
             seo_palavra_chave = excluded.seo_palavra_chave, seo_canonical = excluded.seo_canonical, faq_jsonld = excluded.faq_jsonld,
             autor = excluded.autor, publicado_em = excluded.publicado_em, atualizado_em = excluded.atualizado_em,
             slugs_antigos = excluded.slugs_antigos, recebido_em = excluded.recebido_em, assinatura = excluded.assinatura
           WHERE excluded.atualizado_em >= p12_posts.atualizado_em`,
        )
        .bind(
          p.id, p.slug, p.titulo, p.resumo, p.conteudo_html, p.conteudo_markdown, p.capa?.url ?? null, p.capa?.alt ?? null,
          p.seo.titulo, p.seo.descricao, p.seo.palavra_chave, p.seo.canonical, p.faq_jsonld ? JSON.stringify(p.faq_jsonld) : null,
          p.autor, p.publicado_em, p.atualizado_em, JSON.stringify(slugsAntigos), agora, p.assinatura ? JSON.stringify(p.assinatura) : null,
        ),
      // The post's category: created at the end of the order when the list has not brought it yet (never renamed here).
      // Without a category in the body (null, missing or v1) nothing is touched: a new post stays without one and an
      // existing post keeps the one it has (Rankeando never erases what was set on the site).
      ...(p.categoria
        ? [
            this.db
              .prepare(
                `INSERT OR IGNORE INTO p12_categorias (slug, nome, descricao, ordem, pai_slug)
                 VALUES (?, ?, ?, (SELECT COALESCE(MAX(ordem), -1) + 1 FROM p12_categorias), ?)`,
              )
              .bind(p.categoria.slug, p.categoria.nome, p.categoria.descricao, p.categoria.pai),
            this.db
              .prepare('INSERT INTO p12_post_categoria (post_id, categoria_slug) VALUES (?, ?) ON CONFLICT (post_id) DO UPDATE SET categoria_slug = excluded.categoria_slug')
              .bind(p.id, p.categoria.slug),
          ]
        : []),
      this.db.prepare('DELETE FROM p12_entregas WHERE entrega = ?').bind(`${p.id}:remover`),
      // What Rankeando publishes now is the content that counts: a replacement of this post (contract v3) goes away.
      this.db.prepare('DELETE FROM p12_substituicoes WHERE id_no_site = ?').bind(idDoPostDoPublisher(p.id)),
      this.novaEntrega(entrega, agora),
    ]);
  }

  async remover(id: string, entrega: NovaEntrega, agora: string) {
    await this.db.batch([
      this.db.prepare('DELETE FROM p12_post_categoria WHERE post_id = ?').bind(id),
      this.db.prepare('DELETE FROM p12_posts WHERE id = ?').bind(id),
      this.db.prepare('DELETE FROM p12_substituicoes WHERE id_no_site = ?').bind(idDoPostDoPublisher(id)),
      this.novaEntrega(entrega, agora),
    ]);
  }

  async categoriasAtualizadoEm() {
    return this.db.prepare("SELECT valor FROM p12_config WHERE chave = 'categorias_atualizado_em'").first<string>('valor');
  }

  async salvarCategorias({ categorias, atualizadoEm, entrega, agora }: Parameters<P12Store['salvarCategorias']>[0]) {
    await this.db.batch([
      ...categorias.map((c) =>
        this.db
          .prepare(
            `INSERT INTO p12_categorias (slug, nome, descricao, ordem, pai_slug, atualizado_em) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT (slug) DO UPDATE SET nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem,
               pai_slug = CASE WHEN ?7 = 1 THEN p12_categorias.pai_slug ELSE excluded.pai_slug END,
               atualizado_em = COALESCE(excluded.atualizado_em, p12_categorias.atualizado_em)
             WHERE excluded.atualizado_em IS NULL OR p12_categorias.atualizado_em IS NULL OR excluded.atualizado_em >= p12_categorias.atualizado_em`,
          )
          .bind(c.slug, c.nome, c.descricao, c.ordem, c.pai, c.atualizado_em ?? null, c.pai_ausente ? 1 : 0),
      ),
      this.db
        .prepare("INSERT INTO p12_config (chave, valor) VALUES ('categorias_atualizado_em', ?) ON CONFLICT (chave) DO UPDATE SET valor = MAX(valor, excluded.valor)")
        .bind(atualizadoEm),
      this.novaEntrega(entrega, agora),
    ]);
  }

  async removerCategorias({ slugs, entrega, agora }: Parameters<P12Store['removerCategorias']>[0]) {
    const lista = JSON.stringify(slugs);
    await this.db.batch([
      this.db.prepare('DELETE FROM p12_post_categoria WHERE categoria_slug IN (SELECT value FROM json_each(?))').bind(lista),
      this.db.prepare('UPDATE p12_categorias SET pai_slug = NULL WHERE pai_slug IN (SELECT value FROM json_each(?))').bind(lista),
      this.db.prepare('DELETE FROM p12_categorias WHERE slug IN (SELECT value FROM json_each(?))').bind(lista),
      this.novaEntrega(entrega, agora),
    ]);
  }

  async categorias() {
    const { results } = await this.db
      .prepare(
        `SELECT c.slug, c.nome, c.descricao, c.ordem, c.pai_slug, COUNT(p.id) AS posts, MAX(p.atualizado_em) AS ultima
         FROM p12_categorias c
         LEFT JOIN p12_post_categoria pc ON pc.categoria_slug = c.slug
         LEFT JOIN p12_posts p ON p.id = pc.post_id
         GROUP BY c.slug ORDER BY c.ordem, c.slug`,
      )
      .all<{ slug: string; nome: string; descricao: string | null; ordem: number; pai_slug: string | null; posts: number; ultima: string | null }>();
    return results.map((r) => ({ slug: r.slug, nome: r.nome, descricao: r.descricao, ordem: r.ordem, pai: r.pai_slug, posts: r.posts, ultimaAtualizacao: r.ultima }));
  }

  async resumos() {
    const { results } = await this.db
      .prepare(
        `SELECT p.id, p.slug, p.titulo, p.resumo, p.publicado_em, p.atualizado_em, c.slug AS categoria_slug
         FROM p12_posts p ${COM_CATEGORIA} ORDER BY p.publicado_em DESC, p.slug`,
      )
      .all<Linha>();
    return results.map((l) => ({
      id: l.id, slug: l.slug, titulo: l.titulo, resumo: l.resumo, publicadoEm: l.publicado_em, atualizadoEm: l.atualizado_em,
      categoria: l.categoria_slug ?? null,
    }));
  }

  async substituicoes() {
    const { results } = await this.db
      .prepare(
        `SELECT id_no_site, titulo, conteudo_html, conteudo_markdown, seo_titulo, seo_descricao, seo_palavra_chave, faq_jsonld, atualizado_em
         FROM p12_substituicoes ORDER BY id_no_site`,
      )
      .all<{ id_no_site: string; titulo: string; conteudo_html: string; conteudo_markdown: string; seo_titulo: string; seo_descricao: string; seo_palavra_chave: string; faq_jsonld: string | null; atualizado_em: string }>();
    return results.map((l): Substituicao => {
      let faq: Record<string, unknown> | null = null;
      try {
        const v: unknown = l.faq_jsonld ? JSON.parse(l.faq_jsonld) : null;
        faq = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
      } catch {
        faq = null;
      }
      return {
        idNoSite: l.id_no_site, titulo: l.titulo, conteudoHtml: l.conteudo_html, conteudoMarkdown: l.conteudo_markdown, seoTitulo: l.seo_titulo,
        seoDescricao: l.seo_descricao, seoPalavraChave: l.seo_palavra_chave, faqJsonld: faq, atualizadoEm: l.atualizado_em,
      };
    });
  }

  async substituir(s: Substituicao, entrega: NovaEntrega, agora: string) {
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO p12_substituicoes (id_no_site, titulo, conteudo_html, conteudo_markdown, seo_titulo, seo_descricao, seo_palavra_chave, faq_jsonld, atualizado_em, recebido_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id_no_site) DO UPDATE SET titulo = excluded.titulo, conteudo_html = excluded.conteudo_html, conteudo_markdown = excluded.conteudo_markdown,
             seo_titulo = excluded.seo_titulo, seo_descricao = excluded.seo_descricao, seo_palavra_chave = excluded.seo_palavra_chave, faq_jsonld = excluded.faq_jsonld,
             atualizado_em = excluded.atualizado_em, recebido_em = excluded.recebido_em
           WHERE excluded.atualizado_em >= p12_substituicoes.atualizado_em`,
        )
        .bind(s.idNoSite, s.titulo, s.conteudoHtml, s.conteudoMarkdown, s.seoTitulo, s.seoDescricao, s.seoPalavraChave, s.faqJsonld ? JSON.stringify(s.faqJsonld) : null, s.atualizadoEm, agora),
      this.novaEntrega(entrega, agora),
    ]);
  }

  async restaurar(idNoSite: string, entrega: NovaEntrega, agora: string) {
    await this.db.batch([this.db.prepare('DELETE FROM p12_substituicoes WHERE id_no_site = ?').bind(idNoSite), this.novaEntrega(entrega, agora)]);
  }

  async cartoes(ids: string[]) {
    if (!ids.length) return [];
    const { results } = await this.db
      .prepare(
        `SELECT p.id, p.slug, p.titulo, p.resumo, p.autor, p.publicado_em, p.capa_url, p.capa_alt, p.conteudo_markdown,
                c.slug AS categoria_slug, c.nome AS categoria_nome
         FROM p12_posts p ${COM_CATEGORIA} WHERE p.id IN (SELECT value FROM json_each(?))`,
      )
      .bind(JSON.stringify(ids))
      .all<Linha>();
    return results.map((l) => ({
      id: l.id,
      slug: l.slug,
      titulo: l.titulo,
      resumo: l.resumo,
      autor: l.autor,
      publicadoEm: l.publicado_em,
      capa: capa(l.capa_url, l.capa_alt),
      minutos: readingMinutes(l.conteudo_markdown),
      categoria: l.categoria_slug && l.categoria_nome ? { slug: l.categoria_slug, nome: l.categoria_nome } : null,
    }));
  }

  async post(slug: string) {
    const l = await this.db
      .prepare(
        `SELECT p.*, c.slug AS categoria_slug, c.nome AS categoria_nome, c.descricao AS categoria_descricao,
                c.pai_slug AS categoria_pai, cp.nome AS categoria_pai_nome
         FROM p12_posts p ${COM_CATEGORIA} ${COM_PAI} WHERE p.slug = ?`,
      )
      .bind(slug)
      .first<Linha>();
    if (!l) return null;
    return {
      id: l.id,
      slug: l.slug,
      titulo: l.titulo,
      resumo: l.resumo,
      conteudo_html: l.conteudo_html,
      conteudo_markdown: l.conteudo_markdown,
      capa: capa(l.capa_url, l.capa_alt),
      seo: { titulo: l.seo_titulo, descricao: l.seo_descricao, palavra_chave: l.seo_palavra_chave, canonical: l.seo_canonical },
      faq_jsonld: l.faq_jsonld ? (JSON.parse(l.faq_jsonld) as Record<string, unknown>) : null,
      autor: l.autor,
      publicado_em: l.publicado_em,
      atualizado_em: l.atualizado_em,
      categoria: l.categoria_slug && l.categoria_nome ? categoriaDoPost(l) : null,
      assinatura: assinaturaDoBanco(l.assinatura),
    };
  }

  async slugAtualDoAntigo(slug: string) {
    return this.db
      .prepare('SELECT p.slug FROM p12_posts p, json_each(p.slugs_antigos) j WHERE j.value = ? LIMIT 1')
      .bind(slug)
      .first<string>('slug');
  }
}
