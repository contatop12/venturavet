/**
 * Componentes de build: tags <x-*> escritas nas páginas HTML e trocadas
 * por HTML final na compilação. Nada disso roda no navegador.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CheerioAPI } from 'cheerio';
import { getImage } from './images.ts';
import { icon } from './icons.ts';
import { paths } from './paths.ts';
import { site, services, reviews, categories, waLink, areas, team } from './site.ts';
import { getPosts, formatDate, categoryName, type Post } from './posts.ts';
import { esc, type PageMeta } from './seo.ts';

export type RenderCtx = {
  meta: PageMeta;
  icons: Set<string>;
  vars: Record<string, unknown>;
};

const attr = (v: string | undefined) => (v == null ? '' : esc(v));
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function interpolate(tpl: string, vars: Record<string, unknown>): string {
  const lookup = (key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], vars);
  return tpl
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, k) => String(lookup(k) ?? ''))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => {
      const v = lookup(k);
      if (v === undefined) throw new Error(`Variável de template indefinida: ${m}`);
      return esc(String(v));
    });
}

export function partial(name: string, vars: Record<string, unknown>) {
  return interpolate(readFileSync(join(paths.partials, `${name}.html`), 'utf8'), vars);
}

function stars(ctx: RenderCtx, n = 5) {
  ctx.icons.add('star-fill');
  return `<span class="stars" role="img" aria-label="${n} de 5 estrelas">${icon('star-fill').repeat(n)}</span>`;
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const monthYear = (iso: string) => {
  const m = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  const d = new Date(iso + 'T12:00:00Z');
  return `${m[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
};

export function postCard(p: Post, ctx: RenderCtx, opts: { sizes?: string; heading?: string } = {}) {
  const h = opts.heading ?? 'h3';
  ctx.icons.add('clock');
  return `<article class="post-card" data-cats="${p.categories.join(' ')}" data-title="${attr(p.title.toLowerCase())}" data-date="${p.datePublished}">
  <a class="post-card__link" href="${p.path}">
    ${p.image ? `<x-img class="post-card__media" src="${p.image}" alt="" decorative widths="360,540,720" sizes="${opts.sizes ?? '(min-width: 1100px) 360px, (min-width: 700px) 45vw, 100vw'}"></x-img>` : ''}
    <span class="post-card__body">
      <span class="post-card__cat">${esc(categoryName(p.categories.find((c) => c !== 'dicas-e-curiosidades') ?? p.categories[0] ?? 'sem-categoria'))}</span>
      <${h} class="post-card__title">${esc(p.title.replace(/\.+$/, ''))}</${h}>
      <span class="post-card__meta"><time datetime="${p.datePublished}">${formatDate(p.datePublished)}</time><span>${icon('clock')} ${p.readingMinutes} min de leitura</span></span>
    </span>
  </a>
</article>`;
}

type Component = ($: CheerioAPI, el: ReturnType<CheerioAPI>, ctx: RenderCtx) => string | Promise<string>;

export const components: Record<string, Component> = {
  'x-include': ($, el, ctx) => partial(el.attr('src')!, ctx.vars),

  /** Conteúdo bruto versionado em content/ (ex.: textos legais importados). */
  'x-content': ($, el) => readFileSync(join(paths.root, 'content', el.attr('src')!), 'utf8'),

  'x-icon': ($, el, ctx) => {
    const name = el.attr('name')!;
    ctx.icons.add(name);
    return icon(name, el.attr('class'));
  },

  'x-stars': ($, el, ctx) => stars(ctx, Number(el.attr('n') ?? 5)),

  'x-img': async ($, el, ctx) => {
    const src = el.attr('src')!;
    const decorative = el.attr('decorative') !== undefined;
    const alt = el.attr('alt');
    if (alt === undefined && !decorative) throw new Error(`<x-img src="${src}"> sem alt (use decorative para imagens decorativas)`);
    const widths = el.attr('widths')?.split(',').map(Number);
    const info = await getImage(src, widths);
    const sizes = el.attr('sizes') ?? '100vw';
    const priority = el.attr('priority') !== undefined;
    const eager = priority || el.attr('eager') !== undefined;
    if (priority && !ctx.meta.preloadImage) ctx.meta.preloadImage = { avif: info.avif, sizes };
    const cls = el.attr('class');
    const imgCls = el.attr('img-class');
    const data = Object.entries(el.attr() ?? {})
      .filter(([k]) => k.startsWith('data-') || k === 'style')
      .map(([k, v]) => ` ${k}="${attr(v)}"`)
      .join('');
    return `<picture${cls ? ` class="${cls}"` : ''}${data}><source type="image/avif" srcset="${info.avif}" sizes="${sizes}"><source type="image/webp" srcset="${info.webp}" sizes="${sizes}"><img src="${info.fallback}" width="${info.width}" height="${info.height}" alt="${decorative ? '' : attr(alt)}"${imgCls ? ` class="${imgCls}"` : ''} ${priority ? 'fetchpriority="high" ' : ''}loading="${eager ? 'eager' : 'lazy'}" decoding="async"></picture>`;
  },

  'x-breadcrumbs': ($, el, ctx) => {
    const items: [string, string?][] = [['Início', '/'], ...(ctx.meta.breadcrumb ?? [])];
    return `<nav class="crumbs" aria-label="Você está em"><ol>${items
      .map(([name, href], i) => (i === items.length - 1 ? `<li><span aria-current="page">${esc(name)}</span></li>` : `<li><a href="${href}">${esc(name)}</a></li>`))
      .join('')}</ol></nav>`;
  },

  'x-services-index': ($, el, ctx) => {
    ctx.icons.add('arrow-up-right');
    // group="outros": serviços com poucas vagas, em cartões compactos (menos destaque)
    if (el.attr('group') === 'outros') {
      const list = services.filter((s) => s.group === 'outros');
      list.forEach((s) => ctx.icons.add(s.icon));
      return `<ul class="svc-mini">${list
        .map((s) => `<li><a class="svc-mini__link" href="${s.path}">${icon(s.icon)}<span><strong>${esc(s.navName)}</strong><small>${esc(s.short)}</small></span></a></li>`)
        .join('')}</ul>`;
    }
    return `<ul class="svc-index" data-svc-index>${services
      .filter((s) => s.group === 'principal')
      .map(
        (s) => `<li class="svc-index__item">
  <a class="svc-index__link" href="${s.path}">
    <span class="svc-index__name">${esc(s.name)}</span>
    <span class="svc-index__desc">${esc(s.short)}</span>
    <span class="svc-index__go" aria-hidden="true">${icon('arrow-up-right')}</span>
  </a>
  <x-img class="svc-index__img" src="${s.image}" alt="${attr(s.imageAlt)}" widths="360,540,720" sizes="(min-width: 960px) 340px, 30vw"></x-img>
</li>`,
      )
      .join('')}</ul>`;
  },

  'x-service-nav': ($, el, ctx) => {
    const current = el.attr('current');
    services.forEach((s) => ctx.icons.add(s.icon));
    return `<nav class="svc-nav" aria-label="Outros serviços"><p class="svc-nav__title">Também na Ventura</p><ul>${services
      .filter((s) => s.slug !== current)
      .map((s) => `<li><a href="${s.path}">${icon(s.icon)}<span><strong>${esc(s.navName)}</strong><small>${esc(s.short)}</small></span></a></li>`)
      .join('')}</ul></nav>`;
  },

  'x-reviews': ($, el, ctx) => {
    ctx.icons.add('google');
    const cards = reviews
      .map(
        (r) => `<li class="review"><figure>
  ${stars(ctx, r.rating)}
  <blockquote><p>${esc(r.text)}</p></blockquote>
  <figcaption><span class="review__avatar" aria-hidden="true">${initials(r.author)}</span><span><strong>${esc(r.author)}</strong><time datetime="${r.date}">${monthYear(r.date)}, no Google</time></span></figcaption>
</figure></li>`,
      )
      .join('');
    return `<div class="reviews">
  <div class="reviews__summary">
    <p class="reviews__score">${icon('google', 'reviews__g')}<span>${stars(ctx)}<strong>${site.google.reviewCount} avaliações no Google</strong></span></p>
    <p class="reviews__links"><a href="${site.google.reviewsUrl}" target="_blank" rel="noopener">Ler todas no Google</a><a href="${site.google.writeReviewUrl}" target="_blank" rel="noopener">Avaliar a Ventura</a></p>
  </div>
  <div class="reviews__viewport" data-marquee tabindex="0" role="region" aria-label="Avaliações de clientes no Google">
    <ul class="reviews__track">${cards}</ul>
  </div>
</div>`;
  },

  'x-latest-posts': ($, el, ctx) => {
    const n = Number(el.attr('count') ?? 3);
    const cat = el.attr('category');
    const list = getPosts().filter((p) => !cat || p.categories.includes(cat)).slice(0, n);
    return `<div class="post-grid">${list.map((p) => postCard(p, ctx)).join('')}</div>`;
  },

  'x-blog-grid': ($, el, ctx) => {
    const cat = el.attr('category');
    const posts = getPosts().filter((p) => !cat || p.categories.includes(cat));
    ctx.meta.itemList = posts.map((p) => ({ name: p.title, url: p.path }));
    ctx.icons.add('search');
    const counts = Object.keys(categories)
      .map((c) => [c, getPosts().filter((p) => p.categories.includes(c)).length] as const)
      .filter(([, n]) => n > 0);
    const chips = [`<li><a class="chip" href="/blog/"${!cat ? ' aria-current="page"' : ''} data-filter="">Todos <span>${getPosts().length}</span></a></li>`]
      .concat(counts.map(([c, n]) => `<li><a class="chip" href="/category/${c}/"${cat === c ? ' aria-current="page"' : ''} data-filter="${c}">${esc(categoryName(c))} <span>${n}</span></a></li>`))
      .join('');
    return `<div class="blog-tools">
  <nav aria-label="Categorias do blog"><ul class="chips">${chips}</ul></nav>
  <label class="search"><span class="sr-only">Buscar no blog</span>${icon('search')}<input type="search" placeholder="Buscar artigo, ex.: vacina, castração" data-blog-search autocomplete="off"></label>
</div>
<p class="blog-empty" data-blog-empty hidden>Nenhum artigo encontrado. Tente outra palavra ou <a href="${waLink('Olá! Tenho uma dúvida sobre o meu pet.')}" target="_blank" rel="noopener">pergunte para a equipe pelo WhatsApp</a>.</p>
<div class="post-grid post-grid--all" data-blog-grid>${posts.map((p) => postCard(p, ctx, { heading: 'h2' })).join('')}</div>`;
  },

  'x-map': ($, el, ctx) => {
    ctx.meta.hasMap = true;
    ctx.icons.add('map-pin');
    const title = `Mapa: ${site.name}, ${site.address.full}`;
    return `<div class="map" data-map="${attr(site.google.embedUrl)}" data-map-title="${attr(title)}">
  <a class="map__fallback" href="${site.google.mapsUrl}" target="_blank" rel="noopener">${icon('map-pin')}<span>Abrir no Google Maps</span></a>
  <noscript><iframe src="${attr(site.google.embedUrl)}" title="${attr(title)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></noscript>
</div>`;
  },

  /** Vídeo otimizado por `npm run media:video`: pôster leve, só toca quando visível. */
  'x-video': ($, el) => {
    const name = el.attr('src')!;
    const alt = el.attr('alt') ?? '';
    const cls = el.attr('class');
    return `<video${cls ? ` class="${cls}"` : ''} data-autoplay muted loop playsinline preload="none" poster="/video/${name}.jpg" aria-label="${attr(alt)}"><source src="/video/${name}.webm" type="video/webm"><source src="/video/${name}.mp4" type="video/mp4"></video>`;
  },

  // Cartões dos especialistas (dados em `team`, site.ts). O CRMV só aparece quando está preenchido.
  'x-team': () => `<ul class="team">${team.map((t) => `<li class="team__card" id="${t.slug}">
  <x-img class="team__photo" src="${t.image}" alt="${attr(t.imageAlt)}" widths="360,540,720" sizes="(min-width: 1000px) 280px, (min-width: 640px) 30vw, 46vw"></x-img>
  <div class="team__body">
    <h3>${esc(t.name)}</h3>
    <p class="team__role">${esc(t.role)}</p>
    <p class="team__about">${esc(t.about)}</p>
    ${t.crmv ? `<p class="team__crmv">${esc(t.crmv)}</p>` : ''}
  </div>
</li>`).join('')}</ul>`,

  'x-youtube': ($, el, ctx) => {
    const id = el.attr('id')!;
    const title = el.attr('title') ?? 'Vídeo da Ventura Vet';
    ctx.icons.add('play-fill');
    // Shorts (vídeo vertical): usa a miniatura em retrato e a variante .yt--short
    if (el.attr('short') !== undefined) {
      return `<a class="yt yt--short" href="https://www.youtube.com/watch?v=${id}" data-yt="${id}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${id}/oar2.jpg" alt="${attr(title)}" width="405" height="720" loading="lazy" decoding="async"><span class="yt__play">${icon('play-fill')}<span class="sr-only">Assistir: ${esc(title)}</span></span></a>`;
    }
    return `<a class="yt" href="https://www.youtube.com/watch?v=${id}" data-yt="${id}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${attr(title)}" width="480" height="360" loading="lazy" decoding="async"><span class="yt__play">${icon('play-fill')}<span class="sr-only">Assistir: ${esc(title)}</span></span></a>`;
  },

  'x-nap': ($, el, ctx) => {
    ['map-pin', 'phone', 'whatsapp', 'mail'].forEach((i) => ctx.icons.add(i));
    return `<address class="nap">
  <a href="${site.google.mapsUrl}" target="_blank" rel="noopener">${icon('map-pin')}<span><strong>${esc(site.name)}</strong>${esc(site.address.street)} – ${esc(site.address.district)}<br>${esc(site.address.city)} – ${site.address.region}, CEP ${site.address.postalCode}</span></a>
  <a href="tel:${site.phone.e164}" data-track="phone">${icon('phone')}<span>Telefone <strong>${site.phone.display}</strong></span></a>
  <a href="${waLink()}" target="_blank" rel="noopener" data-track="whatsapp">${icon('whatsapp')}<span>WhatsApp <strong>${site.whatsapp.display}</strong></span></a>
  <a href="mailto:${site.email}">${icon('mail')}<span>E-mail <strong>${site.email}</strong></span></a>
</address>`;
  },

  /** Bairros atendidos (SEO local) — mesma lista do areaServed do JSON-LD. */
  'x-areas': ($, el, ctx) => {
    ctx.icons.add('map-pin');
    // detailed: um cartão por bairro, com distância aproximada e link de rota (página "Onde estamos")
    if (el.attr('detailed') !== undefined) {
      ctx.icons.add('navigation');
      const destination = encodeURIComponent(`${site.name}, ${site.address.full}`);
      return `<ul class="area-cards">${areas
        .map((a) => {
          const km = a.km.toLocaleString('pt-BR');
          const text = a.km === 0
            ? `É o nosso bairro: a clínica fica na ${esc(site.address.street)}, ${site.landmarks.metro}.`
            : `Para quem vem ${esc(a.from)}, a clínica fica a cerca de ${km} km de carro.`;
          const route = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${a.name}, São Paulo - SP`)}&destination=${destination}&destination_place_id=${site.google.placeId}`;
          const link = a.km === 0
            ? `<a href="${site.google.mapsUrl}" target="_blank" rel="noopener">${icon('navigation')}Ver a clínica no mapa</a>`
            : `<a href="${route}" target="_blank" rel="noopener">${icon('navigation')}Traçar rota ${esc(a.from)}</a>`;
          return `<li class="area-card" id="${slug(a.name)}"><h3>${icon('map-pin')}${esc(a.name)}</h3><p>${text}</p>${link}</li>`;
        })
        .join('')}</ul>`;
    }
    return `<ul class="areas" aria-label="Bairros atendidos">${areas.map((a) => `<li>${icon('map-pin')}${esc(a.name)}</li>`).join('')}</ul>`;
  },

  'x-hours': ($, el, ctx) => {
    ctx.icons.add('clock');
    return `<dl class="hours">
  <div><dt>Clínica e Laboratório</dt><dd>${esc(site.hours.clinicDisplay)}</dd></div>
  <div><dt>Banho e Tosa</dt><dd>${esc(site.hours.groomingDisplay)}</dd></div>
  <div><dt>Day Care</dt><dd>${esc(site.hours.daycareDisplay)}</dd></div>
</dl>`;
  },
};

export const componentNames = Object.keys(components);
