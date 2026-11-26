import { describe, expect, it } from 'vitest';
import { REGIONS } from './pricing.ts';
import { SERVICES, getService, isAdvanced } from './registry.ts';
import { CATEGORIES, defaultConfig, type ModelContext } from './types.ts';

const ctxFor = (cfg: ModelContext['cfg'], rps: number): ModelContext => ({
  cfg,
  avg: { r: rps * 0.8, w: rps * 0.2 },
  peak: { r: rps * 2.4, w: rps * 0.6 },
  scenario: { rps, peakMultiplier: 3, readRatio: 0.8, payloadKB: 20, region: 'us-east-1' },
  region: REGIONS['us-east-1'],
});

describe('service registry', () => {
  it('has unique ids and known categories', () => {
    const ids = SERVICES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SERVICES) expect(CATEGORIES).toContain(s.category);
  });

  it('keeps the advanced tier separate from the core palette', () => {
    expect(SERVICES.length).toBeGreaterThanOrEqual(150);
    expect(SERVICES.filter(isAdvanced).length).toBeGreaterThan(100);
    expect(isAdvanced(getService('ec2')!)).toBe(false);
    expect(isAdvanced(getService('msk')!)).toBe(true);
  });

  it.each(SERVICES.map((s) => [s.id, s] as const))('%s models sane numbers with its defaults', (_id, s) => {
    for (const rps of [0, 50, 5000]) {
      const m = s.model(ctxFor(defaultConfig(s), rps));
      expect(m.capacityRps).toBeGreaterThan(0);
      expect(m.availability).toBeGreaterThan(0.9);
      expect(m.availability).toBeLessThanOrEqual(1);
      expect(Number.isFinite(m.baseLatencyMs)).toBe(true);
      for (const c of m.costs) {
        expect(Number.isFinite(c.usd)).toBe(true);
        expect(c.usd).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('palette shape', () => {
  it('every category except Users has popular services and the rest behind "See all"', () => {
    for (const c of CATEGORIES) {
      const inCat = SERVICES.filter((s) => s.category === c);
      expect(inCat.filter((s) => !isAdvanced(s)).length, c).toBeGreaterThan(0);
      expect(inCat.filter((s) => !isAdvanced(s)).length, c).toBeLessThanOrEqual(8);
    }
  });
});
