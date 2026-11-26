import { getService } from '@learninglab/cloud-catalog';
import type { FlowRole, FlowStep, Requirement } from './types.ts';

/**
 * Caches, queues and topics/streams are how you *optimise* a system, not its
 * core. Requirements about them are hidden from the learner until a hint
 * reveals them, but they are still graded.
 */
const OPT_BEHAVIORS = new Set(['cache', 'queue', 'pubsub']);
const OPT_ROLES = new Set<FlowRole>(['cache', 'queue', 'pubsub', 'async']);

const isOptService = (id: string) => OPT_BEHAVIORS.has(getService(id)?.behavior ?? '');
const isOptStep = (step: FlowStep) => (Array.isArray(step) ? step.length > 0 && step.every(isOptService) : OPT_ROLES.has(step));

export interface SplitRequirements {
  /** Shown from the start. */
  core: Requirement[];
  /** Hidden until revealed by hints; still required to pass. */
  optimizations: Requirement[];
}

/**
 * Split a challenge's requirements into core and optimisation ones. A flow that
 * mixes both is split into two flows; since a flow only checks that each step's
 * component is present and wired, the two halves grade exactly like the whole.
 * A flow with a custom label that mentions an optimisation stays whole (its
 * label describes the optimisation).
 */
export function splitRequirements(requirements: Requirement[]): SplitRequirements {
  const core: Requirement[] = [];
  const optimizations: Requirement[] = [];
  for (const r of requirements) {
    if (r.type === 'uses') {
      (r.services.length > 0 && r.services.every(isOptService) ? optimizations : core).push(r);
    } else if (r.type === 'flow') {
      const opt = r.steps.filter(isOptStep);
      if (opt.length === 0) core.push(r);
      else if (r.label) optimizations.push(r);
      else {
        const rest = r.steps.filter((s) => !isOptStep(s));
        if (rest.length) core.push({ type: 'flow', steps: rest });
        optimizations.push({ type: 'flow', steps: opt });
      }
    } else core.push(r);
  }
  return { core, optimizations };
}

/** How many hidden requirements the first `hintsShown` hints have revealed. */
export function revealedOptimizations(hiddenCount: number, hintsShown: number, hintCount: number): number {
  if (hiddenCount === 0 || hintsShown <= 0) return 0;
  if (hintCount <= 0 || hintsShown >= hintCount) return hiddenCount;
  return Math.min(hiddenCount, hintsShown);
}
