import type { Design, Scenario } from '@learninglab/cloud-catalog';
import type { BaseExercise, CommonAnswer, CommonExercise } from '@learninglab/exercise-kit';
import type { LocalizedText } from '@learninglab/shared';
import type { ChaosOptions, Severity } from '@learninglab/cloud-sim';

export type MetricKey = 'monthlyUsd' | 'latencyMs' | 'p95Ms' | 'availability' | 'errorRate' | 'maxPeakRps';

export type Requirement =
  | { type: 'metric'; metric: MetricKey; op: '<=' | '>='; value: number }
  | { type: 'survives'; chaos: ChaosOptions; label: LocalizedText }
  | { type: 'no-findings'; severity: Severity; pillar?: 'reliability' | 'performance' | 'cost' | 'security' | 'operational' }
  /** A specific reviewer finding (by id prefix, e.g. "nat-to-aws") must be gone. */
  | { type: 'no-finding'; prefix: string; label: LocalizedText }
  | { type: 'uses'; services: string[]; label: LocalizedText }
  | { type: 'not-uses'; services: string[]; label: LocalizedText }
  /**
   * Structure check: every step must be matched by a node wired to at least
   * one other node (order and path do not matter). Stops "Users → Lambda" from
   * counting as a full API when the job needs a front door and a data store.
   */
  | { type: 'flow'; steps: FlowStep[]; label?: LocalizedText };

/**
 * One hop of a `flow` requirement: a role (any service that plays it) or an
 * explicit list of service ids (any of them).
 */
export type FlowRole = 'entry' | 'compute' | 'data' | 'cache' | 'queue' | 'pubsub' | 'async';
export type FlowStep = FlowRole | string[];

export interface CanvasChallenge extends BaseExercise {
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
  /**
   * Security groups start empty and the learner writes every rule. Set by the
   * content registry once the learner has studied security groups.
   */
  manualSg?: boolean;
}

/** Every exercise a Cloud course can contain. */
export type CloudExercise = CommonExercise | CanvasChallenge;

export type CanvasAnswer = { kind: 'canvas-design' | 'canvas-fix'; design: Design };
export type CloudAnswer = CommonAnswer | CanvasAnswer;

export const isCanvasChallenge = (ex: { kind: string }): ex is CanvasChallenge => ex.kind === 'canvas-design' || ex.kind === 'canvas-fix';
