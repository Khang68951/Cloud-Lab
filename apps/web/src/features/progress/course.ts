import { availableLessonsOf, courseExercises, lessonsOf, tracks } from '@learninglab/content';
import type { TrackMeta } from '@learninglab/shared';
import { useMemo } from 'react';
import { useProgress, type Progress } from './api';

export interface CourseProgress {
  slug: string;
  /** All lessons in the curriculum, including ones still being written. */
  lessonsTotal: number;
  lessonsAvailable: number;
  lessonsDone: number;
  exercisesTotal: number;
  exercisesPassed: number;
  challengesTotal: number;
  challengesPassed: number;
  /** 0–1, lessons done over all lessons of the course. */
  ratio: number;
  started: boolean;
  /** Every lesson written and done, and every Lab challenge passed. */
  completed: boolean;
  /** When the last lesson was completed (for certificates). */
  completedAt: number | null;
  /** First available lesson not yet done. */
  nextLessonUrl: string | null;
}

export function courseProgress(track: TrackMeta, data: Progress): CourseProgress {
  const done = new Map(data.lessons.map((l) => [l.key, l.completedAt]));
  const passed = new Set(data.exercises.filter((e) => e.passed).map((e) => e.exerciseId));
  const all = lessonsOf(track);
  const available = availableLessonsOf(track);
  const exercises = courseExercises(track);
  const challenges = exercises.filter((e) => e.kind === 'canvas-design' || e.kind === 'canvas-fix');
  const lessonsDone = available.filter((l) => done.has(l.key)).length;
  const exercisesPassed = exercises.filter((e) => passed.has(e.id)).length;
  const challengesPassed = challenges.filter((e) => passed.has(e.id)).length;
  const completed =
    all.length > 0 && available.length === all.length && lessonsDone === all.length && challengesPassed === challenges.length;
  const next = available.find((l) => !done.has(l.key));
  const doneTimes = available.map((l) => done.get(l.key)).filter((x): x is number => x !== undefined);
  return {
    slug: track.slug,
    lessonsTotal: all.length,
    lessonsAvailable: available.length,
    lessonsDone,
    exercisesTotal: exercises.length,
    exercisesPassed,
    challengesTotal: challenges.length,
    challengesPassed,
    ratio: all.length ? lessonsDone / all.length : 0,
    started: lessonsDone > 0 || exercisesPassed > 0,
    completed,
    completedAt: completed && doneTimes.length ? Math.max(...doneTimes) : null,
    nextLessonUrl: next ? `/learn/${track.slug}/${next.module.slug}/${next.lesson.slug}` : null,
  };
}

/**
 * Recommended course: the first course in roadmap order that is not finished,
 * has something to study, and whose prerequisites are done; otherwise the first
 * unfinished course with content.
 */
export function recommendedCourse(all: Record<string, CourseProgress>): TrackMeta | undefined {
  const candidates = tracks.filter((t) => !all[t.slug]?.completed && (all[t.slug]?.lessonsAvailable ?? 0) > (all[t.slug]?.lessonsDone ?? 0));
  return candidates.find((t) => t.prerequisites.every((p) => all[p]?.completed)) ?? candidates[0];
}

/** Progress of every course, recomputed when progress data changes. */
export function useCourseProgress() {
  const progress = useProgress();
  const data = progress.data;
  return useMemo(() => {
    const byCourse = Object.fromEntries(tracks.map((t) => [t.slug, courseProgress(t, data)])) as Record<string, CourseProgress>;
    return { byCourse, recommended: recommendedCourse(byCourse), isLoading: progress.isLoading };
  }, [data, progress.isLoading]);
}

/** Missing prerequisites of a course (not completed yet). */
export function missingPrerequisites(track: TrackMeta, all: Record<string, CourseProgress>): TrackMeta[] {
  return track.prerequisites.map((p) => tracks.find((t) => t.slug === p)!).filter((t) => t && !all[t.slug]?.completed);
}
