import { tx } from '@cloudlab/catalog';
import type { Estimation, ScenarioQuiz } from '@cloudlab/exercise-kit';
import type { ContentStatus, ExerciseKind, LessonMeta, LocalizedText, SkillTag } from '@cloudlab/shared';

/** [english, vietnamese] — compact bilingual text for content files. */
export type T = [en: string, vi: string];
export const L = ([en, vi]: T): LocalizedText => tx(en, vi);

/**
 * Exercise builders shared by every course. `prefix` namespaces ids per course
 * so progress stays stable (e.g. "aws-networking" → "aws-networking.cidr-size").
 */
export function exerciseBuilders(prefix: string) {
  const quiz = (id: string, skills: SkillTag[], prompt: T, choices: [string, T, boolean, T][], hints: T[] = []): ScenarioQuiz => ({
    id: `${prefix}.${id}`,
    kind: 'scenario-quiz',
    skills,
    prompt: L(prompt),
    choices: choices.map(([cid, text, correct, explain]) => ({ id: cid, text: L(text), correct, explain: L(explain) })),
    hints: hints.map(L),
  });
  const estimate = (
    id: string,
    skills: SkillTag[],
    prompt: T,
    unit: string,
    answer: number,
    tolerance: number,
    explain: T,
    hints: T[] = [],
  ): Estimation => ({
    id: `${prefix}.${id}`,
    kind: 'estimation',
    skills,
    prompt: L(prompt),
    unit,
    answer,
    tolerance,
    explain: L(explain),
    hints: hints.map(L),
  });
  return { quiz, estimate };
}

/**
 * Lesson outline entry. Lessons start as "planned" (shown as "being written");
 * flip to "available" once both MDX files and the exercises exist — the
 * content tests enforce that.
 */
export function lesson(slug: string, title: T, summary: T, estMinutes: number, status: ContentStatus = 'planned'): LessonMeta {
  return { slug, title: L(title), summary: L(summary), estMinutes, status, skills: [] };
}

/** Module outline entry. */
export function mod(slug: string, icon: string, title: T, summary: T, practice: ExerciseKind[], lessons: LessonMeta[]) {
  return { slug, icon, title: L(title), summary: L(summary), practice, lessons };
}
