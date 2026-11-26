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
      'Route 53 → WAF + CloudFront → ALB → EC2 Auto Scaling across 2 AZs → ElastiCache + RDS Multi-AZ. Security groups chained tier by tier.',
      'Route 53 → WAF + CloudFront → ALB → EC2 Auto Scaling trên 2 AZ → ElastiCache + RDS Multi-AZ. Security group nối nhau từng tầng.',
    ),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['dns', 'route53', 1, 1],
        ['waf', 'waf', 2, 0],
        ['cdn', 'cloudfront', 2, 1, { hitRatio: 0.6 }],
        ['lb', 'alb', 3, 1],
        ['app', 'ec2', 4, 1, { instanceType: 't3.medium', count: 2, autoscaling: true, maxCount: 8, multiAz: true, sg: '80<sg:lb' }, 'Web/API'],
        ['cache', 'elasticache', 5, 0, { sg: '6379<sg:app' }],
        ['db', 'rds', 5, 2, { multiAz: true, instanceClass: 'db.t3.medium', sg: '5432<sg:app' }],
      ],
      ['users>dns', 'dns>waf', 'waf>cdn', 'cdn>lb', 'lb>app', 'app>cache', 'app>db'],
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
  {
    id: 'microservices',
    name: tx('Microservices on ECS Fargate', 'Microservice trên ECS Fargate'),
    description: tx(
      'One ALB routes /orders and /catalog to two Fargate services, each owning its data: orders in Aurora Serverless, the catalog in DynamoDB (through a free gateway endpoint) with an ElastiCache layer in front.',
      'Một ALB định tuyến /orders và /catalog tới hai service Fargate, mỗi service giữ dữ liệu riêng: orders trong Aurora Serverless, catalog trong DynamoDB (qua gateway endpoint miễn phí) có ElastiCache đứng trước.',
    ),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['waf', 'waf', 1, 1],
        ['lb', 'alb', 2, 1],
        ['orders', 'fargate', 3, 0, { taskSize: '0.5-1', count: 2, autoscaling: true, maxCount: 10, multiAz: true, sg: '80<sg:lb' }, 'Orders service'],
        ['catalog', 'fargate', 3, 2, { taskSize: '0.5-1', count: 2, autoscaling: true, maxCount: 10, multiAz: true, sg: '80<sg:lb' }, 'Catalog service'],
        ['db', 'aurora-serverless', 4, 0, { count: 2, sg: '5432<sg:orders' }, 'Orders DB'],
        ['cache', 'elasticache', 4, 1, { nodeType: 'cache.t3.micro', sg: '6379<sg:catalog' }, 'Catalog cache'],
        ['gw', 'vpce', 4, 3, { type: 'gateway' }, 'DynamoDB endpoint'],
        ['table', 'dynamodb', 5, 2, {}, 'Products'],
      ],
      ['users>waf', 'waf>lb', 'lb>orders', 'lb>catalog', 'orders>db', 'catalog>cache', 'catalog>table'],
      { rps: 150, readRatio: 0.8, payloadKB: 2 },
    ),
  },
  {
    id: 'wordpress',
    name: tx('WordPress / CMS, highly available', 'WordPress / CMS sẵn sàng cao'),
    description: tx(
      'CloudFront caches pages and media, EC2 Auto Scaling runs PHP in 2 AZs, EFS shares the uploads folder between instances, RDS MySQL Multi-AZ stores posts.',
      'CloudFront cache trang và media, EC2 Auto Scaling chạy PHP trên 2 AZ, EFS chia sẻ thư mục uploads giữa các instance, RDS MySQL Multi-AZ lưu bài viết.',
    ),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['dns', 'route53', 1, 1],
        ['waf', 'waf', 2, 0],
        ['cdn', 'cloudfront', 2, 1, { hitRatio: 0.85 }],
        ['lb', 'alb', 3, 1],
        ['wp', 'ec2', 4, 1, { instanceType: 't3.small', count: 2, autoscaling: true, maxCount: 6, multiAz: true, sg: '80<sg:lb' }, 'WordPress'],
        ['db', 'rds', 5, 0, { engine: 'mysql', instanceClass: 'db.t3.micro', multiAz: true, sg: '3306<sg:wp' }, 'MySQL'],
        ['files', 'efs', 5, 2, { storageGB: 50, sg: '2049<sg:wp' }, 'Uploads (EFS)'],
      ],
      ['users>dns', 'dns>waf', 'waf>cdn', 'cdn>lb', 'lb>wp', 'wp>db', 'wp>files'],
      { rps: 30, readRatio: 0.95, payloadKB: 40 },
    ),
  },
  {
    id: 'image-pipeline',
    name: tx('Photo upload & thumbnails', 'Upload ảnh & tạo thumbnail'),
    description: tx(
      'Users upload straight to S3; every new object triggers a Lambda that writes thumbnails to a second bucket and metadata to DynamoDB. CloudFront serves the results.',
      'Người dùng upload thẳng lên S3; mỗi object mới kích hoạt một Lambda ghi thumbnail vào bucket thứ hai và metadata vào DynamoDB. CloudFront phục vụ kết quả.',
    ),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['cdn', 'cloudfront', 1, 1, { hitRatio: 0.9 }],
        ['uploads', 's3', 2, 1, { storageGB: 500 }, 'Uploads'],
        ['fn', 'lambda', 3, 1, { memoryMB: '1024', durationMs: 900 }, 'Make thumbnails'],
        ['thumbs', 's3', 4, 0, { storageGB: 100 }, 'Thumbnails'],
        ['meta', 'dynamodb', 4, 2, {}, 'Photo metadata'],
      ],
      ['users>cdn', 'cdn>uploads', 'uploads>fn', 'fn>thumbs', 'fn>meta'],
      { rps: 5, readRatio: 0.8, payloadKB: 200 },
    ),
  },
  {
    id: 'clickstream',
    name: tx('Clickstream analytics', 'Phân tích clickstream'),
    description: tx(
      'Browsers send events to API Gateway, Kinesis Data Streams buffers them, Firehose batches them into S3 as a data lake you can query with Athena.',
      'Trình duyệt gửi event tới API Gateway, Kinesis Data Streams làm bộ đệm, Firehose gom thành file trong S3 làm data lake để truy vấn bằng Athena.',
    ),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['waf', 'waf', 1, 1],
        ['api', 'apigw', 2, 1, {}, 'Collect events'],
        ['stream', 'kinesis', 3, 1, { shards: 2 }],
        ['fh', 'firehose', 4, 1],
        ['lake', 's3', 5, 1, { storageGB: 2000, storageClass: 'intelligent-tiering' }, 'Data lake'],
      ],
      ['users>waf', 'waf>api', 'api>stream', 'stream>fh', 'fh>lake'],
      { rps: 100, readRatio: 0, payloadKB: 1 },
    ),
  },
  {
    id: 'websocket-chat',
    name: tx('Real-time chat (WebSocket)', 'Chat thời gian thực (WebSocket)'),
    description: tx(
      'API Gateway keeps WebSocket connections open, a Lambda handles each message and DynamoDB stores rooms, members and messages. No servers to run.',
      'API Gateway giữ kết nối WebSocket, một Lambda xử lý từng tin nhắn và DynamoDB lưu phòng, thành viên và tin nhắn. Không có server nào phải chạy.',
    ),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['api', 'apigw', 1, 1, { type: 'websocket', connections: 2000 }, 'WebSocket API'],
        ['fn', 'lambda', 2, 1, { durationMs: 40, memoryMB: '256' }, 'On message'],
        ['table', 'dynamodb', 3, 1, {}, 'Rooms & messages'],
      ],
      ['users>api', 'api>fn', 'fn>table'],
      { rps: 30, readRatio: 0.5, payloadKB: 1 },
    ),
  },
  {
    id: 'serverless-web-app',
    name: tx('Full-stack serverless web app', 'Web app full-stack serverless'),
    description: tx(
      'A single-page app on S3 + CloudFront, sign-in with Cognito, and a backend of API Gateway → Lambda → DynamoDB. The usual starting point for a new product.',
      'Ứng dụng single-page trên S3 + CloudFront, đăng nhập bằng Cognito, backend là API Gateway → Lambda → DynamoDB. Điểm khởi đầu quen thuộc cho một sản phẩm mới.',
    ),
    design: buildDesign(
      [
        ['users', 'users', 0, 1],
        ['auth', 'cognito', 1, 0, { mau: 10000 }, 'Sign-in'],
        ['cdn', 'cloudfront', 1, 1, { hitRatio: 0.9 }],
        ['site', 's3', 2, 0, { storageGB: 5 }, 'Web app (SPA)'],
        ['api', 'apigw', 2, 2],
        ['fn', 'lambda', 3, 2, { durationMs: 80 }, 'API handler'],
        ['table', 'dynamodb', 4, 2],
      ],
      ['users>auth', 'users>cdn', 'cdn>site', 'cdn>api', 'api>fn', 'fn>table'],
      { rps: 40, readRatio: 0.8, payloadKB: 8 },
    ),
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
