import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
/** VV_DIST permite compilar em outra pasta (ex.: builds paralelos de revisão); o padrão é dist/. */
const dist = join(root, process.env.VV_DIST ?? 'dist');

export const paths = {
  root,
  src: join(root, 'src'),
  pages: join(root, 'src/pages'),
  partials: join(root, 'src/partials'),
  css: join(root, 'src/css'),
  ts: join(root, 'src/ts'),
  img: join(root, 'src/assets/img'),
  fonts: join(root, 'src/assets/fonts'),
  static: join(root, 'src/static'),
  posts: join(root, 'content/posts'),
  dist,
  distImg: join(dist, 'img'),
  distAssets: join(dist, 'assets'),
  imgCache: join(root, '.cache/img'),
};
