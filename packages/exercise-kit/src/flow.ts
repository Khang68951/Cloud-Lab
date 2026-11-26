import { getService, tx, type Design, type ServiceDef } from '@learninglab/catalog';
import type { LocalizedText } from '@learninglab/shared';
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

/** "Required: a front door, compute, a data store" (each component once). */
export function flowLabel(steps: FlowStep[]): LocalizedText {
  const seen = new Set<string>();
  const parts = steps
    .filter((step) => {
      const key = Array.isArray(step) ? step.join('|') : step;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(stepLabel);
  return {
    en: `Has ${parts.map((p) => p.en).join(', ')}`,
    vi: `Có ${parts.map((p) => p.vi).join(', ')}`,
  };
}

/**
 * Does the design contain every component the steps name? Each one must be
 * matched by a node that is wired to at least one other node (an edge in or
 * out), so a component dropped on the canvas and left unconnected does not
 * count. Order and the exact path do not matter.
 */
export function hasFlow(design: Design, steps: FlowStep[]): boolean {
  const wired = new Set<string>();
  for (const e of design.edges) {
    if (e.source === e.target) continue;
    wired.add(e.source);
    wired.add(e.target);
  }
  const services = design.nodes.filter((n) => wired.has(n.id)).map((n) => n.service);
  return steps.every((step) => services.some((svc) => stepMatches(step, svc)));
}
