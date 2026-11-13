// In-memory P12Store for the webhook tests (same behaviour as D1Store, without SQL).
import { readingMinutes } from '../worker/p12/constantes';
import type { CategoriaP12, PostP12 } from '../worker/p12/contrato';
import { idDoPostDoPublisher } from '../worker/p12/ids';
import type { EntregaSalva, NovaEntrega, P12Store, Registro, Substituicao } from '../worker/p12/store';

type Salvo = { post: PostP12; slugsAntigos: string[] };

export class MemoriaStore implements P12Store {
  posts = new Map<string, Salvo>();
  categoriasPorSlug = new Map<string, CategoriaP12>();
  trocas = new Map<string, Substituicao>();
  categoriasEm: string | null = null;
  entregas = new Map<string, EntregaSalva & { evento: string; recebidoEm: string }>();

  private guardar(e: NovaEntrega, agora: string) {
    if (!this.entregas.has(e.entrega)) this.entregas.set(e.entrega, { status: e.status, corpo: e.corpo, evento: e.evento, recebidoEm: agora });
  }
  private registro({ post, slugsAntigos }: Salvo): Registro {
    return { id: post.id, slug: post.slug, slugsAntigos: [...slugsAntigos], atualizadoEm: post.atualizado_em };
  }

  async entrega(id: string) {
    const e = this.entregas.get(id);
    return e ? { status: e.status, corpo: e.corpo } : null;
  }
  async salvarPing(e: NovaEntrega, agora: string) {
    this.guardar(e, agora);
    const ontem = new Date(Date.parse(agora) - 86_400_000).toISOString();
    for (const [k, v] of this.entregas) if (v.evento === 'ping' && v.recebidoEm < ontem) this.entregas.delete(k);
  }
  async salvarEntrega(e: NovaEntrega, agora: string) {
    this.guardar(e, agora);
  }
  async removidoEm(id: string) {
    return this.entregas.get(`${id}:remover`)?.recebidoEm ?? null;
  }
  async porId(id: string) {
    const s = this.posts.get(id);
    return s ? this.registro(s) : null;
  }
  async idDoSlug(slug: string) {
    return [...this.posts.values()].find((s) => s.post.slug === slug)?.post.id ?? null;
  }
  async donosDoSlugAntigo(slug: string) {
    return [...this.posts.values()].filter((s) => s.slugsAntigos.includes(slug)).map((s) => this.registro(s));
  }
  async gravar({ post, slugsAntigos, liberar, entrega, agora }: Parameters<P12Store['gravar']>[0]) {
    for (const r of liberar) {
      const s = this.posts.get(r.id);
      if (s) s.slugsAntigos = s.slugsAntigos.filter((x) => x !== post.slug);
    }
    const atual = this.posts.get(post.id);
    // Sem categoria no corpo, o post que já existe mantém a dele (como o D1Store, que não mexe em p12_post_categoria).
    if (!atual || post.atualizado_em >= atual.post.atualizado_em) this.posts.set(post.id, { post: { ...post, categoria: post.categoria ?? atual?.post.categoria ?? null }, slugsAntigos });
    if (post.categoria && !this.categoriasPorSlug.has(post.categoria.slug)) {
      this.categoriasPorSlug.set(post.categoria.slug, { ...post.categoria, ordem: Math.max(-1, ...[...this.categoriasPorSlug.values()].map((c) => c.ordem)) + 1 });
    }
    this.entregas.delete(`${post.id}:remover`);
    this.trocas.delete(idDoPostDoPublisher(post.id));
    this.guardar(entrega, agora);
  }
  async categoriasAtualizadoEm() {
    return this.categoriasEm;
  }
  async salvarCategorias({ categorias, atualizadoEm, entrega, agora }: Parameters<P12Store['salvarCategorias']>[0]) {
    for (const c of categorias) {
      const salvo = this.categoriasPorSlug.get(c.slug);
      if (salvo?.atualizado_em && c.atualizado_em && c.atualizado_em < salvo.atualizado_em) continue;
      this.categoriasPorSlug.set(c.slug, { ...c, pai: c.pai_ausente && salvo ? salvo.pai : c.pai, atualizado_em: c.atualizado_em ?? salvo?.atualizado_em ?? null });
    }
    if (!this.categoriasEm || atualizadoEm > this.categoriasEm) this.categoriasEm = atualizadoEm;
    this.guardar(entrega, agora);
  }
  async removerCategorias({ slugs, entrega, agora }: Parameters<P12Store['removerCategorias']>[0]) {
    const fora = new Set(slugs);
    for (const s of this.posts.values()) {
      if (s.post.categoria && fora.has(s.post.categoria.slug)) s.post = { ...s.post, categoria: null };
    }
    for (const [k, c] of this.categoriasPorSlug) {
      if (fora.has(k)) this.categoriasPorSlug.delete(k);
      else if (c.pai && fora.has(c.pai)) this.categoriasPorSlug.set(k, { ...c, pai: null });
    }
    this.guardar(entrega, agora);
  }
  async categorias() {
    return [...this.categoriasPorSlug.values()]
      .sort((a, b) => a.ordem - b.ordem || a.slug.localeCompare(b.slug))
      .map((c) => {
        const posts = [...this.posts.values()].filter((s) => s.post.categoria?.slug === c.slug).map((s) => s.post);
        return { ...c, posts: posts.length, ultimaAtualizacao: posts.map((p) => p.atualizado_em).sort().at(-1) ?? null };
      });
  }
  async remover(id: string, e: NovaEntrega, agora: string) {
    this.posts.delete(id);
    this.trocas.delete(idDoPostDoPublisher(id));
    this.guardar(e, agora);
  }
  async substituicoes() {
    return [...this.trocas.values()].sort((a, b) => a.idNoSite.localeCompare(b.idNoSite)).map((s) => ({ ...s }));
  }
  async substituir(s: Substituicao, e: NovaEntrega, agora: string) {
    const atual = this.trocas.get(s.idNoSite);
    if (!atual || s.atualizadoEm >= atual.atualizadoEm) this.trocas.set(s.idNoSite, { ...s });
    this.guardar(e, agora);
  }
  async restaurar(idNoSite: string, e: NovaEntrega, agora: string) {
    this.trocas.delete(idNoSite);
    this.guardar(e, agora);
  }
  async resumos() {
    return [...this.posts.values()]
      .map(({ post: p }) => ({ id: p.id, slug: p.slug, titulo: p.titulo, resumo: p.resumo, publicadoEm: p.publicado_em, atualizadoEm: p.atualizado_em, categoria: p.categoria?.slug ?? null }))
      .sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm) || a.slug.localeCompare(b.slug));
  }
  async cartoes(ids: string[]) {
    return ids.flatMap((id) => {
      const p = this.posts.get(id)?.post;
      return p ? [{ id: p.id, slug: p.slug, titulo: p.titulo, resumo: p.resumo, autor: p.autor, publicadoEm: p.publicado_em, capa: p.capa, minutos: readingMinutes(p.conteudo_markdown), categoria: p.categoria ? { slug: p.categoria.slug, nome: this.categoriasPorSlug.get(p.categoria.slug)?.nome ?? p.categoria.nome } : null }] : [];
    });
  }
  async post(slug: string) {
    return [...this.posts.values()].find((s) => s.post.slug === slug)?.post ?? null;
  }
  async slugAtualDoAntigo(slug: string) {
    return [...this.posts.values()].find((s) => s.slugsAntigos.includes(slug))?.post.slug ?? null;
  }
}
