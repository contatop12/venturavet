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
 * `crmv` e `education` só entram quando confirmados em fonte que nomeia a pessoa; sem isso, ficam de fora.
 */
export interface TeamMember { slug: string; name: string; role: string; about: string; image: string; imageAlt: string; knowsAbout: string[]; crmv?: string; education?: string; founder?: boolean }
export const team: TeamMember[] = [
  {
    slug: 'ana-luiza-mazorra', name: 'Dra. Ana Luiza Mazorra', role: 'Médica-veterinária, proprietária e responsável técnica', founder: true, crmv: 'CRMV-SP 15.768',
    about: 'Formada pela FMVZ-USP, está à frente do Ventura desde 2007 e acompanha de perto os atendimentos da clínica.',
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
    // Fontes (conferidas em 16/11/2026): CRMV na página de Odontologia da Inova Veterinária; formação na bio da equipe da Mastercat.
    crmv: 'CRMV-SP 19.821',
    education: 'Formada pela Universidade Metodista de São Paulo, com pós-graduação em odontologia veterinária pela Anclivepa-SP. Mestranda na FMVZ-USP.',
  },
  {
    slug: 'felipe-alfaro', name: 'Dr. Felipe Alfaro', role: 'Cardiologista',
    about: 'Avalia o coração com ecocardiograma e eletrocardiograma e acompanha cães e gatos com doenças cardíacas.',
    image: 'especialista-felipe-alfaro.jpg', imageAlt: 'Dr. Felipe Alfaro, cardiologista veterinário, de jaleco branco',
    knowsAbout: ['Cardiologia veterinária', 'Ecocardiograma', 'Eletrocardiograma'],
    // Fonte: página da equipe da Maskovet, onde ele também atende como cardiologista (conferida em 16/11/2026).
    crmv: 'CRMV-SP 42.817',
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
    // Fontes (conferidas em 16/11/2026): perfil na Biblioteca Virtual da FAPESP (resumo do Lattes) e dissertação no repositório de teses da USP.
    education: 'Formada pela Unesp, com residência em clínica e cirurgia de pequenos animais na USP e mestrado pela FMVZ-USP, com pesquisa sobre os olhos de cães com diabetes.',
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

  /** Redes oficiais (cliente, nov/2026): só estas quatro aparecem no site. */
  social: {
    instagram: 'https://www.instagram.com/venturavet/',
    facebook: 'https://www.facebook.com/VenturaVeterinariaPetshop/',
    tiktok: 'https://vt.tiktok.com/ZSpGLQfBN/',
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
    /** Hotéis: acompanhamento contínuo, que não é horário de funcionamento da clínica. */
    hotelDisplay: 'Monitores 24 horas, todos os dias · entrada e saída em horários combinados',
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
  /** Rótulo do botão do cartão (ex.: "Conheça a clínica"). */
  cta: string;
  icon: string;
  image: string;
  imageAlt: string;
  serviceType: string;
  waMessage: string;
  /**
   * principal = os sete cartões da home, nesta ordem; clinica = serviços clínicos (submenu da Clínica);
   * exame = exames específicos (submenu de Exames); especie = clínica por espécie; hub = página geral de Day Care e Hotel.
   */
  group: 'principal' | 'clinica' | 'exame' | 'especie' | 'hub';
  audience?: string;
};

const wa = (txt: string) => `Olá! Vim pelo site do Ventura Vet e gostaria de ${txt}`;

export const services: Service[] = [
  // ---------- Os sete cartões da home (ordem do briefing de nov/2026) ----------
  {
    slug: 'clinica-veterinaria', path: '/clinica-veterinaria/', name: 'Clínica Veterinária', navName: 'Clínica Veterinária',
    short: 'Consultas, vacinação, especialidades e cirurgias para cães e gatos.', cta: 'Conheça a clínica',
    icon: 'stethoscope', image: 'consulta-dra-ana-luiza-com-boston-terrier.jpg',
    imageAlt: 'Dra. Ana Luiza Mazorra examinando um boston terrier no consultório do Ventura',
    serviceType: 'Clínica veterinária', waMessage: wa('agendar uma consulta veterinária para meu pet.'), group: 'principal',
  },
  {
    slug: 'laboratorio', path: '/laboratorio/', name: 'Exames e Laboratório', navName: 'Exames e Laboratório',
    short: 'Exames laboratoriais, de imagem e cardiológicos para cães e gatos.', cta: 'Conheça os exames',
    icon: 'flask-conical', image: 'laboratorio-bancada-equipamentos-microscopio.jpg',
    imageAlt: 'Bancada do laboratório do Ventura com analisadores e microscópio',
    serviceType: 'Laboratório veterinário e diagnóstico por imagem', waMessage: wa('informações sobre exames e laboratório.'), group: 'principal',
  },
  {
    slug: 'hotel-para-gatos', path: '/hotel-para-gatos/', name: 'Hotel para Gatos', navName: 'Hotel para gatos',
    short: 'Conheça as acomodações e a rotina de cuidados durante a hospedagem.', cta: 'Conheça o hotel para gatos',
    icon: 'cat', image: 'hotel-para-gatos-gato-siames-no-nicho.jpg',
    imageAlt: 'Gato siamês em uma prateleira de parede do espaço do hotel para gatos, com mural ilustrado',
    serviceType: 'Hotel para gatos', waMessage: wa('consultar a disponibilidade do hotel para meu gato.'), group: 'principal', audience: 'Tutores de gatos',
  },
  {
    slug: 'day-care-para-cachorros', path: '/day-care-para-cachorros/', name: 'Day Care para Cachorros', navName: 'Day Care para cachorros',
    short: 'Atividades, convivência e cuidados durante o dia, com adaptação previamente agendada.', cta: 'Conheça o Day Care',
    icon: 'paw-print', image: 'day-care-monitora-com-caes.jpg',
    imageAlt: 'Monitora do Day Care do Ventura brincando com cachorros na área de recreação',
    serviceType: 'Creche para cachorros', waMessage: wa('conhecer as vagas e os planos do Day Care para meu cachorro.'), group: 'principal', audience: 'Tutores de cães',
  },
  {
    slug: 'hotel-para-cachorros', path: '/hotel-para-cachorros/', name: 'Hotel para Cachorros', navName: 'Hotel para cachorros',
    short: 'Hospedagem e cuidados para seu cachorro enquanto você viaja.', cta: 'Conheça o hotel para cachorros',
    icon: 'house-heart', image: 'day-care-cavalier-descansando.jpg',
    imageAlt: 'Cavalier king charles descansando no espaço dos cães do Ventura',
    serviceType: 'Hotel para cachorros', waMessage: wa('consultar a disponibilidade do Hotel para Cachorros.'), group: 'principal', audience: 'Tutores de cães',
  },
  {
    slug: 'natacao', path: '/natacao/', name: 'Natação para Cachorros', navName: 'Natação',
    short: 'Aulas em piscina coberta e aquecida, com acompanhamento de monitores.', cta: 'Conheça a natação',
    icon: 'waves', image: 'natacao-cao-nadando-com-instrutora.jpg',
    imageAlt: 'Cachorro nadando com a instrutora na piscina coberta e aquecida do Ventura',
    serviceType: 'Natação para cachorros', waMessage: wa('informações sobre a natação para meu cachorro.'), group: 'principal', audience: 'Tutores de cães',
  },
  {
    slug: 'banho-e-tosa', path: '/banho-e-tosa/', name: 'Banho e Tosa', navName: 'Banho e Tosa',
    short: 'Higiene e cuidados para a rotina do seu pet.', cta: 'Conheça o banho e tosa',
    icon: 'shower-head', image: 'yorkshire-pos-banho.webp',
    imageAlt: 'Yorkshire enrolado em toalhas após o banho',
    serviceType: 'Banho e tosa', waMessage: wa('agendar banho e tosa para meu pet.'), group: 'principal',
  },

  // ---------- Página geral de Day Care e Hotel ----------
  {
    slug: 'day-care-e-hotel', path: '/day-care-e-hotel/', name: 'Day Care e Hotel', navName: 'Day Care e Hotel',
    short: 'Day Care para cachorros, hotel para cachorros e hotel para gatos, com monitores e requisitos próprios.', cta: 'Conheça o Day Care e os hotéis',
    icon: 'house-heart', image: 'day-care-area-de-recreacao-caes.jpg',
    imageAlt: 'Cães pequenos brincando na área de recreação do Ventura',
    serviceType: 'Creche e hotel para cães e gatos', waMessage: wa('informações sobre o Day Care e os hotéis.'), group: 'hub',
  },

  // ---------- Clínica por espécie ----------
  {
    slug: 'veterinario-para-cachorro', path: '/veterinario-para-cachorro/', name: 'Veterinário para Cachorro', navName: 'Atendimento para cães',
    short: 'Consultas, vacinação, exames, castração e acompanhamento para cachorros de todas as idades.', cta: 'Atendimento para cães',
    icon: 'dog', image: 'consulta-veterinaria-cachorro-jack-russell.jpg',
    imageAlt: 'Veterinária do Ventura examinando um jack russell com o estetoscópio',
    serviceType: 'Clínica veterinária para cães', waMessage: wa('agendar uma consulta para meu cachorro.'), group: 'especie', audience: 'Tutores de cães',
  },
  {
    slug: 'veterinario-para-gatos', path: '/veterinario-para-gatos/', name: 'Veterinário para Gatos', navName: 'Atendimento para gatos',
    short: 'Consultório exclusivo e sala de espera separada para gatos, com selo Cat Friendly Practice.', cta: 'Atendimento para gatos',
    icon: 'cat', image: 'consulta-veterinaria-gato-preto.jpg',
    imageAlt: 'Veterinária do Ventura examinando um gato preto com o estetoscópio',
    serviceType: 'Clínica veterinária para gatos', waMessage: wa('agendar uma consulta para meu gato.'), group: 'especie', audience: 'Tutores de gatos',
  },

  // ---------- Serviços clínicos (submenu da Clínica) ----------
  {
    slug: 'consulta-veterinaria', path: '/consulta-veterinaria/', name: 'Consulta Veterinária', navName: 'Consulta veterinária',
    short: 'Avaliação clínica de cães e gatos, com orientação sobre exames e tratamentos.', cta: 'Conheça a consulta',
    icon: 'stethoscope', image: 'consulta-veterinaria-cachorro-jack-russell.jpg',
    imageAlt: 'Veterinária do Ventura examinando um jack russell com o estetoscópio',
    serviceType: 'Consulta veterinária', waMessage: wa('agendar uma consulta veterinária para meu pet.'), group: 'clinica',
  },
  {
    slug: 'vacinacao', path: '/vacinacao/', name: 'Vacinação de Cães e Gatos', navName: 'Vacinação',
    short: 'Vacinas para cães e gatos, com avaliação e protocolo definidos pelo veterinário.', cta: 'Conheça a vacinação',
    icon: 'syringe', image: 'filhote-em-consulta.webp',
    imageAlt: 'Filhote de cachorro tricolor no colo de uma veterinária com estetoscópio',
    serviceType: 'Vacinação de cães e gatos', waMessage: wa('informações sobre a vacinação do meu pet.'), group: 'clinica',
  },
  {
    slug: 'castracao', path: '/castracao/', name: 'Castração de Cães e Gatos', navName: 'Castração',
    short: 'Avaliação, exames pré-operatórios, anestesia com monitorização contínua e orientação na recuperação.', cta: 'Como funciona a castração',
    icon: 'heart-pulse', image: 'cirurgia-monitoramento-anestesico.jpg',
    imageAlt: 'Profissional ao lado do aparelho de anestesia e do monitor do centro cirúrgico',
    serviceType: 'Castração de cães e gatos', waMessage: wa('informações sobre castração para meu pet.'), group: 'clinica', audience: 'Tutores de cães e gatos',
  },
  {
    slug: 'especialistas', path: '/especialistas/', name: 'Especialidades Veterinárias', navName: 'Especialidades',
    short: 'Atendimento por áreas como cardiologia, dermatologia, oftalmologia, odontologia e medicina felina.', cta: 'Conheça as especialidades',
    icon: 'graduation-cap', image: 'equipe-ventura-parede-verde.jpg',
    imageAlt: 'Equipe do Ventura reunida em frente ao jardim vertical da recepção',
    serviceType: 'Especialidades veterinárias', waMessage: wa('consultar a agenda de uma especialidade veterinária.'), group: 'clinica',
  },
  {
    slug: 'cirurgias-veterinarias', path: '/cirurgias-veterinarias/', name: 'Cirurgias Veterinárias', navName: 'Cirurgias',
    short: 'Procedimentos cirúrgicos com avaliação prévia, anestesia monitorada e orientação no pós-operatório.', cta: 'Conheça as cirurgias',
    icon: 'activity', image: 'cirurgia-centro-cirurgico-ventura.jpg',
    imageAlt: 'Centro cirúrgico do Ventura com mesa, foco e aparelhos de monitorização',
    serviceType: 'Cirurgia veterinária', waMessage: wa('informações sobre um procedimento cirúrgico para meu pet.'), group: 'clinica',
  },
  {
    slug: 'tratamentos-e-terapias', path: '/tratamentos-e-terapias/', name: 'Tratamentos e Terapias', navName: 'Tratamentos e Terapias',
    short: 'Fluidoterapia, oncologia, reabilitação e outros cuidados indicados pela equipe veterinária.', cta: 'Conheça os tratamentos',
    icon: 'pill', image: 'consultorio-clinico-ventura.jpg',
    imageAlt: 'Consultório clínico do Ventura com mesa de atendimento e armários',
    serviceType: 'Tratamentos e terapias veterinárias', waMessage: wa('informações sobre tratamentos e terapias para meu pet.'), group: 'clinica',
  },
  {
    slug: 'fisioterapia-veterinaria', path: '/fisioterapia-veterinaria/', name: 'Fisioterapia Veterinária', navName: 'Fisioterapia',
    short: 'Reabilitação e controle da dor para cães e gatos, com avaliação e plano individual.', cta: 'Conheça a fisioterapia',
    icon: 'accessibility', image: 'especialista-lais-suda.jpg',
    imageAlt: 'Dra. Lais Suda, fisioterapeuta e acupunturista veterinária, ao lado de um buldogue francês',
    serviceType: 'Fisioterapia veterinária', waMessage: wa('consultar uma avaliação de fisioterapia para meu pet.'), group: 'clinica',
  },
  {
    slug: 'acupuntura-veterinaria', path: '/acupuntura-veterinaria/', name: 'Acupuntura Veterinária', navName: 'Acupuntura',
    short: 'Terapia complementar para cães e gatos, indicada após avaliação veterinária.', cta: 'Conheça a acupuntura',
    icon: 'hand-heart', image: 'especialista-lais-suda.jpg',
    imageAlt: 'Dra. Lais Suda, fisioterapeuta e acupunturista veterinária, ao lado de um buldogue francês',
    serviceType: 'Acupuntura veterinária', waMessage: wa('informações sobre acupuntura para meu pet.'), group: 'clinica',
  },
  {
    slug: 'microchipagem', path: '/microchipagem/', name: 'Microchipagem', navName: 'Microchipagem',
    short: 'Identificação permanente de cães e gatos, com orientação sobre o cadastro.', cta: 'Conheça a microchipagem',
    icon: 'scan', image: 'consulta-veterinaria-gato-preto.jpg',
    imageAlt: 'Veterinária do Ventura examinando um gato preto com o estetoscópio',
    serviceType: 'Microchipagem de cães e gatos', waMessage: wa('informações sobre a microchipagem do meu pet.'), group: 'clinica',
  },

  // ---------- Exames (submenu de Exames e Laboratório) ----------
  {
    slug: 'ultrassom-veterinario', path: '/ultrassom-veterinario/', name: 'Ultrassom Veterinário', navName: 'Ultrassom veterinário',
    short: 'Ultrassom para cães e gatos, com agendamento e orientação de preparo.', cta: 'Conheça o ultrassom',
    icon: 'scan-heart', image: 'exame-ultrassom.png',
    imageAlt: 'Exame de ultrassom sendo realizado em um cachorro',
    serviceType: 'Ultrassonografia veterinária', waMessage: wa('consultar a disponibilidade de ultrassom para meu pet.'), group: 'exame',
  },
  {
    slug: 'raio-x-veterinario', path: '/raio-x-veterinario/', name: 'Raio-X Veterinário', navName: 'Raio X veterinário',
    short: 'Raio-X para cães e gatos, com agendamento conforme a solicitação veterinária.', cta: 'Conheça o raio-X',
    icon: 'bone', image: 'exame-raio-x.png',
    imageAlt: 'Imagem de raio-X de um cachorro em avaliação',
    serviceType: 'Radiologia veterinária', waMessage: wa('consultar a realização de um raio-X para meu pet.'), group: 'exame',
  },
  {
    slug: 'exames-cardiologicos-veterinarios', path: '/exames-cardiologicos-veterinarios/', name: 'Exames Cardiológicos Veterinários', navName: 'Exames cardiológicos',
    short: 'Eletrocardiograma e ecocardiograma para cães e gatos, com agendamento.', cta: 'Conheça os exames cardiológicos',
    icon: 'heart-pulse', image: 'exame-ecocardiograma.png',
    imageAlt: 'Exame de ecocardiograma sendo realizado em um cachorro',
    serviceType: 'Cardiologia veterinária', waMessage: wa('consultar um exame cardiológico para meu pet.'), group: 'exame',
  },
  {
    slug: 'teste-fiv-felv', path: '/teste-fiv-felv/', name: 'Teste de FIV e FeLV', navName: 'Teste FIV e FeLV',
    short: 'Teste de ELISA para FIV e FeLV em gatos, realizado no laboratório do Ventura.', cta: 'Conheça o teste FIV e FeLV',
    icon: 'microscope', image: 'laboratorio-profissional-operando-equipamento.jpg',
    imageAlt: 'Profissional do Ventura operando um analisador do laboratório',
    serviceType: 'Teste de FIV e FeLV para gatos', waMessage: wa('consultar o teste de FIV e FeLV para meu gato.'), group: 'exame', audience: 'Tutores de gatos',
  },
];

/** Serviço por slug (evita depender da ordem do array). */
export function svc(slug: string): Service {
  const s = services.find((x) => x.slug === slug);
  if (!s) throw new Error(`Serviço inexistente: ${slug}`);
  return s;
}
export const mainServices = services.filter((s) => s.group === 'principal');
export const clinicServices = services.filter((s) => s.group === 'clinica');
export const examServices = services.filter((s) => s.group === 'exame');

/**
 * Menu principal (referência visual do cliente, nov/2026): cinco grupos com ícone.
 * `overview` = link "Visão geral"; `columns` = colunas com título; `links` = lista simples.
 * Natação e Banho e Tosa levam direto à página. Quem somos, Blog e Contato ficam na barra superior.
 */
export interface NavLink { label: string; href: string }
export interface NavColumn { title: string; links: NavLink[] }
export interface NavItem { label: string; href: string; icon: string; overview?: NavLink; columns?: NavColumn[]; links?: NavLink[] }
const link = (slug: string, label?: string): NavLink => ({ label: label ?? svc(slug).navName, href: svc(slug).path });
export const nav: NavItem[] = [
  {
    label: 'Clínica Veterinária', href: '/clinica-veterinaria/', icon: 'stethoscope',
    overview: { label: 'Visão geral da clínica', href: '/clinica-veterinaria/' },
    columns: [
      { title: 'Por espécie', links: [link('veterinario-para-cachorro'), link('veterinario-para-gatos')] },
      { title: 'Serviços clínicos', links: clinicServices.map((s) => link(s.slug)) },
    ],
  },
  {
    label: 'Exames e Laboratório', href: '/laboratorio/', icon: 'flask-conical',
    links: [link('laboratorio', 'Laboratório veterinário'), ...examServices.map((s) => link(s.slug))],
  },
  {
    label: 'Day Care e Hotel', href: '/day-care-e-hotel/', icon: 'house-heart',
    overview: { label: 'Visão geral', href: '/day-care-e-hotel/' },
    links: [link('day-care-para-cachorros'), link('hotel-para-cachorros'), link('hotel-para-gatos')],
  },
  { label: 'Natação', href: '/natacao/', icon: 'waves' },
  { label: 'Banho e Tosa', href: '/banho-e-tosa/', icon: 'shower-head' },
];
/** Links institucionais da barra superior. */
export const topLinks: NavLink[] = [
  { label: 'Quem somos', href: '/quem-somos/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Contato', href: '/contato/' },
];

/**
 * Seletor de atendimento (botão "Atendimento" e botões "Entrar em contato"):
 * cada opção abre o WhatsApp com a mensagem pronta, sem envio automático.
 */
export const contactOptions: { label: string; icon: string; message: string; service: string }[] = [
  { label: 'Consulta e especialidades', icon: 'stethoscope', service: 'consulta', message: wa('agendar uma consulta ou especialidade para meu pet.') },
  { label: 'Exames e laboratório', icon: 'flask-conical', service: 'exames', message: wa('informações sobre exames e laboratório.') },
  { label: 'Day Care', icon: 'paw-print', service: 'day-care', message: wa('informações sobre o Day Care para meu cachorro.') },
  { label: 'Hotel para cães e gatos', icon: 'house-heart', service: 'hotel', message: wa('consultar a disponibilidade do hotel para meu pet.') },
  { label: 'Natação', icon: 'waves', service: 'natacao', message: wa('informações sobre a natação para meu cachorro.') },
  { label: 'Banho e tosa', icon: 'shower-head', service: 'banho-e-tosa', message: wa('agendar banho e tosa para meu pet.') },
];

/**
 * Avaliações reais publicadas no Google (exibidas no site antigo via Trustindex).
 * Ordem: primeiro as que falam da clínica e da estrutura como um todo (foco do site), depois as de banho e tosa.
 * Para trocar por avaliações de consultas, castração ou hotel para gatos, copie o texto exato do Google.
 */
/** `service`: só quando o texto fala de um serviço específico (o componente filtra por página). */
export const reviews: { author: string; date: string; rating: number; service?: string; text: string }[] = [
  { author: 'MZ Serviços', date: '2025-02-09', rating: 5, text: 'Espaço espetacular, com ótima estrutura e padrão 5 estrelas no atendimento e cuidado com seu pet. Super recomendo.' },
  { author: 'Karin Deguirmendjan Rosa Campos', date: '2024-09-12', rating: 5, text: 'Excelente atendimento, equipe atenciosa e competente! Agradecimento especial à Michele!' },
  { author: 'Patricia Biembenguti', date: '2025-05-18', rating: 5, text: 'Excelente atendimento, em todos aspectos! 👏👏👏👏' },
  { author: 'Renata Malachias', date: '2025-11-06', rating: 5, service: 'banho-e-tosa', text: 'Adorei. Pontuais, organizados, carinhosos e atenciosos. A Michelle cuidou super bem da minha cachorrinha que é super medrosa. Pepé saiu de lá feliz, limpinha e com cara de ter sido bem cuidada.' },
  { author: 'Renata Balerine', date: '2025-07-16', rating: 5, service: 'banho-e-tosa', text: 'Foi uma experiência ótima! Minhas cachorras tomaram banho lá e voltaram lindas e cheirosas! AMEI o atendimento e o serviço. Super recomendo!' },
  { author: 'Ivonete Gonçalves', date: '2025-09-25', rating: 5, service: 'banho-e-tosa', text: 'Gostei demais do banho, tosa e o atendimento muito agradável!' },
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
