/**
 * <head> e dados estruturados (JSON-LD em grafo com @id estáveis).
 * Regra: o schema só descreve o que está visível na página.
 */
import { site, services, team, waLink, type Service } from './site.ts';
import type { Post } from './posts.ts';
import { categoryName } from './posts.ts';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const abs = (p: string) => (p.startsWith('http') ? p : site.url + p);

const ORG = `${site.url}/#organizacao`;
const WEBSITE = `${site.url}/#website`;
const FOUNDER = `${site.url}/#ana-luiza-mazorra`;

export type PageMeta = {
  title: string;
  description: string;
  path: string;
  type?: 'home' | 'about' | 'contact' | 'service' | 'services' | 'blog' | 'category' | 'post' | 'legal' | 'page';
  service?: string; // slug do serviço
  breadcrumb?: [string, string?][];
  ogImage?: string; // url já processada
  ogImageAlt?: string;
  image?: string; // url absoluta/relativa da imagem principal
  noindex?: boolean;
  priority?: number;
  changefreq?: string;
  datePublished?: string;
  dateModified?: string;
  post?: Post;
  faq?: { q: string; a: string }[];
  itemList?: { name: string; url: string }[];
  preloadImage?: { avif: string; sizes: string } | null;
  bodyClass?: string;
  hasMap?: boolean;
};

function openingHours(list: readonly { days: readonly string[]; opens: string; closes: string }[]) {
  return list.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days.map((d) => `https://schema.org/${d}`), opens: h.opens, closes: h.closes }));
}

function organization() {
  const org: Record<string, unknown> = {
    '@type': ['VeterinaryCare', 'PetStore'],
    '@id': ORG,
    name: site.name,
    alternateName: [site.shortName, 'Ventura Veterinária', 'Ventura Pet Shop'],
    description: site.description,
    url: site.url + '/',
    logo: { '@type': 'ImageObject', '@id': `${site.url}/#logo`, url: `${site.url}/logo-ventura.png`, width: 1280, height: 562, caption: site.name },
    image: [`${site.url}/og/og-home.jpg`],
    telephone: site.phone.e164,
    email: site.email,
    foundingDate: String(site.foundingYear),
    founder: { '@id': FOUNDER },
    address: {
      '@type': 'PostalAddress',
      // Com o bairro, como no Google Business Profile ("R. Otávio Nébias, 190 - Paraíso")
      streetAddress: `${site.address.street} - ${site.address.district}`,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    hasMap: site.google.mapsUrl,
    areaServed: site.areaServed.map((name) => ({ '@type': name === 'São Paulo' ? 'City' : 'Place', name: name === 'São Paulo' ? name : `${name}, São Paulo - SP` })),
    contactPoint: [
      { '@type': 'ContactPoint', contactType: 'customer service', telephone: site.phone.e164, email: site.email, areaServed: 'BR', availableLanguage: 'Portuguese' },
      { '@type': 'ContactPoint', contactType: 'reservations', telephone: `+${site.whatsapp.number}`, url: waLink(), areaServed: 'BR', availableLanguage: 'Portuguese' },
    ],
    sameAs: [...Object.values(site.social), site.google.mapsUrl],
    knowsAbout: ['Clínica veterinária', 'Ortopedia veterinária', 'Oftalmologia veterinária', 'Dermatologia veterinária', 'Endocrinologia veterinária', 'Odontologia veterinária', 'Neurologia veterinária', 'Cardiologia veterinária', 'Oncologia veterinária', 'Medicina felina', 'Cat Friendly Practice', 'Castração de cães e gatos', 'Laboratório veterinário', 'Hotel para gatos', 'Day care para cães', 'Hotel para cães', 'Natação para cães', 'Banho e tosa'],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Serviços da Ventura Vet',
      itemListElement: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@id': `${site.url}${s.path}#servico` } })),
    },
    currenciesAccepted: 'BRL',
    paymentAccepted: 'Atendimento particular (não aceita convênios ou planos de saúde pet)',
    award: `Selo ${site.credentials.catFriendly}`,
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      name: site.credentials.catFriendly,
      credentialCategory: 'Certificação de clínica amiga dos gatos',
    },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Consultório exclusivo para gatos', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Laboratório próprio com resultados em até 15 minutos', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Hotel para gatos', value: true },
    ],
  };
  if (site.hours.clinic.length) org.openingHoursSpecification = openingHours(site.hours.clinic);
  if (site.cnpj) org.taxID = site.cnpj;
  if (site.legalName !== site.name) org.legalName = site.legalName;
  return org;
}

function founder() {
  const p: Record<string, unknown> = {
    '@type': 'Person',
    '@id': FOUNDER,
    name: site.founder.name,
    jobTitle: site.founder.jobTitle,
    worksFor: { '@id': ORG },
    alumniOf: { '@type': 'CollegeOrUniversity', name: site.founder.alumniOf },
    knowsAbout: ['Medicina veterinária', 'Clínica de pequenos animais', 'Medicina felina', 'Castração de cães e gatos'],
    description: `Proprietária e responsável técnica da Ventura Vet (${site.founder.crmv}), formada pela FMVZ-USP.`,
    url: `${site.url}/quem-somos/`,
    image: `${site.url}/og/og-quem-somos.jpg`,
  };
  if (site.founder.crmv) p.identifier = { '@type': 'PropertyValue', propertyID: 'CRMV-SP', value: site.founder.crmv };
  return p;
}

function serviceNode(s: Service, image?: string) {
  const node: Record<string, unknown> = {
    '@type': 'Service',
    '@id': `${site.url}${s.path}#servico`,
    name: s.name,
    serviceType: s.serviceType,
    description: s.short,
    url: site.url + s.path,
    provider: { '@id': ORG },
    areaServed: site.areaServed.map((name) => ({ '@type': name === 'São Paulo' ? 'City' : 'Place', name: name === 'São Paulo' ? name : `${name}, São Paulo - SP` })),
    availableChannel: [
      { '@type': 'ServiceChannel', name: 'WhatsApp', serviceUrl: waLink(s.waMessage) },
      { '@type': 'ServiceChannel', name: 'Presencial', serviceLocation: { '@id': ORG } },
    ],
  };
  if (image) node.image = abs(image);
  if (s.slug === 'banho-e-tosa') node.hoursAvailable = openingHours(site.hours.grooming);
  else if (['clinica-veterinaria', 'laboratorio', 'castracao'].includes(s.slug)) node.hoursAvailable = openingHours(site.hours.clinic);
  if (s.audience) node.audience = { '@type': 'Audience', audienceType: s.audience };
  return node;
}

export function jsonLd(m: PageMeta): string {
  const url = abs(m.path);
  const graph: Record<string, unknown>[] = [
    organization(),
    founder(),
    { '@type': 'WebSite', '@id': WEBSITE, url: site.url + '/', name: site.shortName, alternateName: site.name, description: site.description, publisher: { '@id': ORG }, inLanguage: site.lang },
  ];

  const pageType = { about: 'AboutPage', contact: 'ContactPage', blog: 'CollectionPage', category: 'CollectionPage', services: 'CollectionPage' }[m.type as string] ?? 'WebPage';
  const page: Record<string, unknown> = {
    '@type': pageType,
    '@id': `${url}#pagina`,
    url,
    name: m.title,
    description: m.description,
    isPartOf: { '@id': WEBSITE },
    about: { '@id': ORG },
    inLanguage: site.lang,
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.answer'] },
  };
  if (m.ogImage) page.primaryImageOfPage = { '@type': 'ImageObject', url: abs(m.ogImage), width: 1200, height: 630 };
  if (m.dateModified) page.dateModified = m.dateModified;
  if (m.datePublished) page.datePublished = m.datePublished;
  graph.push(page);

  if (m.breadcrumb?.length) {
    const items: [string, string?][] = [['Início', '/'], ...m.breadcrumb];
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#trilha`,
      itemListElement: items.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(href || i === items.length - 1 ? { item: abs(href ?? m.path) } : {}) })),
    });
    page.breadcrumb = { '@id': `${url}#trilha` };
  }

  // Página de especialistas: um nó Person por profissional (a proprietária já está no grafo como FOUNDER)
  if (m.path === '/especialistas/') {
    for (const t of team) {
      if (t.founder) continue;
      const p: Record<string, unknown> = { '@type': 'Person', '@id': `${url}#${t.slug}`, name: t.name, jobTitle: t.role, worksFor: { '@id': ORG }, knowsAbout: t.knowsAbout, url: `${url}#${t.slug}` };
      if (t.crmv) p.identifier = { '@type': 'PropertyValue', propertyID: t.crmv.split(' ')[0], value: t.crmv };
      graph.push(p);
    }
  }

  if (m.type === 'service' && m.service) {
    const s = services.find((x) => x.slug === m.service)!;
    graph.push(serviceNode(s, m.image));
    page.mainEntity = { '@id': `${site.url}${s.path}#servico` };
  }

  if (m.type === 'services') {
    graph.push({
      '@type': 'ItemList',
      '@id': `${url}#lista`,
      itemListElement: services.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: serviceNode(s) })),
    });
  }

  if (m.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      isPartOf: { '@id': `${url}#pagina` },
      mainEntity: m.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }

  if ((m.type === 'blog' || m.type === 'category') && m.itemList) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${url}#posts`,
      itemListElement: m.itemList.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(it.url), name: it.name })),
    });
    if (m.type === 'blog') graph.push({ '@type': 'Blog', '@id': `${site.url}/blog/#blog`, name: 'Blog da Ventura Vet', url: `${site.url}/blog/`, publisher: { '@id': ORG }, inLanguage: site.lang });
  }

  if (m.type === 'post' && m.post) {
    const p = m.post;
    graph.push({
      '@type': 'BlogPosting',
      '@id': `${url}#artigo`,
      headline: p.title.slice(0, 110),
      description: p.description,
      image: m.image ? [abs(m.image)] : undefined,
      datePublished: p.datePublished,
      dateModified: p.dateModified,
      author: { '@type': 'Organization', name: 'Equipe Ventura Vet', url: `${site.url}/quem-somos/`, parentOrganization: { '@id': ORG } },
      publisher: { '@id': ORG },
      mainEntityOfPage: { '@id': `${url}#pagina` },
      isPartOf: { '@id': `${site.url}/blog/#blog` },
      articleSection: p.categories.map(categoryName),
      wordCount: p.words,
      timeRequired: `PT${p.readingMinutes}M`,
      inLanguage: site.lang,
    });
    page['@type'] = 'WebPage';
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

export function head(m: PageMeta, assets: { criticalCss: string; mainCss: string; fonts: string[] }) {
  const url = abs(m.path);
  const og = abs(m.ogImage ?? '/og/og-home.jpg');
  const robots = m.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const lines = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="${robots}">`,
    // Pré-carregamento crítico: fontes do primeiro paint + imagem LCP
    ...assets.fonts.map((f) => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`),
    m.preloadImage ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${m.preloadImage.avif}" imagesizes="${m.preloadImage.sizes}" fetchpriority="high">` : '',
    m.hasMap ? '<link rel="dns-prefetch" href="https://www.google.com"><link rel="dns-prefetch" href="https://maps.gstatic.com">' : '',
    '<link rel="dns-prefetch" href="https://www.googletagmanager.com">',
    // .js habilita as animações de entrada (conteúdo começa invisível). Failsafe: se o JS principal
    // não sinalizar que rodou em 4 s (falha de rede, navegador antigo, erro), remove .js e mostra tudo.
    `<script>(function(d){d.classList.add('js');setTimeout(function(){if(!window.__vvReady)d.classList.remove('js')},4000)})(document.documentElement)</script>`,
    `<style>${assets.criticalCss}</style>`,
    `<link rel="preload" href="${assets.mainCss}" as="style">`,
    `<link rel="stylesheet" href="${assets.mainCss}" media="print" onload="this.media='all'">`,
    `<noscript><link rel="stylesheet" href="${assets.mainCss}"></noscript>`,
    `<meta name="theme-color" content="${site.themeColor}">`,
    '<meta name="color-scheme" content="light">',
    '<meta name="format-detection" content="telephone=no">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<link rel="alternate" type="application/rss+xml" title="Blog da Ventura Vet" href="/feed.xml">',
    '<link rel="author" href="/humans.txt">',
    // Open Graph / redes sociais
    `<meta property="og:locale" content="${site.locale}">`,
    `<meta property="og:type" content="${m.type === 'post' ? 'article' : 'website'}">`,
    `<meta property="og:site_name" content="${esc(site.shortName)}">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${og}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:type" content="image/jpeg">',
    `<meta property="og:image:alt" content="${esc(m.ogImageAlt ?? site.name)}">`,
    m.post ? `<meta property="article:published_time" content="${m.post.datePublished}"><meta property="article:modified_time" content="${m.post.dateModified}">${m.post.categories.map((c) => `<meta property="article:section" content="${esc(categoryName(c))}">`).join('')}` : '',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.description)}">`,
    `<meta name="twitter:image" content="${og}">`,
    // Sinais locais
    '<meta name="geo.region" content="BR-SP">',
    '<meta name="geo.placename" content="São Paulo">',
    `<meta name="geo.position" content="${site.geo.lat};${site.geo.lng}">`,
    `<meta name="ICBM" content="${site.geo.lat}, ${site.geo.lng}">`,
    site.verification.facebook ? `<meta name="facebook-domain-verification" content="${site.verification.facebook}">` : '',
    site.verification.google ? `<meta name="google-site-verification" content="${site.verification.google}">` : '',
    `<script type="application/ld+json">${jsonLd(m)}</script>`,
    // Navegação instantânea: pré-renderiza links internos ao passar o mouse/tocar
    `<script type="speculationrules">${JSON.stringify({
      prerender: [{ where: { and: [{ href_matches: '/*' }, { not: { href_matches: ['/*.pdf', '/*.xml', '/*.txt'] } }, { not: { selector_matches: '[rel~=nofollow], [target=_blank]' } }] }, eagerness: 'moderate' }],
      prefetch: [{ where: { href_matches: '/*' }, eagerness: 'conservative' }],
    })}</script>`,
  ];
  return lines.filter(Boolean).join('\n');
}
