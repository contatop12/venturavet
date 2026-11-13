// Rankeando contract v3 (rankeando-blog/CONTRATO.md): the events it sends and the answers the site gives.
import { MAX_ID_NO_SITE } from './ids';
// Answers carry only what the contract lists: ok, desafio, contrato and url; erro and mensagem on errors.

/** The version this site implements: what the ping answers. Events with contrato 1 (no categories) and 2 are accepted too. */
export const CONTRATO = 3;
/** What the ping announces beyond the version: the category events (v2) and the post events (v3: list, read, replace, restore). */
export const RECURSOS = ['categorias.listar', 'categorias.mesclar', 'posts.listar', 'post.ler', 'post.substituir', 'post.restaurar'] as const;
const CONTRATOS_ACEITOS: readonly unknown[] = [1, 2, 3];

export type Capa = { url: string; alt: string };
/** A blog category as the post carries it (`descricao` may be null; `pai` = slug of the parent category of a subcategory, else null). */
export type CategoriaDoPost = { slug: string; nome: string; descricao: string | null; pai: string | null; pai_nome?: string | null };
/** The "Escrito por" box of a post (optional field `post.assinatura`): an author person or a company. */
export type Assinatura = {
  tipo: 'pessoa' | 'empresa';
  nome: string;
  funcao: string;
  registro: string;
  /** May hold line breaks (
). */
  curriculo: string;
  foto_url: string | null;
  link_url: string | null;
};
/** A category in the `categorias` list, in the order of the Rankeando screen. */
export type CategoriaP12 = CategoriaDoPost & { ordem: number; /** Optional: when this item changed at Rankeando (ISO); an older item never overwrites a newer stored one. */ atualizado_em?: string | null; /** True when the item came without the `pai` field: the stored parent stays as it is (only an explicit null makes it top-level). */ pai_ausente?: boolean };
export type PostP12 = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  conteudo_html: string;
  conteudo_markdown: string;
  capa: Capa | null;
  seo: { titulo: string; descricao: string; palavra_chave: string | null; canonical: string | null };
  faq_jsonld: Record<string, unknown> | null;
  autor: string;
  /** ISO 8601 UTC, normalized (toISOString). */
  publicado_em: string;
  atualizado_em: string;
  /** Contract v2; null for a v1 post or a post without a category. */
  categoria: CategoriaDoPost | null;
  /** Optional field of contract v2; null when the post came without it (the site shows no box). */
  assinatura: Assinatura | null;
};

export type Evento =
  | { evento: 'ping'; desafio: string }
  | { evento: 'post.publicar'; post: PostP12 }
  | { evento: 'post.remover'; id: string }
  | { evento: 'categorias'; atualizado_em: string; categorias: CategoriaP12[]; modo: string | null }
  | { evento: 'categorias.listar' }
  | { evento: 'categorias.remover'; slugs: string[] }
  | { evento: 'posts.listar'; limite: number; cursor: string | null; desde: number | null; ate: number | null }
  | { evento: 'post.ler'; id_no_site: string }
  | { evento: 'post.substituir'; id_no_site: string; troca: TrocaDoPost }
  | { evento: 'post.restaurar'; id_no_site: string; atualizado_em: string };

/** What `post.substituir` brings: the new content of a post that already existed (contract v3). Empty seo fields mean "keep the original's". */
export type TrocaDoPost = {
  titulo: string;
  conteudo_html: string;
  conteudo_markdown: string;
  seo: { titulo: string; descricao: string; palavra_chave: string };
  faq_jsonld: Record<string, unknown> | null;
  atualizado_em: string;
};

/** An answer: HTTP status and JSON body. */
export type Resposta = { status: number; corpo: Record<string, unknown> };

export const resposta = (status: number, corpo: Record<string, unknown>): Resposta => ({ status, corpo });
export const erro = (status: number, codigo: string, mensagem: string): Resposta => resposta(status, { ok: false, erro: codigo, mensagem });

export const ERROS = {
  assinatura: () => erro(401, 'assinatura_invalida', 'assinatura inválida'),
  horario: () => erro(401, 'fora_do_horario', 'horário fora da janela de 300 s'),
  slugDoSite: () => erro(409, 'slug_em_uso', 'slug já usado por um post do site'),
  slugDoPublisher: () => erro(409, 'slug_em_uso', 'slug já usado por outro post do Rankeando'),
  corpo: (mensagem: string) => erro(400, 'corpo_invalido', mensagem),
  contrato: (mensagem: string) => erro(400, 'contrato_desconhecido', mensagem),
};

/** The URL path of a post: lowercase words and digits joined by single hyphens. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ID = 200;
const MAX_SLUG = 200;
const MAX_NOME = 200;
const MAX_CATEGORIAS = 500;
const MAX_ASSINATURA = 5000;
const MAX_CURSOR = 512;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isHttps = (v: unknown): v is string => {
  if (typeof v !== 'string') return false;
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
};
const iso = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

class Invalido extends Error {}
const falta = (campo: string): never => {
  throw new Invalido(`campo obrigatório ausente ou inválido: ${campo}`);
};
const texto = (o: Obj, campo: string, nome: string, { vazio = true, max = Infinity } = {}): string => {
  const v = o[campo];
  if (typeof v !== 'string' || (!vazio && !v.trim()) || v.length > max) return falta(nome);
  return v;
};

function lerCategoria(v: unknown, campo: string): CategoriaDoPost {
  if (!isObj(v)) return falta(campo);
  const slug = texto(v, 'slug', `${campo}.slug`, { max: MAX_SLUG });
  if (!SLUG.test(slug)) throw new Invalido(`${campo}.slug inválido: use letras minúsculas, números e hífens`);
  if (v.descricao !== null && v.descricao !== undefined && typeof v.descricao !== 'string') return falta(`${campo}.descricao`);
  let pai: string | null = null;
  if (v.pai !== null && v.pai !== undefined) {
    if (typeof v.pai !== 'string' || v.pai.length > MAX_SLUG || !SLUG.test(v.pai)) throw new Invalido(`${campo}.pai inválido: use o slug da categoria-mãe`);
    if (v.pai === slug) throw new Invalido(`${campo}.pai não pode ser a própria categoria`);
    pai = v.pai;
  }
  return { slug, nome: texto(v, 'nome', `${campo}.nome`, { vazio: false, max: MAX_NOME }), descricao: typeof v.descricao === 'string' && v.descricao.trim() ? v.descricao : null, pai };
}

function lerAssinatura(v: unknown): Assinatura | null {
  if (v === null || v === undefined) return null;
  if (!isObj(v)) return falta('post.assinatura');
  if (v.tipo !== 'pessoa' && v.tipo !== 'empresa') return falta('post.assinatura.tipo');
  const link = (campo: 'foto_url' | 'link_url') => {
    const u = v[campo];
    if (u === null || u === undefined) return null;
    return isHttps(u) && u.length <= MAX_ASSINATURA ? u : falta(`post.assinatura.${campo}`);
  };
  const livre = (campo: 'funcao' | 'registro' | 'curriculo') => texto(v, campo, `post.assinatura.${campo}`, { max: MAX_ASSINATURA });
  return {
    tipo: v.tipo,
    nome: texto(v, 'nome', 'post.assinatura.nome', { vazio: false, max: MAX_NOME }),
    funcao: livre('funcao'),
    registro: livre('registro'),
    curriculo: livre('curriculo'),
    foto_url: link('foto_url'),
    link_url: link('link_url'),
  };
}

function lerPost(v: unknown): PostP12 {
  if (!isObj(v)) return falta('post');
  const id = texto(v, 'id', 'post.id', { vazio: false, max: MAX_ID });
  const slug = texto(v, 'slug', 'post.slug', { max: MAX_SLUG });
  if (!SLUG.test(slug)) throw new Invalido('post.slug inválido: use letras minúsculas, números e hífens');

  let capa: Capa | null = null;
  if (v.capa !== null && v.capa !== undefined) {
    if (!isObj(v.capa) || !isHttps(v.capa.url)) return falta('post.capa.url');
    capa = { url: v.capa.url, alt: typeof v.capa.alt === 'string' ? v.capa.alt : '' };
  }

  if (!isObj(v.seo)) return falta('post.seo');
  const seo = v.seo;
  if (seo.canonical !== null && seo.canonical !== undefined && !isHttps(seo.canonical)) return falta('post.seo.canonical');
  if (v.faq_jsonld !== null && v.faq_jsonld !== undefined && !isObj(v.faq_jsonld)) return falta('post.faq_jsonld');

  return {
    id,
    slug,
    titulo: texto(v, 'titulo', 'post.titulo', { vazio: false }),
    resumo: texto(v, 'resumo', 'post.resumo'),
    conteudo_html: texto(v, 'conteudo_html', 'post.conteudo_html'),
    conteudo_markdown: texto(v, 'conteudo_markdown', 'post.conteudo_markdown'),
    capa,
    seo: {
      titulo: texto(seo, 'titulo', 'post.seo.titulo', { vazio: false }),
      descricao: texto(seo, 'descricao', 'post.seo.descricao'),
      palavra_chave: typeof seo.palavra_chave === 'string' ? seo.palavra_chave : null,
      canonical: typeof seo.canonical === 'string' ? seo.canonical : null,
    },
    faq_jsonld: isObj(v.faq_jsonld) ? v.faq_jsonld : null,
    autor: texto(v, 'autor', 'post.autor', { vazio: false }),
    publicado_em: iso(v.publicado_em) ?? falta('post.publicado_em'),
    atualizado_em: iso(v.atualizado_em) ?? falta('post.atualizado_em'),
    categoria: v.categoria === null || v.categoria === undefined ? null : lerCategoria(v.categoria, 'post.categoria'),
    assinatura: lerAssinatura(v.assinatura),
  };
}

/**
 * The event in a body whose signature was already checked, or the 400 answer it gets.
 * `cabecalho` is X-Rankeando-Evento (or X-P12-Evento): when present it must name the body's event.
 */
export function lerEvento(corpo: string, cabecalho: string | null): Evento | Resposta {
  let v: unknown;
  try {
    v = JSON.parse(corpo);
  } catch {
    return ERROS.corpo('corpo não é JSON');
  }
  if (!isObj(v)) return ERROS.corpo('corpo não é um objeto JSON');
  if (!CONTRATOS_ACEITOS.includes(v.contrato)) return ERROS.contrato(`contrato ${JSON.stringify(v.contrato ?? null)} não suportado; este site usa os contratos 1, 2 e 3`);
  if (cabecalho !== null && cabecalho !== v.evento) return ERROS.corpo('X-Rankeando-Evento diferente do evento do corpo');
  try {
    switch (v.evento) {
      case 'ping':
        return { evento: 'ping', desafio: texto(v, 'desafio', 'desafio') };
      case 'post.publicar':
        return { evento: 'post.publicar', post: lerPost(v.post) };
      case 'post.remover':
        if (!isObj(v.post)) return falta('post');
        return { evento: 'post.remover', id: texto(v.post, 'id', 'post.id', { vazio: false, max: MAX_ID }) };
      case 'categorias': {
        const atualizado = iso(v.atualizado_em) ?? falta('atualizado_em');
        if (!Array.isArray(v.categorias) || v.categorias.length > MAX_CATEGORIAS) return falta('categorias');
        const vistos = new Set<string>();
        const categorias = v.categorias.map((c, i): CategoriaP12 => {
          const base = lerCategoria(c, `categorias[${i}]`);
          if (vistos.has(base.slug)) throw new Invalido(`categorias[${i}].slug repetido`);
          vistos.add(base.slug);
          const ordem = (c as Obj).ordem;
          return { ...base, ordem: typeof ordem === 'number' && Number.isInteger(ordem) ? ordem : i, atualizado_em: iso((c as Obj).atualizado_em), pai_ausente: (c as Obj).pai === undefined };
        });
        return { evento: 'categorias', atualizado_em: atualizado, categorias, modo: typeof v.modo === 'string' ? v.modo : null };
      }
      case 'categorias.listar':
        return { evento: 'categorias.listar' };
      case 'categorias.remover': {
        if (!Array.isArray(v.slugs) || v.slugs.length > MAX_CATEGORIAS) return falta('slugs');
        const slugs = v.slugs.map((s, i) => {
          if (typeof s !== 'string' || s.length > MAX_SLUG || !SLUG.test(s)) throw new Invalido(`slugs[${i}] inválido: use letras minúsculas, números e hífens`);
          return s;
        });
        return { evento: 'categorias.remover', slugs };
      }
      case 'posts.listar': {
        const limite = v.limite === undefined ? 50 : v.limite;
        if (typeof limite !== 'number' || !Number.isInteger(limite) || limite < 1 || limite > 50) throw new Invalido('limite inválido: use um inteiro de 1 a 50');
        if (v.cursor !== undefined && v.cursor !== null && (typeof v.cursor !== 'string' || !v.cursor || v.cursor.length > MAX_CURSOR)) throw new Invalido('cursor inválido');
        const data = (campo: 'desde' | 'ate') => {
          const d = v[campo];
          if (d === undefined || d === null) return null;
          const t = typeof d === 'string' ? Date.parse(d) : NaN;
          return Number.isNaN(t) ? falta(campo) : t;
        };
        return { evento: 'posts.listar', limite, cursor: typeof v.cursor === 'string' ? v.cursor : null, desde: data('desde'), ate: data('ate') };
      }
      case 'post.ler':
        return { evento: 'post.ler', id_no_site: texto(v, 'id_no_site', 'id_no_site', { vazio: false, max: MAX_ID_NO_SITE }) };
      case 'post.substituir': {
        const id = texto(v, 'id_no_site', 'id_no_site', { vazio: false, max: MAX_ID_NO_SITE });
        if (!isObj(v.post)) return falta('post');
        const p = v.post;
        const seo = p.seo === undefined || p.seo === null ? {} : isObj(p.seo) ? p.seo : falta('post.seo');
        const livre = (o: Obj, campo: string, nome: string) => (o[campo] === undefined || o[campo] === null ? '' : texto(o, campo, nome));
        if (p.faq_jsonld !== null && p.faq_jsonld !== undefined && !isObj(p.faq_jsonld)) return falta('post.faq_jsonld');
        return {
          evento: 'post.substituir',
          id_no_site: id,
          troca: {
            titulo: texto(p, 'titulo', 'post.titulo', { vazio: false }),
            conteudo_html: texto(p, 'conteudo_html', 'post.conteudo_html', { vazio: false }),
            conteudo_markdown: livre(p, 'conteudo_markdown', 'post.conteudo_markdown'),
            seo: { titulo: livre(seo, 'titulo', 'post.seo.titulo'), descricao: livre(seo, 'descricao', 'post.seo.descricao'), palavra_chave: livre(seo, 'palavra_chave', 'post.seo.palavra_chave') },
            faq_jsonld: isObj(p.faq_jsonld) ? p.faq_jsonld : null,
            atualizado_em: iso(v.atualizado_em) ?? falta('atualizado_em'),
          },
        };
      }
      case 'post.restaurar':
        return {
          evento: 'post.restaurar',
          id_no_site: texto(v, 'id_no_site', 'id_no_site', { vazio: false, max: MAX_ID_NO_SITE }),
          atualizado_em: iso(v.atualizado_em) ?? falta('atualizado_em'),
        };
      default:
        return ERROS.contrato(`evento desconhecido: ${JSON.stringify(v.evento ?? null)}`);
    }
  } catch (e) {
    if (e instanceof Invalido) return ERROS.corpo(e.message);
    throw e;
  }
}
