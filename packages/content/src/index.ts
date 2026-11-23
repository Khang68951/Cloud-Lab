import type { Exercise } from '@cloudlab/exercise-kit';
import type { LessonMeta, ModuleMeta, TrackMeta } from '@cloudlab/shared';
import * as analytics from './tracks/aws-analytics/index.ts';
import * as compute from './tracks/aws-compute/index.ts';
import * as cost from './tracks/aws-cost/index.ts';
import * as data from './tracks/aws-data/index.ts';
import * as devops from './tracks/aws-devops/index.ts';
import * as networking from './tracks/aws-networking/index.ts';
import * as reliability from './tracks/aws-reliability/index.ts';
import * as security from './tracks/aws-security/index.ts';
import * as serverless from './tracks/aws-serverless/index.ts';
import * as systemDesign from './tracks/aws-system-design/index.ts';
import * as core from './tracks/aws/index.ts';

export { defineTrack } from './define.ts';
export { GLOSSARY, type GlossaryTerm } from './glossary.ts';

interface CourseModule {
  track: TrackMeta;
  exercises: Record<string, Record<string, Exercise[]>>;
}

/**
 * Every course, in roadmap order. A new course = a folder under tracks/
 * exporting { track, exercises } + one line here.
 */
const COURSES: CourseModule[] = [core, security, networking, compute, data, serverless, reliability, cost, devops, analytics, systemDesign];

export const tracks: readonly TrackMeta[] = COURSES.map((c) => c.track);

const EXERCISES: Record<string, Record<string, Record<string, Exercise[]>>> = Object.fromEntries(
  COURSES.map((c) => [c.track.slug, c.exercises]),
);

export function getTrack(slug: string): TrackMeta | undefined {
  return tracks.find((t) => t.slug === slug);
}

export const lessonKey = (track: string, module: string, lesson: string) => `${track}/${module}/${lesson}`;

export interface LessonRef {
  track: TrackMeta;
  module: ModuleMeta;
  moduleIndex: number;
  lesson: LessonMeta;
  key: string;
}

/** Every lesson of a course in reading order. */
export function lessonsOf(track: TrackMeta): LessonRef[] {
  return track.modules.flatMap((module, moduleIndex) =>
    module.lessons.map((lesson) => ({ track, module, moduleIndex, lesson, key: lessonKey(track.slug, module.slug, lesson.slug) })),
  );
}

/** Lessons whose content is written (planned ones are shown as "being written"). */
export function availableLessonsOf(track: TrackMeta): LessonRef[] {
  return lessonsOf(track).filter((l) => l.lesson.status === 'available');
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

const BY_ID = new Map(allExercises.map((e) => [e.exercise.id, e]));

export function getExercise(id: string): ExerciseEntry | undefined {
  return BY_ID.get(id);
}

/** Courses grouped by roadmap stage. */
export function roadmapStages(): { stage: number; courses: TrackMeta[] }[] {
  const stages = [...new Set(tracks.map((t) => t.stage))].sort((a, b) => a - b);
  return stages.map((stage) => ({ stage, courses: tracks.filter((t) => t.stage === stage) }));
}
