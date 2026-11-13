// Copiado sem mudanças do pacote do Rankeando (referencia/verificar-assinatura.ts). Não edite: o CONTRATO.md define a assinatura que ela confere.
/**
 * Conferência da assinatura que o Rankeando manda em cada pedido ao seu site.
 * Copie esta função para o servidor do site. Leia o corpo como texto antes de qualquer JSON.parse.
 *
 * Cabeçalho: X-Rankeando-Assinatura: t=<segundos unix>,v1=<HMAC-SHA256 em hex de "<t>.<corpo>">
 * (o Rankeando manda também a cópia antiga, X-P12-Assinatura, com o mesmo valor: `lerCabecalhoDoRankeando` aceita as duas).
 * Só usa Web Crypto (Node 18+, Deno, Bun, Cloudflare Workers, navegadores).
 */

const texto = new TextEncoder()

async function hmacHex(segredo: string, mensagem: string): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', texto.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', chave, texto.encode(mensagem)))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/**
 * Lê um cabeçalho do Rankeando pelo nome novo e, se ele não vier, pelo antigo. `nome` é Evento, Entrega ou Assinatura:
 * lerCabecalhoDoRankeando(req.headers, 'Assinatura') procura X-Rankeando-Assinatura e depois X-P12-Assinatura.
 */
export function lerCabecalhoDoRankeando(headers: { get(nome: string): string | null }, nome: 'Evento' | 'Entrega' | 'Assinatura'): string | null {
  return headers.get(`X-Rankeando-${nome}`) ?? headers.get(`X-P12-${nome}`)
}

/**
 * A chave do site: RANKEANDO_WEBHOOK_SECRET e, se ela não existir, P12_WEBHOOK_SECRET (nome usado nos pacotes antigos).
 * Quem já tem o segredo com o nome antigo não precisa mexer na hospedagem.
 */
export function segredoDoRankeando(env: Record<string, string | undefined>): string | undefined {
  return env.RANKEANDO_WEBHOOK_SECRET || env.P12_WEBHOOK_SECRET || undefined
}

/** Devolve o valor do cabeçalho X-Rankeando-Assinatura para um corpo (útil nos seus testes). */
export async function assinarCorpo(segredo: string, t: number, corpo: string): Promise<string> {
  return `t=${t},v1=${await hmacHex(segredo, `${t}.${corpo}`)}`
}

export async function verificarAssinatura(
  segredo: string,
  cabecalho: string | null,
  corpo: string,
  agoraEmSegundos: number = Math.floor(Date.now() / 1000),
): Promise<'ok' | 'formato' | 'fora_do_horario' | 'assinatura_invalida'> {
  const m = typeof cabecalho === 'string' ? /^t=(\d{1,12}),v1=([0-9a-f]{64})$/.exec(cabecalho) : null
  if (!m) return 'formato'
  const t = Number(m[1])
  if (!iguais(await hmacHex(segredo, `${t}.${corpo}`), m[2])) return 'assinatura_invalida'
  if (Math.abs(agoraEmSegundos - t) > 300) return 'fora_do_horario'
  return 'ok'
}

/** Vetor fixo: confira a sua implementação contra ele antes de ligar o recebimento. */
export const VETOR_DE_TESTE = {
  segredo: 'p12-vetor-de-teste-1',
  t: 1760000000,
  corpo: '{"evento":"ping","contrato":1,"desafio":"desafio-fixo-0001"}',
  cabecalho: 't=1760000000,v1=3c6ae81ec5c58d28eed93666b429c54e68d54741a5fdc2d986ffb6729be3966c',
}
