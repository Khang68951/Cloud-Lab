import { findLesson, getExercise } from '@learninglab/content';
import { localize, type Locale } from '@learninglab/shared';
import { lessonPath, parseLessonPath } from '@/app/paths';
import { exerciseAnchor, safeFrom } from '@/lib/returnTo';

export { exerciseAnchor, fromParam, safeFrom } from '@/lib/returnTo';

function lessonTitle(path: string, locale: Locale): string | null {
  const p = parseLessonPath(path);
  const found = p && findLesson(p.track, p.module, p.lesson);
  return found ? localize(found.lesson.title, locale) : null;
}

/**
 * Where the Lab's "back" buttons go. `from` wins when present (the page that
 * opened the Lab); a challenge otherwise returns to its own lesson's card.
 */
export function resolveBackTo(opts: { from: string | null; exerciseId?: string; locale: Locale }): { to: string; label: string | null } | undefined {
  const from = safeFrom(opts.from);
  if (from) return { to: from, label: lessonTitle(from, opts.locale) };
  const ref = opts.exerciseId ? getExercise(opts.exerciseId)?.ref : undefined;
  if (!ref) return undefined;
  return {
    to: `${lessonPath(ref)}#${exerciseAnchor(opts.exerciseId!)}`,
    label: localize(ref.lesson.title, opts.locale),
  };
}
