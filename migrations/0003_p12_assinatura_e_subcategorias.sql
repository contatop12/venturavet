-- Rankeando contract v2.1 (rankeando-blog/CONTRATO.md): two optional, additive fields.
-- 1) post.assinatura: the "Escrito por" box of a post, kept as JSON (NULL = no box, as every post stored so far).
-- 2) pai in each category of the `categorias` event: slug of the parent category of a subcategory (NULL = top level).
-- Plain ALTER TABLE ADD COLUMN: nothing is rewritten, every row keeps NULL. Run it once (SQLite has no IF NOT EXISTS for columns).

ALTER TABLE p12_posts ADD COLUMN assinatura TEXT;

ALTER TABLE p12_categorias ADD COLUMN pai_slug TEXT;

CREATE INDEX IF NOT EXISTS p12_categorias_pai ON p12_categorias (pai_slug);
