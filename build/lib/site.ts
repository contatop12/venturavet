/**
 * Fonte única de verdade do negócio. NAP, contatos, horários e serviços
 * saem daqui para o HTML, o JSON-LD, o llms.txt e o rodapé — assim nunca
 * divergem entre si (consistência de NAP é fator de SEO local).
 *
 * Campos marcados com `TODO` não existem no site atual e não foram
 * inventados: preencha com os dados do Google Business Profile.
 */

export const site = {
  url: 'https://venturavet.com.br',
  name: 'Ventura Veterinária & Pet Shop',
  shortName: 'Ventura Vet',
  legalName: 'Ventura Veterinária & Pet Shop', // TODO: razão social
  cnpj: '', // TODO: CNPJ
  foundingYear: 2007,
  description:
    'Clínica veterinária e pet shop no Paraíso, em São Paulo, desde 2007: consultas e especialidades, cirurgias, laboratório com exames em até 15 minutos, day care e hotel, natação e banho e tosa para cães e gatos.',
  locale: 'pt_BR',
  lang: 'pt-BR',
  themeColor: '#FF6600',

  phone: { display: '(11) 3884-7758', e164: '+551138847758' },
  whatsapp: { display: '(11) 95048-1577', number: '5511950481577', defaultMessage: 'Olá! Vim pelo site e gostaria de mais informações.' },
  email: 'contato@venturavet.com.br',

  address: {
    street: 'Rua Otávio Nébias, 190',
    district: 'Paraíso',
    city: 'São Paulo',
    region: 'SP',
    postalCode: '04002-011',
    country: 'BR',
    full: 'Rua Otávio Nébias, 190 – Paraíso, São Paulo – SP, 04002-011',
  },
  geo: { lat: -23.5732, lng: -46.65257 },
  areaServed: ['Paraíso', 'Vila Mariana', 'Bela Vista', 'Jardim Paulista', 'Ibirapuera', 'Aclimação', 'São Paulo'],

  google: {
    placeId: 'ChIJa05YW5VZzpQRLMvtUmyE_Gs',
    reviewCount: 138,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ventura%20Veterin%C3%A1ria%20%26%20Pet%20Shop&query_place_id=ChIJa05YW5VZzpQRLMvtUmyE_Gs',
    reviewsUrl: 'https://search.google.com/local/reviews?placeid=ChIJa05YW5VZzpQRLMvtUmyE_Gs',
    writeReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJa05YW5VZzpQRLMvtUmyE_Gs',
    embedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.8674729921177!2d-46.65256558538363!3d-23.573202767913987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce59955b584e6b%3A0x6bfc846c52edcb2c!2sVentura%20Veterin%C3%A1ria%20%26%20Pet%20Shop!5e0!3m2!1spt-BR!2sbr!4v1677094221274!5m2!1spt-BR!2sbr',
  },

  social: {
    instagram: 'https://www.instagram.com/venturavet/',
    facebook: 'https://www.facebook.com/VenturaVeterinariaPetshop/',
    linkedin: 'https://www.linkedin.com/company/ventura-veterinaria/',
    youtube: 'https://www.youtube.com/@ventura_tv',
  },

  founder: {
    name: 'Dra. Ana Luiza Mazorra',
    jobTitle: 'Médica-veterinária e diretora clínica',
    alumniOf: 'Faculdade de Medicina Veterinária e Zootecnia da Universidade de São Paulo (FMVZ-USP)',
    crmv: '', // TODO: CRMV-SP da responsável técnica (exigência do CFMV para publicidade)
  },

  /**
   * Horários publicados no site atual. O horário geral da clínica não
   * aparece em nenhuma página — TODO: preencher a partir do Google.
   * Formato schema.org: dias em inglês, horas HH:MM.
   */
  hours: {
    clinic: [] as { days: string[]; opens: string; closes: string }[],
    grooming: [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00' },
      { days: ['Saturday'], opens: '09:00', closes: '15:00' },
    ],
    groomingDisplay: 'Seg. a sex., 9h às 17h · Sáb., 9h às 15h',
    daycareDisplay: 'Rotina das 7h às 21h',
  },

  analytics: { gtm: 'GTM-MQ8G7B9' },
  verification: { facebook: '4wwykzsu4vyyp7e75f2a20dtgibkl7', google: '' },
  credits: { name: 'P12 Digital', url: 'https://p12digital.com.br' },
} as const;

export type Service = {
  slug: string;
  path: string;
  name: string;
  navName: string;
  short: string;
  icon: string;
  image: string;
  imageAlt: string;
  serviceType: string;
  waMessage: string;
};

export const services: Service[] = [
  {
    slug: 'clinica-veterinaria',
    path: '/clinica-veterinaria/',
    name: 'Clínica Veterinária',
    navName: 'Clínica Veterinária',
    short: 'Consultas, vacinas, cirurgias e oito especialidades, com consultório exclusivo para gatos.',
    icon: 'stethoscope',
    image: 'filhote-em-consulta.webp',
    imageAlt: 'Filhote sendo examinado com estetoscópio por veterinária da Ventura',
    serviceType: 'Clínica veterinária',
    waMessage: 'Olá! Vim pelo site e quero agendar uma consulta veterinária.',
  },
  {
    slug: 'laboratorio',
    path: '/laboratorio/',
    name: 'Laboratório e Exames de Imagem',
    navName: 'Laboratório',
    short: 'Hemograma e perfis bioquímicos em até 15 minutos; raio-X, ultrassom, eco e eletrocardiograma.',
    icon: 'microscope',
    image: 'veterinaria-examinando-yorkshire.webp',
    imageAlt: 'Veterinária sorrindo enquanto examina um yorkshire',
    serviceType: 'Laboratório veterinário e diagnóstico por imagem',
    waMessage: 'Olá! Vim pelo site e quero agendar um exame para o meu pet.',
  },
  {
    slug: 'day-care-e-hotel',
    path: '/day-care-e-hotel/',
    name: 'Day Care e Hotel',
    navName: 'Day Care e Hotel',
    short: 'Dia inteiro de atividades, socialização e descanso, com câmeras 24h e pernoite.',
    icon: 'moon-star',
    image: 'lulu-da-pomerania.webp',
    imageAlt: 'Lulu-da-pomerânia sorrindo, aluno do day care',
    serviceType: 'Creche e hotel para cães',
    waMessage: 'Olá! Vim pelo site e quero saber sobre o Day Care e o Hotel.',
  },
  {
    slug: 'natacao',
    path: '/natacao/',
    name: 'Natação para Cães',
    navName: 'Natação',
    short: 'Aulas de 1 hora com ducha e secagem inclusas, para gastar energia ou reabilitar.',
    icon: 'waves',
    image: 'pug-nadando.webp',
    imageAlt: 'Pug nadando na piscina com um brinquedo na boca',
    serviceType: 'Natação e hidroterapia para cães',
    waMessage: 'Olá! Vim pelo site e quero agendar uma aula experimental de natação.',
  },
  {
    slug: 'banho-e-tosa',
    path: '/banho-e-tosa/',
    name: 'Banho e Tosa',
    navName: 'Banho e Tosa',
    short: 'Produtos EcoDog e Perigot, toalhas esterilizadas e ambiente climatizado — inclusive para gatos.',
    icon: 'bath',
    image: 'yorkshire-pos-banho.webp',
    imageAlt: 'Yorkshire enrolado em toalhas após o banho, com patinho de borracha',
    serviceType: 'Banho e tosa',
    waMessage: 'Olá! Vim pelo site e quero agendar banho e tosa.',
  },
];

export const nav = [
  { label: 'Quem somos', href: '/quem-somos/' },
  { label: 'Serviços', href: '/servicos/', children: services.map((s) => ({ label: s.navName, href: s.path, icon: s.icon, short: s.short })) },
  { label: 'Blog', href: '/blog/' },
  { label: 'Contato', href: '/contato/' },
];

/** Avaliações reais publicadas no Google (exibidas no site atual via Trustindex). */
export const reviews = [
  { author: 'Renata Malachias', date: '2025-11-06', rating: 5, text: 'Adorei. Pontuais, organizados, carinhosos e atenciosos. A Michelle cuidou super bem da minha cachorrinha que é super medrosa. Pepé saiu de lá feliz, limpinha e com cara de ter sido bem cuidada.' },
  { author: 'Ivonete Gonçalves', date: '2025-09-25', rating: 5, text: 'Gostei demais do banho, tosa e o atendimento muito agradável!' },
  { author: 'Renata Balerine', date: '2025-07-16', rating: 5, text: 'Foi uma experiência ótima! Minhas cachorras tomaram banho lá e voltaram lindas e cheirosas! AMEI o atendimento e o serviço. Super recomendo!' },
  { author: 'MZ Serviços', date: '2025-02-09', rating: 5, text: 'Espaço espetacular, com ótima estrutura e padrão 5 estrelas no atendimento e cuidado com seu pet. Super recomendo.' },
  { author: 'Karin Deguirmendjan Rosa Campos', date: '2024-09-12', rating: 5, text: 'Excelente atendimento, equipe atenciosa e competente! Agradecimento especial à Michele!' },
  { author: 'Patricia Biembenguti', date: '2025-05-18', rating: 5, text: 'Excelente atendimento, em todos aspectos! 👏👏👏👏' },
  { author: 'Ana Lucia Abrahão', date: '2025-08-04', rating: 5, text: 'Excelente.' },
];

export const categories: Record<string, string> = {
  clinica: 'Clínica',
  'dicas-e-curiosidades': 'Dicas e curiosidades',
  'day-use': 'Day Use',
  hotel: 'Hotel',
  'pet-shop': 'Pet Shop',
  'sem-categoria': 'Geral',
};

export function waLink(message: string = site.whatsapp.defaultMessage) {
  return `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(message)}`;
}
