import { getService, tx, type Design, type ServiceDef } from '@cloudlab/catalog';
import type { LocalizedText } from '@cloudlab/shared';
import type { FlowRole, FlowStep } from './types.ts';

/**
 * Routers that sit *in front of* a front door but are not one themselves:
 * DNS, filters and proxies. "Users → Route 53 → Lambda" still has no real
 * entry point (no API Gateway / load balancer / CDN).
 */
const NOT_ENTRY = new Set(['route53', 'route53-resolver', 'waf', 'shield', 'cf-functions', 'network-firewall', 'rds-proxy', 'gwlb']);
/** "db"/"object" services that are not where an app keeps its data. */
const NOT_DATA = new Set(['cognito', 'ecr', 'codeartifact', 'snowball']);

const ROLE_TEST: Record<FlowRole, (s: ServiceDef) => boolean> = {
  entry: (s) => (s.behavior === 'router' || s.behavior === 'cdn') && !NOT_ENTRY.has(s.id),
  compute: (s) => s.behavior === 'app',
  data: (s) => (s.behavior === 'db' || s.behavior === 'object') && !NOT_DATA.has(s.id),
  cache: (s) => s.behavior === 'cache',
  queue: (s) => s.behavior === 'queue',
  pubsub: (s) => s.behavior === 'pubsub',
  async: (s) => s.behavior === 'queue' || s.behavior === 'pubsub',
};

const ROLE_LABEL: Record<FlowRole, LocalizedText> = {
  entry: tx('a front door (ALB / NLB / API Gateway / CloudFront…)', 'cửa trước (ALB / NLB / API Gateway / CloudFront…)'),
  compute: tx('compute (EC2 / Fargate / Lambda…)', 'compute (EC2 / Fargate / Lambda…)'),
  data: tx('a data store (database or S3)', 'nơi lưu dữ liệu (database hoặc S3)'),
  cache: tx('a cache (ElastiCache…)', 'cache (ElastiCache…)'),
  queue: tx('a queue (SQS…)', 'queue (SQS…)'),
  pubsub: tx('a topic / bus / stream (SNS, EventBridge, Kinesis…)', 'topic / bus / stream (SNS, EventBridge, Kinesis…)'),
  async: tx('a queue, topic or stream', 'queue, topic hoặc stream'),
};

function stepMatches(step: FlowStep, serviceId: string): boolean {
  if (Array.isArray(step)) return step.includes(serviceId);
  const def = getService(serviceId);
  return def ? ROLE_TEST[step](def) : false;
}

function stepLabel(step: FlowStep): LocalizedText {
  if (!Array.isArray(step)) return ROLE_LABEL[step];
  const names = step.map((id) => getService(id)?.name ?? id).join(' / ');
  return { en: names, vi: names };
}

/** "Request flow: Users → a front door → compute → a data store". */
export function flowLabel(steps: FlowStep[]): LocalizedText {
  const parts = steps.map(stepLabel);
  return {
    en: `Connected flow: Users → ${parts.map((p) => p.en).join(' → ')}`,
    vi: `Có luồng nối liền: Users → ${parts.map((p) => p.vi).join(' → ')}`,
  };
}

/**
 * Is there a directed path from a Users node that visits nodes matching every
 * step, in order? Intermediate hops are free (WAF, NAT, endpoints, caches…).
 * State = (node, steps matched so far), so cycles terminate.
 */
export function hasFlow(design: Design, steps: FlowStep[]): boolean {
  if (steps.length === 0) return true;
  const out = new Map<string, string[]>();
  for (const e of design.edges) {
    const list = out.get(e.source) ?? [];
    list.push(e.target);
    out.set(e.source, list);
  }
  const serviceOf = new Map(design.nodes.map((n) => [n.id, n.service]));
  const seen = new Set<string>();
  const stack: [string, number][] = design.nodes.filter((n) => n.service === 'users').map((n) => [n.id, 0]);

  while (stack.length) {
    const [node, matched] = stack.pop()!;
    const key = `${node}#${matched}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const next of out.get(node) ?? []) {
      const svc = serviceOf.get(next);
      if (!svc) continue;
      const step = steps[matched]!;
      const m = stepMatches(step, svc) ? matched + 1 : matched;
      if (m === steps.length) return true;
      stack.push([next, m]);
    }
  }
  return false;
}
