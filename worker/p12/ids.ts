// `id_no_site` of Rankeando contract v3: a stable text of 1 to 128 characters, no control characters, that names a post of the
// blog for good (`posts.listar`, `post.ler`, `post.substituir`, `post.restaurar`).
//   site post (written in the code, prerendered):  "site:<slug>"
//   Rankeando post (D1):                           "rk:<id Rankeando>"  (not the slug: the slug of a Rankeando post can change)
// A text that is too long or carries a control character keeps its start and gets "~" plus an FNV-1a hash of the whole.
// Pure and synchronous: the build (src/pages/p12-kit/) and the Worker use the same function.

export const MAX_ID_NO_SITE = 128;
const CONTROLE = /[\u0000-\u001f\u007f-\u009f]/g;

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** `s` itself when it is a valid id; otherwise its clean start plus "~" and the hash of the original. */
export function ajustarId(s: string): string {
  CONTROLE.lastIndex = 0;
  if (s.length <= MAX_ID_NO_SITE && !CONTROLE.test(s)) return s;
  const inicio = s.replace(CONTROLE, '').slice(0, MAX_ID_NO_SITE - 9).replace(/[\ud800-\udbff]$/, '');
  return `${inicio}~${fnv1a(s)}`;
}

export const idDoPostDoSite = (slug: string) => ajustarId(`site:${slug}`);
export const idDoPostDoPublisher = (id: string) => ajustarId(`rk:${id}`);
