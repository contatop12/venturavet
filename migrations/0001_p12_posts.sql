-- Rankeando (rankeando-blog/CONTRATO.md): the posts it sends and every delivery answered with success. The 0001 text
-- below is the v1 original; v2 categories are in 0002.

-- One row per Rankeando post, written and updated by its `id`. Text fields as the contract sends them;
-- `capa`, `seo` and `faq_jsonld` flattened; dates in ISO 8601 UTC.
CREATE TABLE p12_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  resumo TEXT NOT NULL,
  conteudo_html TEXT NOT NULL,
  conteudo_markdown TEXT NOT NULL,
  capa_url TEXT,
  capa_alt TEXT,
  seo_titulo TEXT NOT NULL,
  seo_descricao TEXT NOT NULL,
  seo_palavra_chave TEXT,
  seo_canonical TEXT,
  faq_jsonld TEXT,
  autor TEXT NOT NULL,
  publicado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  -- JSON array of the post's previous slugs: each answers 301 to the current one.
  slugs_antigos TEXT NOT NULL DEFAULT '[]',
  recebido_em TEXT NOT NULL
);

CREATE INDEX p12_posts_publicado_em ON p12_posts (publicado_em DESC);

-- X-P12-Entrega of each successful (2xx) answer and the exact answer, so a repeated delivery gets
-- the same response and writes nothing. Failed deliveries are not kept: Rankeando may resend them.
CREATE TABLE p12_entregas (
  entrega TEXT PRIMARY KEY,
  evento TEXT NOT NULL,
  status INTEGER NOT NULL,
  corpo TEXT NOT NULL,
  recebido_em TEXT NOT NULL
);

CREATE INDEX p12_entregas_evento_recebido ON p12_entregas (evento, recebido_em);
