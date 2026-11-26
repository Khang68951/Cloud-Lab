import { isCanvasChallenge } from '@learninglab/cloud-challenges';
import { SERVICES } from '@learninglab/cloud-catalog';
import { exercisesOf } from '@learninglab/content';
import { localize, type Locale } from '@learninglab/shared';
import { searchEntry as e, type SearchEntry } from '@/features/search/entry';
import { challengePath, CLOUD, explorePath } from './paths';

/** Lab challenges and AWS services (courses, lessons and glossary are indexed for every domain). */
export function cloudSearch(locale: Locale): SearchEntry[] {
  return [
    ...exercisesOf(CLOUD).flatMap(({ exercise: ex, ref }) =>
      isCanvasChallenge(ex) ? [e('challenge', localize(ex.title, locale), localize(ref.lesson.title, locale), challengePath(ex.id), ex.title.en)] : [],
    ),
    ...SERVICES.filter((s) => s.behavior !== 'client').map((s) =>
      e('service', s.short, `${s.name} — ${localize(s.description, locale)}`, explorePath(s.id), s.equivalents ? `${s.equivalents.azure} ${s.equivalents.gcp}` : ''),
    ),
  ];
}
