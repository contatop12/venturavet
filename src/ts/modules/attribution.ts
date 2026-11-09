/**
 * Origem da visita (UTMs, IDs de clique de anúncios, página de entrada e site de origem),
 * guardada só durante a sessão para acompanhar o lead enviado pelo formulário.
 * Uma nova campanha na mesma sessão substitui a anterior (último clique).
 */
const KEY = 'vv_origem';
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid'];

function externalReferrer() {
  try {
    return document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : '';
  } catch {
    return '';
  }
}

export function captureAttribution() {
  try {
    const query = new URLSearchParams(location.search);
    const fresh: Record<string, string> = {};
    for (const p of PARAMS) {
      const v = query.get(p);
      if (v) fresh[p] = v.slice(0, 300);
    }
    if (sessionStorage.getItem(KEY) && !Object.keys(fresh).length) return;
    sessionStorage.setItem(KEY, JSON.stringify({ landing: location.pathname, firstReferrer: externalReferrer(), ...fresh }));
  } catch {
    /* armazenamento bloqueado: segue sem atribuição */
  }
}

export function getAttribution(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}
