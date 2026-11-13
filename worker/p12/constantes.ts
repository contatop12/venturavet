// Constantes do site que o Worker usa (o build escreve o resto em /p12-kit/config.json).
export const SITE_URL = 'https://venturavet.com.br';
export const SITE_NAME = 'Ventura Vet';

/** Minutos de leitura, a mesma regra do build do site (build/lib/posts.ts). */
export const readingMinutes = (texto: string) => Math.max(2, Math.round(texto.split(/\s+/).filter(Boolean).length / 200));
