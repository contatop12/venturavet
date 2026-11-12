/**
 * Monta uma página: front-matter → layout → componentes <x-*> → SEO → HTML final.
 */
import * as cheerio from 'cheerio';
import { minify } from 'html-minifier-terser';
import { components, componentNames, interpolate, partial, type RenderCtx } from './components.ts';
import { head, type PageMeta } from './seo.ts';
import { sprite, icon } from './icons.ts';
import { site, services, nav, waLink, svc } from './site.ts';

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

const selfClosing = (html: string) => html.replace(/<(x-[a-z-]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');

function navHtml(ctx: RenderCtx) {
  ctx.icons.add('chevron-down');
  services.forEach((s) => ctx.icons.add(s.icon));
  return nav
    .map((item) => {
      if (!item.children) return `<li><a class="nav__link" href="${item.href}">${item.label}</a></li>`;
      return `<li class="nav__has-sub">
  <a class="nav__link" href="${item.href}">${item.label}</a>
  <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="sub-servicos"><span class="sr-only">Abrir submenu de serviços</span>${icon('chevron-down')}</button>
  <div class="nav__sub" id="sub-servicos"><ul>${item.children
    .filter((c) => c.group === 'principal')
    .map((c) => `<li><a href="${c.href}">${icon(c.icon)}<span><strong>${c.label}</strong><small>${c.short}</small></span></a></li>`)
    .join('')}</ul>
    <p class="nav__sub-title">Outros serviços <small>(vagas limitadas)</small></p>
    <ul class="nav__sub-mini">${item.children
    .filter((c) => c.group === 'outros')
    .map((c) => `<li><a href="${c.href}">${icon(c.icon)}<span>${c.label}</span></a></li>`)
    .join('')}</ul></div>
</li>`;
    })
    .join('');
}

export async function renderPage(meta: PageMeta, body: string, assets: Assets, extraVars: Record<string, unknown> = {}) {
  const ctx: RenderCtx = { meta, icons: new Set(['whatsapp', 'phone', 'menu', 'x', 'instagram', 'facebook', 'linkedin', 'youtube', 'map-pin', 'clock', 'mail']), vars: {} };
  ctx.vars = {
    site,
    page: meta,
    year: new Date().getFullYear(),
    wa: waLink(),
    waDayCare: waLink(svc('day-care-e-hotel').waMessage),
    nav: navHtml(ctx),
    ...extraVars,
  };

  const bodyHtml = interpolate(selfClosing(body), ctx.vars);
  const doc = `<!doctype html><html lang="${site.lang}"><head></head><body class="${meta.bodyClass ?? ''}">
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<x-include src="header"></x-include>
<main id="conteudo" tabindex="-1">${bodyHtml}</main>
<x-include src="footer"></x-include>
<x-include src="whatsapp-float"></x-include>
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

  // Links de WhatsApp com mensagem contextual: <a data-wa="mensagem">
  $('a[data-wa]').each((_, a) => {
    const el = $(a);
    el.attr('href', waLink(el.attr('data-wa') || undefined));
    el.attr({ target: '_blank', rel: 'noopener', 'data-track': 'whatsapp' });
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
  // "Serviços" fica ativo nas páginas de serviço — menos na Castração, que tem item próprio no menu
  const ownNavItem = nav.some((item) => !item.children && item.href === meta.path);
  if ((services.some((s) => s.path === meta.path) && !ownNavItem) || meta.path === '/servicos/') $('.nav__has-sub > .nav__link').addClass('is-active');
  if (meta.type === 'post' || meta.type === 'category') $('.nav a[href="/blog/"]').addClass('is-active');

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
