import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths } from './paths.ts';
import { categories } from './site.ts';

export type Post = {
  slug: string;
  path: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  categories: string[];
  image: string | null;
  words: number;
  content: string;
  readingMinutes: number;
};

let all: Post[] | null = null;

export function getPosts(): Post[] {
  if (all) return all;
  all = readdirSync(paths.posts)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const p = JSON.parse(readFileSync(join(paths.posts, f), 'utf8'));
      return { ...p, readingMinutes: Math.max(2, Math.round(p.words / 200)) } as Post;
    })
    .sort((a, b) => b.datePublished.localeCompare(a.datePublished));
  return all;
}

export function resetPosts() {
  all = null;
}

export function categoryName(slug: string) {
  return categories[slug] ?? slug;
}

/** Posts relacionados por categoria em comum (exclui o próprio). */
export function relatedPosts(post: Post, n = 3) {
  const scored = getPosts()
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, score: p.categories.filter((c) => post.categories.includes(c) && c !== 'dicas-e-curiosidades').length * 2 + p.categories.filter((c) => post.categories.includes(c)).length }))
    .sort((a, b) => b.score - a.score || b.p.datePublished.localeCompare(a.p.datePublished));
  return scored.slice(0, n).map((s) => s.p);
}

const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
export function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} de ${months[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}
