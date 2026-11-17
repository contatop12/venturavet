// Auditoria de layout (Chrome headless via DevTools Protocol), sem dependências.
// Uso: node tools/audit-layout.mjs http://localhost:4321 1440,1024,390 / /castracao/ ...
// Aponta texto que estoura a própria caixa (botões, títulos), sai do contorno de botões/cartões ou sai da tela.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [base, widths, ...pages] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50 && !ws; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = l.find((t) => t.type === 'page'); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {} await sleep(200); }
if (ws.readyState !== 1) await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

const probe = `(() => {
  const vw = document.documentElement.clientWidth, out = [];
  const skip = (el) => el.closest('[data-marquee], .ticker, dialog:not([open]), .sr-only, .nav__sub, .nav, noscript') ;
  const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : '');
  document.querySelectorAll('a, button, h1, h2, h3, h4, p, li, summary, dt, dd, figcaption, span, strong, label').forEach((el) => {
    if (skip(el)) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'inline' || cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const txt = (el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
    if (!txt) return;
    const over = el.scrollWidth - el.clientWidth;
    if (over > 2 && cs.overflowX === 'visible') out.push('estoura caixa +' + over + 'px  ' + name(el) + '  "' + txt + '"');
    else if (r.right > vw + 1 || r.left < -1) out.push('fora da tela  ' + name(el) + '  "' + txt + '"');
  });
  // Texto de filhos que passa da borda do pai com fundo/borda (cartões, pílulas)
  document.querySelectorAll('.btn, .card, .svc-card__link, .pills li, .chip').forEach((box) => {
    if (skip(box)) return;
    const b = box.getBoundingClientRect(); if (!b.width) return;
    const range = document.createRange(); range.selectNodeContents(box);
    const t = range.getBoundingClientRect();
    if (t.right > b.right + 2 || t.left < b.left - 2) out.push('texto sai do contorno  ' + name(box) + '  "' + box.innerText.trim().replace(/\\s+/g,' ').slice(0,60) + '"');
  });
  return [...new Set(out)];
})()`;

const W = widths.split(',').map(Number);
for (const w of W) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 700 });
  for (const p of pages) {
    await send('Page.navigate', { url: base + p });
    await sleep(1400);
    await send('Runtime.evaluate', { expression: `document.querySelectorAll('[data-reveal],[data-hero]').forEach(e=>e.classList.add('is-in','in'))` });
    await sleep(300);
    const r = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
    if (r.result?.exceptionDetails) console.log('ERRO', p, JSON.stringify(r.result.exceptionDetails).slice(0,300));
    const list = r.result?.result?.value ?? [];
    for (const l of list) console.log(`${w}\t${p}\t${l}`);
  }
}
ws.close(); chrome.kill(); process.exit(0);
