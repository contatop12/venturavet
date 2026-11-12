/**
 * Build completo do site estático → dist/
 *   npm run build
 */
import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';
import { bundleAsync, browserslistToTargets, Features } from 'lightningcss';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
import { paths } from './lib/paths.ts';
import { site, services, categories, svc, areas } from './lib/site.ts';
import { getPosts, resetPosts, relatedPosts, categoryName, formatDate } from './lib/posts.ts';
import { renderPage, parsePage, type Assets } from './lib/render.ts';
import { getImage, makeOgImage, makeAppIcons } from './lib/images.ts';
import { postCard, type RenderCtx } from './lib/components.ts';
import type { PageMeta } from './lib/seo.ts';
import { esc, abs } from './lib/seo.ts';

const isDev = process.argv.includes('--dev');
const hash = (b: string | Uint8Array) => createHash('sha1').update(b).digest('hex').slice(0, 10);
const targets = browserslistToTargets(['> 0.3% in BR', 'last 2 versions', 'not dead', 'iOS >= 15', 'Safari >= 15']);

async function write(file: string, data: string | Uint8Array) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, data);
}

const outFor = (p: string) => join(paths.dist, p === '/' ? 'index.html' : p.endsWith('/') ? `${p}index.html` : p);

async function buildCss() {
  const opts = { targets, minify: !isDev, drafts: { customMedia: true }, include: Features.Nesting | Features.MediaRangeSyntax, errorRecovery: false };
  const critical = await bundleAsync({ ...opts, filename: join(paths.css, 'critical.css') });
  const main = await bundleAsync({ ...opts, filename: join(paths.css, 'main.css') });
  const mainName = `/assets/main.${hash(main.code)}.css`;
  await write(join(paths.dist, mainName), main.code);
  return { criticalCss: Buffer.from(critical.code).toString(), mainCss: mainName };
}

async function buildJs() {
  const res = await esbuild.build({
    entryPoints: [join(paths.ts, 'main.ts')],
    bundle: true,
    splitting: true,
    format: 'esm',
    target: ['es2020', 'safari15'],
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
    outdir: paths.distAssets,
    entryNames: '[name].[hash]',
    chunkNames: 'chunks/[name].[hash]',
    metafile: true,
    define: { __GTM_ID__: JSON.stringify(site.analytics.gtm), __DEV__: String(isDev) },
    legalComments: 'none',
  });
  // Com code splitting, os import() dinâmicos também aparecem com entryPoint no metafile
  // (e a ordem varia entre Windows e Linux): procura explicitamente a saída de main.ts.
  const entry = Object.entries(res.metafile!.outputs).find(
    ([file, o]) => o.entryPoint?.replace(/\\/g, '/').endsWith('src/ts/main.ts') && file.endsWith('.js'),
  );
  if (!entry) throw new Error('Build JS: saída de src/ts/main.ts não encontrada no metafile');
  const url = '/' + entry[0].replace(/\\/g, '/').replace(/^dist\//, '');
  if (!/^\/assets\/main\.[\w-]+\.js$/.test(url)) throw new Error(`Build JS: entrada principal inesperada: ${url}`);
  return url;
}

async function copyFonts() {
  const out = join(paths.distAssets, 'fonts');
  await mkdir(out, { recursive: true });
  for (const f of await readdir(paths.fonts)) await copyFile(join(paths.fonts, f), join(out, f));
  return ['/assets/fonts/red-hat-display-italic.woff2', '/assets/fonts/red-hat-text.woff2'];
}

type BuiltPage = { meta: PageMeta; html: string; lastmod: string; images: string[] };

/**
 * Data da última alteração real da página, para o <lastmod> do sitemap: data do último commit
 * que tocou o arquivo. A data do arquivo em disco não serve — num clone novo (deploy pelo Git)
 * todos os arquivos ganham a data do clone e o sitemap diria que o site inteiro mudou a cada deploy.
 * Arquivo com alterações ainda não commitadas (ou fora do git) usa a data em disco.
 */
function lastModified(file: string, mtime: Date) {
  const git = (...args: string[]) => execFileSync('git', args, { cwd: paths.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    if (!git('status', '--porcelain', '--', file)) {
      const iso = git('log', '-1', '--format=%cI', '--', file);
      if (iso) return new Date(iso).toISOString();
    }
  } catch {
    /* sem git no ambiente de build: usa a data do arquivo */
  }
  return mtime.toISOString();
}

async function buildPages(assets: Assets) {
  const built: BuiltPage[] = [];
  const files = (await readdir(paths.pages)).filter((f) => f.endsWith('.html'));
  for (const f of files) {
    const file = join(paths.pages, f);
    const src = await readFile(file, 'utf8');
    const { meta: fm, body } = parsePage(src);
    const meta = { ...fm } as PageMeta & { ogSource?: string; imageSource?: string };
    if (!meta.path || !meta.title || !meta.description) throw new Error(`${f}: front-matter precisa de path, title e description`);
    const slug = meta.path === '/' ? 'home' : meta.path.replace(/\//g, '');
    if (meta.ogSource) meta.ogImage = await makeOgImage(meta.ogSource, slug || 'pagina');
    const images: string[] = [];
    if (meta.imageSource) {
      meta.image = (await getImage(meta.imageSource)).largest;
      images.push(meta.image);
    }
    const html = await renderPage(meta, body, assets);
    await write(outFor(meta.path), html);
    built.push({ meta, html, lastmod: lastModified(file, (await stat(file)).mtime), images });
  }
  return built;
}

/** Title de até ~65 caracteres: usa a parte antes de ":" quando o título original é longo. */
function seoTitle(raw: string) {
  const base = raw.replace(/\.+$/, '').trim();
  const brand = ' | Ventura Vet';
  if ((base + brand).length <= 65) return base + brand;
  if (base.length <= 65) return base;
  const head = base.split(/:\s/)[0];
  if (head.length >= 25 && head.length < base.length) return (head + brand).length <= 65 ? head + brand : head.slice(0, 65);
  return base.slice(0, 62).replace(/\s+\S*$/, '') + '…';
}

/** Description entre ~120 e ~160 caracteres, completando com o 1º parágrafo do texto. */
function seoDescription(desc: string, html: string) {
  const clip = (t: string) => (t.length <= 160 ? t : t.slice(0, 157).replace(/\s+\S*$/, '') + '…');
  const d = desc.replace(/\s+/g, ' ').trim();
  if (d.length >= 110) return clip(d);
  const first = cheerio.load(html, null, false)('p').first().text().replace(/\s+/g, ' ').trim();
  return clip(d ? `${d.replace(/\.?$/, '.')} ${first}` : first);
}

function slugify(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function buildPosts(assets: Assets) {
  const tpl = await readFile(join(paths.src, 'templates/post.html'), 'utf8');
  const built: BuiltPage[] = [];
  const posts = getPosts();
  for (const post of posts) {
    // Sumário automático a partir dos H2 + ids estáveis
    const $c = cheerio.load(post.content, null, false);
    const toc: { id: string; text: string }[] = [];
    const used = new Set<string>();
    $c('h2').each((_, h) => {
      let id = slugify($c(h).text()) || 'secao';
      while (used.has(id)) id += '-2';
      used.add(id);
      $c(h).attr('id', id);
      toc.push({ id, text: $c(h).text().trim() });
    });
    $c('table').each((_, t) => { $c(t).wrap('<div class="table-wrap" tabindex="0"></div>'); });

    const mainCat = post.categories.find((c) => c !== 'dicas-e-curiosidades') ?? post.categories[0];
    const service =
      /castra/.test(post.slug) ? svc('castracao')
      : mainCat === 'hotel' || mainCat === 'day-use' ? svc('day-care-e-hotel')
      : mainCat === 'pet-shop' ? svc('banho-e-tosa')
      : /exame|check-up|hemograma/.test(post.slug) ? svc('laboratorio')
      : svc('clinica-veterinaria');
    const ctx = { meta: {} as PageMeta, icons: new Set<string>(), vars: {} } as RenderCtx;
    const related = relatedPosts(post).map((p) => postCard(p, ctx)).join('');
    const image = post.image ? await getImage(post.image) : null;
    const ogImage = post.image ? await makeOgImage(post.image, `post-${post.slug.slice(0, 50)}`) : '/og/og-blog.jpg';

    const meta: PageMeta = {
      title: seoTitle(post.title),
      description: seoDescription(post.description, post.content),
      path: post.path,
      type: 'post',
      post,
      breadcrumb: [['Blog', '/blog/'], [categoryName(mainCat), `/category/${mainCat}/`], [post.title.replace(/\.+$/, '')]],
      ogImage,
      ogImageAlt: post.title,
      image: image?.largest,
      bodyClass: 'is-post',
      datePublished: post.datePublished,
      dateModified: post.dateModified,
    };
    const html = await renderPage(meta, tpl, assets, {
      post: { ...post, title: post.title.replace(/\.+$/, ''), content: $c.html() },
      postDate: formatDate(post.datePublished),
      postUpdated: post.dateModified && post.dateModified.slice(0, 10) !== post.datePublished.slice(0, 10) ? `Atualizado em ${formatDate(post.dateModified)}` : '',
      postCategory: categoryName(mainCat),
      postCategoryUrl: `/category/${mainCat}/`,
      postImage: post.image ? `<x-img class="article__cover" src="${post.image}" alt="${esc(post.title)}" priority sizes="(min-width: 900px) 820px, 100vw"></x-img>` : '',
      toc: toc.length > 2 ? `<nav class="toc" aria-label="Neste artigo"><p class="toc__title">Neste artigo</p><ol>${toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav>` : '',
      related,
      shareUrl: encodeURIComponent(abs(post.path)),
      shareText: encodeURIComponent(`${post.title} — ${abs(post.path)}`),
      ctaService: service,
    });
    await write(outFor(post.path), html);
    built.push({ meta, html, lastmod: post.dateModified || post.datePublished, images: image ? [image.largest] : [] });
  }
  return built;
}

async function buildCategories(assets: Assets) {
  const tpl = await readFile(join(paths.src, 'templates/category.html'), 'utf8');
  const built: BuiltPage[] = [];
  for (const [slug, name] of Object.entries(categories)) {
    const posts = getPosts().filter((p) => p.categories.includes(slug));
    if (!posts.length) continue;
    const meta: PageMeta = {
      title: `${name}: artigos sobre pets | Blog Ventura Vet`,
      description: `${posts.length} artigos de ${name.toLowerCase()} no blog da Ventura Vet, clínica veterinária no Paraíso (SP), com dicas de saúde e bem-estar para cães e gatos.`,
      path: `/category/${slug}/`,
      type: 'category',
      breadcrumb: [['Blog', '/blog/'], [name]],
      ogImage: '/og/og-blog.jpg',
      bodyClass: 'is-blog',
    };
    const html = await renderPage(meta, tpl, assets, { category: { slug, name, count: posts.length } });
    await write(outFor(meta.path), html);
    built.push({ meta, html, lastmod: posts[0].dateModified, images: [] });
  }
  return built;
}

/** Converte o <main> renderizado em Markdown simples (para llms-full.txt). */
function mainToMarkdown(html: string) {
  const $ = cheerio.load(html);
  const main = $('main');
  main.find('svg, script, style, form, .reviews__track [aria-hidden="true"], .svc-nav, .crumbs, .toc, .share, .post-grid, .map, noscript, [data-llms-skip]').remove();
  const out: string[] = [];
  main.find('h1, h2, h3, h4, p, li, dt, dd, summary, blockquote, figcaption').each((_, el) => {
    const $el = $(el);
    if ($el.parents('li, blockquote').length && el.tagName !== 'li') return;
    const text = $el.text().replace(/\s+/g, ' ').trim();
    if (!text) return;
    const t = el.tagName;
    if (t === 'h1') out.push(`# ${text}`);
    else if (t === 'h2') out.push(`\n## ${text}`);
    else if (t === 'h3' || t === 'summary') out.push(`\n### ${text}`);
    else if (t === 'h4') out.push(`\n#### ${text}`);
    else if (t === 'li' || t === 'dt') out.push(`- ${text}`);
    else if (t === 'blockquote') out.push(`> ${text}`);
    else out.push(text);
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

async function buildSeoFiles(all: BuiltPage[]) {
  const indexable = all.filter((p) => !p.meta.noindex);
  const pri = (p: BuiltPage) => p.meta.priority ?? (p.meta.type === 'post' ? 0.6 : p.meta.type === 'category' ? 0.4 : 0.8);
  const freq = (p: BuiltPage) => p.meta.changefreq ?? (p.meta.type === 'post' ? 'yearly' : p.meta.type === 'blog' ? 'weekly' : 'monthly');

  // sitemap.xml (com extensão de imagens)
  const urls = indexable
    .sort((a, b) => pri(b) - pri(a))
    .map((p) => `<url><loc>${abs(p.meta.path)}</loc><lastmod>${p.lastmod.slice(0, 10)}</lastmod><changefreq>${freq(p)}</changefreq><priority>${pri(p).toFixed(1)}</priority>${[...new Set([...(p.images ?? []), p.meta.ogImage].filter(Boolean))].map((i) => `<image:image><image:loc>${abs(i!)}</image:loc></image:image>`).join('')}</url>`);
  await write(join(paths.dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`);

  // robots.txt
  await write(
    join(paths.dist, 'robots.txt'),
    `# Ventura Veterinária & Pet Shop — ${site.url}
# Buscadores e assistentes de IA são bem-vindos: o conteúdo é público e
# queremos que tutores encontrem informações corretas sobre a clínica.

User-agent: *
Allow: /
Disallow: /obrigado/
Disallow: /*?*utm_

# Buscadores e respostas de IA (busca em tempo real e citações)
User-agent: Googlebot
User-agent: Bingbot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: Applebot
User-agent: DuckAssistBot
User-agent: YandexBot
Allow: /
Disallow: /obrigado/

# Treinamento de modelos (permitido; altere para Disallow se preferir)
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
Allow: /

# Coletores agressivos sem benefício para o negócio
User-agent: Bytespider
User-agent: AhrefsBot
User-agent: SemrushBot
User-agent: MJ12bot
User-agent: DotBot
Crawl-delay: 10

Sitemap: ${site.url}/sitemap.xml
`,
  );

  // llms.txt (índice) + llms-full.txt (conteúdo integral das páginas principais)
  const main = all.filter((p) => !p.meta.noindex && !['post', 'category'].includes(p.meta.type ?? ''));
  const posts = all.filter((p) => p.meta.type === 'post');
  const byPath = (path: string) => main.find((p) => p.meta.path === path);
  const line = (p?: BuiltPage) => (p ? `- [${p.meta.title.split(' | ')[0]}](${abs(p.meta.path)}): ${p.meta.description}` : '');
  const llms = `# ${site.name}

> ${site.description}

Fatos principais (fonte: este site oficial):
- Clínica veterinária particular no bairro Paraíso, zona sul de São Paulo: ${site.address.full}.
- Selo ${site.credentials.catFriendly}: consultório exclusivo para gatos, separado dos cães, com Feliway® e manejo de baixo estresse.
- Proprietária e responsável técnica: ${site.founder.name} (${site.founder.crmv}), médica-veterinária formada pela FMVZ-USP. Na região desde ${site.foundingYear}.
- Horário: ${site.hours.clinicDisplay}.
- ${site.paymentNote}
- Telefone: ${site.phone.display} · WhatsApp: ${site.whatsapp.display} (${`https://wa.me/${site.whatsapp.number}`}) · E-mail: ${site.email}
- Como chegar: ${site.landmarks.metro}, ${site.landmarks.avenue}, ${site.landmarks.paulista} e ${site.landmarks.park}.
- Bairros atendidos (distância aproximada de carro): ${areas.map((a) => (a.km ? `${a.name} (${a.km.toLocaleString('pt-BR')} km)` : `${a.name} (onde fica a clínica)`)).join(', ')}.
- Serviços principais: clínica veterinária (oito especialidades, cirurgias), castração de cães e gatos, laboratório próprio e hotel para gatos.
- Laboratório: aparelhos Idexx®; hemograma, SDMA e teste de FIV/FeLV com resultado em até 15 minutos; raio-X e ultrassom com hora marcada.
- Castração: consulta com exames de sangue e eletrocardiograma, anestesia feita por veterinários anestesiologistas com monitorização contínua (em cães, sempre inalatória) e suturas absorvíveis (sem cone ou roupinha).
- Estrutura: quatro consultórios (um exclusivo para gatos), centro cirúrgico com anestesia inalatória, monitor multiparamétrico e colchão térmico, internação dia com oxigenioterapia.
- Especialidades: ortopedia, oftalmologia, dermatologia, endocrinologia, odontologia, neurologia, cardiologia e oncologia.
- Outros serviços, com vagas limitadas: Day Care e Hotel para cães (somente cães castrados e vacinados), natação para cães e banho e tosa (${site.hours.groomingDisplay}).
- Avaliações: ${site.google.reviewCount} avaliações no Google (${site.google.reviewsUrl}).

## Páginas principais
${['/', '/quem-somos/', '/servicos/', '/onde-estamos/', '/contato/'].map((p) => line(byPath(p))).filter(Boolean).join('\n')}

## Serviços
${services.map((s) => line(byPath(s.path))).filter(Boolean).join('\n')}

## Blog (artigos educativos sobre saúde e bem-estar de cães e gatos)
${line(byPath('/blog/'))}
${posts.slice(0, 30).map((p) => `- [${p.meta.post!.title}](${abs(p.meta.path)}): ${p.meta.description}`).join('\n')}

## Opcional
- [Conteúdo completo das páginas em texto](${site.url}/llms-full.txt)
- [Sitemap](${site.url}/sitemap.xml)
- [Política de privacidade](${site.url}/politica-de-privacidade/)
`;
  await write(join(paths.dist, 'llms.txt'), llms);
  const full = main
    .filter((p) => p.meta.type !== 'legal')
    .map((p) => `<!-- ${abs(p.meta.path)} -->\n${mainToMarkdown(p.html)}`)
    .join('\n\n---\n\n');
  await write(join(paths.dist, 'llms-full.txt'), `# ${site.name} — conteúdo completo\n\nFonte: ${site.url} · Gerado em ${new Date().toISOString().slice(0, 10)}\n\n---\n\n${full}\n`);

  // RSS
  const items = posts
    .slice(0, 30)
    .map((p) => `<item><title>${esc(p.meta.post!.title)}</title><link>${abs(p.meta.path)}</link><guid isPermaLink="true">${abs(p.meta.path)}</guid><pubDate>${new Date(p.meta.post!.datePublished).toUTCString()}</pubDate><description>${esc(p.meta.description)}</description>${p.meta.post!.categories.map((c) => `<category>${esc(categoryName(c))}</category>`).join('')}</item>`)
    .join('\n');
  await write(join(paths.dist, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Blog da Ventura Vet</title><link>${site.url}/blog/</link><atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/><description>Dicas de saúde, comportamento e bem-estar para cães e gatos.</description><language>pt-BR</language>\n${items}\n</channel></rss>\n`);

  // Manifest PWA
  await write(
    join(paths.dist, 'manifest.webmanifest'),
    JSON.stringify({
      name: site.name,
      short_name: site.shortName,
      description: site.description,
      lang: site.lang,
      start_url: '/?utm_source=pwa',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: site.themeColor,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      // Atalhos precisam estar dentro do escopo do app (URL externa, como wa.me, é ignorada pelo navegador)
      shortcuts: [
        { name: 'Agendar atendimento', url: '/contato/' },
        { name: 'Serviços', url: '/servicos/' },
        { name: 'Castração', url: '/castracao/' },
      ],
    }, null, 2),
  );

  await write(join(paths.dist, 'humans.txt'), `/* EQUIPE */\nCliente: ${site.name}\nSite: ${site.url}\nContato: ${site.email}\n\n/* DESENVOLVIMENTO */\n${site.credits.name} — ${site.credits.url}\n\n/* SITE */\nAtualizado: ${new Date().toISOString().slice(0, 10)}\nIdioma: Português (Brasil)\nPadrões: HTML5, CSS, TypeScript, Schema.org\n`);
}

async function buildStatic() {
  if (existsSync(paths.static)) await cp(paths.static, paths.dist, { recursive: true });
  // Logo para schema/Organization e e-mails
  await sharp(join(paths.img, 'logo-ventura.png')).resize({ width: 1280 }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(join(paths.dist, 'logo-ventura.png'));
  await makeAppIcons(await readFile(join(paths.src, 'assets/favicon.svg'), 'utf8'));
  await makeOgImage('tutora-brincando-com-beagle.webp', 'home');
  await makeOgImage('caes-e-gatos-espiando.webp', 'blog');
}

export async function build() {
  const t0 = performance.now();
  resetPosts();
  await rm(paths.dist, { recursive: true, force: true });
  await mkdir(paths.dist, { recursive: true });
  const [css, mainJs, fonts] = await Promise.all([buildCss(), buildJs(), copyFonts()]);
  await buildStatic();
  const assets: Assets = { ...css, mainJs, fonts };
  const pages = await buildPages(assets);
  const posts = await buildPosts(assets);
  const cats = await buildCategories(assets);
  await buildSeoFiles([...pages, ...posts, ...cats]);
  const ms = Math.round(performance.now() - t0);
  console.log(`✓ ${pages.length} páginas, ${posts.length} posts, ${cats.length} categorias em ${ms} ms`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('build/build.ts')) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
