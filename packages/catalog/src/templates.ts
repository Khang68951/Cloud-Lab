import type { LocalizedText } from '@cloudlab/shared';
import { DEFAULT_SCENARIO, type Design, type DesignEdge, type DesignNode } from './design.ts';
import { tx, type Scenario, type ServiceConfig } from './types.ts';

export interface Template {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  design: Design;
}

/** Compact builder: nodes on a grid (col, row), edges as "a>b". Used by templates and challenges. */
export function buildDesign(
  nodes: [id: string, service: string, col: number, row: number, config?: ServiceConfig, label?: string][],
  edges: string[],
  scenario: Partial<Scenario> = {},
): Design {
  const ns: DesignNode[] = nodes.map(([id, service, col, row, config, label]) => ({
    id,
    service,
    x: col * 230,
    y: row * 150,
    config: config ?? {},
    ...(label ? { label } : {}),
  }));
  const es: DesignEdge[] = edges.map((e) => {
    const [source, target] = e.split('>') as [string, string];
    return { id: `${source}-${target}`, source, target };
  });
  return { nodes: ns, edges: es, scenario: { ...DEFAULT_SCENARIO, ...scenario } };
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: tx('Blank canvas', 'Canvas trống'),
    description: tx('Start from just the users.', 'Bắt đầu chỉ với Users.'),
    design: buildDesign([['users', 'users', 0, 1]], []),
  },
  {
    id: 'three-tier',
    name: tx('Classic 3-tier web app', 'Web app 3 tầng kinh điển'),
    description: tx(
      'Route 53 → ALB → EC2 Auto Scaling across 2 AZs → ElastiCache + RDS Multi-AZ.',
      'Route 53 → ALB → EC2 Auto Scaling trên 2 AZ → ElastiCache + RDS Multi-AZ.',
    ),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['dns', 'route53', 1, 1],
        ['lb', 'alb', 2, 1],
        ['app', 'ec2', 3, 1, { instanceType: 't3.medium', count: 2, autoscaling: true, maxCount: 8, multiAz: true }, 'Web/API'],
        ['cache', 'elasticache', 4, 0],
        ['db', 'rds', 4, 2, { multiAz: true, instanceClass: 'db.t3.medium' }],
      ],
      ['users>dns', 'dns>lb', 'lb>app', 'app>cache', 'app>db'],
    ),
  },
  {
    id: 'serverless-api',
    name: tx('Serverless API', 'API serverless'),
    description: tx('API Gateway → Lambda → DynamoDB. Zero idle cost.', 'API Gateway → Lambda → DynamoDB. Không tốn tiền khi rảnh.'),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['api', 'apigw', 1, 1],
        ['fn', 'lambda', 2, 1, {}, 'API handler'],
        ['table', 'dynamodb', 3, 1],
      ],
      ['users>api', 'api>fn', 'fn>table'],
      { rps: 20, readRatio: 0.7, payloadKB: 4 },
    ),
  },
  {
    id: 'static-site',
    name: tx('Static website', 'Website tĩnh'),
    description: tx('Route 53 → CloudFront → S3. Cheap, fast, nothing to patch.', 'Route 53 → CloudFront → S3. Rẻ, nhanh, không có gì phải vá.'),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['dns', 'route53', 1, 1],
        ['cdn', 'cloudfront', 2, 1, { hitRatio: 0.95 }],
        ['bucket', 's3', 3, 1, { storageGB: 20 }],
      ],
      ['users>dns', 'dns>cdn', 'cdn>bucket'],
      { rps: 30, readRatio: 1, payloadKB: 50 },
    ),
  },
  {
    id: 'event-driven',
    name: tx('Event-driven orders', 'Xử lý đơn hàng event-driven'),
    description: tx(
      'API accepts orders fast, SQS buffers them, a worker Lambda processes them asynchronously.',
      'API nhận đơn thật nhanh, SQS làm bộ đệm, Lambda worker xử lý bất đồng bộ.',
    ),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['api', 'apigw', 1, 1],
        ['fn', 'lambda', 2, 1, { durationMs: 50 }, 'Accept order'],
        ['q', 'sqs', 3, 0],
        ['worker', 'lambda', 4, 0, { durationMs: 800, memoryMB: '1024' }, 'Process order'],
        ['table', 'dynamodb', 3, 2],
      ],
      ['users>api', 'api>fn', 'fn>q', 'fn>table', 'q>worker', 'worker>table'],
      { rps: 10, readRatio: 0.5, payloadKB: 2 },
    ),
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
