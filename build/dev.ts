/**
 * Servidor local.
 *   npm run dev      → build + watch + live reload (http://localhost:4321)
 *   npm run preview  → serve dist/ como produção (sem watch)
 */
import { createServer, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { paths } from './lib/paths.ts';

const preview = process.argv.includes('--preview');
if (!preview) process.argv.push('--dev');
const { build } = await import('./build.ts');

const PORT = Number(process.env.PORT ?? 4321);
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const clients = new Set<ServerResponse>();
const RELOAD = `<script>new EventSource('/__reload').onmessage=()=>location.reload()</script>`;

async function resolve(url: string) {
  const p = normalize(decodeURIComponent(url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(paths.dist, p);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    if (!extname(file)) file = join(file, 'index.html');
  }
  return file;
}

createServer(async (req, res) => {
  if (req.url === '/__reload') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  // Redirecionamentos equivalentes ao _redirects de produção
  const redirects: Record<string, string> = { '/banho-e-tosa-2/': '/banho-e-tosa/', '/feed/': '/feed.xml' };
  const url = req.url ?? '/';
  if (redirects[url]) { res.writeHead(301, { location: redirects[url] }); return res.end(); }
  if (!extname(url) && !url.endsWith('/') && !url.includes('?')) { res.writeHead(301, { location: url + '/' }); return res.end(); }
  let file = await resolve(url);
  let status = 200;
  let body: Buffer;
  try {
    body = await readFile(file);
  } catch {
    status = 404;
    file = join(paths.dist, '404.html');
    body = await readFile(file).catch(() => Buffer.from('404'));
  }
  const type = types[extname(file)] ?? 'application/octet-stream';
  if (!preview && type.startsWith('text/html')) body = Buffer.from(body.toString().replace('</body>', `${RELOAD}</body>`));
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}).listen(PORT, () => console.log(`→ http://localhost:${PORT}${preview ? ' (preview de produção)' : ''}`));

if (!preview) {
  await build();
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (running) return rebuild();
      running = true;
      try {
        await build();
        clients.forEach((c) => c.write('data: reload\n\n'));
      } catch (e) {
        console.error('✗', (e as Error).message);
      } finally {
        running = false;
      }
    }, 120);
  };
  // Mudanças em build/ exigem reiniciar o servidor (módulos já carregados).
  for (const dir of [paths.src, join(paths.root, 'content')]) watch(dir, { recursive: true }, rebuild);
} else {
  console.log('Servindo dist/ — rode "npm run build" antes.');
}
