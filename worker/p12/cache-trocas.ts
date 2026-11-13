// The list of post replacements (p12_substituicoes) is read on every page with cards, and it is almost always empty: two cache levels keep that
// read off the D1 path. Order: memory of the isolate (60 s), then the Cache API of the colo (60 s, a fixed internal key), then D1, which fills both.
// An empty list is cached too. A D1 failure is never cached. Without `caches` (tests, local) only the isolate memory is used.
// Writes that touch the table call `limparCacheDeTrocas()`: this isolate and this colo see the change at once, the other colos within 60 s.
// `post.ler` and `posts.listar` do NOT use this cache (Rankeando checks a replacement through them right after writing it).
import { SITE_URL } from './constantes';
import type { Substituicao } from './store';

// On the site's own hostname: the Cache API keeps entries per zone. The path is never a page (the Worker answers every request first,
// and caches.default entries are only read through cache.match).
export const CHAVE_CACHE_TROCAS = `${SITE_URL}/__p12-cache/trocas-v1`;
export const TTL_TROCAS_MS = 60_000;

let memoria: { ate: number; lista: Substituicao[] } | null = null;

const api = (): Cache | null => {
  try {
    const c = (globalThis as { caches?: { default?: Cache } }).caches;
    return c?.default ?? null;
  } catch {
    return null;
  }
};

/** The replacements: isolate memory, then Cache API, then `ler` (D1). If `ler` throws, `onErro` runs and the list is empty, uncached. */
export async function trocasComCache(ler: () => Promise<Substituicao[]>, onErro: (e: unknown) => void, agora: () => number = Date.now): Promise<Substituicao[]> {
  if (memoria && memoria.ate > agora()) return memoria.lista;
  const cache = api();
  if (cache) {
    try {
      const r = await cache.match(CHAVE_CACHE_TROCAS);
      if (r) {
        const lista = (await r.json()) as Substituicao[];
        memoria = { ate: agora() + TTL_TROCAS_MS, lista };
        return lista;
      }
    } catch {
      // a broken cache is a miss
    }
  }
  let lista: Substituicao[];
  try {
    lista = await ler();
  } catch (e) {
    onErro(e);
    return [];
  }
  memoria = { ate: agora() + TTL_TROCAS_MS, lista };
  if (cache) {
    try {
      await cache.put(CHAVE_CACHE_TROCAS, new Response(JSON.stringify(lista), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${TTL_TROCAS_MS / 1000}` } }));
    } catch {
      // not cached: the next request reads D1 again
    }
  }
  return lista;
}

/** Forgets the list here (memory now, then the colo's Cache API entry). Await it only when the caller can wait (tests, `waitUntil`). */
export async function limparCacheDeTrocas(): Promise<void> {
  memoria = null;
  const cache = api();
  if (!cache) return;
  try {
    await cache.delete(CHAVE_CACHE_TROCAS);
  } catch {
    // the 60 s TTL ends it anyway
  }
}
