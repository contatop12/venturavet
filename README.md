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

- **Dados do negócio** (endereço, telefones, horários, serviços, avaliações): `build/lib/site.ts` — fonte única usada no HTML, no JSON-LD, no `llms.txt` e no rodapé.
- **Páginas**: `src/pages/*.html`. O topo de cada arquivo tem um bloco `<!--- ... --->` com title, description, URL e tipo de schema.
- **Posts do blog**: `content/posts/*.json` (template em `src/templates/post.html`).
- **Estilos**: `src/css/critical.css` (primeira dobra, vai inline) e `src/css/components/*.css`.
- **Interações**: `src/ts/main.ts` e `src/ts/modules/*`.

Componentes de build usados no HTML (trocados por HTML final na compilação):
`<x-img>` (gera `<picture>` AVIF/WebP responsivo), `<x-icon>`, `<x-reviews>`, `<x-services-index>`, `<x-service-nav>`,
`<x-latest-posts>`, `<x-blog-grid>`, `<x-map>`, `<x-nap>`, `<x-hours>`, `<x-breadcrumbs>`, `<x-youtube>`, `<x-video>`, `<x-include>`.
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
- `sitemap.xml` (com imagens), `robots.txt` (buscadores e assistentes de IA liberados), `llms.txt` e `llms-full.txt`, `feed.xml`, `manifest.webmanifest`, `humans.txt`.
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

1. No DNS da Cloudflare, apague os registros `A`/`AAAA`/`CNAME` de `venturavet.com.br` e de `www` que apontam para a hospedagem atual.
2. Em `wrangler.jsonc`, descomente o bloco `routes` e rode `npm run deploy` (a Cloudflare cria o DNS e o certificado do domínio).
3. **www → sem www:** crie o registro `www` (AAAA `100::`, proxied) e, em *Rules → Redirect Rules*, use o modelo *Redirect from WWW to root* (301, mantendo caminho e query string).
4. Desative o *robots.txt gerenciado* (ver Pendências) e, já com o domínio funcionando, mude `workers_dev` e `preview_urls` para `false` em `wrangler.jsonc` e publique de novo, para não existir cópia do site em `*.workers.dev`.
5. Search Console: reenvie `https://venturavet.com.br/sitemap.xml`.

Para voltar atrás, *Workers & Pages → venturavet → Deployments* permite reverter versões; para voltar ao WordPress, remova o domínio do Worker e recrie os registros DNS antigos (anote-os antes do passo 1).

### Outras hospedagens

O conteúdo de `dist/` funciona em qualquer hospedagem estática:
- **Cloudflare Pages / Netlify**: build `npm run build`, pasta `dist`. Usam `_headers` e `_redirects`.
- **Apache/LiteSpeed (hospedagem comum)**: envie o conteúdo de `dist/`, incluindo o `.htaccess`.

## Pendências (dados que não estão no site atual — não foram inventados)

1. **Horário da clínica**: preencher `hours.clinic` em `build/lib/site.ts` (hoje aparece "Consulte pelo WhatsApp"). Entra automaticamente no schema e no rodapé.
2. **CRMV-SP da responsável técnica** (`founder.crmv`) — exigência do CFMV para publicidade veterinária — e **CNPJ/razão social** (`cnpj`, `legalName`).
3. **Robots do Cloudflare**: o domínio usa o "robots.txt gerenciado" da Cloudflare, que bloqueia GPTBot, ClaudeBot, Google-Extended etc. e sobrepõe o arquivo do site. Para o GEO funcionar, desative em *Security → Bots → Manage robots.txt* (ou ajuste o `robots.txt` deste projeto se preferir manter o bloqueio de treinamento).
4. **Google Search Console**: adicionar o código em `verification.google` e reenviar o `sitemap.xml` após a publicação.
5. **Fotos reais**: várias imagens herdadas são de banco de imagens. Fotos da equipe e do espaço aumentam a confiança.
6. **Regras do Day Care em PDF**: o link antigo (`regras-day-care-ventura-2022.pdf`) já estava quebrado; as regras agora estão na própria página e o endereço redireciona para elas.
