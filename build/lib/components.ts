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
import { site, services, reviews, categories, waLink, areas, team, member } from './site.ts';
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

  /**
   * Cartões de serviços com foto. Sem atributo: os sete serviços da home (três grandes + quatro menores).
   * group="clinica" | "exame" | "especie": cartões compactos do grupo (ex.: na Clínica e em /servicos/).
   */
  'x-services-index': ($, el, ctx) => {
    ctx.icons.add('arrow-right');
    const group = el.attr('group');
    if (group) {
      const list = services.filter((s) => s.group === group && s.slug !== el.attr('exclude'));
      list.forEach((s) => ctx.icons.add(s.icon));
      return `<ul class="svc-mini">${list
        .map((s) => `<li><a class="svc-mini__link" href="${s.path}">${icon(s.icon)}<span><strong>${esc(s.navName)}</strong><small>${esc(s.short)}</small></span></a></li>`)
        .join('')}</ul>`;
    }
    const heading = el.attr('heading') ?? 'h3';
    return `<ul class="svc-cards">${services
      .filter((s) => s.group === 'principal')
      .map(
        (s, i) => `<li class="svc-card${i < 3 ? ' svc-card--lg' : ''}" data-reveal style="--i:${i % 4}">
  <a class="svc-card__link" href="${s.path}">
    <x-img class="svc-card__img" src="${s.image}" alt="${attr(s.imageAlt)}" widths="360,540,720" sizes="${i < 3 ? '(min-width: 1000px) 380px, (min-width: 640px) 45vw, 92vw' : '(min-width: 1000px) 280px, (min-width: 640px) 45vw, 92vw'}"></x-img>
    <span class="svc-card__body">
      <${heading} class="svc-card__name">${esc(s.name)}</${heading}>
      <span class="svc-card__desc">${esc(s.short)}</span>
      <span class="svc-card__go">${esc(s.cta)}${icon('arrow-right')}</span>
    </span>
  </a>
</li>`,
      )
      .join('')}</ul>`;
  },

  /** "Também no Ventura": os sete serviços principais (menos o atual), no fim das páginas de serviço. */
  'x-service-nav': ($, el, ctx) => {
    const current = el.attr('current');
    const list = services.filter((s) => s.slug !== current && s.group === 'principal');
    list.forEach((s) => ctx.icons.add(s.icon));
    return `<nav class="svc-nav" aria-label="Outros serviços"><p class="svc-nav__title">Também no Ventura</p><ul>${list
      .map((s) => `<li><a href="${s.path}">${icon(s.icon)}<span><strong>${esc(s.navName)}</strong><small>${esc(s.short)}</small></span></a></li>`)
      .join('')}</ul></nav>`;
  },

  'x-reviews': ($, el, ctx) => {
    ['google', 'chevron-left', 'chevron-right'].forEach((i) => ctx.icons.add(i));
    // Banho e tosa: só os relatos de banho e tosa. Home: todos. Demais páginas: os relatos gerais,
    // sem os de banho e tosa (as specs pedem relatos ligados ao serviço da página).
    const svcSlug = ctx.meta.service;
    const list = ctx.meta.type === 'home' ? reviews
      : reviews.some((r) => r.service === svcSlug) ? reviews.filter((r) => r.service === svcSlug)
      : reviews.filter((r) => !r.service);
    const cards = list
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
    <p class="reviews__links"><a href="${site.google.reviewsUrl}" target="_blank" rel="noopener">Ler todas no Google</a><a href="${site.google.writeReviewUrl}" target="_blank" rel="noopener">Avaliar o Ventura</a></p>
    <p class="reviews__nav"><button class="reviews__btn" type="button" data-reviews-prev aria-label="Avaliações anteriores">${icon('chevron-left')}</button><button class="reviews__btn" type="button" data-reviews-next aria-label="Próximas avaliações">${icon('chevron-right')}</button></p>
  </div>
  <div class="reviews__viewport" data-marquee tabindex="0" role="region" aria-label="Avaliações de clientes no Google">
    <ul class="reviews__track">${cards}</ul>
  </div>
</div>`;
  },

  'x-latest-posts': ($, el, ctx) => {
    const n = Number(el.attr('count') ?? 3);
    const cat = el.attr('category');
    // slugs="a,b,c": escolhe os artigos (na ordem dada); sem isso, os mais recentes
    const slugs = el.attr('slugs')?.split(',').map((x) => x.trim());
    const list = slugs
      ? slugs.map((sl) => { const p = getPosts().find((x) => x.slug === sl); if (!p) throw new Error(`Post inexistente: ${sl}`); return p; })
      : getPosts().filter((p) => !cat || p.categories.includes(cat)).slice(0, n);
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
  // `compact`: foto, nome, função e CRMV, com link para o perfil completo em /especialistas/ (evita repetir os textos).
  'x-team': ($, el) => el.attr('compact') !== undefined
    ? `<ul class="team team--compact">${team.map((t) => `<li class="team__card"><a class="team__link" href="/especialistas/#${t.slug}">
  <x-img class="team__photo" src="${t.image}" alt="${attr(t.imageAlt)}" widths="360,540" sizes="(min-width: 1000px) 230px, (min-width: 640px) 30vw, 46vw"></x-img>
  <span class="team__body"><strong class="team__name">${esc(t.name)}</strong><span class="team__role">${esc(t.role)}</span>${t.crmv ? `<span class="team__crmv">${esc(t.crmv)}</span>` : ''}</span>
</a></li>`).join('')}</ul>`
    : `<ul class="team">${team.map((t) => `<li class="team__card" id="${t.slug}">
  <x-img class="team__photo" src="${t.image}" alt="${attr(t.imageAlt)}" widths="360,540,720" sizes="(min-width: 1000px) 280px, (min-width: 640px) 30vw, 46vw"></x-img>
  <div class="team__body">
    <h3>${esc(t.name)}</h3>
    <p class="team__role">${esc(t.role)}</p>
    <p class="team__about">${esc(t.about)}</p>
    ${t.education ? `<p class="team__edu">${esc(t.education)}</p>` : ''}
    ${t.crmv ? `<p class="team__crmv">${esc(t.crmv)}</p>` : ''}
    <p class="team__cta"><a class="btn btn--ghost btn--sm" data-wa="${attr(`Olá! Vim pelo site do Ventura Vet e gostaria de consultar a disponibilidade de atendimento com ${t.name} (${t.role.toLowerCase()}).`)}" data-service="especialistas" data-pos="equipe"><x-icon name="whatsapp"></x-icon>Consultar disponibilidade</a></p>
  </div>
</li>`).join('')}</ul>`,

  /**
   * Selos da clínica (Cat Friendly Practice e DNA USP), com as artes oficiais.
   * Sem atributo: logos com uma linha de explicação. `compact`: só os logos (rodapé, heróis).
   * `only="cat"` ou `only="dna"`: um selo só. `tom="escuro"`: fundo escuro (DNA USP na versão negativa oficial, branca).
   */
  'x-selos': ($, el) => {
    const compact = el.attr('compact') !== undefined;
    const only = el.attr('only');
    const dark = el.attr('tom') === 'escuro';
    const all = [
      {
        key: 'cat', src: 'selo-cat-friendly-practice.png', alt: `Selo ${site.credentials.catFriendly}`, w: '360,540', sizes: compact ? '9rem' : '10rem',
        title: site.credentials.catFriendly, text: 'Clínica certificada no programa internacional de atendimento amigo dos gatos, com consultório exclusivo para felinos.',
      },
      {
        key: 'dna', src: dark ? 'selo-dna-usp-branco.png' : 'selo-dna-usp.png', alt: `Selo ${site.credentials.dnaUsp}`, w: '360', sizes: compact ? '5rem' : '7rem',
        title: site.credentials.dnaUsp, text: 'Empresa do grupo DNA USP, formado por empresas de alunos, ex-alunos e pesquisadores da Universidade de São Paulo.',
      },
    ].filter((s) => !only || s.key === only);
    return `<ul class="selos${compact ? ' selos--compact' : ''}${dark ? ' selos--escuro' : ''}">${all
      .map((s) => `<li class="selo selo--${s.key}"><x-img class="selo__logo" src="${s.src}" alt="${attr(s.alt)}" widths="${s.w}" sizes="${s.sizes}"></x-img>${compact ? '' : `<p><strong>${esc(s.title)}</strong>${esc(s.text)}</p>`}</li>`)
      .join('')}</ul>`;
  },

  /**
   * Bloco "Equipe" das páginas da Clínica Veterinária: apresentação, foto real da equipe (ou o perfil de quem atende),
   * faixa rolável com todos os médicos-veterinários (ordem de `team`) e os selos.
   * Atributos: titulo, id (padrão "equipe"), fundo="nevoa", foto, foto-alt, legenda,
   * video (nome do vídeo em /video/, no lugar da foto), video-alt,
   * destaque="slug,slug" (sobem para o início da faixa com o `rotulo`), perfil="slug" (cartão grande no lugar da foto),
   * perfil-msg (mensagem de WhatsApp do perfil), perfil-cta (rótulo do botão do perfil).
   * O conteúdo interno (parágrafos) substitui o texto padrão.
   */
  'x-equipe': ($, el, ctx) => {
    ['chevron-left', 'chevron-right', 'arrow-right', 'users-round', 'calendar-heart', 'graduation-cap', 'whatsapp'].forEach((i) => ctx.icons.add(i));
    const id = el.attr('id') ?? 'equipe';
    const titulo = el.attr('titulo') ?? 'Conheça a equipe do Ventura';
    const destaque = (el.attr('destaque') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    destaque.forEach(member);
    const rotulo = el.attr('rotulo') ?? 'Nesta área';
    const perfilSlug = el.attr('perfil');
    const lede = (el.html() ?? '').trim() || `<p>O Ventura atende cães e gatos no Paraíso desde ${site.foundingYear}. À frente da clínica está a ${esc(site.founder.name)}, médica-veterinária formada pela FMVZ-USP, com uma equipe de clínicos e especialistas que trabalham juntos no mesmo endereço.</p>`;
    const ordered = [...destaque.map(member), ...team.filter((t) => !destaque.includes(t.slug))];

    let side: string;
    if (perfilSlug) {
      const p = member(perfilSlug);
      const msg = el.attr('perfil-msg') ?? `Olá! Vim pelo site do Ventura Vet e gostaria de consultar a disponibilidade de atendimento com ${p.name}.`;
      side = `<article class="equipe-perfil" data-reveal style="--i:1">
  <x-img class="equipe-perfil__foto" src="${p.image}" alt="${attr(p.imageAlt)}" widths="360,540" sizes="(min-width: 860px) 15rem, 40vw"></x-img>
  <div class="equipe-perfil__body">
    <h3>${esc(p.name)}</h3>
    <p class="equipe-perfil__role">${esc(p.role)}</p>
    <p>${esc(p.about)}</p>
    ${p.crmv ? `<p class="equipe-perfil__crmv">${esc(p.crmv)}</p>` : ''}
    <p class="equipe-perfil__cta"><a class="btn btn--sm" data-wa="${attr(msg)}" data-service="especialistas" data-pos="equipe-perfil"><x-icon name="whatsapp"></x-icon>${esc(el.attr('perfil-cta') ?? 'Consultar agenda')}</a></p>
  </div>
</article>`;
    } else if (el.attr('video')) {
      side = `<figure class="equipe-bloco__foto equipe-bloco__foto--video" data-reveal style="--i:1">
  <x-video src="${attr(el.attr('video'))}" alt="${attr(el.attr('video-alt') ?? 'Equipe do Ventura Vet')}"></x-video>
  <figcaption>${esc(el.attr('legenda') ?? 'Equipe do Ventura na fachada da clínica, no Paraíso.')}</figcaption>
</figure>`;
    } else {
      const foto = el.attr('foto') ?? 'equipe-ventura-parede-verde.jpg';
      const alt = el.attr('foto-alt') ?? 'Equipe do Ventura Vet reunida em frente ao jardim vertical da recepção da clínica';
      const legenda = el.attr('legenda') ?? 'Equipe do Ventura na recepção da clínica, no Paraíso.';
      side = `<figure class="equipe-bloco__foto" data-reveal style="--i:1">
  <x-img src="${foto}" alt="${attr(alt)}" widths="540,720,960,1280" sizes="(min-width: 1100px) 560px, (min-width: 860px) 48vw, 92vw"></x-img>
  <figcaption>${esc(legenda)}</figcaption>
</figure>`;
    }

    const cards = ordered
      .map((t) => {
        const hl = destaque.includes(t.slug);
        return `<li class="equipe-card${hl ? ' equipe-card--destaque' : ''}"><a class="equipe-card__link" href="/especialistas/#${t.slug}">
  <x-img class="equipe-card__foto" src="${t.image}" alt="${attr(t.imageAlt)}" widths="360,540" sizes="(min-width: 860px) 13.5rem, 46vw"></x-img>
  <span class="equipe-card__body">${hl ? `<span class="equipe-card__rotulo">${esc(rotulo)}</span>` : ''}<strong class="equipe-card__nome">${esc(t.name)}</strong><span class="equipe-card__area">${esc(t.role)}</span>${t.crmv ? `<span class="equipe-card__crmv">${esc(t.crmv)}</span>` : ''}</span>
</a></li>`;
      })
      .join('');

    return `<section class="section equipe-bloco${el.attr('fundo') === 'nevoa' ? ' section--nevoa' : ''}" id="${id}" aria-labelledby="${id}-titulo">
  <div class="wrap">
    <div class="equipe-bloco__top${perfilSlug ? ' equipe-bloco__top--perfil' : ''}">
      <div class="equipe-bloco__intro">
        <p class="equipe-bloco__kicker" data-reveal>Equipe Ventura</p>
        <h2 id="${id}-titulo" data-reveal>${esc(titulo)}</h2>
        <div class="prose" data-reveal style="--i:1">${lede}</div>
        <ul class="equipe-bloco__fatos" data-reveal style="--i:2">
          <li>${icon('users-round')}<span><strong>${team.length} médicos-veterinários</strong> entre clínicos e especialistas</span></li>
          <li>${icon('calendar-heart')}<span><strong>No Paraíso desde ${site.foundingYear}</strong> no mesmo endereço</span></li>
          <li>${icon('graduation-cap')}<span><strong>Fundadora formada pela FMVZ-USP</strong> <span class="equipe-bloco__crmv">${esc(site.founder.crmv)}</span></span></li>
        </ul>
      </div>
      ${side}
    </div>
    <div class="equipe-carrossel" data-carousel>
      <div class="equipe-carrossel__head">
        <h3 class="equipe-carrossel__titulo">Médicos-veterinários do Ventura</h3>
        <p class="reviews__nav"><button class="reviews__btn" type="button" data-carousel-prev aria-label="Profissionais anteriores">${icon('chevron-left')}</button><button class="reviews__btn" type="button" data-carousel-next aria-label="Próximos profissionais">${icon('chevron-right')}</button></p>
      </div>
      <div class="equipe-carrossel__viewport" data-marquee tabindex="0" role="region" aria-label="Médicos-veterinários do Ventura">
        <ul class="equipe-carrossel__track">${cards}</ul>
      </div>
    </div>
    <div class="equipe-bloco__rodape">
      <x-selos></x-selos>
      <p class="equipe-bloco__acao"><a class="btn btn--ghost" href="/especialistas/">${icon('arrow-right')}Conhecer a equipe completa</a></p>
    </div>
  </div>
</section>`;
  },

  'x-youtube': ($, el, ctx) => {
    const id = el.attr('id')!;
    const title = el.attr('title') ?? 'Vídeo do Ventura Vet';
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
  <div><dt>Hotéis</dt><dd>${esc(site.hours.hotelDisplay)}</dd></div>
</dl>`;
  },

  /**
   * Bloco final laranja (mapa, endereço e horários). Sem conteúdo: texto geral do briefing da home.
   * Com conteúdo interno (h2, parágrafos e botões), usa o texto da página no lugar do geral.
   */
  'x-cta-final': ($, el, ctx) => {
    const custom = (el.html() ?? '').trim();
    const copy = custom || `<h2 id="cta-final-titulo">Seu pet merece o melhor, num só endereço.</h2>
        <p>No Ventura Vet, você encontra clínica veterinária para cães e gatos, consultas, vacinação, especialidades, cirurgias e castração, exames e laboratório, Day Care para cachorros, hotel para cães, hotel para gatos, natação e banho e tosa. Tudo na ${esc(site.address.street)}, no Paraíso, em São Paulo.</p>
        <p>Converse com nossa equipe para agendar um atendimento ou consultar a disponibilidade do serviço que seu pet precisa.</p>
        <div class="cta-final__actions">
          <button class="btn btn--dark" data-atendimento><x-icon name="whatsapp"></x-icon>Entrar em contato</button>
          <a class="btn btn--light" href="${site.google.mapsUrl}" target="_blank" rel="noopener"><x-icon name="map-pin"></x-icon>Como chegar</a>
        </div>`;
    const id = custom.match(/<h2[^>]*id="([^"]+)"/)?.[1] ?? 'cta-final-titulo';
    return `<section class="cta-final" aria-labelledby="${id}">
  <div class="wrap">
    <div class="cta-final__panel">
      <x-img class="cta-final__pets" src="caes-e-gatos-espiando.webp" alt="" decorative widths="540,960,1280" sizes="(min-width: 1100px) 640px, 90vw"></x-img>
      <div class="cta-final__copy">${copy}</div>
      <div class="cta-final__visit">
        <x-map></x-map>
        <div class="cta-final__info">
          <x-nap></x-nap>
          <x-hours></x-hours>
          <p class="cta-final__note">Clínica veterinária: atendimento em horário comercial. Hotéis: acompanhamento por monitores 24 horas, com horários específicos de entrada e saída.</p>
        </div>
      </div>
    </div>
  </div>
</section>`;
  },
};

export const componentNames = Object.keys(components);
