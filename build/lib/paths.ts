import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));

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
  dist: join(root, 'dist'),
  distImg: join(root, 'dist/img'),
  distAssets: join(root, 'dist/assets'),
  imgCache: join(root, '.cache/img'),
};
