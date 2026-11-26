import { cloudContent } from '@learninglab/cloud-content';
import type { CloudExercise } from '@learninglab/cloud-challenges';
import { lessonsOf, type DomainContent, type GlossaryTerm, type LessonRef, type RoadmapStage } from '@learninglab/course-kit';
import type { TrackMeta } from '@learninglab/shared';

export { availableLessonsOf, lessonKey, lessonsOf, MIN_EXERCISES, type GlossaryTerm, type LessonRef, type RoadmapStage } from '@learninglab/course-kit';

/**
 * Course registry of the whole app: every domain's courses and exercises.
 * A new domain = a content package exporting a `DomainContent` + one line in
 * DOMAINS + its exercise type in `Exercise`.
 */
export type Exercise = CloudExercise;

const DOMAINS: DomainContent<Exercise>[] = [cloudContent];

/** Domain ids that have content, in display order. */
export const contentDomains: readonly string[] = DOMAINS.map((d) => d.id);

/** Every course of every domain. */
export const tracks: readonly TrackMeta[] = DOMAINS.flatMap((d) => d.tracks);

const EXERCISES = Object.assign({}, ...DOMAINS.map((d) => d.exercises)) as DomainContent<Exercise>['exercises'];

/** Courses of one domain, in roadmap order. */
export function tracksOf(domain: string): readonly TrackMeta[] {
  return tracks.filter((t) => t.domain === domain);
}

export function getTrack(slug: string): TrackMeta | undefined {
  return tracks.find((t) => t.slug === slug);
}

export function glossaryOf(domain: string): readonly GlossaryTerm[] {
  return DOMAINS.find((d) => d.id === domain)?.glossary ?? [];
}

/** A lesson plus its previous/next *available* lessons for navigation. */
export function findLesson(trackSlug: string, moduleSlug: string, lessonSlug: string) {
  const track = getTrack(trackSlug);
  if (!track) return undefined;
  const all = lessonsOf(track);
  const i = all.findIndex((l) => l.module.slug === moduleSlug && l.lesson.slug === lessonSlug);
  if (i < 0) return undefined;
  const ready = (l: LessonRef) => l.lesson.status === 'available';
  return { ...all[i]!, prev: all.slice(0, i).reverse().find(ready), next: all.slice(i + 1).find(ready) };
}

export function lessonExercises(trackSlug: string, moduleSlug: string, lessonSlug: string): Exercise[] {
  return EXERCISES[trackSlug]?.[moduleSlug]?.[lessonSlug] ?? [];
}

export function courseExercises(track: TrackMeta): Exercise[] {
  return lessonsOf(track).flatMap((l) => lessonExercises(track.slug, l.module.slug, l.lesson.slug));
}

export interface ExerciseEntry {
  exercise: Exercise;
  ref: LessonRef;
}

export const allExercises: ExerciseEntry[] = tracks.flatMap((track) =>
  lessonsOf(track).flatMap((ref) =>
    lessonExercises(track.slug, ref.module.slug, ref.lesson.slug).map((exercise) => ({ exercise, ref })),
  ),
);

/** Exercises of one domain's courses. */
export function exercisesOf(domain: string): ExerciseEntry[] {
  return allExercises.filter((e) => e.ref.track.domain === domain);
}

const BY_ID = new Map(allExercises.map((e) => [e.exercise.id, e]));

export function getExercise(id: string): ExerciseEntry | undefined {
  return BY_ID.get(id);
}

/** A domain's courses grouped by roadmap stage (only stages that have courses). */
export function roadmapStages(domain: string): (RoadmapStage & { courses: TrackMeta[] })[] {
  const d = DOMAINS.find((x) => x.id === domain);
  if (!d) return [];
  return [...d.stages]
    .sort((a, b) => a.stage - b.stage)
    .map((s) => ({ ...s, courses: d.tracks.filter((t) => t.stage === s.stage) }))
    .filter((s) => s.courses.length > 0);
}
