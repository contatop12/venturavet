import { $ } from './dom';
import { getAttribution } from './attribution';

/**
 * Formulário de contato: valida, registra o lead (POST /api/contato → Worker → n8n)
 * e abre o WhatsApp da clínica já preenchido (ou o e-mail, se o tutor preferir).
 * O registro é "dispare e esqueça" (keepalive): não atrasa nem bloqueia a abertura do
 * WhatsApp, e se falhar a mensagem ainda chega à clínica pelo canal escolhido.
 */
export default function initContact() {
  const form = $<HTMLFormElement>('[data-contact-form]');
  if (!form) return;
  const startedAt = performance.now();
  const number = form.dataset.whatsapp!;
  const email = form.dataset.email!;
  const status = $('[data-form-status]', form);
  const phone = form.elements.namedItem('telefone') as HTMLInputElement;

  // Máscara de telefone (DDD + número)
  phone?.addEventListener('input', () => {
    const d = phone.value.replace(/\D/g, '').slice(0, 11);
    phone.value = d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  });

  const setError = (el: HTMLInputElement | HTMLTextAreaElement, msg: string) => {
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    const out = document.getElementById(`${el.id}-erro`);
    if (out) out.textContent = msg;
  };
  const validate = () => {
    let first: HTMLElement | null = null;
    const req = form.querySelectorAll<HTMLInputElement>('[required]');
    req.forEach((el) => {
      let msg = '';
      if (el.type === 'checkbox' && !el.checked) msg = 'Marque para continuar.';
      else if (el.type !== 'checkbox' && !el.value.trim()) msg = 'Preencha este campo.';
      else if (el.name === 'telefone' && el.value.replace(/\D/g, '').length < 10) msg = 'Informe DDD + número.';
      setError(el, msg);
      if (msg && !first) first = el;
    });
    (first as HTMLElement | null)?.focus();
    return !first;
  };
  form.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.getAttribute('aria-invalid') === 'true') setError(el, '');
  });

  const compose = () => {
    const f = new FormData(form);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    const fields = [
      `*Tutor(a):* ${g('nome')}`,
      `*Telefone:* ${g('telefone')}`,
      g('email') && `*E-mail:* ${g('email')}`,
      `*Pet:* ${g('pet') || '—'}${g('especie') ? ` (${g('especie')})` : ''}`,
      g('raca') && `*Raça:* ${g('raca')}`,
      g('idade') && `*Idade:* ${g('idade')}`,
      `*Preciso de:* ${g('necessidade') || '—'}`,
    ].filter(Boolean);
    const msg = g('mensagem');
    return ['Olá! Vim pelo site e gostaria de atendimento.', fields.join('\n'), msg].filter(Boolean).join('\n\n');
  };

  const sendLead = (via: string) => {
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const body = JSON.stringify({
      ...getAttribution(),
      ...data,
      consentimento: (form.elements.namedItem('consentimento') as HTMLInputElement | null)?.checked === true,
      canal: via,
      tempo: Math.round(performance.now() - startedAt),
      pagina: location.pathname,
      referrer: document.referrer,
    });
    try {
      fetch('/api/contato', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch {
      /* navegador sem fetch/keepalive: segue só com WhatsApp/e-mail */
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;
    const via = (e as SubmitEvent).submitter?.getAttribute('value') ?? 'whatsapp';
    sendLead(via);
    const text = compose();
    const url = via === 'email'
      ? `mailto:${email}?subject=${encodeURIComponent('Contato pelo site — ' + (new FormData(form).get('necessidade') || 'Atendimento'))}&body=${encodeURIComponent(text.replace(/\*/g, ''))}`
      : `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    window.dataLayer?.push({ event: 'form_submit', form_channel: via });
    window.open(url, via === 'email' ? '_self' : '_blank', 'noopener');
    if (status) status.textContent = via === 'email' ? 'Abrimos seu aplicativo de e-mail com a mensagem pronta.' : 'Abrimos o WhatsApp com a sua mensagem pronta — é só tocar em enviar.';
  });
}
