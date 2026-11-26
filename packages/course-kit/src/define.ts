import type { BaseExercise } from '@learninglab/exercise-kit';
import {
  EXERCISE_KINDS,
  trackMetaSchema,
  type ContentStatus,
  type TrackMeta,
  type TrackMetaInput,
} from '@learninglab/shared';

/** Exercises of one course, keyed module slug → lesson slug. Order = order shown. */
export type CourseExercises<E extends BaseExercise = BaseExercise> = Record<string, Record<string, E[]>>;

/** A lesson becomes "available" once it has at least this many exercises. */
export const MIN_EXERCISES = 3;

/**
 * Validate a track. Runs at import time, so a typo in content (bad slug,
 * duplicate module, unknown exercise kind) fails fast in dev, tests and
 * `npm run check`.
 */
export function defineTrack(input: TrackMetaInput): TrackMeta {
  const parsed = trackMetaSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid track "${input.slug}":\n${issues}`);
  }
  return parsed.data;
}

/**
 * Course outline as written in `track.ts`: no status or practice badges (those
 * are derived) and no domain (set by the domain that registers the course).
 */
export type CourseInput = Omit<TrackMetaInput, 'status' | 'domain'>;

export const defineCourse = (input: CourseInput): CourseInput => input;

/** "available" if every item is, "planned" if none is, otherwise "in-progress". */
function rollUp(statuses: ContentStatus[]): ContentStatus {
  if (statuses.length === 0) return 'planned';
  const ready = statuses.filter((s) => s === 'available').length;
  if (ready === statuses.length) return 'available';
  return ready === 0 && statuses.every((s) => s === 'planned') ? 'planned' : 'in-progress';
}

/**
 * Join a course outline with its exercises and derive everything else:
 * - lesson status: `available` once it has ≥ MIN_EXERCISES exercises
 *   (content tests check the MDX files exist),
 * - module practice badges: the exercise kinds it actually uses,
 * - module and course status: rolled up from the lessons.
 * Exercises filed under a module/lesson that does not exist throw.
 */
export function buildCourse(domain: string, input: CourseInput, exercises: CourseExercises): TrackMeta {
  const track = defineTrack({ ...input, domain, status: 'planned' });
  for (const [m, lessons] of Object.entries(exercises)) {
    for (const l of Object.keys(lessons)) {
      const ok = track.modules.find((x) => x.slug === m)?.lessons.some((x) => x.slug === l);
      if (!ok) throw new Error(`Course "${track.slug}": exercises filed under unknown lesson "${m}/${l}"`);
    }
  }
  const modules = track.modules.map((m) => {
    const lessons = m.lessons.map((l) => {
      const count = exercises[m.slug]?.[l.slug]?.length ?? 0;
      return { ...l, status: count >= MIN_EXERCISES ? ('available' as const) : ('planned' as const) };
    });
    const kinds = new Set<string>(lessons.flatMap((l) => (exercises[m.slug]?.[l.slug] ?? []).map((e) => e.kind)));
    return {
      ...m,
      lessons,
      practice: EXERCISE_KINDS.filter((k) => kinds.has(k)),
      status: rollUp(lessons.map((l) => l.status)),
    };
  });
  return { ...track, modules, status: rollUp(modules.map((m) => m.status)) };
}
