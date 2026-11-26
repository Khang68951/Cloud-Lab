import { z } from 'zod';

/**
 * Every kind of hands-on practice Learning Lab knows about. Each kind gets a
 * Player (UI) + a pure `grade()` function in the Exercise Kit (Phase 1+).
 * New subjects can add new kinds (e.g. `sql-query`, `k8s-manifest`) here.
 */
export const EXERCISE_KINDS = [
  'scenario-quiz',
  'estimation',
  'canvas-design',
  'canvas-fix',
  'cli-lab',
  'console-lab',
  'iam-policy',
  'vpc-reachability',
  'dynamo-model',
  'cost-detective',
  'incident',
  'iac',
] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];
export const exerciseKindSchema = z.enum(EXERCISE_KINDS);
