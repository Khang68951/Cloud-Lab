import type { BaseExercise } from '@learninglab/exercise-kit';
import type { LocalizedText, TrackMeta } from '@learninglab/shared';
import { buildCourse, type CourseExercises, type CourseInput } from './define.ts';

export interface GlossaryTerm {
  term: string;
  /** Short definition. */
  def: LocalizedText;
  /** Related services or terms (searchable). */
  see?: string[];
}

/** A column of the domain's roadmap. Courses pick one with `stage`. */
export interface RoadmapStage {
  stage: number;
  title: LocalizedText;
  body: LocalizedText;
}

/**
 * Everything a domain contributes to the course registry. The web app adds the
 * domain's own pages and tools on top (apps/web/src/domains/<id>).
 */
export interface DomainContent<E extends BaseExercise = BaseExercise> {
  id: string;
  /** Courses in roadmap order. */
  tracks: TrackMeta[];
  /** Exercises per course slug. */
  exercises: Record<string, CourseExercises<E>>;
  glossary: GlossaryTerm[];
  stages: RoadmapStage[];
}

export interface CourseModule<E extends BaseExercise = BaseExercise> {
  track: CourseInput;
  exercises: CourseExercises<E>;
}

/** Build and validate every course of a domain (fails fast on content mistakes). */
export function buildDomain<E extends BaseExercise>(
  id: string,
  courses: CourseModule<E>[],
  extra: { glossary?: GlossaryTerm[]; stages?: RoadmapStage[] } = {},
): DomainContent<E> {
  const tracks = courses.map((c) => buildCourse(id, c.track, c.exercises));
  for (const t of tracks) {
    if (extra.stages && !extra.stages.some((s) => s.stage === t.stage)) {
      throw new Error(`Course "${t.slug}" is in stage ${t.stage}, which domain "${id}" does not define`);
    }
  }
  return {
    id,
    tracks,
    exercises: Object.fromEntries(courses.map((c) => [c.track.slug, c.exercises])),
    glossary: extra.glossary ?? [],
    stages: extra.stages ?? [],
  };
}
