/**
 * Pipeline de imagens: gera AVIF + WebP em várias larguras a partir dos
 * originais em src/assets/img. Saída com hash de conteúdo (cache imutável)
 * e cache em disco (.cache/img) para builds incrementais rápidos.
 */
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, mkdir, copyFile, access, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { paths } from './paths.ts';

sharp.concurrency(0);

export type ImageInfo = {
  width: number;
  height: number;
  avif: string; // srcset
  webp: string; // srcset
  fallback: string; // url do webp de largura intermediária
  widths: number[];
  largest: string; // url do maior webp (OG, schema)
};

const DEFAULT_WIDTHS = [360, 540, 720, 960, 1280, 1600];
const cache = new Map<string, Promise<ImageInfo>>();
const exists = (p: string) => access(p).then(() => true, () => false);

async function hashFile(buf: Buffer) {
  return createHash('sha1').update(buf).digest('hex').slice(0, 8);
}

export function getImage(src: string, widths?: number[]): Promise<ImageInfo> {
  const key = `${src}|${widths?.join(',') ?? ''}`;
  if (!cache.has(key)) cache.set(key, processImage(src, widths));
  return cache.get(key)!;
}

async function processImage(src: string, widths = DEFAULT_WIDTHS): Promise<ImageInfo> {
  const input = join(paths.img, src);
  const buf = await readFile(input).catch(() => {
    throw new Error(`Imagem não encontrada: src/assets/img/${src}`);
  });
  const hash = await hashFile(buf);
  const meta = await sharp(buf).metadata();
  const ow = meta.width!;
  const oh = meta.height!;
  const name = parse(src).name.replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 80);
  const cap = Math.min(ow, 1600);
  let ws = widths.filter((w) => w < cap);
  ws.push(cap);
  ws = [...new Set(ws)].sort((a, b) => a - b);

  await mkdir(paths.imgCache, { recursive: true });
  await mkdir(paths.distImg, { recursive: true });

  const jobs: Promise<void>[] = [];
  for (const w of ws) {
    for (const fmt of ['avif', 'webp'] as const) {
      const file = `${name}.${hash}-${w}.${fmt}`;
      const cached = join(paths.imgCache, file);
      jobs.push(
        (async () => {
          if (!(await exists(cached))) {
            const pipe = sharp(buf).resize({ width: w, withoutEnlargement: true });
            if (fmt === 'avif') await pipe.avif({ quality: 52, effort: 4, chromaSubsampling: '4:2:0' }).toFile(cached);
            else await pipe.webp({ quality: 76, effort: 5, smartSubsample: true }).toFile(cached);
          }
          await copyFile(cached, join(paths.distImg, file));
        })(),
      );
    }
  }
  await Promise.all(jobs);

  const url = (w: number, fmt: string) => `/img/${name}.${hash}-${w}.${fmt}`;
  const mid = ws.find((w) => w >= 720) ?? ws[ws.length - 1];
  return {
    width: ow,
    height: oh,
    widths: ws,
    avif: ws.map((w) => `${url(w, 'avif')} ${w}w`).join(', '),
    webp: ws.map((w) => `${url(w, 'webp')} ${w}w`).join(', '),
    fallback: url(mid, 'webp'),
    largest: url(ws[ws.length - 1], 'webp'),
  };
}

/** Imagem Open Graph 1200×630 (JPEG) composta com a marca. */
export async function makeOgImage(src: string, slug: string): Promise<string> {
  const file = `og-${slug}.jpg`;
  const out = join(paths.dist, 'og', file);
  const cached = join(paths.imgCache, `og-${slug}-${(await hashFile(await readFile(join(paths.img, src)))).slice(0, 6)}.jpg`);
  await mkdir(join(paths.dist, 'og'), { recursive: true });
  await mkdir(paths.imgCache, { recursive: true });
  if (!(await exists(cached))) {
    const W = 1200, H = 630;
    const blob = Buffer.from(
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${W}" height="${H}" fill="#ffffff"/>
        <path d="M700 40c160-40 400 10 460 170s-20 330-170 390-360 40-450-80-30-440 160-480z" fill="#FF6600"/>
        <path d="M40 560c120-60 260 40 420-10s180-150 300-120" fill="none" stroke="#9AA3A8" stroke-width="5" stroke-linecap="round"/>
      </svg>`,
    );
    const photo = await sharp(join(paths.img, src)).resize({ width: 560, height: 540, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const logo = await sharp(join(paths.img, 'logo-ventura.png')).resize({ width: 460 }).png().toBuffer();
    await sharp(blob)
      .composite([
        { input: logo, left: 70, top: 200 },
        { input: photo, left: 600, top: 50 },
      ])
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(cached);
  }
  await copyFile(cached, out);
  return `/og/${file}`;
}

/** Ícones do app (favicon PNG, apple-touch, PWA) gerados do SVG da marca. */
export async function makeAppIcons(svg: string) {
  const sizes: [string, number, boolean][] = [
    ['favicon-32.png', 32, false],
    ['apple-touch-icon.png', 180, true],
    ['icon-192.png', 192, true],
    ['icon-512.png', 512, true],
    ['icon-maskable-512.png', 512, true],
  ];
  for (const [name, size, bg] of sizes) {
    const maskable = name.includes('maskable');
    const inner = Math.round(size * (maskable ? 0.62 : bg ? 0.8 : 1));
    const icon = await sharp(Buffer.from(svg)).resize(inner, inner).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: bg ? '#ffffff' : { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: icon, gravity: 'center' }])
      .png({ compressionLevel: 9, palette: true })
      .toFile(join(paths.dist, name));
  }
  await writeFile(join(paths.dist, 'favicon.svg'), svg);
}
