// A Rankeando post body made ready for the page (HTMLRewriter: runs in the Worker only). The body is
// signed by Rankeando; this is defence in depth: what a page body must not carry is dropped
// (scripts, frames other than YouTube's privacy-enhanced embed, forms, event handlers, javascript: and
// data: URLs), headings get ids the way the site's Markdown posts do, and images load lazily.
import { toc, type Conteudo } from './render';

const FORA = 'script,style,link,meta,base,object,embed,applet,frame,frameset,iframe,form,input,button,textarea,select,option,noscript,template,svg,math';
const IFRAME_OK = /^https:\/\/www\.youtube-nocookie\.com\/embed\//;
const COM_URL = new Set(['href', 'src', 'srcset', 'xlink:href', 'action', 'formaction', 'poster', 'background', 'cite', 'data']);
const IMG_DATA = /^data:image\/(?:png|jpe?g|gif|webp|avif);/i;
const TITULOS = 'h1,h2,h3,h4,h5,h6';

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodificar = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] !== '#') return ENTIDADES[e.toLowerCase()] ?? m;
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
  });
/** What the browser reads as the URL scheme: entities decoded, controls and spaces out. */
const esquema = (v: string) => decodificar(v).replace(/[\u0000- ]/g, '').toLowerCase();

/** Heading ids as github-slugger (Astro's Markdown) makes them: lowercase, punctuation out, spaces to hyphens, repeats numbered. */
function slugger() {
  const vistos: Record<string, number> = {};
  return (texto: string) => {
    const original = texto.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\p{Pc} -]/gu, '').replace(/ /g, '-');
    let slug = original;
    while (Object.hasOwn(vistos, slug)) {
      vistos[original]++;
      slug = `${original}-${vistos[original]}`;
    }
    vistos[slug] = 0;
    return slug;
  };
}

const passar = (html: string, r: HTMLRewriter) => r.transform(new Response(html)).text();

export async function prepararConteudo(html: string): Promise<Conteudo> {
  const limpo = await passar(
    html,
    new HTMLRewriter()
      .on(FORA, {
        element(el) {
          if (el.tagName === 'iframe' && IFRAME_OK.test(el.getAttribute('src') ?? '')) return;
          el.remove();
        },
      })
      .on('*', {
        element(el) {
          for (const [nome, valor] of [...el.attributes]) {
            const n = nome.toLowerCase();
            const url = COM_URL.has(n) && /^(?:javascript|vbscript|data):/.test(esquema(valor));
            if (n.startsWith('on') || n === 'srcdoc' || (url && !(n === 'src' && el.tagName === 'img' && IMG_DATA.test(esquema(valor))))) {
              el.removeAttribute(nome);
            }
          }
        },
      })
      .on('img', {
        element(el) {
          if (!el.hasAttribute('loading')) el.setAttribute('loading', 'lazy');
          if (!el.hasAttribute('decoding')) el.setAttribute('decoding', 'async');
        },
      })
      .on('a[target]', { element(el) { el.setAttribute('rel', 'noopener'); } }),
  );

  // Headings of the cleaned body, in order: level (the page's h1 is the title, so h1 counts as h2), text as HTML.
  const titulos: { depth: number; id: string | null; texto: string }[] = [];
  await passar(
    limpo,
    new HTMLRewriter().on(TITULOS, {
      element(el) {
        titulos.push({ depth: Math.max(2, Number(el.tagName.slice(1))), id: el.getAttribute('id'), texto: '' });
      },
      text(t) {
        const atual = titulos.at(-1);
        if (atual) atual.texto += t.text;
      },
    }),
  );
  const slug = slugger();
  const lista = titulos.map((t) => {
    const texto = t.texto.replace(/\s+/g, ' ').trim();
    return { depth: t.depth, text: texto, slug: t.id ?? slug(decodificar(texto)) };
  });

  let i = 0;
  const final = await passar(
    limpo,
    new HTMLRewriter().on(TITULOS, {
      element(el) {
        const t = lista[i++];
        if (el.tagName === 'h1') el.tagName = 'h2';
        if (t && !el.hasAttribute('id')) el.setAttribute('id', t.slug);
      },
    }),
  );
  return { html: final, toc: toc(lista.filter((t) => t.text)) };
}
