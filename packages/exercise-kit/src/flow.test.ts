import { buildDesign, DEFAULT_SCENARIO } from '@cloudlab/catalog';
import { describe, expect, it } from 'vitest';
import { hasFlow } from './flow.ts';
import type { FlowStep } from './types.ts';

const API: FlowStep[] = ['entry', 'compute', 'data'];
const d = (nodes: [string, string][], edges: string[]) =>
  buildDesign(
    nodes.map(([id, svc], i) => [id, svc, i, 1] as const),
    edges,
    DEFAULT_SCENARIO,
  );

describe('flow requirement', () => {
  it('rejects Users → Lambda (no front door, no data store)', () => {
    expect(hasFlow(d([['u', 'users'], ['fn', 'lambda']], ['u>fn']), API)).toBe(false);
  });

  it('rejects nodes that are placed but not connected', () => {
    const design = d([['u', 'users'], ['api', 'apigw'], ['fn', 'lambda'], ['db', 'dynamodb']], ['u>api', 'api>fn']);
    expect(hasFlow(design, API)).toBe(false);
  });

  it('does not count DNS or WAF as a front door', () => {
    const design = d([['u', 'users'], ['dns', 'route53'], ['waf', 'waf'], ['fn', 'lambda'], ['db', 'dynamodb']], ['u>dns', 'dns>waf', 'waf>fn', 'fn>db']);
    expect(hasFlow(design, API)).toBe(false);
  });

  it('accepts API Gateway → Lambda → DynamoDB, with extra hops in between', () => {
    const design = d(
      [['u', 'users'], ['dns', 'route53'], ['api', 'apigw'], ['fn', 'lambda'], ['vpce', 'vpce'], ['db', 'dynamodb']],
      ['u>dns', 'dns>api', 'api>fn', 'fn>vpce', 'vpce>db'],
    );
    expect(hasFlow(design, API)).toBe(true);
  });

  it('checks order and async hops', () => {
    const design = d(
      [['u', 'users'], ['alb', 'alb'], ['app', 'fargate'], ['q', 'sqs'], ['w', 'lambda'], ['db', 'rds']],
      ['u>alb', 'alb>app', 'app>q', 'q>w', 'w>db'],
    );
    expect(hasFlow(design, ['entry', 'compute', 'queue', 'compute', 'data'])).toBe(true);
    expect(hasFlow(design, ['entry', 'compute', ['sns'], 'compute'])).toBe(false);
  });
});
