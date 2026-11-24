import { buildDesign, DEFAULT_SCENARIO } from '@cloudlab/catalog';
import { describe, expect, it } from 'vitest';
import { flowLabel, hasFlow } from './flow.ts';
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

  it('rejects a component that is placed but has no edge', () => {
    const design = d([['u', 'users'], ['api', 'apigw'], ['fn', 'lambda'], ['db', 'dynamodb']], ['u>api', 'api>fn']);
    expect(hasFlow(design, API)).toBe(false);
  });

  it('accepts components wired to anything, in any order or path', () => {
    const design = d([['u', 'users'], ['api', 'apigw'], ['fn', 'lambda'], ['db', 'dynamodb']], ['u>api', 'u>fn', 'db>fn']);
    expect(hasFlow(design, API)).toBe(true);
  });

  it('does not count DNS or WAF as a front door', () => {
    const design = d([['u', 'users'], ['dns', 'route53'], ['waf', 'waf'], ['fn', 'lambda'], ['db', 'dynamodb']], ['u>dns', 'dns>waf', 'waf>fn', 'fn>db']);
    expect(hasFlow(design, API)).toBe(false);
  });

  it('requires every listed component', () => {
    const design = d(
      [['u', 'users'], ['alb', 'alb'], ['app', 'fargate'], ['q', 'sqs'], ['w', 'lambda'], ['db', 'rds']],
      ['u>alb', 'alb>app', 'app>q', 'q>w', 'w>db'],
    );
    expect(hasFlow(design, ['entry', 'compute', 'queue', 'compute', 'data'])).toBe(true);
    expect(hasFlow(design, ['entry', 'compute', ['sns'], 'compute'])).toBe(false);
  });

  it('labels list each component once, without the flow arrows', () => {
    expect(flowLabel(['entry', 'compute', 'queue', 'compute', 'data']).vi).toBe(
      'Có cửa trước (ALB / NLB / API Gateway / CloudFront…), compute (EC2 / Fargate / Lambda…), queue (SQS…), nơi lưu dữ liệu (database hoặc S3)',
    );
  });
});
