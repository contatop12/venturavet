-- Per-item timestamp of a category (optional `atualizado_em` of each item in the `categorias` event, merge mode): an older item never overwrites a newer stored one.
ALTER TABLE p12_categorias ADD COLUMN atualizado_em TEXT;
