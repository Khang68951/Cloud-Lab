import type { LocalizedText, SkillTag } from '@learninglab/shared';

/**
 * Exercise kinds every domain can use. A domain adds its own kinds (e.g. the
 * Cloud domain's canvas challenges) in its own package, extending `BaseExercise`
 * and providing its own grader and player.
 */
export interface BaseExercise {
  /** Globally unique, stable id (progress is stored against it). */
  id: string;
  kind: string;
  skills: SkillTag[];
  /** Progressive hints, shown one at a time. */
  hints?: LocalizedText[];
}

export interface QuizChoice {
  id: string;
  text: LocalizedText;
  correct: boolean;
  /** Why this choice is right or wrong — shown after answering. */
  explain: LocalizedText;
}

export interface ScenarioQuiz extends BaseExercise {
  kind: 'scenario-quiz';
  prompt: LocalizedText;
  choices: QuizChoice[];
}

export interface Estimation extends BaseExercise {
  kind: 'estimation';
  prompt: LocalizedText;
  unit: string;
  answer: number;
  /** Accepted relative error, e.g. 0.15 = ±15%. */
  tolerance: number;
  explain: LocalizedText;
}

/** The exercise kinds that work in any domain. */
export type CommonExercise = ScenarioQuiz | Estimation;

export type CommonAnswer = { kind: 'scenario-quiz'; selected: string[] } | { kind: 'estimation'; value: number };

export interface CheckResult {
  label: LocalizedText;
  passed: boolean;
  /** Actual value, e.g. "$412/month". */
  actual?: string;
}

export interface GradeResult {
  passed: boolean;
  /** 0–100 */
  score: number;
  checks: CheckResult[];
}
