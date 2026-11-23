import type { Locale } from '@cloudlab/shared';
import type { MDXContent } from 'mdx/types';

/**
 * All lesson MDX files, lazily loaded:
 *   packages/content/src/tracks/<track>/lessons/<module>/<lesson>.<locale>.mdx
 * A missing translation falls back to English.
 */
const files = import.meta.glob<{ default: MDXContent }>('../../../../../packages/content/src/tracks/*/lessons/*/*.mdx');

const index = new Map<string, () => Promise<{ default: MDXContent }>>();
for (const [path, load] of Object.entries(files)) {
  const m = path.match(/tracks\/([^/]+)\/lessons\/([^/]+)\/([^/.]+)\.([a-z]{2})\.mdx$/);
  if (m) index.set(`${m[1]}/${m[2]}/${m[3]}:${m[4]}`, load);
}

export function hasLessonContent(key: string, locale: Locale): boolean {
  return index.has(`${key}:${locale}`);
}

export async function loadLessonContent(key: string, locale: Locale): Promise<{ Content: MDXContent; locale: Locale } | null> {
  const exact = index.get(`${key}:${locale}`);
  if (exact) return { Content: (await exact()).default, locale };
  const fallback = index.get(`${key}:en`);
  if (fallback) return { Content: (await fallback()).default, locale: 'en' };
  return null;
}
