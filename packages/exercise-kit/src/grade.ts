import { tx } from '@learninglab/shared';
import type { CommonAnswer, Estimation, GradeResult, ScenarioQuiz } from './types.ts';

export function gradeQuiz(ex: ScenarioQuiz, selected: string[]): GradeResult {
  const picked = new Set(selected);
  const checks = ex.choices.map((c) => ({ label: c.text, passed: picked.has(c.id) === c.correct }));
  const passed = checks.every((c) => c.passed);
  return { passed, score: passed ? 100 : 0, checks };
}

export function gradeEstimation(ex: Estimation, value: number): GradeResult {
  const err = ex.answer === 0 ? Math.abs(value) : Math.abs(value - ex.answer) / Math.abs(ex.answer);
  const passed = err <= ex.tolerance;
  const close = err <= ex.tolerance * 2;
  return {
    passed,
    score: passed ? 100 : close ? 50 : 0,
    checks: [
      {
        label: tx(`Within ±${Math.round(ex.tolerance * 100)}% of the answer`, `Sai số trong khoảng ±${Math.round(ex.tolerance * 100)}%`),
        passed,
        actual: `${Math.round(err * 100)}%`,
      },
    ],
  };
}

/** Pure grading entry point for the common exercise kinds. */
export function grade(ex: ScenarioQuiz | Estimation, answer: CommonAnswer): GradeResult {
  if (ex.kind !== answer.kind) throw new Error(`Answer kind ${answer.kind} does not match exercise ${ex.id} (${ex.kind})`);
  return ex.kind === 'scenario-quiz'
    ? gradeQuiz(ex, (answer as Extract<CommonAnswer, { kind: 'scenario-quiz' }>).selected)
    : gradeEstimation(ex, (answer as Extract<CommonAnswer, { kind: 'estimation' }>).value);
}
