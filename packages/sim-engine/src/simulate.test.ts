import { DEFAULT_SCENARIO, getTemplate, TEMPLATES, type Design, type ServiceConfig } from '@cloudlab/catalog';
import { describe, expect, it } from 'vitest';
import { simulate } from './simulate.ts';

function design(
  nodes: [string, string, ServiceConfig?][],
  edges: string[],
  scenario: Partial<Design['scenario']> = {},
): Design {
  return {
    nodes: nodes.map(([id, service, config], i) => ({ id, service, x: i * 100, y: 0, config: config ?? {} })),
    edges: edges.map((e) => {
      const [source, target] = e.split('>') as [string, string];
      return { id: e, source, target };
    }),
    scenario: { ...DEFAULT_SCENARIO, ...scenario },
  };
}

const ids = (r: ReturnType<typeof simulate>) => r.findings.map((f) => f.id);

describe('simulate', () => {
  it('runs every template without errors', () => {
    for (const t of TEMPLATES) {
      const r = simulate(t.design);
      expect(r.findings.filter((f) => f.severity === 'error'), t.id).toEqual([]);
      if (t.id !== 'blank') {
        expect(r.totals.monthlyUsd, t.id).toBeGreaterThan(0);
        expect(r.totals.availability, t.id).toBeGreaterThan(0.99);
      }
    }
  });

  it('prices Lambda like the AWS formula', () => {
    // 1M requests/month, 100 ms, 512 MB → $0.20 + 1e6 × 0.1 s × 0.5 GB × $0.0000166667 ≈ $1.03
    const rps = 1e6 / (730 * 3600);
    const r = simulate(
      design([['u', 'users'], ['f', 'lambda', { memoryMB: '512', durationMs: 100 }]], ['u>f'], { rps, payloadKB: 0.1 }),
    );
    const lambdaCost = r.nodes.f!.costs.filter((c) => c.kind !== 'transfer').reduce((a, c) => a + c.usd, 0);
    expect(lambdaCost).toBeCloseTo(1.033, 2);
  });

  it('a cache takes reads off the database', () => {
    const base = design(
      [['u', 'users'], ['app', 'ec2'], ['db', 'rds']],
      ['u>app', 'app>db'],
      { rps: 1000, readRatio: 0.9 },
    );
    const withCache = design(
      [['u', 'users'], ['app', 'ec2'], ['db', 'rds'], ['c', 'elasticache', { hitRatio: 0.9 }]],
      ['u>app', 'app>db', 'app>c'],
      { rps: 1000, readRatio: 0.9 },
    );
    const a = simulate(base).nodes.db!;
    const b = simulate(withCache).nodes.db!;
    expect(a.avg.r).toBeCloseTo(900);
    expect(b.avg.r).toBeCloseTo(90);
    expect(b.avg.w).toBeCloseTo(a.avg.w);
  });

  it('Multi-AZ database improves availability', () => {
    const mk = (multiAz: boolean) =>
      simulate(design([['u', 'users'], ['lb', 'alb'], ['app', 'ec2'], ['db', 'rds', { multiAz }]], ['u>lb', 'lb>app', 'app>db']));
    expect(mk(true).totals.availability).toBeGreaterThan(mk(false).totals.availability);
    expect(ids(mk(false))).toContain('single-az-db-db');
    expect(ids(mk(true))).not.toContain('single-az-db-db');
  });

  it('more read replicas never reduce capacity or availability', () => {
    let prevCap = 0;
    for (const replicas of [0, 1, 2, 3]) {
      const r = simulate(
        design([['u', 'users'], ['app', 'lambda'], ['db', 'rds', { replicas }]], ['u>app', 'app>db'], { rps: 500 }),
      );
      expect(r.nodes.db!.model.capacityRps).toBeGreaterThanOrEqual(prevCap);
      prevCap = r.nodes.db!.model.capacityRps;
    }
  });

  it('AZ failure: single-AZ stack dies, multi-AZ stack survives', () => {
    const fragile = design([['u', 'users'], ['app', 'ec2', { count: 1 }], ['db', 'rds']], ['u>app', 'app>db']);
    const robust = getTemplate('three-tier')!.design;
    expect(simulate(fragile, { azDown: true }).totals.survives).toBe(false);
    expect(simulate(robust, { azDown: true }).totals.survives).toBe(true);
  });

  it('killing the only database takes the app down', () => {
    const d = getTemplate('three-tier')!.design;
    const r = simulate(d, { killed: ['db'] });
    expect(r.totals.survives).toBe(false);
    expect(r.totals.errorRate).toBe(1);
    // Losing only the cache is survivable (reads fall back to the DB).
    expect(simulate(d, { killed: ['cache'] }).totals.survives).toBe(true);
  });

  it('flags overload and reports errors at peak', () => {
    const r = simulate(
      design([['u', 'users'], ['app', 'ec2', { count: 1, instanceType: 't3.micro', multiAz: false }]], ['u>app'], {
        rps: 1000,
      }),
    );
    expect(r.nodes.app!.status).toBe('saturated');
    expect(ids(r)).toContain('saturated-app');
    expect(r.totals.errorRate).toBeGreaterThan(0.5);
    expect(r.totals.maxPeakRps).toBeLessThan(1000 * 3);
  });

  it('Auto Scaling adds instances at peak', () => {
    const r = simulate(
      design([['u', 'users'], ['app', 'ec2', { count: 2, autoscaling: true, maxCount: 20, instanceType: 't3.medium' }]], ['u>app'], {
        rps: 1000,
        peakMultiplier: 3,
      }),
    );
    // 3000 rps at peak / (300 rps × 70%) → 15 instances
    expect(r.nodes.app!.model.instances).toBe(15);
    expect(r.nodes.app!.status).toBe('ok');
  });

  it('detects the NAT → S3 cost trap and its fix is cheaper', () => {
    const viaNat = design([['u', 'users'], ['app', 'ec2'], ['nat', 'nat'], ['b', 's3']], ['u>app', 'app>nat', 'nat>b'], {
      rps: 500,
      payloadKB: 500,
    });
    const viaEndpoint = design([['u', 'users'], ['app', 'ec2'], ['vpce', 'vpce'], ['b', 's3']], ['u>app', 'app>vpce', 'vpce>b'], {
      rps: 500,
      payloadKB: 500,
    });
    const a = simulate(viaNat);
    const b = simulate(viaEndpoint);
    expect(ids(a)).toContain('nat-to-aws-nat');
    expect(b.totals.monthlyUsd).toBeLessThan(a.totals.monthlyUsd - 1000);
  });

  it('rejects nonsense connections and flags exposed databases', () => {
    const r = simulate(design([['u', 'users'], ['db', 'rds'], ['app', 'ec2']], ['u>db', 'db>app']));
    expect(r.edges['db>app']!.valid).toBe(false);
    expect(ids(r)).toContain('invalid-edge-db>app');
    expect(ids(r)).toContain('public-db-db');
  });

  it('queues decouple: consumers are off the user latency path', () => {
    const d = design(
      [['u', 'users'], ['api', 'lambda', { durationMs: 20 }], ['q', 'sqs'], ['worker', 'lambda', { durationMs: 5000 }]],
      ['u>api', 'api>q', 'q>worker'],
      { rps: 10, readRatio: 0 },
    );
    const r = simulate(d);
    expect(r.edges['q>worker']!.async).toBe(true);
    expect(r.totals.latencyMs).toBeLessThan(100);
    expect(r.nodes.worker!.avg.w).toBeCloseTo(10);
  });

  it('CloudFront cuts origin load and internet egress cost', () => {
    const direct = design([['u', 'users'], ['b', 's3']], ['u>b'], { rps: 300, readRatio: 1, payloadKB: 500 });
    const cdn = design([['u', 'users'], ['cf', 'cloudfront', { hitRatio: 0.95 }], ['b', 's3']], ['u>cf', 'cf>b'], {
      rps: 300,
      readRatio: 1,
      payloadKB: 500,
    });
    const a = simulate(direct);
    const b = simulate(cdn);
    expect(ids(a)).toContain('egress-no-cdn');
    expect(b.nodes.b!.avg.r).toBeCloseTo(15);
    expect(b.totals.monthlyUsd).toBeLessThan(a.totals.monthlyUsd);
  });

  it('queues level load: consumers only need the average rate', () => {
    const direct = design(
      [['u', 'users'], ['api', 'lambda', { durationMs: 50 }], ['db', 'rds']],
      ['u>api', 'api>db'],
      { rps: 300, peakMultiplier: 10, readRatio: 0 },
    );
    const buffered = design(
      [['u', 'users'], ['api', 'lambda', { durationMs: 50 }], ['q', 'sqs'], ['worker', 'lambda'], ['db', 'rds']],
      ['u>api', 'api>q', 'q>worker', 'worker>db'],
      { rps: 300, peakMultiplier: 10, readRatio: 0 },
    );
    expect(simulate(direct).nodes.db!.status).toBe('saturated');
    const b = simulate(buffered);
    expect(b.nodes.db!.peak.w).toBeCloseTo(300);
    expect(b.nodes.db!.status).toBe('ok');
    expect(b.totals.errorRate).toBe(0);
  });

  it('new services: Step Functions, WebSocket, Firehose → S3, Cognito and OpenSearch', () => {
    const rps = 1e6 / (730 * 3600); // 1M executions/month
    const sfn = simulate(design([['u', 'users'], ['sf', 'stepfunctions', { type: 'standard', steps: 10 }]], ['u>sf'], { rps, payloadKB: 0.1 }));
    // 1M executions × 10 transitions × $0.025/1,000 = $250
    expect(sfn.nodes.sf!.monthlyUsd).toBeCloseTo(250, 0);

    const ws = simulate(design([['u', 'users'], ['api', 'apigw', { type: 'websocket', connections: 1000 }]], ['u>api'], { rps: 0.0001 }));
    // 1,000 connections × 43,800 min = 43.8M connection-minutes × $0.25/M ≈ $10.95
    expect(ws.nodes.api!.monthlyUsd).toBeCloseTo(10.95, 1);

    const lake = simulate(
      design([['u', 'users'], ['api', 'apigw'], ['fh', 'firehose'], ['b', 's3']], ['u>api', 'api>fh', 'fh>b'], { rps: 100, readRatio: 0 }),
    );
    expect(lake.edges['fh>b']!.valid).toBe(true);
    expect(lake.edges['fh>b']!.async).toBe(true); // buffered delivery, off the user path
    // Firehose batches records into ~5 MB objects: far fewer PUTs than records.
    expect(lake.nodes.b!.avg.w).toBeGreaterThan(0);
    expect(lake.nodes.b!.avg.w).toBeLessThan(1);

    const auth = simulate(design([['u', 'users'], ['c', 'cognito', { mau: 10000 }]], ['u>c']));
    expect(auth.findings.map((f) => f.id)).not.toContain('public-db-c');
    expect(auth.nodes.c!.monthlyUsd).toBe(0);

    const search = simulate(design([['u', 'users'], ['app', 'lambda'], ['os', 'opensearch', { count: 1 }]], ['u>app', 'app>os']));
    expect(search.findings.map((f) => f.id)).toContain('single-az-db-os');
  });

  it('is deterministic', () => {
    const d = getTemplate('event-driven')!.design;
    expect(simulate(d)).toEqual(simulate(d));
  });
});
