import type { Design, Scenario } from '@cloudlab/catalog';
import type { LocalizedText, SkillTag } from '@cloudlab/shared';
import type { ChaosOptions, Severity } from '@cloudlab/sim-engine';

interface Base {
  /** Globally unique, stable id (progress is stored against it). */
  id: string;
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

export interface ScenarioQuiz extends Base {
  kind: 'scenario-quiz';
  prompt: LocalizedText;
  choices: QuizChoice[];
}

export interface Estimation extends Base {
  kind: 'estimation';
  prompt: LocalizedText;
  unit: string;
  answer: number;
  /** Accepted relative error, e.g. 0.15 = ±15%. */
  tolerance: number;
  explain: LocalizedText;
}

export type MetricKey = 'monthlyUsd' | 'latencyMs' | 'p95Ms' | 'availability' | 'errorRate' | 'maxPeakRps';

export type Requirement =
  | { type: 'metric'; metric: MetricKey; op: '<=' | '>='; value: number }
  | { type: 'survives'; chaos: ChaosOptions; label: LocalizedText }
  | { type: 'no-findings'; severity: Severity; pillar?: 'reliability' | 'performance' | 'cost' | 'security' | 'operational' }
  /** A specific reviewer finding (by id prefix, e.g. "nat-to-aws") must be gone. */
  | { type: 'no-finding'; prefix: string; label: LocalizedText }
  | { type: 'uses'; services: string[]; label: LocalizedText }
  | { type: 'not-uses'; services: string[]; label: LocalizedText };

export interface CanvasChallenge extends Base {
  kind: 'canvas-design' | 'canvas-fix';
  title: LocalizedText;
  brief: LocalizedText;
  /** Traffic the design must handle (locked while solving). */
  scenario: Scenario;
  /** Starting diagram (canvas-fix: a broken/expensive design). */
  starter: Design;
  requirements: Requirement[];
  /** Shown after passing: why the reference works, trade-offs. */
  debrief: LocalizedText;
  /** A design that passes — verified by tests. */
  reference: Design;
}

export type Exercise = ScenarioQuiz | Estimation | CanvasChallenge;

export type Answer =
  | { kind: 'scenario-quiz'; selected: string[] }
  | { kind: 'estimation'; value: number }
  | { kind: 'canvas-design' | 'canvas-fix'; design: Design };

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
