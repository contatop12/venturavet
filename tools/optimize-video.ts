/**
 * Otimiza vídeos para a web com ffmpeg.
 *   1. Coloque os originais em src/assets/video/ (mp4, mov, m4v, webm)
 *   2. npm run media:video
 * Gera em src/static/video/:
 *   <nome>.mp4  — H.264 (CRF 26, até 1280 px, faststart, sem áudio por padrão)
 *   <nome>.webm — VP9 (CRF 36), menor para navegadores modernos
 *   <nome>.jpg  — pôster (primeiro quadro nítido)
 * Use no HTML: <x-video src="nome" alt="descrição"></x-video>
 * Flags: --keep-audio  mantém o áudio (AAC 96k / Opus 64k)
 */
import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IN = join(ROOT, 'src/assets/video');
const OUT = join(ROOT, 'src/static/video');
const keepAudio = process.argv.includes('--keep-audio');

function ff(args: string[]) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg falhou: ${args.join(' ')}`);
}

const files = (await readdir(IN).catch(() => [] as string[])).filter((f) => /\.(mp4|mov|m4v|webm)$/i.test(f));
if (!files.length) {
  console.log('Nenhum vídeo em src/assets/video/.');
  process.exit(0);
}
await mkdir(OUT, { recursive: true });
const scale = "scale='min(1280,iw)':-2:flags=lanczos";
for (const f of files) {
  const src = join(IN, f);
  const name = parse(f).name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const audioMp4 = keepAudio ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an'];
  const audioWebm = keepAudio ? ['-c:a', 'libopus', '-b:a', '64k'] : ['-an'];
  ff(['-i', src, '-vf', scale, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', ...audioMp4, join(OUT, `${name}.mp4`)]);
  ff(['-i', src, '-vf', scale, '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', ...audioWebm, join(OUT, `${name}.webm`)]);
  ff(['-ss', '0.5', '-i', src, '-vf', scale, '-frames:v', '1', '-q:v', '4', join(OUT, `${name}.jpg`)]);
  const kb = async (p: string) => ((await stat(p)).size / 1024).toFixed(0);
  console.log(`✓ ${name}: original ${await kb(src)} KB → mp4 ${await kb(join(OUT, `${name}.mp4`))} KB, webm ${await kb(join(OUT, `${name}.webm`))} KB`);
}
