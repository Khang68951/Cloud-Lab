import type { Estimation, ScenarioQuiz } from '@learninglab/exercise-kit';
import type { LocalizedText, SkillTag } from '@learninglab/shared';

type T = LocalizedText;

/**
 * Builders for the exercise kinds every domain has. `prefix` (the course slug)
 * namespaces ids so progress stays stable, e.g. "aws-networking.cidr-size".
 * A domain adds builders for its own kinds next to these.
 */
export function commonBuilders(prefix: string) {
  const quiz = (id: string, skills: SkillTag[], prompt: T, choices: [string, T, boolean, T][], hints: T[] = []): ScenarioQuiz => ({
    id: `${prefix}.${id}`,
    kind: 'scenario-quiz',
    skills,
    prompt,
    choices: choices.map(([id, text, correct, explain]) => ({ id, text, correct, explain })),
    hints,
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
    prompt,
    unit,
    answer,
    tolerance,
    explain,
    hints,
  });
  return { quiz, estimate };
}

/**
 * Lesson outline entry. Its status is derived (see `buildCourse`): shown as
 * "being written" until it has its exercises; tests check both MDX files exist.
 */
export function lesson(slug: string, title: T, summary: T, estMinutes: number) {
  return { slug, title, summary, estMinutes };
}

/** Module outline entry. Practice badges and status are derived from its exercises. */
export function mod(slug: string, icon: string, title: T, summary: T, lessons: ReturnType<typeof lesson>[]) {
  return { slug, icon, title, summary, lessons };
}
