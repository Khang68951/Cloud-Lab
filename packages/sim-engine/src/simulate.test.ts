import { DEFAULT_NETWORK, DEFAULT_SCENARIO, getTemplate, TEMPLATES, type Design, type ServiceConfig } from '@learninglab/catalog';
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
/** A web server users reach directly: public subnet, HTTP open to the internet. */
const WEB: ServiceConfig = { subnet: 'public', sg: '80<0.0.0.0/0' };
/** A Lambda function attached to the VPC (needed to reach RDS & co). */
const VPC_FN: ServiceConfig = { subnet: 'private' };

describe('simulate', () => {
  it('runs every template without errors or warnings', () => {
    for (const t of TEMPLATES) {
      const r = simulate(t.design);
      // Templates are the examples learners copy: the Review tab must be clean.
      expect(r.findings.filter((f) => f.severity !== 'info').map((f) => f.id), t.id).toEqual([]);
      expect(Object.values(r.edges).filter((e) => e.blocked).map((e) => e.id), t.id).toEqual([]);
      if (t.id !== 'blank') {
        expect(simulate(t.design, { azDown: true }).totals.survives, `${t.id} survives an AZ outage`).toBe(true);
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
      [['u', 'users'], ['app', 'ec2', WEB], ['db', 'rds']],
      ['u>app', 'app>db'],
      { rps: 1000, readRatio: 0.9 },
    );
    const withCache = design(
      [['u', 'users'], ['app', 'ec2', WEB], ['db', 'rds'], ['c', 'elasticache', { hitRatio: 0.9 }]],
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
        design([['u', 'users'], ['app', 'lambda', VPC_FN], ['db', 'rds', { replicas }]], ['u>app', 'app>db'], { rps: 500 }),
      );
      expect(r.nodes.db!.model.capacityRps).toBeGreaterThanOrEqual(prevCap);
      prevCap = r.nodes.db!.model.capacityRps;
    }
  });

  it('AZ failure: single-AZ stack dies, multi-AZ stack survives', () => {
    const fragile = design([['u', 'users'], ['app', 'ec2', { count: 1, ...WEB }], ['db', 'rds']], ['u>app', 'app>db']);
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
      design([['u', 'users'], ['app', 'ec2', { count: 1, instanceType: 't3.micro', multiAz: false, ...WEB }]], ['u>app'], {
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
      design([['u', 'users'], ['app', 'ec2', { count: 2, autoscaling: true, maxCount: 20, instanceType: 't3.medium', ...WEB }]], ['u>app'], {
        rps: 1000,
        peakMultiplier: 3,
      }),
    );
    // 3000 rps at peak / (300 rps × 70%) → 15 instances
    expect(r.nodes.app!.model.instances).toBe(15);
    expect(r.nodes.app!.status).toBe('ok');
  });

  it('detects the NAT → S3 cost trap and its fix is cheaper', () => {
    const viaNat = design([['u', 'users'], ['app', 'ec2', WEB], ['nat', 'nat'], ['b', 's3']], ['u>app', 'app>nat', 'nat>b'], {
      rps: 500,
      payloadKB: 500,
    });
    const viaEndpoint = design([['u', 'users'], ['app', 'ec2', WEB], ['vpce', 'vpce'], ['b', 's3']], ['u>app', 'app>vpce', 'vpce>b'], {
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
    // A private RDS cannot be reached from the internet at all.
    expect(r.edges['u>db']!.blocked?.kind).toBe('route');
    // Moved to a public subnet with the port open to the world, it really is exposed.
    const open = simulate(design([['u', 'users'], ['db', 'rds', { subnet: 'public', sg: '5432<0.0.0.0/0' }]], ['u>db']));
    expect(open.edges['u>db']!.blocked).toBeUndefined();
    expect(ids(open)).toEqual(expect.arrayContaining(['public-db-db', 'public-subnet-data-db', 'sg-open-data-db']));
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
      [['u', 'users'], ['api', 'lambda', { durationMs: 50, ...VPC_FN }], ['db', 'rds']],
      ['u>api', 'api>db'],
      { rps: 300, peakMultiplier: 10, readRatio: 0 },
    );
    const buffered = design(
      [['u', 'users'], ['api', 'lambda', { durationMs: 50 }], ['q', 'sqs'], ['worker', 'lambda', VPC_FN], ['db', 'rds']],
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

    const search = simulate(design([['u', 'users'], ['app', 'lambda', VPC_FN], ['os', 'opensearch', { count: 1 }]], ['u>app', 'app>os']));
    expect(search.findings.map((f) => f.id)).toContain('single-az-db-os');
  });

  it('is deterministic', () => {
    const d = getTemplate('event-driven')!.design;
    expect(simulate(d)).toEqual(simulate(d));
  });
});

describe('queues buffer what consumers cannot take', () => {
  const pipeline = (rps: number) =>
    design(
      [['u', 'users'], ['api', 'apigw'], ['fn', 'lambda'], ['q', 'sqs'], ['w', 'lambda', VPC_FN], ['db', 'rds']],
      ['u>api', 'api>fn', 'fn>q', 'q>w', 'w>db'],
      { rps, readRatio: 0 },
    );

  it('passes everything through when consumers keep up', () => {
    const r = simulate(pipeline(300));
    expect(r.nodes.q!.queue).toBeUndefined();
    expect(r.edges['q>w']!.avg.w).toBeCloseTo(r.edges['fn>q']!.avg.w);
  });

  it('holds back a traffic spike instead of overloading the database', () => {
    const r = simulate(pipeline(300), { trafficMultiplier: 10 });
    const q = r.nodes.q!.queue!;
    expect(r.edges['fn>q']!.avg.w).toBeCloseTo(3000);
    expect(r.edges['q>w']!.avg.w).toBeCloseTo(q.drainRps);
    expect(q.backlogRps).toBeGreaterThan(0);
    expect(r.nodes.db!.status).not.toBe('saturated');
    expect(ids(r)).toContain('queue-buffering-q');
  });

  it('warns when consumers cannot keep up even at normal traffic', () => {
    const r = simulate(pipeline(1500));
    expect(r.nodes.q!.queue!.backlogRps).toBeGreaterThan(0);
    expect(ids(r)).toContain('queue-backlog-q');
  });

  it('keeps messages while the consumer is down, without failing users', () => {
    const r = simulate(pipeline(300), { killed: ['w'] });
    expect(r.nodes.q!.queue).toMatchObject({ drainRps: 0, backlogRps: 300 });
    expect(r.totals.errorRate).toBe(0);
  });
});

describe('subnet placement', () => {
  const web = (cfg: Record<string, ServiceConfig>) =>
    design(
      [['u', 'users'], ['lb', 'alb', cfg.lb], ['app', 'ec2', cfg.app], ['db', 'rds', cfg.db], ['nat', 'nat', cfg.nat]],
      ['u>lb', 'lb>app', 'app>db', 'app>nat'],
    );
  const placementIds = (r: ReturnType<typeof simulate>) => ids(r).filter((id) => /subnet|private-nat|blocked|sg-open/.test(id));

  it('default placements raise no placement findings', () => {
    expect(placementIds(simulate(web({})))).toEqual([]);
  });

  it('flags data and app tiers moved to a public subnet', () => {
    const r = simulate(web({ db: { subnet: 'public' }, app: { subnet: 'public' } }));
    expect(ids(r)).toContain('public-subnet-data-db');
    expect(ids(r)).toContain('public-subnet-app-app');
  });

  it('flags a NAT in a private subnet and an internal LB facing users', () => {
    const r = simulate(web({ nat: { subnet: 'private' }, lb: { subnet: 'private' } }));
    expect(ids(r)).toContain('private-nat-nat');
    expect(ids(r)).toContain('blocked-edge-u>lb');
  });

  it('ignores placements a service cannot take', () => {
    const r = simulate(design([['u', 'users'], ['b', 's3', { subnet: 'public' }]], ['u>b']));
    expect(placementIds(r)).toEqual([]);
  });
});

describe('network: routes and security groups', () => {
  const tier3 = (cfg: Record<string, ServiceConfig> = {}, extra: [string, string, ServiceConfig?][] = [], extraEdges: string[] = []) =>
    design(
      [['u', 'users'], ['lb', 'alb', cfg.lb], ['app', 'ec2', cfg.app], ['db', 'rds', cfg.db], ...extra],
      ['u>lb', 'lb>app', 'app>db', ...extraEdges],
    );

  it('the classic public ALB -> private app -> private DB works with default rules', () => {
    const r = simulate(tier3());
    expect(Object.values(r.edges).some((e) => e.blocked)).toBe(false);
    expect(r.totals.errorRate).toBe(0);
  });

  it('manual security groups start empty: every hop needs a rule', () => {
    const manual = (d: Design): Design => ({ ...d, network: { ...DEFAULT_NETWORK, manualSg: true } });
    const closed = simulate(manual(tier3()));
    expect(['u>lb', 'lb>app', 'app>db'].map((e) => closed.edges[e]!.blocked?.kind)).toEqual(['sg', 'sg', 'sg']);
    const open = simulate(manual(tier3({ lb: { sg: '443<0.0.0.0/0' }, app: { sg: '80<sg:lb' }, db: { sg: '5432<sg:app' } })));
    expect(Object.values(open.edges).some((e) => e.blocked)).toBe(false);
  });

  it('users cannot reach a private instance; requests fail instead of flowing', () => {
    const r = simulate(design([['u', 'users'], ['app', 'ec2']], ['u>app']));
    expect(r.edges['u>app']!.blocked?.kind).toBe('route');
    expect(r.nodes.app!.avg.r + r.nodes.app!.avg.w).toBe(0);
    expect(r.totals.errorRate).toBe(1);
    expect(r.totals.availability).toBe(0);
  });

  it('a public instance still needs its security group to allow the port', () => {
    const closed = simulate(design([['u', 'users'], ['app', 'ec2', { subnet: 'public' }]], ['u>app']));
    expect(closed.edges['u>app']!.blocked?.kind).toBe('sg');
    const open = simulate(design([['u', 'users'], ['app', 'ec2', { subnet: 'public', sg: '80<0.0.0.0/0' }]], ['u>app']));
    expect(open.edges['u>app']!.blocked).toBeUndefined();
  });

  it('security group sources: another SG, a CIDR, or the wrong port', () => {
    const bySg = simulate(tier3({ db: { sg: '5432<sg:app' } }));
    expect(bySg.edges['app>db']!.blocked).toBeUndefined();
    const otherSg = simulate(tier3({ db: { sg: '5432<sg:lb' } }));
    expect(otherSg.edges['app>db']!.blocked?.kind).toBe('sg');
    const wrongPort = simulate(tier3({ db: { sg: '3306<10.0.0.0/16' } }));
    expect(wrongPort.edges['app>db']!.blocked?.kind).toBe('sg');
    // MySQL listens on 3306, so the same rule fits once the engine changes.
    expect(simulate(tier3({ db: { engine: 'mysql', sg: '3306<10.0.0.0/16' } })).edges['app>db']!.blocked).toBeUndefined();
    // Only the private subnet's CIDR: the app (private) passes.
    expect(simulate(tier3({ db: { sg: '5432<10.0.2.0/24' } })).edges['app>db']!.blocked).toBeUndefined();
    // An app dependency that is blocked fails every request.
    expect(otherSg.totals.errorRate).toBe(1);
  });

  it('private subnets reach AWS services only through NAT or a VPC endpoint', () => {
    const direct = simulate(tier3({}, [['b', 's3']], ['app>b']));
    expect(direct.edges['app>b']!.blocked?.kind).toBe('route');
    // Endpoints and NAT are route-table entries: they only need to exist in the VPC.
    const routed = simulate(tier3({}, [['e', 'vpce'], ['b', 's3']], ['app>b']));
    expect(routed.edges['app>b']!.blocked).toBeUndefined();
    expect(routed.edges['app>b']!.via).toEqual({ id: 'e', kind: 'endpoint' });
    expect(ids(routed)).not.toContain('unreachable-e');
    // A gateway endpoint does not cover SQS; NAT does (and bills the data it processes).
    const sqsNoRoute = simulate(tier3({}, [['e', 'vpce'], ['q', 'sqs']], ['app>q']));
    expect(sqsNoRoute.edges['app>q']!.blocked?.kind).toBe('route');
    const sqsViaNat = simulate(tier3({}, [['n', 'nat'], ['q', 'sqs']], ['app>q']));
    expect(sqsViaNat.edges['app>q']!.via).toEqual({ id: 'n', kind: 'nat' });
    expect(sqsViaNat.nodes.n!.avg.w).toBeGreaterThan(0);
    // S3 through NAT is the classic cost trap, even when NAT is not drawn as a hop.
    const trap = simulate(tier3({}, [['n', 'nat'], ['b', 's3']], ['app>b']));
    expect(ids(trap)).toContain('nat-to-aws-n');
    // The most specific route wins: gateway endpoint over NAT for S3.
    const both = simulate(tier3({}, [['n', 'nat'], ['e', 'vpce'], ['b', 's3']], ['app>b']));
    expect(both.edges['app>b']!.via?.kind).toBe('endpoint');
    // Losing the single NAT's AZ cuts the app off from what it reaches through it.
    expect(simulate(tier3({ app: { multiAz: true, count: 2 }, db: { multiAz: true } }, [['n', 'nat'], ['q', 'sqs']], ['app>q']), { azDown: true }).totals.survives).toBe(false);
    const viaVpce = simulate(tier3({}, [['e', 'vpce'], ['b', 's3']], ['app>e', 'e>b']));
    expect(viaVpce.edges['e>b']!.blocked).toBeUndefined();
    const gatewayToSqs = simulate(tier3({}, [['e', 'vpce'], ['q', 'sqs']], ['app>e', 'e>q']));
    expect(gatewayToSqs.edges['e>q']!.blocked?.kind).toBe('route');
    const interfaceToSqs = simulate(tier3({}, [['e', 'vpce', { type: 'interface' }], ['q', 'sqs']], ['app>e', 'e>q']));
    expect(interfaceToSqs.edges['e>q']!.blocked).toBeUndefined();
    const privateNat = simulate(tier3({}, [['n', 'nat', { subnet: 'private' }], ['b', 's3']], ['app>n', 'n>b']));
    expect(privateNat.edges['n>b']!.blocked?.kind).toBe('route');
  });

  it('Lambda: invoking it needs no network, but reaching RDS needs a VPC attachment', () => {
    const outside = simulate(design([['u', 'users'], ['api', 'apigw'], ['fn', 'lambda'], ['db', 'rds']], ['u>api', 'api>fn', 'fn>db']));
    expect(outside.edges['api>fn']!.blocked).toBeUndefined();
    expect(outside.edges['fn>db']!.blocked?.kind).toBe('route');
    const inVpc = simulate(design([['u', 'users'], ['api', 'apigw'], ['fn', 'lambda', VPC_FN], ['db', 'rds']], ['u>api', 'api>fn', 'fn>db']));
    expect(inVpc.edges['fn>db']!.blocked).toBeUndefined();
    const publicFn = simulate(design([['u', 'users'], ['fn', 'lambda', { subnet: 'public' }], ['t', 'dynamodb']], ['u>fn', 'fn>t']));
    expect(publicFn.edges['fn>t']!.blocked?.kind).toBe('route');
  });

  it('a private worker polling SQS needs a way out', () => {
    const d = (withNat: boolean) =>
      simulate(
        design(
          [['u', 'users'], ['api', 'apigw'], ['fn', 'lambda'], ['q', 'sqs'], ['w', 'ec2'], ...(withNat ? [['n', 'nat'] as [string, string]] : [])],
          ['u>api', 'api>fn', 'fn>q', 'q>w'],
        ),
      );
    expect(d(false).edges['q>w']!.blocked?.kind).toBe('route');
    expect(d(true).edges['q>w']!.blocked).toBeUndefined();
  });

  it('validates the CIDR layout and runs out of IPs in tiny subnets', () => {
    const bad = simulate({ ...tier3(), network: { vpcCidr: '10.0.0.0/16', publicCidr: '10.1.0.0/24', privateCidr: '10.0.2.0/24' } });
    expect(ids(bad)).toContain('network-invalid-0');
    const tiny = design(
      [['u', 'users'], ['lb', 'alb'], ...Array.from({ length: 12 }, (_, i) => [`a${i}`, 'ec2'] as [string, string])],
      ['u>lb', ...Array.from({ length: 12 }, (_, i) => `lb>a${i}`)],
    );
    // A /28 has 16 addresses, 11 usable.
    const full = simulate({ ...tiny, network: { vpcCidr: '10.0.0.0/16', publicCidr: '10.0.1.0/24', privateCidr: '10.0.2.0/28' } });
    expect(ids(full)).toContain('subnet-full');
  });

  it('warns about SSH open to the world', () => {
    const r = simulate(design([['u', 'users'], ['app', 'ec2', { subnet: 'public', sg: '80<0.0.0.0/0,22<0.0.0.0/0' }]], ['u>app']));
    expect(ids(r)).toContain('sg-open-ssh-app');
  });
});
