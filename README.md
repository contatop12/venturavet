# Ventura Vet — site estático (HTML, CSS e TypeScript)

Recriação do site [venturavet.com.br](https://venturavet.com.br) (antes em WordPress/Divi): novo layout, imagens otimizadas,
SEO técnico, dados estruturados e arquivos para buscadores e IAs. Saída 100% estática em `dist/`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências (Node 24+) |
| `npm run dev` | Build + servidor com recarga automática em http://localhost:4321 (`PORT=xxxx` para trocar) |
| `npm run build` | Gera o site em `dist/` |
| `npm run check` | Audita o `dist/`: links internos, H1, title/description, canonical, JSON-LD, `alt`, ids |
| `npm run preview` | Serve o `dist/` como em produção |
| `npm run typecheck` | Verifica os tipos do TypeScript |
| `npm run media:video` | Otimiza vídeos de `src/assets/video/` (MP4 H.264 + WebM VP9 + pôster) |
| `npm run import:wp` | Reimporta os posts do WordPress antigo (uso único na migração) |

O primeiro build leva ~2 min (codificação AVIF); os seguintes usam o cache em `.cache/`.

## Onde editar

- **Dados do negócio** (endereço, telefones, horários, serviços, avaliações, bairros atendidos): `build/lib/site.ts` — fonte única usada no HTML, no JSON-LD, no `llms.txt` e no rodapé.
  A lista `areas` (bairro + distância aproximada) alimenta os bairros da home, a página `/onde-estamos/` e o `areaServed` do schema.
- **Páginas**: `src/pages/*.html`. O topo de cada arquivo tem um bloco `<!--- ... --->` com title, description, URL e tipo de schema.
- **Posts do blog**: `content/posts/*.json` (template em `src/templates/post.html`).
- **Estilos**: `src/css/critical.css` (primeira dobra, vai inline) e `src/css/components/*.css`.
- **Interações**: `src/ts/main.ts` e `src/ts/modules/*`.

Componentes de build usados no HTML (trocados por HTML final na compilação):
`<x-img>` (gera `<picture>` AVIF/WebP responsivo), `<x-icon>`, `<x-reviews>`, `<x-services-index>`, `<x-service-nav>`,
`<x-latest-posts>`, `<x-blog-grid>`, `<x-map>`, `<x-nap>`, `<x-hours>`, `<x-areas>` (com `detailed`: cartões por bairro com rota), `<x-breadcrumbs>`, `<x-youtube>`, `<x-video>`, `<x-include>`.
Links com `data-wa="mensagem"` viram links de WhatsApp com a mensagem já preenchida.

## O que foi otimizado

**Performance**
- Imagens: AVIF + WebP em até 6 larguras com `srcset/sizes`, `width/height` (sem CLS), lazy-load e preload da imagem principal (LCP) com `fetchpriority="high"`. Nomes de arquivo descritivos.
- Fontes: Red Hat Display/Text auto-hospedadas (woff2 variável, subconjunto latino), com preload das usadas na primeira dobra.
- CSS crítico inline + CSS principal assíncrono; JS de 8 KB com módulos carregados só nas páginas que precisam.
- Google Maps só carrega perto da tela; YouTube com fachada; GTM só após a primeira interação.
- Pré-carregamento: Speculation Rules (pré-renderiza a página ao passar o mouse), prefetch de reserva, `dns-prefetch`, View Transitions entre páginas.

**SEO, GEO e AEO**
- Title, description, canonical, Open Graph (imagem 1200×630 por página) e Twitter Card em todas as páginas.
- JSON-LD em grafo: `VeterinaryCare`/`PetStore` com NAP e geolocalização, `Person` (Dra. Ana Luiza), `WebSite`, `Service` por serviço, `BreadcrumbList`, `FAQPage` gerado do FAQ visível, `BlogPosting` nos posts e `speakable`.
- Cápsulas de resposta (`.answer`) no topo das páginas para buscadores e IAs.
- SEO local: página `/onde-estamos/` (como chegar, pontos de referência e distância por bairro, com link de rota), bairros no rodapé de conversão de todas as páginas e pergunta de localização no FAQ dos serviços principais.
- `sitemap.xml` (com imagens; `lastmod` vem da data do último commit de cada página), `robots.txt` (buscadores e assistentes de IA liberados), `llms.txt` e `llms-full.txt`, `feed.xml`, `manifest.webmanifest`, `humans.txt`.
- URLs antigas preservadas; redirecionamentos 301 (`/banho-e-tosa-2/`, feeds, sitemaps do Yoast, paginação, tags) em `_redirects` e `.htaccess`.

## Publicação — Cloudflare Workers (recomendado)

Configuração em `wrangler.jsonc`: Worker `venturavet` só com arquivos estáticos (Workers Static Assets, sem código).
Requisições a arquivos estáticos não são cobradas nem contam no limite do plano grátis.
`_headers` (segurança e cache) e `_redirects` (301 das URLs antigas) são lidos pela Cloudflare; o `.htaccess` fica fora do upload (`.assetsignore`).

| Comando | O que faz |
|---|---|
| `npm run cf:dev` | Serve o `dist/` no runtime da Cloudflare em http://localhost:8787 (testa headers, redirects e 404) |
| `npm run deploy:check` | Build + auditoria + `wrangler deploy --dry-run` (não publica) |
| `npm run deploy` | Build + publicação |

### Primeira publicação (pela máquina)

1. `npx wrangler login` (abre o navegador; use a conta Cloudflare onde está o domínio `venturavet.com.br`).
2. `npm run deploy` → o site sobe em `https://venturavet.<subdominio-da-conta>.workers.dev` para revisão. O WordPress continua no ar.

### Ou com deploy automático pelo Git (Workers Builds)

1. Suba o projeto para um repositório no GitHub/GitLab.
2. Painel da Cloudflare → *Workers & Pages* → *Create* → *Import a repository*.
3. **Deploy command:** `npx wrangler deploy` (ele mesmo roda `npm run build`, configurado em `wrangler.jsonc`) · **Build command:** vazio · Node definido em `.node-version` (24).
   O primeiro build leva ~2 min (geração das imagens AVIF); cada `git push` na `main` publica sozinho.

### Virar a chave do domínio (tira o WordPress do ar)

Antes de começar, exporte do Search Console o relatório de *Desempenho* (páginas e consultas, 16 meses): é a linha de base para comparar depois.

1. No DNS da Cloudflare, apague os registros `A`/`AAAA`/`CNAME` de `venturavet.com.br` e de `www` que apontam para a hospedagem atual. **Não apague os registros `TXT`**: os dois `google-site-verification` são a verificação do Search Console, e o `v=spf1` é do e-mail.
2. Em `wrangler.jsonc`, descomente o bloco `routes` e rode `npm run deploy` (a Cloudflare cria o DNS e o certificado do domínio).
3. **www → sem www:** crie o registro `www` (AAAA `100::`, proxied) e, em *Rules → Redirect Rules*, use o modelo *Redirect from WWW to root* (301, mantendo caminho e query string).
4. Desative o *robots.txt gerenciado* (ver Pendências) e, já com o domínio funcionando, mude `workers_dev` e `preview_urls` para `false` em `wrangler.jsonc` e publique de novo, para não existir cópia do site em `*.workers.dev`.
5. Search Console: envie `https://venturavet.com.br/sitemap.xml` (o `sitemap_index.xml` antigo redireciona para ele), peça a inspeção da home e das páginas de serviço e acompanhe o relatório *Páginas* por quatro semanas, corrigindo qualquer 404 que aparecer com uma linha em `src/static/_redirects`.

### O que protege o tráfego orgânico na virada

Conferido em 12/11/2026 contra o sitemap do WordPress (312 URLs: 13 páginas, 56 posts, 6 categorias, 237 tags):

- **Mesmas URLs**: páginas, posts (`/AAAA/MM/DD/slug/`) e categorias respondem no mesmo endereço. Nenhuma URL do sitemap antigo dá 404.
- **Títulos dos posts**: o `<title>` mantém o título original inteiro (`seoTitle` em `build/build.ts`), sem cortar.
- **Tags**: o site novo não tem arquivos de tag. As 203 tags que listavam um único post redirecionam para esse post; 8 tags de tema amplo vão para a categoria ou o serviço equivalente; as demais vão para `/blog/` (`src/static/_redirects`).
- **Medição**: o GTM é o mesmo contêiner (`GTM-MQ8G7B9`) e o Search Console é verificado por `TXT` no DNS, então os dois continuam valendo sem configuração nova.
- **URL de teste**: `*.workers.dev` responde com `X-Robots-Tag: noindex` (`src/static/_headers`), para não competir com o domínio.

Para refazer a conferência depois de mudar URLs, compare o sitemap antigo com as respostas do site novo (cada URL deve dar 200 ou um único 301).

Para voltar atrás, *Workers & Pages → venturavet → Deployments* permite reverter versões; para voltar ao WordPress, remova o domínio do Worker e recrie os registros DNS antigos (anote-os antes do passo 1).

### Outras hospedagens

O conteúdo de `dist/` funciona em qualquer hospedagem estática:
- **Cloudflare Pages / Netlify**: build `npm run build`, pasta `dist`. Usam `_headers` e `_redirects`.
- **Apache/LiteSpeed (hospedagem comum)**: envie o conteúdo de `dist/`, incluindo o `.htaccess`.
  Nessas hospedagens o formulário continua abrindo WhatsApp/e-mail, mas o envio ao n8n (que depende do Worker) não funciona.

## Formulário de contato → n8n

Ao enviar o formulário de `/contato/`, o site faz duas coisas ao mesmo tempo:
1. registra o lead: `POST /api/contato` → Worker (`worker/index.ts`) → webhook do n8n;
2. abre o WhatsApp (ou o e-mail) da clínica com a mensagem pronta, como antes.

Se o n8n estiver fora do ar ou não configurado, o passo 2 acontece normalmente (nenhum contato se perde).

**Proteções no Worker:** só aceita envios do próprio domínio, limite de 5 envios/min por IP, campo invisível
anti-robô, tempo mínimo de preenchimento (2,5 s), validação dos campos e corpo de até 16 KB. Nenhum dado pessoal vai para os logs.

**Configurar (uma vez):**
1. No n8n, importe `tools/n8n/venturavet-formulario-contato.json` (*Workflows → Import from file*).
2. No nó **Webhook do site**, crie a credencial *Header Auth*: **Name** `Authorization`, **Value** `Bearer <token>`
   (gere um token longo e aleatório). Ligue a continuação do fluxo (planilha, CRM, WhatsApp, e-mail…) depois do nó **Dados do lead** e **ative** o workflow.
3. Copie a **Production URL** do webhook (`https://<seu-n8n>/webhook/venturavet-contato`).
4. Na Cloudflare, cadastre os dois valores como **segredos** do Worker — pelo painel
   (*Workers e Pages → venturavet → Configurações → Variáveis e segredos → Adicionar → tipo Segredo*) ou pelo terminal:
   ```
   npx wrangler secret put N8N_WEBHOOK_URL
   npx wrangler secret put N8N_WEBHOOK_TOKEN
   ```
   Use o mesmo token do passo 2, só o valor (sem `Bearer`). Segredos valem na hora e não são apagados pelos deploys.

**Dados enviados ao n8n** (JSON):
```json
{
  "evento": "lead", "formulario": "contato", "site": "venturavet.com.br",
  "recebidoEm": "2026-11-06T21:27:53.164Z", "canal": "whatsapp",
  "lead": { "nome": "", "telefone": "(11) 98765-4321", "telefoneE164": "+5511987654321", "email": "",
            "pet": "", "especie": "cão", "raca": "", "idade": "", "necessidade": "Vacina", "mensagem": "",
            "consentimento": true, "consentimentoEm": "…" },
  "origem": { "pagina": "/contato/", "referrer": "", "landing": "/", "firstReferrer": "https://www.google.com/",
              "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "…", "gclid": "…" },
  "contexto": { "pais": "BR", "cidade": "São Paulo", "userAgent": "…" }
}
```
`origem` traz UTMs e IDs de clique (gclid, fbclid…) da entrada no site, guardados só durante a sessão.

**Testar localmente:** copie `.dev.vars.example` para `.dev.vars`, aponte para o webhook de teste do n8n e rode `npm run cf:dev`.
Depois de mudar bindings em `wrangler.jsonc`, regenere os tipos com `npm run cf:types`.

## Pendências (dados que não estão no site atual — não foram inventados)

1. **CNPJ/razão social** (`cnpj`, `legalName` em `build/lib/site.ts`). CRMV-SP 15.768 e horário da clínica já preenchidos (briefing de nov/2026).
2. **Hotel para Gatos — gaiolas**: a página antiga dizia "não possuímos gaiolas", o PDF de regras diz que o gato pode ficar em gaiola em alguns períodos. O site não afirma nenhum dos dois: descreve o gatil telado e diz que os hóspedes usam o espaço em alternância, sem contato entre si (comentário `CONFIRMAR COM CLIENTE` em `src/pages/hotel-para-gatos.html`).
3. **Preços e telefones extras** dos PDFs (natação, day care, telefones do day care) ficaram fora do site de propósito; publique só se o cliente quiser mantê-los atualizados.
4. **Bots de IA bloqueados na Cloudflare**: o domínio usa o "robots.txt gerenciado", que proíbe GPTBot, ClaudeBot, Google-Extended etc. e se sobrepõe ao arquivo do site. Além disso, a borda responde **403** a GPTBot e ClaudeBot (testado em 12/11/2026); OAI-SearchBot, ChatGPT-User e PerplexityBot passam. É configuração da zona, então continua valendo depois da virada. Para o GEO, desative em *Security → Bots* as opções *Block AI bots* e *Manage robots.txt* (ou *AI Crawl Control*, conforme o painel).
5. **Google Search Console**: a propriedade já é verificada por `TXT` no DNS, então `verification.google` pode ficar vazio. Falta só enviar o `sitemap.xml` novo depois da virada (passo 5 acima).
6. **Google Business Profile**: manter horário, categoria ("Clínica veterinária"), atributos e fotos iguais aos do site (consistência de NAP para SEO local).
7. **Regras do Day Care em PDF**: o link antigo (`regras-day-care-ventura-2022.pdf`) já estava quebrado; as regras agora estão na própria página e o endereço redireciona para elas.
8. **Anestesia inalatória em gatos**: o texto do cliente só afirma anestesia inalatória na castração de **cães** (e que o centro cirúrgico tem o aparelho). O site segue essa redação. Se a castração de gatos também for sempre inalatória, dá para voltar a dizer "cães e gatos".
9. **Avaliações**: as avaliações exibidas vieram do site antigo e a maioria fala de banho e tosa. Trocar em `reviews` (`build/lib/site.ts`) por avaliações reais do Google sobre consultas, castração e hotel para gatos, copiando o texto exato; conferir também o total (`google.reviewCount`).
10. **Especialidades**: o site lista oito (com odontologia). O documento "Mais informações" cita também nutrologia e medicina felina e não cita odontologia. Confirmar a lista atual antes de mudar o número.
11. **Vídeos e mais fotos** (inventário do Drive em nov/2026): o material novo tem cerca de 171 arquivos em 8 pastas, 151 deles em HEIC (Natação 19, Hotel para Gatos 13, Cirurgia 53, Equipe/Clínica/fachada 16, Equipe/Fachada 7, Cães/consultório 6, Dra. Ana 1). O site usa só uma seleção (6 fotos do hotel de gatos, 4 de natação, 4 de cirurgia). Não há vídeo de natação nem do hotel de gatos nas pastas novas; os vídeos novos são 5 curtos em "Imagens da Equipe, Clínica, fachada" (1,5 a 3,5 MB), 1 em "Equipe / Fachada" (IMG_2994.MOV) e 12 em "Mais pastas → Vídeos reels dezembro 2025". O conector do Drive não baixa arquivos em lote: para usar, salve os vídeos em `src/assets/video/` e rode `npm run media:video`; fotos vão em `src/assets/img/` (JPG ou WebP, com nome descritivo). As demais subpastas de "Mais pastas" são material de campanhas de 2023 e 2024.
12. **Distâncias por bairro**: os valores de `areas` e `landmarks` em `build/lib/site.ts` são aproximações do OpenStreetMap (nov/2026). Ajuste se o cliente preferir outros pontos de referência.
13. **Castração "sem dor" / "indolor"**: a página de campanha usa esses termos; o site principal descreve o controle da dor sem prometer resultado. Usar os termos da campanha é decisão do cliente (regras de publicidade do CFMV).
14. **Estudo de palavras-chave** (planilha "Estudo Keywords — Novembro 2026" no Drive): só a aba "Geral" pôde ser lida pelo conector; as outras 37 abas (Termos principais, Geolocalizacao, Exames com bairro, Especialidades com Paraíso, Fora do Escopo, etc.) ficaram sem leitura. Os ajustes feitos com a aba Geral: a home mira "clínica veterinária" e a página da clínica mira "veterinário" (para as duas não disputarem o mesmo termo); laboratório usa "exames veterinários", "ultrassom/raio-X veterinário" e "teste rápido de FIV e FeLV"; castração responde "quanto custa castrar"; hotel para gatos usa "hotelzinho"; day care cita "creche para cachorro" (é o termo buscado). Termos evitados de propósito: "24 horas", "hospital veterinário", "gratuito" e "popular".
15. **Raças não aceitas no Hotel/Day Care**: a lista do site segue o PDF "REGRAS - VENTURA HOTEL 2026" (o documento antigo citava Akita, que não aparece na lista nova). Confirmar se vale também para o Day Care.
