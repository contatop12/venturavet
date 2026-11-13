-- Rankeando contract v2 (rankeando-blog/CONTRATO.md): blog categories. Additive and re-runnable: only new
-- tables, nothing in p12_posts changes, so the posts already stored stay as they are (without category).

-- The categories of the blog, by slug. `ordem` follows the Rankeando screen (0, 1, 2...).
CREATE TABLE IF NOT EXISTS p12_categorias (
  slug TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0
);

-- The category of a post (at most one). A post without a row here has no category (every v1 post).
CREATE TABLE IF NOT EXISTS p12_post_categoria (
  post_id TEXT PRIMARY KEY,
  categoria_slug TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS p12_post_categoria_slug ON p12_post_categoria (categoria_slug);

-- Small settings of the receiver: `categorias_atualizado_em` is the `atualizado_em` of the last category list
-- applied, so an older list that arrives late is ignored.
CREATE TABLE IF NOT EXISTS p12_config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
