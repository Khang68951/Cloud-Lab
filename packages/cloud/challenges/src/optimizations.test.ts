import { describe, expect, it } from 'vitest';
import { revealedOptimizations, splitRequirements } from './optimizations.ts';
import type { Requirement } from './types.ts';

describe('splitRequirements', () => {
  it('splits a mixed flow into its core and optimisation halves', () => {
    const reqs: Requirement[] = [
      { type: 'flow', steps: ['entry', 'compute', 'queue', 'compute', 'data'] },
      { type: 'uses', services: ['sqs'], label: { en: 'q', vi: 'q' } },
      { type: 'uses', services: ['s3'], label: { en: 's3', vi: 's3' } },
      { type: 'metric', metric: 'errorRate', op: '<=', value: 0.01 },
    ];
    const { core, optimizations } = splitRequirements(reqs);
    expect(core).toEqual([{ type: 'flow', steps: ['entry', 'compute', 'compute', 'data'] }, reqs[2], reqs[3]]);
    expect(optimizations).toEqual([{ type: 'flow', steps: ['queue'] }, reqs[1]]);
  });

  it('treats explicit caches, queues and streams as optimisations', () => {
    const { core, optimizations } = splitRequirements([{ type: 'flow', steps: ['entry', ['kinesis'], ['firehose'], ['s3']] }]);
    expect(core).toEqual([{ type: 'flow', steps: ['entry', ['s3']] }]);
    expect(optimizations).toEqual([{ type: 'flow', steps: [['kinesis'], ['firehose']] }]);
  });

  it('keeps a labelled flow whole', () => {
    const r: Requirement = { type: 'flow', steps: ['entry', 'compute', 'cache'], label: { en: 'c', vi: 'c' } };
    expect(splitRequirements([r])).toEqual({ core: [], optimizations: [r] });
  });
});

describe('revealedOptimizations', () => {
  it('reveals one per hint and the rest with the last hint', () => {
    expect(revealedOptimizations(4, 0, 3)).toBe(0);
    expect(revealedOptimizations(4, 1, 3)).toBe(1);
    expect(revealedOptimizations(4, 2, 3)).toBe(2);
    expect(revealedOptimizations(4, 3, 3)).toBe(4);
    expect(revealedOptimizations(1, 1, 3)).toBe(1);
  });
});
