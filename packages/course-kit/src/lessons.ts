import type { LessonMeta, ModuleMeta, TrackMeta } from '@learninglab/shared';

/** Progress key of a lesson: "<track>/<module>/<lesson>" (track slugs are unique across domains). */
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
