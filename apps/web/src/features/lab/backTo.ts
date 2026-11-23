import { findLesson, getExercise } from '@cloudlab/content';
import { localize } from '@cloudlab/shared';
import type { Locale } from '@cloudlab/shared';

/** Only same-app paths are accepted from `?from=` (no protocol-relative or external URLs). */
export function safeFrom(v: string | null): string | null {
  return v && v.startsWith('/') && !v.startsWith('//') ? v : null;
}

/** Anchor id of an exercise card (ExerciseShell) — the lesson scrolls to it on return. */
export const exerciseAnchor = (id: string) => `ex-${id}`;

/** Builds a `?from=` value pointing back at the current page and an anchor on it. */
export function fromParam(pathname: string, anchor: string): string {
  return `from=${encodeURIComponent(`${pathname}#${anchor}`)}`;
}

function lessonTitle(path: string, locale: Locale): string | null {
  const parts = path.split(/[?#]/)[0]!.split('/');
  if (parts.length !== 5 || parts[1] !== 'learn') return null;
  const found = findLesson(parts[2]!, parts[3]!, parts[4]!);
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
    to: `/learn/${ref.track.slug}/${ref.module.slug}/${ref.lesson.slug}#${exerciseAnchor(opts.exerciseId!)}`,
    label: localize(ref.lesson.title, opts.locale),
  };
}
