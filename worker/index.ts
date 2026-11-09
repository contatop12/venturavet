/**
 * Worker do site. Só é executado para /api/* (assets.run_worker_first em wrangler.jsonc);
 * páginas e arquivos estáticos são servidos direto, sem passar por aqui.
 *
 * POST /api/contato — recebe o formulário de contato, valida e repassa o lead ao n8n.
 *   Segredos: N8N_WEBHOOK_URL (URL de produção do nó Webhook) e
 *             N8N_WEBHOOK_TOKEN (enviado como "Authorization: Bearer <token>").
 *
 * Tipos de Env: worker/worker-configuration.d.ts (gerado por `npm run cf:types`).
 */

const MAX_BYTES = 16 * 1024;
/** Envio mais rápido que isso (ms desde que o formulário abriu) é tratado como robô. */
const MIN_FILL_MS = 2500;
const ATTRIBUTION_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'landing', 'firstReferrer',
] as const;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/** Texto de uma linha: apara, colapsa espaços e limita o tamanho. */
const line = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
/** Texto livre: preserva quebras de linha (no máximo 2 seguidas). */
const block = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '';

function toE164(digits: string) {
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return '';
}

async function contato(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });

  // Só aceita envios feitos pelo próprio site (mesmo domínio)
  if (request.headers.get('origin') !== url.origin) return json({ ok: false, erro: 'origem' }, 403);

  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  const { success } = await env.LEAD_LIMITER.limit({ key: ip });
  if (!success) return json({ ok: false, erro: 'limite' }, 429);

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) return json({ ok: false, erro: 'tamanho' }, 413);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return json({ ok: false, erro: 'tamanho' }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('corpo inválido');
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, erro: 'formato' }, 400);
  }

  // Armadilhas anti-robô: campo invisível preenchido ou envio rápido demais.
  // Responde "ok" para o robô não perceber, mas não repassa nada.
  const tempo = Number(body.tempo);
  if (line(body.empresa, 200) || !Number.isFinite(tempo) || tempo < MIN_FILL_MS) return json({ ok: true });

  const lead = {
    nome: line(body.nome, 120),
    telefone: line(body.telefone, 30),
    telefoneE164: '',
    email: line(body.email, 160).toLowerCase(),
    pet: line(body.pet, 80),
    especie: line(body.especie, 20),
    raca: line(body.raca, 80),
    idade: line(body.idade, 40),
    necessidade: line(body.necessidade, 60),
    mensagem: block(body.mensagem, 2000),
  };
  lead.telefoneE164 = toE164(lead.telefone.replace(/\D/g, ''));

  const campos: Record<string, string> = {};
  if (lead.nome.length < 2) campos.nome = 'Preencha este campo.';
  if (!lead.telefoneE164) campos.telefone = 'Informe DDD + número.';
  if (!lead.pet) campos.pet = 'Preencha este campo.';
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) campos.email = 'E-mail inválido.';
  if (body.consentimento !== true) campos.consentimento = 'Marque para continuar.';
  if (Object.keys(campos).length) return json({ ok: false, erro: 'validacao', campos }, 422);

  if (!env.N8N_WEBHOOK_URL) {
    console.error('[contato] N8N_WEBHOOK_URL não configurado');
    return json({ ok: false, erro: 'indisponivel' }, 503);
  }

  const agora = new Date().toISOString();
  const origem: Record<string, string> = { pagina: line(body.pagina, 300), referrer: line(body.referrer, 500) };
  for (const k of ATTRIBUTION_KEYS) {
    const v = line(body[k], 300);
    if (v) origem[k] = v;
  }

  const payload = {
    evento: 'lead',
    formulario: 'contato',
    site: url.hostname,
    recebidoEm: agora,
    canal: line(body.canal, 20) === 'email' ? 'email' : 'whatsapp',
    lead: { ...lead, consentimento: true, consentimentoEm: agora },
    origem,
    contexto: {
      pais: request.cf?.country ?? null,
      cidade: request.cf?.city ?? null,
      userAgent: line(request.headers.get('user-agent'), 300),
    },
  };

  try {
    const res = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.N8N_WEBHOOK_TOKEN ? { authorization: `Bearer ${env.N8N_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[contato] n8n respondeu ${res.status}`);
      return json({ ok: false, erro: 'n8n' }, 502);
    }
  } catch (err) {
    console.error(`[contato] falha ao chamar o n8n: ${err instanceof Error ? err.name : 'erro'}`);
    return json({ ok: false, erro: 'n8n' }, 502);
  }

  return json({ ok: true });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contato' || url.pathname === '/api/contato/') return contato(request, env, url);
    if (url.pathname.startsWith('/api/')) return json({ ok: false, erro: 'nao_encontrado' }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
