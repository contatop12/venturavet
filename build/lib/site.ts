/**
 * Fonte única de verdade do negócio. NAP, contatos, horários e serviços
 * saem daqui para o HTML, o JSON-LD, o llms.txt e o rodapé — assim nunca
 * divergem entre si (consistência de NAP é fator de SEO local).
 *
 * Campos marcados com `TODO` não existem no site atual e não foram
 * inventados: preencha com os dados do Google Business Profile.
 */

/**
 * Bairros atendidos (SEO local): o Paraíso e os bairros vizinhos.
 * `km` = distância aproximada de carro do centro do bairro até a clínica (OpenStreetMap/OSRM, nov/2026);
 * `from` = forma usada em frases ("a partir da Vila Mariana"). Alimenta o HTML, o JSON-LD e o llms.txt.
 */
export const areas: { name: string; from: string; km: number }[] = [
  { name: 'Paraíso', from: 'do Paraíso', km: 0 },
  { name: 'Jardim Paulista', from: 'do Jardim Paulista', km: 2.5 },
  { name: 'Bela Vista', from: 'da Bela Vista', km: 2.5 },
  { name: 'Ibirapuera', from: 'do Ibirapuera', km: 2.5 },
  { name: 'Cerqueira César', from: 'de Cerqueira César', km: 3 },
  { name: 'Jardins', from: 'dos Jardins', km: 3.5 },
  { name: 'Vila Nova Conceição', from: 'da Vila Nova Conceição', km: 3.5 },
  { name: 'Vila Mariana', from: 'da Vila Mariana', km: 3.5 },
  { name: 'Moema', from: 'de Moema', km: 4 },
  { name: 'Vila Clementino', from: 'da Vila Clementino', km: 4 },
  { name: 'Aclimação', from: 'da Aclimação', km: 4 },
  { name: 'Liberdade', from: 'da Liberdade', km: 4 },
];

/**
 * Especialistas da página /especialistas/ (nomes, funções e fotos vindos do site anterior).
 * `about` descreve a área de atuação, não o currículo da pessoa.
 * `crmv` só entra quando o número foi confirmado em fonte verificável; sem isso, fica de fora.
 */
export interface TeamMember { slug: string; name: string; role: string; about: string; image: string; imageAlt: string; knowsAbout: string[]; crmv?: string; founder?: boolean }
export const team: TeamMember[] = [
  {
    slug: 'ana-luiza-mazorra', name: 'Dra. Ana Luiza Mazorra', role: 'Médica-veterinária, proprietária e responsável técnica', founder: true, crmv: 'CRMV-SP 15.768',
    about: 'Formada pela FMVZ-USP, está à frente da Ventura desde 2007 e acompanha de perto os atendimentos da clínica.',
    image: 'dra-ana-luiza-mazorra-com-cao-e-gato.jpg', imageAlt: 'Dra. Ana Luiza Mazorra com um cavalier king charles e um gato preto no colo',
    knowsAbout: ['Clínica de pequenos animais', 'Medicina felina'],
  },
  {
    slug: 'cassia-garcia', name: 'Dra. Cássia Garcia', role: 'Ultrassonografista',
    about: 'Faz os exames de ultrassom, que mostram os órgãos abdominais em tempo real e ajudam no diagnóstico sem precisar de cirurgia.',
    image: 'especialista-cassia-garcia.jpg', imageAlt: 'Dra. Cássia Garcia, ultrassonografista veterinária, de jaleco estampado no consultório',
    knowsAbout: ['Ultrassonografia veterinária', 'Diagnóstico por imagem'],
  },
  {
    slug: 'flavia-ianiceli', name: 'Dra. Flávia Ianiceli', role: 'Dermatologista e endocrinologista',
    about: 'Cuida de doenças de pele, alergias e otites, e de alterações hormonais como diabetes e problemas de tireoide.',
    image: 'especialista-flavia-ianiceli.jpg', imageAlt: 'Dra. Flávia Ianiceli, dermatologista e endocrinologista veterinária, de jaleco branco',
    knowsAbout: ['Dermatologia veterinária', 'Endocrinologia veterinária'],
  },
  {
    slug: 'daniela-scatena', name: 'Dra. Daniela Scatena', role: 'Odontologia veterinária',
    about: 'Trata dentes e gengivas: limpeza de tártaro, doença periodontal e extrações, que influenciam a saúde do pet como um todo.',
    image: 'especialista-daniela-scatena.jpg', imageAlt: 'Dra. Daniela Scatena, da odontologia veterinária, com um cãozinho no colo',
    knowsAbout: ['Odontologia veterinária'],
  },
  {
    slug: 'felipe-alfaro', name: 'Dr. Felipe Alfaro', role: 'Cardiologista',
    about: 'Avalia o coração com ecocardiograma e eletrocardiograma e acompanha cães e gatos com doenças cardíacas.',
    image: 'especialista-felipe-alfaro.jpg', imageAlt: 'Dr. Felipe Alfaro, cardiologista veterinário, de jaleco branco',
    knowsAbout: ['Cardiologia veterinária', 'Ecocardiograma', 'Eletrocardiograma'],
  },
  {
    slug: 'luciana-moreno', name: 'Dra. Luciana Moreno', role: 'Anestesista',
    about: 'Conduz a anestesia e monitora o paciente do início ao fim de cirurgias, castrações e outros procedimentos.',
    image: 'especialista-luciana-moreno.jpg', imageAlt: 'Dra. Luciana Moreno, anestesista veterinária, segurando um gato siamês',
    knowsAbout: ['Anestesiologia veterinária'],
  },
  {
    slug: 'graziele-massae-shimamura', name: 'Dra. Graziele Massae Shimamura', role: 'Oftalmologista',
    about: 'Cuida da saúde dos olhos: úlceras de córnea, catarata, glaucoma, olho seco e alterações das pálpebras.',
    image: 'especialista-graziele-massae-shimamura.jpg', imageAlt: 'Dra. Graziele Massae Shimamura, oftalmologista veterinária, de jaleco branco',
    knowsAbout: ['Oftalmologia veterinária'],
  },
  {
    slug: 'amanda-oncins', name: 'Dra. Amanda Oncins', role: 'Especialista em medicina felina',
    about: 'Dedica-se ao atendimento de gatos, do check-up às doenças crônicas da espécie, com o manejo gentil de uma clínica Cat Friendly.',
    image: 'especialista-amanda-oncins.jpg', imageAlt: 'Dra. Amanda Oncins, especialista em medicina felina, com um gato no colo',
    knowsAbout: ['Medicina felina'],
  },
  {
    slug: 'lais-suda', name: 'Dra. Lais Suda', role: 'Fisioterapeuta e acupunturista',
    about: 'Atua na reabilitação e no controle da dor, em pacientes idosos e na recuperação de cirurgias ortopédicas e neurológicas.',
    image: 'especialista-lais-suda.jpg', imageAlt: 'Dra. Lais Suda, fisioterapeuta e acupunturista veterinária, ao lado de um buldogue francês',
    knowsAbout: ['Fisioterapia veterinária', 'Acupuntura veterinária'],
  },
];

export const site = {
  url: 'https://venturavet.com.br',
  name: 'Ventura Veterinária & Pet Shop',
  shortName: 'Ventura Vet',
  legalName: 'Ventura Veterinária & Pet Shop', // TODO: razão social
  cnpj: '', // TODO: CNPJ
  foundingYear: 2007,
  description:
    'Clínica veterinária particular no Paraíso, em São Paulo, desde 2007, com selo Cat Friendly Practice: consultas e especialidades, cirurgias e castração, laboratório próprio com exames em até 15 minutos e hotel para gatos. Também oferece day care e hotel para cães, natação e banho e tosa, com vagas limitadas.',
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
  /** Bairros atendidos + a cidade (mesma lista de `areas`, usada no JSON-LD). */
  areaServed: [...areas.map((a) => a.name), 'São Paulo'],
  /** Bairros citados em frases curtas (os mais próximos e mais buscados). */
  areasShort: 'Paraíso, Vila Mariana, Jardins, Jardim Paulista, Bela Vista, Ibirapuera, Moema e Vila Nova Conceição',
  /** Pontos de referência (distâncias a pé aproximadas, OpenStreetMap, nov/2026). */
  landmarks: {
    metro: 'a cerca de 900 m da estação Brigadeiro do metrô (Linha 2-Verde)',
    avenue: 'a cerca de 300 m da Avenida Brigadeiro Luís Antônio',
    paulista: 'a cerca de 1 km da Avenida Paulista',
    park: 'a cerca de 2,5 km do Parque Ibirapuera',
  },

  /** Diferenciais institucionais destacados no site e nos dados estruturados. */
  credentials: {
    catFriendly: 'Cat Friendly Practice',
  },
  /** Clínica particular: não trabalha com convênios / planos de saúde pet. */
  paymentNote: 'Clínica particular: não atendemos convênios nem planos de saúde pet.',

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
    jobTitle: 'Médica-veterinária, proprietária e responsável técnica',
    alumniOf: 'Faculdade de Medicina Veterinária e Zootecnia da Universidade de São Paulo (FMVZ-USP)',
    crmv: 'CRMV-SP 15.768',
  },

  /**
   * Horários (briefing do cliente, nov/2026). Formato schema.org: dias em inglês, horas HH:MM.
   * Domingo: fechado.
   */
  hours: {
    clinic: [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
      { days: ['Saturday'], opens: '09:00', closes: '16:00' },
    ] as { days: string[]; opens: string; closes: string }[],
    clinicDisplay: 'Seg. a sex., 9h às 18h · Sáb., 9h às 16h · Dom., fechado',
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
  /** principal = foco do site (destaque); outros = poucas vagas, menos destaque. */
  group: 'principal' | 'outros';
  audience?: string;
};

export const services: Service[] = [
  {
    slug: 'clinica-veterinaria',
    path: '/clinica-veterinaria/',
    name: 'Clínica Veterinária',
    navName: 'Clínica Veterinária',
    short: 'Consultas, vacinas, cirurgias e oito especialidades, com consultório exclusivo para gatos.',
    icon: 'stethoscope',
    image: 'consulta-dra-ana-luiza-com-boston-terrier.jpg',
    imageAlt: 'Dra. Ana Luiza Mazorra examinando um boston terrier no consultório da Ventura',
    serviceType: 'Clínica veterinária',
    waMessage: 'Olá! Vim pelo site e quero agendar uma consulta veterinária.',
    group: 'principal',
  },
  {
    slug: 'laboratorio',
    path: '/laboratorio/',
    name: 'Laboratório e Exames de Imagem',
    navName: 'Laboratório',
    short: 'Hemograma, SDMA e FIV/FeLV com resultado em até 15 minutos; raio-X e ultrassom com hora marcada.',
    icon: 'microscope',
    image: 'veterinaria-examinando-yorkshire.webp',
    imageAlt: 'Veterinária sorrindo enquanto examina um yorkshire',
    serviceType: 'Laboratório veterinário e diagnóstico por imagem',
    waMessage: 'Olá! Vim pelo site e quero agendar um exame para o meu pet.',
    group: 'principal',
  },
  {
    slug: 'castracao',
    path: '/castracao/',
    name: 'Castração de Cães e Gatos',
    navName: 'Castração',
    short: 'Castração com anestesia feita por anestesiologistas, monitorização contínua e suturas absorvíveis, sem cone nem roupinha.',
    icon: 'heart-pulse',
    image: 'cirurgia-monitoramento-anestesico.jpg',
    imageAlt: 'Profissional ao lado do aparelho de anestesia e do monitor do centro cirúrgico',
    serviceType: 'Castração de cães e gatos',
    waMessage: 'Olá! Vim pelo site e quero agendar a castração do meu pet.',
    group: 'principal',
    audience: 'Tutores de cães e gatos',
  },
  {
    slug: 'hotel-para-gatos',
    path: '/hotel-para-gatos/',
    name: 'Hotel para Gatos',
    navName: 'Hotel para Gatos',
    short: 'Hospedagem só para gatos em gatil telado, sem contato com outros animais, numa clínica com selo Cat Friendly.',
    icon: 'cat',
    image: 'hotel-para-gatos-gato-descansando.jpg',
    imageAlt: 'Gato siamês relaxando em uma plataforma alta no espaço telado do hotel para gatos',
    serviceType: 'Hotel para gatos',
    waMessage: 'Olá! Vim pelo site e quero reservar o Hotel para Gatos.',
    group: 'principal',
    audience: 'Tutores de gatos',
  },
  {
    slug: 'day-care-e-hotel',
    path: '/day-care-e-hotel/',
    name: 'Day Care e Hotel para Cães',
    navName: 'Day Care e Hotel para Cães',
    short: 'Dia de atividades, socialização e descanso, com pernoite. Só para cães castrados e vacinados; vagas limitadas.',
    icon: 'moon-star',
    image: 'day-care-area-de-recreacao-caes.jpg',
    imageAlt: 'Cães pequenos brincando na área de recreação do day care da Ventura',
    serviceType: 'Creche e hotel para cães',
    waMessage: 'Olá! Vim pelo site e quero saber se há vaga no Day Care ou no Hotel para cães.',
    group: 'outros',
  },
  {
    slug: 'natacao',
    path: '/natacao/',
    name: 'Natação para Cães',
    navName: 'Natação',
    short: 'Aulas de 40 minutos em piscina coberta e aquecida, para gastar energia ou reabilitar. Vagas limitadas.',
    icon: 'waves',
    image: 'natacao-cao-nadando-close.jpg',
    imageAlt: 'Cão nadando com a cabeça fora da água e respingos ao redor, na piscina de natação',
    serviceType: 'Natação e hidroterapia para cães',
    waMessage: 'Olá! Vim pelo site e quero saber se há vaga para natação.',
    group: 'outros',
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
    waMessage: 'Olá! Vim pelo site e quero saber se há horário para banho e tosa.',
    group: 'outros',
  },
];

/** Serviço por slug (evita depender da ordem do array). */
export function svc(slug: string): Service {
  const s = services.find((x) => x.slug === slug);
  if (!s) throw new Error(`Serviço inexistente: ${slug}`);
  return s;
}
export const mainServices = services.filter((s) => s.group === 'principal');
export const otherServices = services.filter((s) => s.group === 'outros');

export const nav = [
  { label: 'Quem somos', href: '/quem-somos/' },
  { label: 'Serviços', href: '/servicos/', children: services.map((s) => ({ label: s.navName, href: s.path, icon: s.icon, short: s.short, group: s.group })) },
  // Castração tem destaque próprio no menu (pedido do briefing), além de estar em Serviços.
  { label: 'Castração', href: '/castracao/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Contato', href: '/contato/' },
];

/**
 * Avaliações reais publicadas no Google (exibidas no site antigo via Trustindex).
 * Ordem: primeiro as que falam da clínica e da estrutura como um todo (foco do site), depois as de banho e tosa.
 * Para trocar por avaliações de consultas, castração ou hotel para gatos, copie o texto exato do Google.
 */
export const reviews = [
  { author: 'MZ Serviços', date: '2025-02-09', rating: 5, text: 'Espaço espetacular, com ótima estrutura e padrão 5 estrelas no atendimento e cuidado com seu pet. Super recomendo.' },
  { author: 'Karin Deguirmendjan Rosa Campos', date: '2024-09-12', rating: 5, text: 'Excelente atendimento, equipe atenciosa e competente! Agradecimento especial à Michele!' },
  { author: 'Patricia Biembenguti', date: '2025-05-18', rating: 5, text: 'Excelente atendimento, em todos aspectos! 👏👏👏👏' },
  { author: 'Renata Malachias', date: '2025-11-06', rating: 5, text: 'Adorei. Pontuais, organizados, carinhosos e atenciosos. A Michelle cuidou super bem da minha cachorrinha que é super medrosa. Pepé saiu de lá feliz, limpinha e com cara de ter sido bem cuidada.' },
  { author: 'Renata Balerine', date: '2025-07-16', rating: 5, text: 'Foi uma experiência ótima! Minhas cachorras tomaram banho lá e voltaram lindas e cheirosas! AMEI o atendimento e o serviço. Super recomendo!' },
  { author: 'Ivonete Gonçalves', date: '2025-09-25', rating: 5, text: 'Gostei demais do banho, tosa e o atendimento muito agradável!' },
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
