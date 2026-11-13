-- Rankeando contract v3 (rankeando-blog/CONTRATO.md): `post.substituir` / `post.restaurar`.
-- One row per post whose content Rankeando replaced, by `id_no_site` ("site:<slug>" for a post of the site, "rk:<id>" for a
-- Rankeando post; worker/p12/ids.ts). The original post (a file of the site, or the p12_posts row) is never edited: the Worker
-- shows this row everywhere the post appears, and `post.restaurar` (or a new `post.publicar` of the post) deletes it.
-- An empty seo_* means "keep the original's". Plain CREATE TABLE: nothing existing is touched.

CREATE TABLE IF NOT EXISTS p12_substituicoes (
  id_no_site TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  conteudo_html TEXT NOT NULL,
  conteudo_markdown TEXT NOT NULL DEFAULT '',
  seo_titulo TEXT NOT NULL DEFAULT '',
  seo_descricao TEXT NOT NULL DEFAULT '',
  seo_palavra_chave TEXT NOT NULL DEFAULT '',
  -- JSON of the FAQPage, NULL = no FAQ.
  faq_jsonld TEXT,
  atualizado_em TEXT NOT NULL,
  recebido_em TEXT NOT NULL
);
