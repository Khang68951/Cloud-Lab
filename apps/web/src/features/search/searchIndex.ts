import { allExercises, GLOSSARY, lessonsOf, tracks } from '@learninglab/content';
import { SERVICES } from '@learninglab/catalog';
import { localize, type Locale } from '@learninglab/shared';

export type SearchKind = 'course' | 'lesson' | 'challenge' | 'service' | 'term';

export interface SearchEntry {
  kind: SearchKind;
  title: string;
  subtitle: string;
  url: string;
  /** Lower-cased, accent-free text used for matching. */
  haystack: string;
  titleKey: string;
}

export const termId = (term: string) => `term-${term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/** Lower-case and strip accents so "bao mat" finds "bảo mật". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

const cache = new Map<Locale, SearchEntry[]>();

export function buildIndex(locale: Locale): SearchEntry[] {
  const hit = cache.get(locale);
  if (hit) return hit;
  const e = (kind: SearchKind, title: string, subtitle: string, url: string, extra = ''): SearchEntry => ({
    kind,
    title,
    subtitle,
    url,
    titleKey: normalize(title),
    haystack: normalize(`${title} ${subtitle} ${extra}`),
  });
  const entries: SearchEntry[] = [
    ...tracks.map((t) => e('course', localize(t.title, locale), localize(t.tagline, locale), `/learn/${t.slug}`, `${t.title.en} ${t.slug}`)),
    ...tracks.flatMap((t) =>
      lessonsOf(t)
        .filter((l) => l.lesson.status === 'available')
        .map((l) =>
          e(
            'lesson',
            localize(l.lesson.title, locale),
            `${localize(t.title, locale)} · ${localize(l.module.title, locale)}`,
            `/learn/${t.slug}/${l.module.slug}/${l.lesson.slug}`,
            `${l.lesson.title.en} ${l.lesson.summary ? localize(l.lesson.summary, locale) : ''}`,
          ),
        ),
    ),
    ...allExercises
      .filter((x) => x.exercise.kind === 'canvas-design' || x.exercise.kind === 'canvas-fix')
      .map((x) => {
        const ex = x.exercise as Extract<typeof x.exercise, { title: unknown }>;
        return e('challenge', localize(ex.title, locale), localize(x.ref.lesson.title, locale), `/lab/challenge/${ex.id}`, ex.title.en);
      }),
    ...SERVICES.filter((s) => s.behavior !== 'client').map((s) =>
      e('service', s.short, `${s.name} — ${localize(s.description, locale)}`, `/explore?service=${s.id}`, s.equivalents ? `${s.equivalents.azure} ${s.equivalents.gcp}` : ''),
    ),
    ...GLOSSARY.map((g) => e('term', g.term, localize(g.def, locale), `/glossary#${termId(g.term)}`, (g.see ?? []).join(' '))),
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
