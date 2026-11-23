import { alb, apigw, nat, nlb, vpce } from './services/network.ts';
import { aurora, dynamodb, elasticache, rds, s3 } from './services/data.ts';
import { cloudfront, route53, users, waf } from './services/edge.ts';
import { ec2, eks, fargate, lambda } from './services/compute.ts';
import { eventbridge, kinesis, sns, sqs } from './services/messaging.ts';
import { cognito, firehose, globalAccelerator, opensearch, stepfunctions, transitGateway } from './services/extra.ts';
import { ADVANCED_SERVICES } from './services/advanced.ts';
import { MORE_INFRA } from './services/more-infra.ts';
import { MORE_PLATFORM } from './services/more-platform.ts';
import { tx, type ServiceDef } from './types.ts';
import type { LocalizedText } from '@cloudlab/shared';

/**
 * All services, in palette order (core first, then advanced — the palette groups
 * them by category). Add a service = write its def + list it here.
 */
export const SERVICES: readonly ServiceDef[] = [
  users,
  route53,
  cloudfront,
  globalAccelerator,
  waf,
  cognito,
  alb,
  nlb,
  apigw,
  nat,
  vpce,
  transitGateway,
  ec2,
  fargate,
  lambda,
  eks,
  stepfunctions,
  rds,
  aurora,
  dynamodb,
  elasticache,
  opensearch,
  s3,
  sqs,
  sns,
  eventbridge,
  kinesis,
  firehose,
  ...ADVANCED_SERVICES,
  ...MORE_INFRA,
  ...MORE_PLATFORM,
];

/** True for services only listed in the palette's "See all" dialog. */
export const isAdvanced = (s: Pick<ServiceDef, 'tier'>) => s.tier === 'advanced';

const BY_ID = new Map(SERVICES.map((s) => [s.id, s]));

export function getService(id: string): ServiceDef | undefined {
  return BY_ID.get(id);
}

/** Edges that deliver work asynchronously (not on the user's request path). */
export function isAsyncEdge(source: ServiceDef): boolean {
  return source.behavior === 'queue' || source.behavior === 'pubsub' || source.behavior === 'db' || source.behavior === 'object';
}

export type ConnectCheck = { ok: true } | { ok: false; reason: LocalizedText };

/**
 * Can `source` send requests/events to `target`? Rejects connections that make
 * no sense; questionable-but-possible ones (e.g. users → database) are allowed
 * and flagged by the linter instead, because spotting them is part of learning.
 */
export function canConnect(source: ServiceDef, target: ServiceDef): ConnectCheck {
  if (target.behavior === 'client') {
    return { ok: false, reason: tx('Users only send traffic; nothing connects into them.', 'Users chỉ gửi traffic; không có gì nối ngược vào Users.') };
  }
  if (source.behavior === 'cache') {
    return {
      ok: false,
      reason: tx(
        'A cache does not call other services — connect your app to both the cache and the database.',
        'Cache không gọi dịch vụ khác — hãy nối app tới cả cache lẫn database.',
      ),
    };
  }
  if (source.behavior === 'db' || source.behavior === 'object') {
    if (target.id === 'lambda') return { ok: true }; // S3 events / DynamoDB Streams → Lambda
    return {
      ok: false,
      reason: tx(
        'Data stores only emit events to Lambda (S3 events, DynamoDB Streams).',
        'Kho dữ liệu chỉ phát sự kiện tới Lambda (S3 event, DynamoDB Streams).',
      ),
    };
  }
  if (source.id === 'firehose' && (target.behavior === 'object' || target.behavior === 'db')) return { ok: true };
  if (source.behavior === 'queue' || source.behavior === 'pubsub') {
    if (target.behavior === 'app' || target.behavior === 'queue' || target.behavior === 'pubsub') return { ok: true };
    return {
      ok: false,
      reason: tx(
        'Queues and topics deliver messages to compute (or other queues/topics), not to databases.',
        'Queue và topic gửi message tới compute (hoặc queue/topic khác), không gửi thẳng vào database.',
      ),
    };
  }
  return { ok: true };
}
