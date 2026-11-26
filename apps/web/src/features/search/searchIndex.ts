import { contentDomains, glossaryOf, lessonsOf, tracks } from '@learninglab/content';
import { localize, type Locale } from '@learninglab/shared';
import { coursePath, domainPath, lessonPath } from '@/app/paths';
import { DOMAINS } from '@/domains';
import { normalize, searchEntry as e, termId, type SearchEntry, type SearchKind } from './entry';

export { normalize, termId, type SearchEntry, type SearchKind };

const cache = new Map<Locale, SearchEntry[]>();

/**
 * Courses, lessons and glossary terms of every domain, plus whatever each
 * domain indexes itself (DomainDefinition.search: tools, reference pages).
 */
export function buildIndex(locale: Locale): SearchEntry[] {
  const hit = cache.get(locale);
  if (hit) return hit;
  const entries: SearchEntry[] = [
    ...tracks.map((t) => e('course', localize(t.title, locale), localize(t.tagline, locale), coursePath(t), `${t.title.en} ${t.slug}`)),
    ...tracks.flatMap((t) =>
      lessonsOf(t)
        .filter((l) => l.lesson.status === 'available')
        .map((l) =>
          e(
            'lesson',
            localize(l.lesson.title, locale),
            `${localize(t.title, locale)} · ${localize(l.module.title, locale)}`,
            lessonPath(l),
            `${l.lesson.title.en} ${l.lesson.summary ? localize(l.lesson.summary, locale) : ''}`,
          ),
        ),
    ),
    ...contentDomains.flatMap((d) =>
      glossaryOf(d).map((g) => e('term', g.term, localize(g.def, locale), `${domainPath(d, 'glossary')}#${termId(g.term)}`, (g.see ?? []).join(' '))),
    ),
    ...DOMAINS.flatMap((d) => d.search?.(locale) ?? []),
  ];
  cache.set(locale, entries);
  return entries;
}

/** All query words must match; titles that start with the query rank first. */
export function search(locale: Locale, query: string, limitPerKind = 6): SearchEntry[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const words = q.split(/\s+/);
  const scored = buildIndex(locale)
    .filter((x) => words.every((w) => x.haystack.includes(w)))
    .map((x) => ({ x, score: x.titleKey.startsWith(q) ? 0 : x.titleKey.includes(q) ? 1 : 2 }))
    .sort((a, b) => a.score - b.score || a.x.title.length - b.x.title.length);
  const perKind = new Map<SearchKind, number>();
  const out: SearchEntry[] = [];
  for (const { x } of scored) {
    const n = perKind.get(x.kind) ?? 0;
    if (n >= limitPerKind) continue;
    perKind.set(x.kind, n + 1);
    out.push(x);
  }
  return out;
}
