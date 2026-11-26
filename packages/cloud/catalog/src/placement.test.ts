import { describe, expect, it } from 'vitest';
import { defaultPlacement, placementChoices, placementOf } from './placement.ts';
import { getService } from './registry.ts';

const def = (id: string) => getService(id)!;

describe('placement', () => {
  it('derives sensible defaults', () => {
    expect(defaultPlacement(def('users'))).toBe('internet');
    expect(defaultPlacement(def('cloudfront'))).toBe('edge');
    expect(defaultPlacement(def('alb'))).toBe('public');
    expect(defaultPlacement(def('nat'))).toBe('public');
    expect(defaultPlacement(def('ec2'))).toBe('private');
    expect(defaultPlacement(def('rds'))).toBe('private');
    expect(defaultPlacement(def('s3'))).toBe('managed');
    expect(defaultPlacement(def('lambda'))).toBe('managed');
  });

  it('only honours overrides the service allows', () => {
    expect(placementOf(def('rds'), { subnet: 'public' })).toBe('public');
    expect(placementOf(def('lambda'), { subnet: 'private' })).toBe('private');
    expect(placementOf(def('s3'), { subnet: 'private' })).toBe('managed');
    expect(placementChoices(def('dynamodb'))).toEqual([]);
  });
});
