/**
 * Monta uma página: front-matter → layout → componentes <x-*> → SEO → HTML final.
 */
import * as cheerio from 'cheerio';
import { minify } from 'html-minifier-terser';
import { components, componentNames, interpolate, partial, type RenderCtx } from './components.ts';
import { head, type PageMeta } from './seo.ts';
import { sprite, icon } from './icons.ts';
import { site, nav, topLinks, contactOptions, waLink, type NavLink } from './site.ts';
import { esc } from './seo.ts';

export type Assets = { criticalCss: string; mainCss: string; mainJs: string; fonts: string[] };

/** Front-matter em comentário HTML no topo: <!--- chave: valor ---> (JSON para listas). */
export function parsePage(src: string): { meta: Partial<PageMeta>; body: string } {
  const m = src.match(/^\s*<!---([\s\S]*?)--->/);
  if (!m) return { meta: {}, body: src };
  const meta: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0 || !line.trim()) continue;
    const key = line.slice(0, i).trim();
    const raw = line.slice(i + 1).trim();
    meta[key] = /^[[{]/.test(raw) || raw === 'true' || raw === 'false' || /^\d+(\.\d+)?$/.test(raw) ? JSON.parse(raw) : raw;
  }
  return { meta: meta as Partial<PageMeta>, body: src.slice(m[0].length) };
}

/** Posição do botão na página, para a medição de contatos (topo, meio, final, menu, flutuante). */
function position(el: cheerio.Cheerio<any>): string {
  if (el.closest('.hero, .page-hero').length) return 'topo';
  if (el.closest('.cta-final').length) return 'final';
  if (el.closest('.header, .topbar').length) return 'menu';
  if (el.closest('.footer').length) return 'rodape';
  if (el.is('[data-wa-float]')) return 'flutuante';
  return el.closest('section[id]').attr('id') ?? el.closest('section').find('h2').first().attr('id') ?? 'meio';
}

const selfClosing = (html: string) => html.replace(/<(x-[a-z-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');

function navHtml(ctx: RenderCtx) {
  ['chevron-down', 'chevron-right'].forEach((i) => ctx.icons.add(i));
  const ic = (name: string) => { ctx.icons.add(name); return icon(name); };
  const li = (l: NavLink) => `<li><a href="${l.href}">${icon('chevron-right')}<span>${l.label}</span></a></li>`;
  return nav
    .map((item, n) => {
      const label = `${ic(item.icon)}<span>${item.label}</span>`;
      if (!item.columns && !item.links) return `<li class="nav__item"><a class="nav__link" href="${item.href}">${label}</a></li>`;
      const id = `submenu-${n}`;
      const overview = item.overview ? `<a class="nav__overview" href="${item.overview.href}">${icon('chevron-right')}<span>${item.overview.label}</span></a>` : '';
      const body = item.columns
        ? `<div class="nav__cols">${item.columns.map((col) => `<div class="nav__col"><p class="nav__col-title">${col.title}</p><ul>${col.links.map(li).join('')}</ul></div>`).join('')}</div>`
        : `<ul class="nav__list">${item.links!.map(li).join('')}</ul>`;
      return `<li class="nav__item nav__has-sub">
  <a class="nav__link" href="${item.href}">${label}</a>
  <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="${id}"><span class="sr-only">Abrir submenu ${item.label}</span>${icon('chevron-down')}</button>
  <div class="nav__sub${item.columns ? ' nav__sub--cols' : ''}" id="${id}"><p class="nav__sub-head" aria-hidden="true">${icon(item.icon)}${item.label}</p>${overview}${body}</div>
</li>`;
    })
    .join('');
}

/** Opções do seletor de atendimento: cada uma abre o WhatsApp com a mensagem pronta. */
function atendHtml(ctx: RenderCtx) {
  ctx.icons.add('chevron-right');
  return contactOptions
    .map((o) => { ctx.icons.add(o.icon); return `<li><a data-wa="${esc(o.message)}" data-service="${o.service}" data-pos="seletor">${icon(o.icon)}<span>${o.label}</span>${icon('chevron-right', 'atend__go')}</a></li>`; })
    .join('');
}

export async function renderPage(meta: PageMeta, body: string, assets: Assets, extraVars: Record<string, unknown> = {}) {
  const ctx: RenderCtx = { meta, icons: new Set(['whatsapp', 'phone', 'menu', 'x', 'instagram', 'facebook', 'tiktok', 'youtube', 'map-pin', 'clock', 'mail']), vars: {} };
  ctx.vars = {
    site,
    page: meta,
    year: new Date().getFullYear(),
    wa: waLink(),
    nav: navHtml(ctx),
    topLinks: topLinks.map((l) => `<a href="${l.href}">${l.label}</a>`).join(''),
    atendOptions: atendHtml(ctx),
    ...extraVars,
  };

  const bodyHtml = interpolate(selfClosing(body), ctx.vars);
  const doc = `<!doctype html><html lang="${site.lang}"><head></head><body class="${meta.bodyClass ?? ''}">
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<x-include src="header"></x-include>
<main id="conteudo" tabindex="-1">${bodyHtml}</main>
<x-include src="footer"></x-include>
<x-include src="whatsapp-float"></x-include>
<x-include src="atendimento"></x-include>
</body></html>`;

  const $ = cheerio.load(selfClosing(doc));

  // Expande componentes até não sobrar nenhum <x-*> (componentes podem gerar outros).
  const selector = componentNames.join(',');
  for (let pass = 0; pass < 8; pass++) {
    const els = $(selector).toArray();
    if (!els.length) break;
    // Processa de dentro para fora não é necessário: cada passada resolve o nível atual.
    await Promise.all(
      els.map(async (node) => {
        const el = $(node);
        if (!el.parents('html').length) return; // já substituído por um pai
        const html = await components[(node as unknown as { tagName: string }).tagName](($ as unknown) as cheerio.CheerioAPI, el, ctx);
        el.replaceWith(selfClosing(interpolate(html, ctx.vars)));
      }),
    );
  }
  const left = $('*').toArray().filter((n) => n.type === 'tag' && (n as unknown as { tagName: string }).tagName.startsWith('x-')) as unknown as { tagName: string }[];
  if (left.length) throw new Error(`Componente desconhecido: <${left[0].tagName}> em ${meta.path}`);

  // Botões "Entrar em contato" / "Atendimento": abrem o seletor de atendimento (<dialog id="atendimento">).
  // Invoker Commands nativos; o módulo atendimento.ts cobre navegadores sem suporte.
  $('[data-atendimento]').each((_, node) => {
    let el: cheerio.Cheerio<any> = $(node);
    if ((node as unknown as { tagName: string }).tagName !== 'button') {
      const attrs = { ...(el.attr() ?? {}) };
      delete attrs.href;
      const btn = $('<button></button>').attr(attrs).html(el.html() ?? '');
      el.replaceWith(btn);
      el = btn;
    }
    el.attr({ type: 'button', commandfor: 'atendimento', command: 'show-modal', 'aria-haspopup': 'dialog' });
    if (!el.attr('data-pos')) el.attr('data-pos', position(el));
  });

  // Links de WhatsApp com mensagem contextual: <a data-wa="mensagem">.
  // data-service e data-pos alimentam a medição por serviço e posição do botão (analytics.ts).
  $('a[data-wa]').each((_, a) => {
    const el = $(a);
    el.attr('href', waLink(el.attr('data-wa') || undefined));
    el.attr({ target: '_blank', rel: 'noopener', 'data-track': 'whatsapp' });
    if (!el.attr('data-service')) el.attr('data-service', meta.service ?? (meta.type === 'home' ? 'home' : 'geral'));
    if (!el.attr('data-pos')) el.attr('data-pos', position(el));
    el.removeAttr('data-wa');
  });

  // Links externos seguros
  $('a[target="_blank"]').each((_, a) => {
    const rel = new Set(($(a).attr('rel') ?? '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    $(a).attr('rel', [...rel].join(' '));
  });

  // Item de menu ativo
  $('.nav a, .footer a').each((_, a) => {
    const href = $(a).attr('href');
    if (href === meta.path) $(a).attr('aria-current', 'page');
  });
  // Item com submenu fica ativo quando a página está entre os seus links (ex.: Laboratório e Castração → Clínica)
  $('.nav__has-sub').each((_, li) => {
    const paths = $(li).find('a').map((_, a) => ($(a).attr('href') ?? '').split('#')[0]).get();
    if (paths.includes(meta.path)) $(li).children('.nav__link').addClass('is-active');
  });

  // Auditoria leve de semântica
  const h1 = $('h1').length;
  if (h1 !== 1) console.warn(`⚠ ${meta.path}: ${h1} <h1> (esperado 1)`);
  $('img:not([alt])').each((_, img) => console.warn(`⚠ ${meta.path}: <img> sem alt`, $(img).attr('src')));

  // FAQ visível → FAQPage (o schema reflete exatamente o texto da página)
  const faq = $('details.faq__item')
    .toArray()
    .map((d) => ({ q: $(d).find('summary').first().text().trim(), a: $(d).find('.faq__answer').text().replace(/\s+/g, ' ').trim() }));
  if (faq.length) meta.faq = faq;

  // Sprite só com os ícones usados
  $('svg use').each((_, u) => {
    const id = $(u).attr('href')?.replace('#i-', '');
    if (id) ctx.icons.add(id);
  });
  $('body').prepend(sprite(ctx.icons));

  $('head').html(head(meta, assets));
  $('body').append(`<script type="module" src="${assets.mainJs}"></script>`);

  const out = await minify('<!doctype html>' + $.html().replace(/^<!DOCTYPE html>/i, ''), {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    minifyJS: false,
    minifyCSS: false,
    removeRedundantAttributes: true,
    sortAttributes: false,
    keepClosingSlash: false,
    decodeEntities: true,
  });
  return out;
}

export { partial };
