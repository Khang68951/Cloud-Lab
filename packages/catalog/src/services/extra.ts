import { tx, type ServiceDef } from '../types.ts';
import { bool, gbPerMonth, hours, line, millionsPerMonth, num, p, str, total } from '../util.ts';

/**
 * Services added for the deep-dive courses (security, networking, serverless,
 * analytics). Reference prices: us-east-1, 2026-11.
 */

export const cognito: ServiceDef = {
  id: 'cognito',
  name: 'Amazon Cognito',
  short: 'Cognito',
  category: 'network',
  behavior: 'db',
  icon: 'user-check',
  equivalents: { azure: 'Entra External ID (Azure AD B2C)', gcp: 'Identity Platform' },
  description: tx(
    'User sign-up/sign-in and tokens (user pools), plus temporary AWS credentials for app users (identity pools).',
    'Đăng ký/đăng nhập người dùng và cấp token (user pool), cùng credential AWS tạm thời cho người dùng app (identity pool).',
  ),
  docs: {
    whenToUse: [
      tx('Web/mobile apps that need sign-up, sign-in, MFA and social login.', 'Ứng dụng web/mobile cần đăng ký, đăng nhập, MFA và đăng nhập qua mạng xã hội.'),
      tx('Issuing JWTs that API Gateway can validate without custom code.', 'Cấp JWT mà API Gateway xác thực được mà không cần viết code.'),
    ],
    whenNotTo: [tx('Workforce (employee) login to AWS — use IAM Identity Center.', 'Đăng nhập AWS cho nhân viên — dùng IAM Identity Center.')],
    pros: [tx('Managed, scales to millions of users, first 10,000 MAU free.', 'Được quản lý, scale tới hàng triệu người dùng, 10.000 MAU đầu miễn phí.')],
    cons: [tx('Customising the hosted UI and migrating users out take effort.', 'Tuỳ biến giao diện có sẵn và chuyển người dùng ra ngoài khá tốn công.')],
    pitfalls: [tx('Using identity-pool credentials with overly broad IAM roles.', 'Dùng credential của identity pool với IAM role quá rộng.')],
    pricing: tx('Per monthly active user beyond the free 10,000 (Lite ~$0.0055, Essentials ~$0.015).', 'Theo người dùng hoạt động mỗi tháng, sau 10.000 MAU miễn phí (Lite ~$0.0055, Essentials ~$0.015).'),
  },
  fields: [
    { key: 'mau', kind: 'number', label: tx('Monthly active users', 'Người dùng hoạt động/tháng'), min: 0, max: 100_000_000, step: 1000, default: 50000 },
    {
      key: 'tier',
      kind: 'select',
      label: tx('Feature tier', 'Gói tính năng'),
      options: [
        { value: 'lite', label: 'Lite' },
        { value: 'essentials', label: 'Essentials' },
      ],
      default: 'essentials',
    },
  ],
  model: (ctx) => {
    const mau = num(ctx, 'mau', 50000);
    const per = str(ctx, 'tier') === 'lite' ? 0.0055 : 0.015;
    return {
      capacityRps: Infinity,
      baseLatencyMs: 30,
      availability: 0.999,
      azLayout: 'regional',
      costs: [line(`${mau.toLocaleString('en-US')} MAU`, `${mau.toLocaleString('en-US')} MAU`, p(ctx, Math.max(0, mau - 10000) * per), 'requests')],
      summary: `${Math.round(mau / 1000)}k MAU`,
    };
  },
};

export const stepfunctions: ServiceDef = {
  id: 'stepfunctions',
  name: 'AWS Step Functions',
  short: 'Step Functions',
  category: 'compute',
  behavior: 'app',
  icon: 'workflow',
  equivalents: { azure: 'Logic Apps / Durable Functions', gcp: 'Workflows' },
  description: tx(
    'Serverless workflows: chain Lambda and AWS service calls with retries, branches, waits and error handling.',
    'Workflow serverless: nối các lời gọi Lambda và dịch vụ AWS, có retry, rẽ nhánh, chờ và xử lý lỗi.',
  ),
  docs: {
    whenToUse: [
      tx('Multi-step business processes (orders, payments, onboarding) and sagas.', 'Quy trình nghiệp vụ nhiều bước (đơn hàng, thanh toán, onboarding) và saga.'),
      tx('Long waits or human approval (Standard workflows run up to a year).', 'Chờ lâu hoặc cần người duyệt (workflow Standard chạy tới một năm).'),
    ],
    whenNotTo: [tx('A single simple call — orchestration adds cost and latency.', 'Một lời gọi đơn giản — điều phối chỉ thêm chi phí và độ trễ.')],
    pros: [tx('Retries, timeouts and visual execution history built in.', 'Có sẵn retry, timeout và lịch sử chạy dạng trực quan.')],
    cons: [tx('Standard workflows are priced per state transition — chatty flows get expensive.', 'Workflow Standard tính theo số lần chuyển trạng thái — flow nhiều bước sẽ đắt.')],
    pitfalls: [tx('Using Standard for high-volume, short flows — Express is far cheaper.', 'Dùng Standard cho flow ngắn, khối lượng lớn — Express rẻ hơn rất nhiều.')],
    pricing: tx('Standard: $0.025 per 1,000 state transitions. Express: $1 per million executions + duration.', 'Standard: $0.025 mỗi 1.000 lần chuyển trạng thái. Express: $1 mỗi triệu lượt chạy + thời gian chạy.'),
  },
  fields: [
    {
      key: 'type',
      kind: 'select',
      label: tx('Workflow type', 'Loại workflow'),
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'express', label: 'Express' },
      ],
      default: 'standard',
    },
    { key: 'steps', kind: 'number', label: tx('State transitions per execution', 'Số lần chuyển trạng thái mỗi lượt chạy'), min: 1, max: 1000, step: 1, default: 6 },
    { key: 'durationMs', kind: 'number', label: tx('Duration (Express)', 'Thời gian chạy (Express)'), min: 1, max: 300000, step: 10, unit: 'ms', default: 500 },
  ],
  model: (ctx) => {
    const execM = millionsPerMonth(total(ctx.avg));
    const express = str(ctx, 'type') === 'express';
    const cost = express
      ? execM * 1 + execM * 1e6 * (num(ctx, 'durationMs', 500) / 1000) * 0.0625 * 0.00001667
      : execM * 1e6 * num(ctx, 'steps', 6) * (0.025 / 1000);
    return {
      capacityRps: express ? 100000 : 2000,
      baseLatencyMs: express ? 20 : 60,
      availability: 0.999,
      azLayout: 'regional',
      costs: [line(express ? 'Express executions' : 'State transitions', express ? 'Lượt chạy Express' : 'Lần chuyển trạng thái', p(ctx, cost), 'requests')],
      summary: express ? 'Express' : `Standard · ${num(ctx, 'steps', 6)} steps`,
    };
  },
};

export const firehose: ServiceDef = {
  id: 'firehose',
  name: 'Amazon Data Firehose',
  short: 'Firehose',
  category: 'messaging',
  behavior: 'queue',
  icon: 'flame',
  equivalents: { azure: 'Event Hubs Capture / Stream Analytics', gcp: 'Pub/Sub → Dataflow' },
  description: tx(
    'Fully managed delivery of streaming data into S3, Redshift or OpenSearch — buffering, batching, compression and format conversion.',
    'Dịch vụ đẩy dữ liệu streaming vào S3, Redshift hoặc OpenSearch — tự đệm, gom lô, nén và chuyển định dạng.',
  ),
  docs: {
    whenToUse: [
      tx('Landing logs, clickstreams and IoT events in a data lake with zero code.', 'Đưa log, clickstream và sự kiện IoT vào data lake mà không cần viết code.'),
      tx('Converting JSON to Parquet on the way into S3.', 'Chuyển JSON sang Parquet trên đường vào S3.'),
    ],
    whenNotTo: [tx('Sub-second processing or custom consumers → Kinesis Data Streams.', 'Cần xử lý dưới 1 giây hoặc consumer tự viết → Kinesis Data Streams.')],
    pros: [tx('No shards to manage; scales automatically.', 'Không phải quản lý shard; tự scale.')],
    cons: [tx('Buffering adds ~60 s+ delay before data appears.', 'Việc đệm làm dữ liệu xuất hiện trễ ~60 giây trở lên.')],
    pitfalls: [tx('Tiny records are rounded up to 5 KB each for billing.', 'Record quá nhỏ bị làm tròn lên 5 KB mỗi record khi tính tiền.')],
    pricing: tx('~$0.029 per GB ingested (records rounded up to 5 KB).', '~$0.029 mỗi GB nạp vào (mỗi record làm tròn lên 5 KB).'),
  },
  fields: [],
  model: (ctx) => {
    const gb = gbPerMonth(total(ctx.avg), Math.max(5, ctx.scenario.payloadKB));
    return {
      capacityRps: Infinity,
      baseLatencyMs: 10,
      availability: 0.999,
      azLayout: 'regional',
      costs: [line(`Ingestion (${gb.toFixed(0)} GB billed)`, `Dữ liệu nạp (${gb.toFixed(0)} GB tính phí)`, p(ctx, gb * 0.029), 'requests')],
      summary: 'delivery stream',
    };
  },
};

const OS_NODES: Record<string, { hourly: number; rps: number }> = {
  't3.small.search': { hourly: 0.036, rps: 50 },
  'm6g.large.search': { hourly: 0.128, rps: 300 },
  'r6g.large.search': { hourly: 0.167, rps: 400 },
  'r6g.xlarge.search': { hourly: 0.335, rps: 800 },
};

export const opensearch: ServiceDef = {
  id: 'opensearch',
  name: 'Amazon OpenSearch Service',
  short: 'OpenSearch',
  category: 'database',
  behavior: 'db',
  icon: 'search',
  equivalents: { azure: 'Azure AI Search', gcp: 'Elastic Cloud on GCP' },
  description: tx(
    'Managed OpenSearch (Elasticsearch-compatible): full-text search, log analytics and dashboards.',
    'OpenSearch được quản lý (tương thích Elasticsearch): tìm kiếm toàn văn, phân tích log và dashboard.',
  ),
  docs: {
    whenToUse: [
      tx('Full-text search, autocomplete, faceted filters on products or documents.', 'Tìm kiếm toàn văn, gợi ý từ khoá, lọc nhiều tiêu chí trên sản phẩm hoặc tài liệu.'),
      tx('Searching and visualising application logs.', 'Tìm kiếm và trực quan hoá log ứng dụng.'),
    ],
    whenNotTo: [
      tx('As the system of record — keep the source of truth in a database and index into OpenSearch.', 'Làm nơi lưu dữ liệu gốc — hãy giữ dữ liệu gốc trong database rồi index sang OpenSearch.'),
    ],
    pros: [tx('Powerful relevance, aggregations and dashboards.', 'Xếp hạng kết quả, tổng hợp số liệu và dashboard mạnh mẽ.')],
    cons: [tx('Cluster sizing and shard planning need care; always-on cost.', 'Cần cẩn thận khi chọn cỡ cluster và chia shard; tốn tiền liên tục.')],
    pitfalls: [tx('Single-node domains in production; too many small shards.', 'Domain một node cho production; quá nhiều shard nhỏ.')],
    pricing: tx('Per instance-hour + EBS storage (~$0.122/GB-month gp3). Serverless option bills OCUs.', 'Theo giờ chạy instance + lưu trữ EBS (~$0.122/GB-tháng gp3). Bản serverless tính theo OCU.'),
  },
  fields: [
    {
      key: 'nodeType',
      kind: 'select',
      label: tx('Data node type', 'Loại data node'),
      options: Object.entries(OS_NODES).map(([k, v]) => ({ value: k, label: `${k} — $${v.hourly}/h, ~${v.rps} qps` })),
      default: 'm6g.large.search',
    },
    { key: 'count', kind: 'number', label: tx('Data nodes', 'Số data node'), min: 1, max: 40, step: 1, default: 2 },
    { key: 'zoneAware', kind: 'toggle', label: tx('Zone awareness (2 AZs)', 'Zone awareness (2 AZ)'), default: true },
    { key: 'storageGB', kind: 'number', label: tx('Storage per node', 'Lưu trữ mỗi node'), min: 10, max: 10000, step: 10, unit: 'GB', default: 100 },
  ],
  model: (ctx) => {
    const node = OS_NODES[str(ctx, 'nodeType', 'm6g.large.search')] ?? OS_NODES['m6g.large.search']!;
    const n = num(ctx, 'count', 2);
    const multi = bool(ctx, 'zoneAware') && n >= 2;
    return {
      capacityRps: node.rps * n,
      baseLatencyMs: 15,
      availability: multi ? 0.999 : 0.995,
      azLayout: multi ? 'multi-az' : 'single-az',
      costs: [
        line(`${n}× ${str(ctx, 'nodeType')}`, `${n}× ${str(ctx, 'nodeType')}`, p(ctx, n * node.hourly * hours), 'compute'),
        line('EBS storage', 'Lưu trữ EBS', p(ctx, n * num(ctx, 'storageGB', 100) * 0.122), 'storage'),
      ],
      summary: `${n}× ${str(ctx, 'nodeType').replace('.search', '')}`,
      instances: n,
    };
  },
};

export const globalAccelerator: ServiceDef = {
  id: 'globalaccelerator',
  name: 'AWS Global Accelerator',
  short: 'Global Accelerator',
  category: 'edge',
  behavior: 'router',
  icon: 'rocket',
  equivalents: { azure: 'Front Door (anycast) / Cross-region LB', gcp: 'Global external LB (anycast)' },
  description: tx(
    'Two static anycast IPs that route users onto the AWS backbone at the nearest edge, with fast regional failover. Works for TCP and UDP.',
    'Hai IP anycast tĩnh đưa người dùng vào mạng xương sống của AWS từ edge gần nhất, failover giữa các region rất nhanh. Dùng được cho TCP và UDP.',
  ),
  docs: {
    whenToUse: [
      tx('Non-HTTP or uncacheable traffic (gaming, VoIP, APIs) that needs global low latency.', 'Traffic không phải HTTP hoặc không cache được (game, VoIP, API) cần độ trễ thấp toàn cầu.'),
      tx('Fixed IPs for allow-lists, and multi-Region failover in seconds.', 'IP cố định để allow-list, và failover multi-region trong vài giây.'),
    ],
    whenNotTo: [tx('Cacheable web content → CloudFront is cheaper and caches.', 'Nội dung web cache được → CloudFront rẻ hơn và có cache.')],
    pros: [tx('No DNS TTL delays on failover.', 'Failover không bị trễ vì TTL của DNS.')],
    cons: [tx('No caching; extra per-GB premium.', 'Không có cache; tốn thêm phụ phí theo GB.')],
    pitfalls: [tx('Using it in front of a single Region with no failover target.', 'Đặt nó trước một region duy nhất, không có đích failover.')],
    pricing: tx('~$0.025/hour per accelerator + a data-transfer premium (~$0.015/GB NA/EU).', '~$0.025/giờ mỗi accelerator + phụ phí data transfer (~$0.015/GB Bắc Mỹ/EU).'),
  },
  fields: [],
  model: (ctx) => {
    const gb = gbPerMonth(total(ctx.avg), ctx.scenario.payloadKB);
    return {
      capacityRps: Infinity,
      baseLatencyMs: 1,
      availability: 0.9999,
      azLayout: 'regional',
      costs: [
        line('Accelerator hours', 'Giờ chạy accelerator', p(ctx, 0.025 * hours), 'other'),
        line('Data-transfer premium', 'Phụ phí data transfer', p(ctx, gb * 0.015), 'transfer'),
      ],
      summary: 'anycast',
    };
  },
};

export const transitGateway: ServiceDef = {
  id: 'transitgateway',
  name: 'AWS Transit Gateway',
  short: 'Transit GW',
  category: 'network',
  behavior: 'endpoint',
  icon: 'waypoints',
  equivalents: { azure: 'Virtual WAN hub', gcp: 'Network Connectivity Center' },
  description: tx(
    'A regional hub that connects many VPCs, VPNs and Direct Connect links with central route tables.',
    'Hub cấp region kết nối nhiều VPC, VPN và Direct Connect với route table tập trung.',
  ),
  docs: {
    whenToUse: [
      tx('More than a handful of VPCs that need to talk to each other or to on-prem.', 'Nhiều hơn vài VPC cần nói chuyện với nhau hoặc với on-prem.'),
      tx('Central inspection/egress VPC patterns.', 'Mô hình VPC kiểm tra hoặc egress tập trung.'),
    ],
    whenNotTo: [tx('Two VPCs with heavy traffic → peering has no per-GB processing fee.', 'Hai VPC trao đổi traffic lớn → peering không có phí xử lý theo GB.')],
    pros: [tx('Hub-and-spoke instead of an N² mesh of peerings.', 'Mô hình hub-and-spoke thay vì lưới N² kết nối peering.')],
    cons: [tx('Per-attachment hourly fee and $0.02/GB processed.', 'Phí theo giờ cho mỗi attachment và $0.02/GB xử lý.')],
    pitfalls: [tx('Routing all east-west traffic through it without checking the per-GB cost.', 'Cho toàn bộ traffic giữa các VPC đi qua nó mà không xem phí theo GB.')],
    pricing: tx('~$0.05/hour per attachment + ~$0.02 per GB processed.', '~$0.05/giờ mỗi attachment + ~$0.02 mỗi GB xử lý.'),
  },
  fields: [{ key: 'attachments', kind: 'number', label: tx('Attachments (VPCs/VPNs)', 'Số attachment (VPC/VPN)'), min: 1, max: 5000, step: 1, default: 3 }],
  model: (ctx) => {
    const n = num(ctx, 'attachments', 3);
    const gb = gbPerMonth(total(ctx.avg), ctx.scenario.payloadKB);
    return {
      capacityRps: Infinity,
      baseLatencyMs: 1,
      availability: 0.9999,
      azLayout: 'regional',
      costs: [
        line(`${n} attachments`, `${n} attachment`, p(ctx, n * 0.05 * hours), 'other'),
        line('Data processed', 'Dữ liệu xử lý', p(ctx, gb * 0.02), 'transfer'),
      ],
      summary: `${n} attachments`,
    };
  },
};
