import type { LocalizedText } from '@cloudlab/shared';
import { PRICES } from '../pricing.ts';
import { tx, type ServiceDef, type ServiceDocs } from '../types.ts';
import { bool, gbPerMonth, hours, line, millionsPerMonth, num, p, str, total } from '../util.ts';
import { fleetModel, instanceField, scalingFields, sized } from './compute.ts';
import { replicatedCapacity } from './data.ts';

/**
 * Advanced services: shown behind the "⋯" expander of each palette category.
 * They are simulated like any other service, but their docs are shorter —
 * enough to compare them with the core services and learn when they fit.
 * Prices: us-east-1 on-demand reference prices (see pricing.ts).
 */

type Pair = [en: string, vi: string];
const t2 = ([en, vi]: Pair): LocalizedText => tx(en, vi);
function docs(d: { use: Pair[]; not: Pair[]; pros: Pair[]; cons: Pair[]; pitfalls: Pair[]; pricing: Pair }): ServiceDocs {
  return {
    whenToUse: d.use.map(t2),
    whenNotTo: d.not.map(t2),
    pros: d.pros.map(t2),
    cons: d.cons.map(t2),
    pitfalls: d.pitfalls.map(t2),
    pricing: t2(d.pricing),
  };
}

/** Requests/second a link of `gbps` can carry at `kb` per request. */
const linkRps = (gbps: number, kb: number) => (gbps * 125_000) / Math.max(kb, 1);

// ───────────────────────────── Edge ─────────────────────────────

export const shieldAdvanced: ServiceDef = {
  id: 'shield',
  name: 'AWS Shield Advanced',
  short: 'Shield Adv.',
  category: 'edge',
  tier: 'advanced',
  behavior: 'router',
  icon: 'shield-check',
  equivalents: { azure: 'Azure DDoS Protection', gcp: 'Cloud Armor Enterprise' },
  description: tx(
    'Managed DDoS protection for CloudFront, Route 53, ALB, Global Accelerator and Elastic IPs, with a 24/7 response team and cost protection.',
    'Bảo vệ DDoS được quản lý cho CloudFront, Route 53, ALB, Global Accelerator và Elastic IP, kèm đội phản ứng 24/7 và bảo hiểm chi phí.',
  ),
  docs: docs({
    use: [
      ['Business-critical public apps that are realistic DDoS targets (finance, gaming, e-commerce).', 'Ứng dụng public quan trọng, dễ là mục tiêu DDoS (tài chính, game, thương mại điện tử).'],
      ['You need DDoS cost protection: AWS credits scaling charges caused by an attack.', 'Cần bảo hiểm chi phí DDoS: AWS hoàn lại tiền scale phát sinh do bị tấn công.'],
    ],
    not: [['Small projects — Shield Standard is free and always on for every AWS customer.', 'Dự án nhỏ — Shield Standard miễn phí và luôn bật cho mọi khách hàng AWS.']],
    pros: [['Layer 3/4/7 detection, Shield Response Team, WAF included for protected resources.', 'Phát hiện tấn công tầng 3/4/7, có Shield Response Team, WAF đi kèm cho tài nguyên được bảo vệ.']],
    cons: [['$3,000/month with a 1-year commitment, per organization.', '$3.000/tháng, cam kết 1 năm, tính theo organization.']],
    pitfalls: [['Buying it for a hobby app — the fixed fee dwarfs everything else on the bill.', 'Mua cho app nhỏ — phí cố định lớn hơn hẳn mọi thứ khác trên hoá đơn.']],
    pricing: ['$3,000/month (1-year commitment) + data transfer out through protected resources (~$0.025/GB).', '$3.000/tháng (cam kết 1 năm) + data transfer out qua tài nguyên được bảo vệ (~$0.025/GB).'],
  }),
  fields: [],
  model: (ctx) => ({
    capacityRps: Infinity,
    baseLatencyMs: 0,
    availability: 0.99999,
    azLayout: 'regional',
    costs: [
      line('Subscription', 'Phí thuê bao', 3000, 'other'),
      line('Protected data out', 'Data out được bảo vệ', p(ctx, gbPerMonth(total(ctx.avg), ctx.scenario.payloadKB) * 0.025), 'transfer'),
    ],
    summary: 'DDoS L3–L7',
  }),
};

// ──────────────────────────── Network ────────────────────────────

export const appsync: ServiceDef = {
  id: 'appsync',
  name: 'AWS AppSync',
  short: 'AppSync',
  category: 'network',
  tier: 'advanced',
  behavior: 'router',
  icon: 'braces',
  equivalents: { azure: 'API Management (GraphQL) / Web PubSub', gcp: 'Apigee (GraphQL) / Firebase' },
  description: tx(
    'Managed GraphQL API with real-time subscriptions over WebSockets; resolvers call DynamoDB, Lambda, HTTP or RDS directly.',
    'GraphQL API được quản lý, có subscription realtime qua WebSocket; resolver gọi thẳng DynamoDB, Lambda, HTTP hoặc RDS.',
  ),
  docs: docs({
    use: [
      ['Mobile/web apps that need one query to fetch data from several sources.', 'App mobile/web cần một query lấy dữ liệu từ nhiều nguồn.'],
      ['Live updates (chat, dashboards, collaboration) via GraphQL subscriptions.', 'Cập nhật realtime (chat, dashboard, cộng tác) qua GraphQL subscription.'],
    ],
    not: [['Simple REST CRUD → API Gateway HTTP API is cheaper ($1/M vs $4/M).', 'REST CRUD đơn giản → API Gateway HTTP API rẻ hơn ($1/M so với $4/M).']],
    pros: [['No servers for the API layer; caching, auth (Cognito/IAM) built in.', 'Không cần server cho tầng API; có sẵn cache và auth (Cognito/IAM).']],
    cons: [['GraphQL learning curve; complex resolvers are hard to debug.', 'Phải học GraphQL; resolver phức tạp khó debug.']],
    pitfalls: [['N+1 resolver calls: one query fans out into hundreds of backend requests.', 'Lỗi N+1: một query bung ra hàng trăm request xuống backend.']],
    pricing: ['$4.00 per million queries/mutations; real-time: $2.00 per million messages + $0.08 per million connection-minutes.', '$4,00 mỗi triệu query/mutation; realtime: $2,00 mỗi triệu message + $0,08 mỗi triệu phút kết nối.'],
  }),
  fields: [
    {
      key: 'connections',
      kind: 'number',
      label: tx('Concurrent real-time connections', 'Số kết nối realtime đồng thời'),
      help: tx('Clients subscribed over WebSocket (0 = queries only).', 'Số client subscribe qua WebSocket (0 = chỉ dùng query).'),
      min: 0,
      max: 1_000_000,
      step: 100,
      default: 0,
    },
  ],
  model: (ctx) => {
    const conns = num(ctx, 'connections', 0);
    const minutesM = (conns * hours * 60) / 1e6;
    return {
      capacityRps: Infinity,
      baseLatencyMs: 15,
      availability: 0.9995,
      azLayout: 'regional',
      costs: [
        line('GraphQL operations', 'Thao tác GraphQL', p(ctx, millionsPerMonth(total(ctx.avg)) * 4), 'requests'),
        ...(conns > 0
          ? [
              line('Connection-minutes', 'Phút kết nối', p(ctx, minutesM * 0.08), 'requests'),
              line('Real-time messages', 'Message realtime', p(ctx, millionsPerMonth(ctx.avg.w) * 2), 'requests'),
            ]
          : []),
      ],
      summary: conns > 0 ? `GraphQL · ${conns} subs` : 'GraphQL',
    };
  },
};

export const vpcLattice: ServiceDef = {
  id: 'vpclattice',
  name: 'Amazon VPC Lattice',
  short: 'VPC Lattice',
  category: 'network',
  tier: 'advanced',
  behavior: 'router',
  icon: 'share-2',
  equivalents: { azure: 'Private Link + App Gateway (no direct equivalent)', gcp: 'Cloud Service Mesh' },
  description: tx(
    'Application networking for service-to-service calls across VPCs and accounts: routing, auth policies and observability without a sidecar mesh.',
    'Mạng tầng ứng dụng cho các service gọi nhau xuyên VPC và account: định tuyến, auth policy và quan sát mà không cần service mesh sidecar.',
  ),
  docs: docs({
    use: [['Microservices owned by many teams/accounts that must call each other securely.', 'Microservice của nhiều team/account cần gọi nhau an toàn.']],
    not: [['One VPC, a few services → an internal ALB is simpler.', 'Một VPC, vài service → ALB nội bộ đơn giản hơn.']],
    pros: [['IAM-based service auth; works across overlapping CIDRs.', 'Xác thực service bằng IAM; chạy được cả khi CIDR bị trùng.']],
    cons: [['Per-service hourly fee plus per-GB and per-request charges.', 'Phí theo giờ mỗi service cộng phí theo GB và theo request.']],
    pitfalls: [['Treating it as a public entry point — it is for east-west (internal) traffic.', 'Dùng như cổng vào public — nó dành cho traffic nội bộ (east-west).']],
    pricing: ['~$0.025/hour per service + $0.025/GB processed + $0.10 per million requests.', '~$0,025/giờ mỗi service + $0,025/GB xử lý + $0,10 mỗi triệu request.'],
  }),
  fields: [{ key: 'services', kind: 'number', label: tx('Lattice services', 'Số Lattice service'), min: 1, max: 500, step: 1, default: 3 }],
  model: (ctx) => {
    const n = num(ctx, 'services', 3);
    return {
      capacityRps: Infinity,
      baseLatencyMs: 2,
      availability: 0.9999,
      azLayout: 'regional',
      costs: [
        line(`${n} services`, `${n} service`, p(ctx, n * 0.025 * hours), 'other'),
        line('Data processed', 'Dữ liệu xử lý', p(ctx, gbPerMonth(total(ctx.avg), ctx.scenario.payloadKB) * 0.025), 'transfer'),
        line('Requests', 'Request', p(ctx, millionsPerMonth(total(ctx.avg)) * 0.1), 'requests'),
      ],
      summary: `${n} services`,
    };
  },
};

export const siteToSiteVpn: ServiceDef = {
  id: 'vpn',
  name: 'AWS Site-to-Site VPN',
  short: 'S2S VPN',
  category: 'network',
  tier: 'advanced',
  behavior: 'endpoint',
  icon: 'lock',
  equivalents: { azure: 'VPN Gateway', gcp: 'Cloud VPN (HA VPN)' },
  description: tx(
    'Encrypted IPsec tunnels over the internet between your data centre/office and a VPC. Each connection has 2 tunnels in different AZs.',
    'Đường hầm IPsec mã hoá qua internet giữa data centre/văn phòng của bạn và VPC. Mỗi connection có 2 tunnel ở 2 AZ khác nhau.',
  ),
  docs: docs({
    use: [
      ['Quick, cheap hybrid connectivity to on-premises.', 'Kết nối hybrid tới on-premises nhanh và rẻ.'],
      ['Backup path for Direct Connect.', 'Đường dự phòng cho Direct Connect.'],
    ],
    not: [['Steady multi-Gbps traffic or strict latency → Direct Connect.', 'Traffic ổn định nhiều Gbps hoặc cần độ trễ ổn định → Direct Connect.']],
    pros: [['Set up in minutes; encrypted by default.', 'Dựng trong vài phút; mã hoá sẵn.']],
    cons: [['~1.25 Gbps per tunnel; latency varies with the internet.', '~1,25 Gbps mỗi tunnel; độ trễ dao động theo internet.']],
    pitfalls: [['Configuring only one of the two tunnels on your router — no redundancy.', 'Chỉ cấu hình một trong hai tunnel trên router — mất dự phòng.']],
    pricing: ['$0.05/hour per connection + standard data transfer out (~$0.09/GB).', '$0,05/giờ mỗi connection + phí data transfer out thông thường (~$0,09/GB).'],
  }),
  fields: [{ key: 'connections', kind: 'number', label: tx('VPN connections', 'Số VPN connection'), min: 1, max: 50, step: 1, default: 1 }],
  model: (ctx) => {
    const n = num(ctx, 'connections', 1);
    const gb = gbPerMonth(ctx.avg.r, ctx.scenario.payloadKB);
    return {
      capacityRps: n * linkRps(1.25, ctx.scenario.payloadKB),
      baseLatencyMs: 25,
      availability: 0.9995,
      azLayout: 'regional',
      costs: [
        line(`${n} connection(s)`, `${n} connection`, p(ctx, n * 0.05 * hours), 'other'),
        line('Data out to on-prem', 'Data out về on-prem', gb * ctx.region.egressPerGB, 'transfer'),
      ],
      summary: `${n}× IPsec`,
    };
  },
};

export const directConnect: ServiceDef = {
  id: 'directconnect',
  name: 'AWS Direct Connect',
  short: 'Direct Connect',
  category: 'network',
  tier: 'advanced',
  behavior: 'endpoint',
  icon: 'cable',
  equivalents: { azure: 'ExpressRoute', gcp: 'Cloud Interconnect' },
  description: tx(
    'A private, dedicated fibre link between your network and AWS. Consistent latency and much cheaper data transfer out.',
    'Đường cáp quang riêng giữa mạng của bạn và AWS. Độ trễ ổn định và phí data transfer out rẻ hơn nhiều.',
  ),
  docs: docs({
    use: [
      ['Large, steady hybrid traffic (backups, data lakes, migrations).', 'Traffic hybrid lớn và đều (backup, data lake, migration).'],
      ['Compliance that forbids traffic over the public internet.', 'Yêu cầu tuân thủ cấm traffic đi qua internet công cộng.'],
    ],
    not: [['Small or occasional traffic → Site-to-Site VPN is far cheaper to start.', 'Traffic nhỏ hoặc thỉnh thoảng → Site-to-Site VPN rẻ hơn nhiều để bắt đầu.']],
    pros: [['Out transfer ~$0.02/GB instead of ~$0.09/GB.', 'Data out ~$0,02/GB thay vì ~$0,09/GB.']],
    cons: [['Weeks to provision; a single link is a single point of failure.', 'Mất vài tuần để kéo; một đường duy nhất là điểm lỗi duy nhất.']],
    pitfalls: [['One connection only — AWS recommends 2 links at 2 locations for 99.99%.', 'Chỉ một đường — AWS khuyên 2 đường ở 2 location để đạt 99,99%.']],
    pricing: ['Port-hours (1 Gbps ~$0.30/h, 10 Gbps ~$2.25/h) + data transfer out ~$0.02/GB.', 'Phí port theo giờ (1 Gbps ~$0,30/h, 10 Gbps ~$2,25/h) + data transfer out ~$0,02/GB.'],
  }),
  fields: [
    {
      key: 'speed',
      kind: 'select',
      label: tx('Port speed', 'Tốc độ port'),
      options: [
        { value: '1', label: '1 Gbps — $0.30/h' },
        { value: '10', label: '10 Gbps — $2.25/h' },
      ],
      default: '1',
    },
    {
      key: 'redundant',
      kind: 'toggle',
      label: tx('Second link (redundant)', 'Thêm đường thứ hai (dự phòng)'),
      help: tx('Two connections at two locations: SLA 99.99% instead of 99.9%.', 'Hai connection ở hai location: SLA 99,99% thay vì 99,9%.'),
      default: false,
    },
  ],
  model: (ctx) => {
    const gbps = Number(str(ctx, 'speed', '1')) || 1;
    const links = bool(ctx, 'redundant') ? 2 : 1;
    const portHour = gbps >= 10 ? 2.25 : 0.3;
    return {
      capacityRps: links * linkRps(gbps, ctx.scenario.payloadKB),
      baseLatencyMs: 5,
      availability: links === 2 ? 0.9999 : 0.999,
      azLayout: 'regional',
      costs: [
        line(`${links}× ${gbps} Gbps port`, `${links}× port ${gbps} Gbps`, portHour * links * hours, 'other'),
        line('Data out (DX rate)', 'Data out (giá DX)', gbPerMonth(ctx.avg.r, ctx.scenario.payloadKB) * 0.02, 'transfer'),
      ],
      summary: `${links}× ${gbps}G`,
    };
  },
};

// ──────────────────────────── Compute ────────────────────────────

const RUNNER_SIZES: Record<string, { vcpu: number; gb: number; rps: number }> = {
  '1-2': { vcpu: 1, gb: 2, rps: 300 },
  '2-4': { vcpu: 2, gb: 4, rps: 700 },
  '4-8': { vcpu: 4, gb: 8, rps: 1500 },
};

export const appRunner: ServiceDef = {
  id: 'apprunner',
  name: 'AWS App Runner',
  short: 'App Runner',
  category: 'compute',
  tier: 'advanced',
  behavior: 'app',
  icon: 'play',
  equivalents: { azure: 'Container Apps / App Service', gcp: 'Cloud Run' },
  description: tx(
    'Give it a container image or repo; it builds, deploys, load-balances, scales and adds HTTPS. No VPC, ALB or cluster to manage.',
    'Đưa image container hoặc repo; nó tự build, deploy, cân bằng tải, scale và gắn HTTPS. Không phải quản lý VPC, ALB hay cluster.',
  ),
  docs: docs({
    use: [['Small teams shipping web APIs who want zero infrastructure work.', 'Team nhỏ làm web API, không muốn đụng tới hạ tầng.']],
    not: [['Fine-grained networking, sidecars or GPUs → ECS/EKS.', 'Cần mạng chi tiết, sidecar hoặc GPU → ECS/EKS.']],
    pros: [['Built-in load balancer + autoscaling by concurrency.', 'Có sẵn load balancer + autoscaling theo số request đồng thời.']],
    cons: [['Pricier per vCPU than Fargate; fewer knobs.', 'Đắt hơn Fargate tính trên mỗi vCPU; ít tuỳ chỉnh.']],
    pitfalls: [['Forgetting the VPC connector — the app cannot reach a private RDS without it.', 'Quên VPC connector — app không gọi được RDS private.']],
    pricing: ['Active: $0.064/vCPU-hour + $0.007/GB-hour. Idle provisioned instances pay memory only.', 'Khi chạy: $0,064/vCPU-giờ + $0,007/GB-giờ. Instance chờ sẵn chỉ trả tiền RAM.'],
  }),
  fields: [
    {
      key: 'size',
      kind: 'select',
      label: tx('Instance size', 'Cỡ instance'),
      options: Object.entries(RUNNER_SIZES).map(([k, v]) => ({ value: k, label: `${v.vcpu} vCPU / ${v.gb} GB — ~${v.rps} rps` })),
      default: '1-2',
    },
    { key: 'count', kind: 'number', label: tx('Minimum instances', 'Số instance tối thiểu'), min: 1, max: 25, step: 1, default: 1 },
    { key: 'maxCount', kind: 'number', label: tx('Maximum instances', 'Số instance tối đa'), min: 1, max: 25, step: 1, default: 10 },
  ],
  model: (ctx) => {
    const size = RUNNER_SIZES[str(ctx, 'size', '1-2')] ?? RUNNER_SIZES['1-2']!;
    const min = num(ctx, 'count', 1);
    const max = Math.max(min, num(ctx, 'maxCount', 10));
    const peakN = sized(total(ctx.peak), size.rps, min, max);
    const avgN = sized(total(ctx.avg), size.rps, min, max);
    const active = size.vcpu * 0.064 + size.gb * 0.007;
    return {
      capacityRps: peakN * size.rps,
      baseLatencyMs: 25,
      availability: 0.9995,
      azLayout: 'multi-az',
      costs: [line(`${avgN}× active instance (avg)`, `${avgN}× instance đang chạy (trung bình)`, p(ctx, avgN * active * hours), 'compute')],
      summary: `${peakN}× ${size.vcpu}vCPU`,
      instances: peakN,
    };
  },
};

export const beanstalk: ServiceDef = {
  id: 'beanstalk',
  name: 'AWS Elastic Beanstalk',
  short: 'Beanstalk',
  category: 'compute',
  tier: 'advanced',
  behavior: 'app',
  icon: 'sprout',
  equivalents: { azure: 'App Service', gcp: 'App Engine' },
  description: tx(
    'Platform-as-a-Service that provisions EC2, Auto Scaling and a load balancer for your code. Beanstalk itself is free; you pay for what it creates.',
    'Platform-as-a-Service tự tạo EC2, Auto Scaling và load balancer cho code của bạn. Beanstalk miễn phí; bạn trả tiền cho tài nguyên nó tạo ra.',
  ),
  docs: docs({
    use: [['Classic web apps (Java, .NET, Node, Python, PHP) moved to AWS with little change.', 'Web app truyền thống (Java, .NET, Node, Python, PHP) chuyển lên AWS mà ít phải sửa.']],
    not: [['New container workloads → App Runner/ECS are more modern.', 'Workload container mới → App Runner/ECS hiện đại hơn.']],
    pros: [['Rolling/blue-green deploys and health monitoring included.', 'Có sẵn deploy rolling/blue-green và giám sát health.']],
    cons: [['Still EC2 underneath: you pay for idle instances.', 'Bên dưới vẫn là EC2: instance ngồi không vẫn tốn tiền.']],
    pitfalls: [['Editing the generated resources by hand — the next deploy overwrites them.', 'Sửa tay tài nguyên nó tạo ra — lần deploy sau sẽ ghi đè.']],
    pricing: ['No extra charge — pay for the EC2 instances, EBS and load balancer it creates.', 'Không thu thêm — trả tiền cho EC2, EBS và load balancer mà nó tạo.'],
  }),
  fields: [instanceField, ...scalingFields],
  model: (ctx) => {
    const type = str(ctx, 'instanceType', 't3.medium');
    const { model } = fleetModel(ctx, PRICES.ec2.rpsPerInstance[type] ?? 300, PRICES.ec2.hourly[type] ?? 0.0416, { en: type, vi: type }, false);
    model.summary = `${model.instances}× ${type}`;
    return model;
  },
};

const LIGHTSAIL_PLANS: Record<string, { usd: number; rps: number; label: string }> = {
  '5': { usd: 5, rps: 50, label: '$5 — 0.5 GB' },
  '10': { usd: 10, rps: 100, label: '$10 — 1 GB' },
  '20': { usd: 20, rps: 200, label: '$20 — 2 GB' },
  '40': { usd: 40, rps: 400, label: '$40 — 4 GB' },
};

export const lightsail: ServiceDef = {
  id: 'lightsail',
  name: 'Amazon Lightsail',
  short: 'Lightsail',
  category: 'compute',
  tier: 'advanced',
  behavior: 'app',
  icon: 'sailboat',
  equivalents: { azure: 'App Service (Basic)', gcp: 'Compute Engine e2-micro' },
  description: tx(
    'Simple VPS bundles at a fixed monthly price: instance + SSD + data transfer allowance. Great for blogs, small sites and learning.',
    'Gói VPS đơn giản giá cố định mỗi tháng: instance + SSD + hạn mức data transfer. Hợp cho blog, website nhỏ và học tập.',
  ),
  docs: docs({
    use: [['Predictable small workloads where a fixed price matters more than flexibility.', 'Workload nhỏ, ổn định, cần giá cố định hơn là linh hoạt.']],
    not: [['Anything that must auto-scale or integrate deeply with VPC services.', 'Thứ cần auto-scale hoặc tích hợp sâu với các dịch vụ trong VPC.']],
    pros: [['Easiest and cheapest way to run a server; transfer included.', 'Cách dễ và rẻ nhất để chạy một server; đã gồm data transfer.']],
    cons: [['No Auto Scaling; limited instance choices.', 'Không có Auto Scaling; ít lựa chọn cấu hình.']],
    pitfalls: [['Burstable CPU: sustained load drains CPU credits and slows to a crawl.', 'CPU burstable: tải liên tục làm cạn CPU credit và chạy rất chậm.']],
    pricing: ['Fixed bundles from $5/month; Lightsail load balancer $18/month.', 'Gói cố định từ $5/tháng; load balancer của Lightsail $18/tháng.'],
  }),
  fields: [
    {
      key: 'plan',
      kind: 'select',
      label: tx('Bundle', 'Gói'),
      options: Object.entries(LIGHTSAIL_PLANS).map(([k, v]) => ({ value: k, label: `${v.label}, ~${v.rps} rps` })),
      default: '10',
    },
    {
      key: 'count',
      kind: 'number',
      label: tx('Instances', 'Số instance'),
      help: tx('≥ 2 adds a Lightsail load balancer ($18/month).', '≥ 2 sẽ thêm load balancer của Lightsail ($18/tháng).'),
      min: 1,
      max: 20,
      step: 1,
      default: 1,
    },
  ],
  model: (ctx) => {
    const plan = LIGHTSAIL_PLANS[str(ctx, 'plan', '10')] ?? LIGHTSAIL_PLANS['10']!;
    const n = num(ctx, 'count', 1);
    return {
      capacityRps: n * plan.rps,
      baseLatencyMs: 25,
      availability: 1 - Math.pow(1 - 0.995, n),
      azLayout: n >= 2 ? 'multi-az' : 'single-az',
      costs: [
        line(`${n}× $${plan.usd} bundle`, `${n}× gói $${plan.usd}`, n * plan.usd, 'compute'),
        ...(n >= 2 ? [line('Lightsail load balancer', 'Load balancer Lightsail', 18, 'other')] : []),
      ],
      summary: `${n}× $${plan.usd}`,
      instances: n,
    };
  },
};

export const batch: ServiceDef = {
  id: 'batch',
  name: 'AWS Batch',
  short: 'Batch',
  category: 'compute',
  tier: 'advanced',
  behavior: 'app',
  icon: 'layers',
  equivalents: { azure: 'Azure Batch', gcp: 'Cloud Batch' },
  description: tx(
    'Runs queued batch jobs (containers) on Fargate or EC2/Spot, scaling the fleet up for the queue and back to zero.',
    'Chạy các batch job (container) trong hàng đợi trên Fargate hoặc EC2/Spot, scale fleet lên theo hàng đợi rồi về 0.',
  ),
  docs: docs({
    use: [['Long-running offline jobs: video encoding, simulations, ML training, nightly reports.', 'Job offline chạy lâu: encode video, mô phỏng, train ML, báo cáo hằng đêm.']],
    not: [['Request/response APIs — Batch is for throughput, not latency.', 'API request/response — Batch dành cho throughput, không phải độ trễ.']],
    pros: [['Spot capacity cuts cost by up to ~70–90%; job dependencies and retries.', 'Dùng Spot giảm tới ~70–90% chi phí; có phụ thuộc giữa job và retry.']],
    cons: [['Minutes of start-up latency before jobs run.', 'Mất vài phút khởi động trước khi job chạy.']],
    pitfalls: [['Jobs that cannot be retried running on Spot.', 'Chạy job không retry được trên Spot.']],
    pricing: ['No extra charge — pay for the Fargate/EC2 (often Spot) capacity used by jobs.', 'Không thu thêm — trả tiền Fargate/EC2 (thường là Spot) mà job dùng.'],
  }),
  fields: [
    { key: 'jobSeconds', kind: 'number', label: tx('Seconds per job', 'Số giây mỗi job'), min: 1, max: 86400, step: 10, unit: 's', default: 60 },
    { key: 'vcpuPerJob', kind: 'number', label: tx('vCPU per job', 'vCPU mỗi job'), min: 0.25, max: 16, step: 0.25, default: 1 },
    { key: 'maxVcpus', kind: 'number', label: tx('Max vCPUs in the compute environment', 'Số vCPU tối đa của compute environment'), min: 1, max: 10000, step: 16, default: 256 },
    {
      key: 'spot',
      kind: 'toggle',
      label: tx('Use Spot capacity (−70%)', 'Dùng Spot (−70%)'),
      default: true,
    },
  ],
  model: (ctx) => {
    const secs = num(ctx, 'jobSeconds', 60);
    const vcpu = num(ctx, 'vcpuPerJob', 1);
    const maxV = num(ctx, 'maxVcpus', 256);
    const spot = bool(ctx, 'spot');
    const vcpuHours = total(ctx.avg) * secs * vcpu * hours; // avg busy vCPUs × hours/month
    const perVcpuHour = (PRICES.fargate.vcpuHour + 2 * PRICES.fargate.gbHour) * (spot ? 0.3 : 1);
    return {
      capacityRps: maxV / Math.max(vcpu * secs, 0.001),
      baseLatencyMs: 1000,
      availability: spot ? 0.99 : 0.999,
      azLayout: 'multi-az',
      costs: [line(`Job compute (${spot ? 'Spot' : 'On-Demand'})`, `Compute cho job (${spot ? 'Spot' : 'On-Demand'})`, p(ctx, vcpuHours * perVcpuHour), 'compute')],
      summary: `≤${maxV} vCPU${spot ? ' spot' : ''}`,
    };
  },
};

// ──────────────────────────── Database ────────────────────────────

/** Shared instance-cluster model (DocumentDB, Neptune): 1 primary + replicas. */
function clusterDb(opts: { hourly: number; rpsPerInstance: number; storagePerGB: number; ioPerM: number; latency: number }): ServiceDef['model'] {
  return (ctx) => {
    const n = Math.max(1, num(ctx, 'count', 2));
    const storage = num(ctx, 'storageGB', 100);
    const ioM = millionsPerMonth(ctx.avg.w + ctx.avg.r * 0.1);
    return {
      capacityRps: replicatedCapacity(ctx.peak, opts.rpsPerInstance, n - 1),
      baseLatencyMs: opts.latency,
      availability: n >= 2 ? 0.9999 : 0.999,
      azLayout: n >= 2 ? 'multi-az' : 'single-az',
      costs: [
        line(`${n}× instance`, `${n}× instance`, p(ctx, n * opts.hourly * hours), 'compute'),
        line(`Storage ${storage} GB`, `Lưu trữ ${storage} GB`, p(ctx, storage * opts.storagePerGB), 'storage'),
        line('I/O requests', 'I/O request', p(ctx, ioM * opts.ioPerM), 'requests'),
      ],
      summary: `${n}× r6g.large`,
      instances: n,
    };
  };
}

const clusterFields = (storage: number) => [
  {
    key: 'count',
    kind: 'number' as const,
    label: tx('Instances (1 primary + replicas)', 'Số instance (1 primary + replica)'),
    help: tx('≥ 2 instances in different AZs for automatic failover.', '≥ 2 instance ở các AZ khác nhau để tự failover.'),
    min: 1,
    max: 16,
    step: 1,
    default: 2,
  },
  { key: 'storageGB', kind: 'number' as const, label: tx('Data stored', 'Dung lượng dữ liệu'), min: 10, max: 128_000, step: 10, unit: 'GB', default: storage },
];

export const documentdb: ServiceDef = {
  id: 'documentdb',
  name: 'Amazon DocumentDB',
  short: 'DocumentDB',
  category: 'database',
  tier: 'advanced',
  behavior: 'db',
  icon: 'file-json',
  equivalents: { azure: 'Cosmos DB for MongoDB', gcp: 'Firestore (MongoDB compatibility)' },
  description: tx(
    'MongoDB-compatible JSON document database with Aurora-style storage (6 copies across 3 AZs).',
    'Database document JSON tương thích MongoDB, lưu trữ kiểu Aurora (6 bản sao trên 3 AZ).',
  ),
  docs: docs({
    use: [['Apps already written for MongoDB that want a managed AWS service.', 'App đã viết cho MongoDB muốn dùng dịch vụ được quản lý trên AWS.']],
    not: [['Simple key-value at any scale → DynamoDB is serverless and cheaper at low traffic.', 'Key-value đơn giản ở mọi quy mô → DynamoDB serverless và rẻ hơn khi traffic thấp.']],
    pros: [['Flexible JSON documents with rich queries and indexes.', 'Document JSON linh hoạt, query và index phong phú.']],
    cons: [['Not 100% MongoDB-compatible; always-on instance cost.', 'Không tương thích MongoDB 100%; luôn tốn phí instance.']],
    pitfalls: [['Single instance in production — failover needs a replica.', 'Một instance cho production — failover cần có replica.']],
    pricing: ['Per instance-hour (db.r6g.large ~$0.277/h) + storage $0.10/GB-month + $0.20 per million I/Os.', 'Theo giờ instance (db.r6g.large ~$0,277/h) + lưu trữ $0,10/GB-tháng + $0,20 mỗi triệu I/O.'],
  }),
  fields: clusterFields(100),
  model: clusterDb({ hourly: 0.277, rpsPerInstance: 3000, storagePerGB: 0.1, ioPerM: 0.2, latency: 6 }),
};

export const neptune: ServiceDef = {
  id: 'neptune',
  name: 'Amazon Neptune',
  short: 'Neptune',
  category: 'database',
  tier: 'advanced',
  behavior: 'db',
  icon: 'git-fork',
  equivalents: { azure: 'Cosmos DB for Apache Gremlin', gcp: 'Spanner Graph' },
  description: tx(
    'Managed graph database (Gremlin, openCypher, SPARQL) for highly connected data: relationships are first-class.',
    'Graph database được quản lý (Gremlin, openCypher, SPARQL) cho dữ liệu kết nối dày đặc: quan hệ là thứ được ưu tiên.',
  ),
  docs: docs({
    use: [['Social graphs, recommendations, fraud rings, knowledge graphs.', 'Mạng xã hội, gợi ý, phát hiện đường dây gian lận, knowledge graph.']],
    not: [['Data without deep relationships → relational or key-value is simpler.', 'Dữ liệu không có quan hệ sâu → quan hệ hoặc key-value đơn giản hơn.']],
    pros: [['Multi-hop traversals in milliseconds instead of many SQL joins.', 'Duyệt nhiều bước trong vài mili-giây thay vì hàng loạt JOIN SQL.']],
    cons: [['Niche query languages; instance-based pricing.', 'Ngôn ngữ query chuyên biệt; tính phí theo instance.']],
    pitfalls: [['Super-nodes (a vertex with millions of edges) make queries slow.', 'Super-node (một đỉnh có hàng triệu cạnh) làm query chậm.']],
    pricing: ['Per instance-hour (db.r6g.large ~$0.348/h) + storage $0.10/GB-month + $0.20 per million I/Os.', 'Theo giờ instance (db.r6g.large ~$0,348/h) + lưu trữ $0,10/GB-tháng + $0,20 mỗi triệu I/O.'],
  }),
  fields: clusterFields(50),
  model: clusterDb({ hourly: 0.348, rpsPerInstance: 2000, storagePerGB: 0.1, ioPerM: 0.2, latency: 10 }),
};

export const redshift: ServiceDef = {
  id: 'redshift',
  name: 'Amazon Redshift',
  short: 'Redshift',
  category: 'database',
  tier: 'advanced',
  behavior: 'db',
  icon: 'chart-column',
  equivalents: { azure: 'Synapse Analytics / Fabric Warehouse', gcp: 'BigQuery' },
  description: tx(
    'Columnar data warehouse for analytics (OLAP): scans billions of rows for reports and BI dashboards.',
    'Kho dữ liệu dạng cột cho phân tích (OLAP): quét hàng tỷ dòng cho báo cáo và dashboard BI.',
  ),
  docs: docs({
    use: [['BI dashboards and reports over large historical data, fed by Firehose/S3.', 'Dashboard BI và báo cáo trên dữ liệu lịch sử lớn, nạp từ Firehose/S3.']],
    not: [['The app’s transactional database (OLTP) — it handles tens of queries/s, not thousands.', 'Làm database giao dịch của app (OLTP) — nó chịu vài chục query/s, không phải hàng nghìn.']],
    pros: [['Massively parallel, compressed columnar storage; queries data in S3 (Spectrum).', 'Song song quy mô lớn, lưu dạng cột có nén; query được dữ liệu trên S3 (Spectrum).']],
    cons: [['Expensive when idle (provisioned); not for single-row lookups.', 'Đắt khi ngồi không (provisioned); không hợp tra cứu từng dòng.']],
    pitfalls: [['Putting it on the user request path — latency in seconds and tiny concurrency.', 'Đặt nó trên đường request của user — độ trễ tính bằng giây và chịu ít truy vấn đồng thời.']],
    pricing: ['ra3.xlplus ~$1.086/node-hour (managed storage $0.024/GB-month). Serverless: ~$0.375 per RPU-hour.', 'ra3.xlplus ~$1,086/node-giờ (managed storage $0,024/GB-tháng). Serverless: ~$0,375 mỗi RPU-giờ.'],
  }),
  fields: [
    { key: 'nodes', kind: 'number', label: tx('ra3.xlplus nodes', 'Số node ra3.xlplus'), min: 1, max: 32, step: 1, default: 2 },
    { key: 'multiAz', kind: 'toggle', label: tx('Multi-AZ (doubles nodes)', 'Multi-AZ (gấp đôi node)'), default: false },
    { key: 'storageGB', kind: 'number', label: tx('Managed storage', 'Managed storage'), min: 100, max: 1_000_000, step: 100, unit: 'GB', default: 1000 },
  ],
  model: (ctx) => {
    const n = num(ctx, 'nodes', 2);
    const multi = bool(ctx, 'multiAz');
    return {
      capacityRps: n * 15,
      baseLatencyMs: 800,
      availability: multi ? 0.9999 : 0.999,
      azLayout: multi ? 'multi-az' : 'single-az',
      costs: [
        line(`${n * (multi ? 2 : 1)}× ra3.xlplus`, `${n * (multi ? 2 : 1)}× ra3.xlplus`, p(ctx, n * (multi ? 2 : 1) * 1.086 * hours), 'compute'),
        line('Managed storage', 'Managed storage', p(ctx, num(ctx, 'storageGB', 1000) * 0.024), 'storage'),
      ],
      summary: `${n}× ra3.xlplus`,
      instances: n,
    };
  },
};

export const memorydb: ServiceDef = {
  id: 'memorydb',
  name: 'Amazon MemoryDB',
  short: 'MemoryDB',
  category: 'database',
  tier: 'advanced',
  behavior: 'db',
  icon: 'memory-stick',
  equivalents: { azure: 'Azure Managed Redis (Enterprise)', gcp: 'Memorystore for Valkey' },
  description: tx(
    'Durable in-memory database (Redis/Valkey compatible): microsecond reads with a Multi-AZ transaction log, so it can be the primary database.',
    'Database in-memory bền vững (tương thích Redis/Valkey): đọc trong micro-giây, có transaction log Multi-AZ nên làm được database chính.',
  ),
  docs: docs({
    use: [['Leaderboards, sessions, rate limiting when you need Redis speed AND durability.', 'Leaderboard, session, rate limit khi cần tốc độ Redis LẪN độ bền dữ liệu.']],
    not: [['Pure cache in front of another database → ElastiCache is cheaper.', 'Chỉ làm cache đứng trước database khác → ElastiCache rẻ hơn.']],
    pros: [['No data loss on node failure; single-digit-ms writes.', 'Không mất dữ liệu khi node hỏng; ghi vài mili-giây.']],
    cons: [['All data must fit in RAM — expensive per GB.', 'Toàn bộ dữ liệu phải nằm trong RAM — đắt tính theo GB.']],
    pitfalls: [['Zero replicas: a node failure means downtime while it recovers.', 'Không có replica: node hỏng là downtime trong lúc phục hồi.']],
    pricing: ['db.r6g.large ~$0.309/node-hour + $0.20 per GB written.', 'db.r6g.large ~$0,309/node-giờ + $0,20 mỗi GB ghi.'],
  }),
  fields: [
    { key: 'shards', kind: 'number', label: tx('Shards', 'Số shard'), min: 1, max: 500, step: 1, default: 1 },
    { key: 'replicas', kind: 'number', label: tx('Replicas per shard', 'Replica mỗi shard'), min: 0, max: 5, step: 1, default: 1 },
  ],
  model: (ctx) => {
    const shards = num(ctx, 'shards', 1);
    const replicas = num(ctx, 'replicas', 1);
    const nodes = shards * (1 + replicas);
    return {
      capacityRps: shards * 60000 + shards * replicas * 60000 * 0.8,
      baseLatencyMs: 2,
      availability: replicas >= 1 ? 0.9999 : 0.999,
      azLayout: replicas >= 1 ? 'multi-az' : 'single-az',
      costs: [
        line(`${nodes}× db.r6g.large`, `${nodes}× db.r6g.large`, p(ctx, nodes * 0.309 * hours), 'compute'),
        line('Data written', 'Dữ liệu ghi', p(ctx, gbPerMonth(ctx.avg.w, ctx.scenario.payloadKB) * 0.2), 'transfer'),
      ],
      summary: `${shards} shard · ${replicas}R`,
      instances: nodes,
    };
  },
};

export const dax: ServiceDef = {
  id: 'dax',
  name: 'Amazon DynamoDB Accelerator (DAX)',
  short: 'DAX',
  category: 'database',
  tier: 'advanced',
  behavior: 'cache',
  icon: 'gauge',
  equivalents: { azure: 'Cosmos DB integrated cache', gcp: 'Memorystore (manual)' },
  description: tx(
    'Write-through in-memory cache built for DynamoDB: same API, reads in microseconds instead of milliseconds.',
    'Cache in-memory write-through dành riêng cho DynamoDB: cùng API, đọc trong micro-giây thay vì mili-giây.',
  ),
  docs: docs({
    use: [['Read-heavy DynamoDB tables with hot keys (product pages, game state).', 'Bảng DynamoDB đọc nhiều, có key nóng (trang sản phẩm, trạng thái game).']],
    not: [['Strongly consistent reads or write-heavy tables — DAX does not help there.', 'Đọc strongly consistent hoặc bảng ghi nhiều — DAX không giúp được.']],
    pros: [['No code change beyond swapping the client; cuts DynamoDB RCU cost.', 'Gần như không sửa code ngoài việc đổi client; giảm chi phí RCU DynamoDB.']],
    cons: [['Only for DynamoDB; runs in your VPC as always-on nodes.', 'Chỉ dùng cho DynamoDB; chạy trong VPC dưới dạng node luôn bật.']],
    pitfalls: [['A 1-node cluster in production — use ≥ 3 nodes across AZs.', 'Cluster 1 node cho production — nên ≥ 3 node trên nhiều AZ.']],
    pricing: ['Per node-hour (dax.r5.large ~$0.269/h).', 'Theo giờ mỗi node (dax.r5.large ~$0,269/h).'],
  }),
  fields: [
    { key: 'nodes', kind: 'number', label: tx('Nodes', 'Số node'), min: 1, max: 11, step: 1, default: 3 },
    {
      key: 'hitRatio',
      kind: 'number',
      label: tx('Cache hit ratio', 'Tỉ lệ cache hit'),
      help: tx('Share of reads answered by DAX; misses go to DynamoDB.', 'Tỉ lệ lượt đọc DAX trả lời được; miss sẽ xuống DynamoDB.'),
      min: 0,
      max: 0.99,
      step: 0.05,
      default: 0.85,
    },
  ],
  model: (ctx) => {
    const n = num(ctx, 'nodes', 3);
    return {
      capacityRps: n * 50000,
      baseLatencyMs: 0.5,
      availability: n >= 3 ? 0.9999 : n >= 2 ? 0.9995 : 0.999,
      azLayout: n >= 2 ? 'multi-az' : 'single-az',
      costs: [line(`${n}× dax.r5.large`, `${n}× dax.r5.large`, p(ctx, n * 0.269 * hours), 'compute')],
      summary: `${n} nodes · hit ${Math.round(num(ctx, 'hitRatio', 0.85) * 100)}%`,
      instances: n,
    };
  },
};

export const keyspaces: ServiceDef = {
  id: 'keyspaces',
  name: 'Amazon Keyspaces (for Apache Cassandra)',
  short: 'Keyspaces',
  category: 'database',
  tier: 'advanced',
  behavior: 'db',
  icon: 'key-round',
  equivalents: { azure: 'Cosmos DB for Apache Cassandra', gcp: 'Bigtable (similar model)' },
  description: tx(
    'Serverless Cassandra-compatible wide-column database (CQL). Pay per request; replicated across 3 AZs.',
    'Database wide-column tương thích Cassandra (CQL), serverless. Trả theo request; nhân bản trên 3 AZ.',
  ),
  docs: docs({
    use: [['Moving existing Cassandra workloads off self-managed clusters.', 'Chuyển workload Cassandra đang tự vận hành sang dịch vụ được quản lý.']],
    not: [['Greenfield key-value apps → DynamoDB has a richer AWS ecosystem.', 'App key-value mới hoàn toàn → DynamoDB có hệ sinh thái AWS phong phú hơn.']],
    pros: [['No nodes, compaction or repairs to manage.', 'Không phải quản lý node, compaction hay repair.']],
    cons: [['Some Cassandra features are not supported.', 'Một số tính năng Cassandra không được hỗ trợ.']],
    pitfalls: [['Designing tables like SQL — Cassandra needs one table per query pattern.', 'Thiết kế bảng như SQL — Cassandra cần mỗi kiểu query một bảng.']],
    pricing: ['On-demand: ~$1.45 per million writes, ~$0.29 per million reads + $0.25/GB-month.', 'On-demand: ~$1,45 mỗi triệu lượt ghi, ~$0,29 mỗi triệu lượt đọc + $0,25/GB-tháng.'],
  }),
  fields: [{ key: 'storageGB', kind: 'number', label: tx('Data stored', 'Dung lượng dữ liệu'), min: 1, max: 1_000_000, step: 10, unit: 'GB', default: 50 }],
  model: (ctx) => ({
    capacityRps: Infinity,
    baseLatencyMs: 8,
    availability: 0.9999,
    azLayout: 'regional',
    costs: [
      line('Writes', 'Lượt ghi', p(ctx, millionsPerMonth(ctx.avg.w) * 1.45), 'requests'),
      line('Reads', 'Lượt đọc', p(ctx, millionsPerMonth(ctx.avg.r) * 0.29), 'requests'),
      line('Storage', 'Lưu trữ', p(ctx, num(ctx, 'storageGB', 50) * 0.25), 'storage'),
    ],
    summary: 'on-demand',
  }),
};

// ──────────────────────────── Storage ────────────────────────────

export const efs: ServiceDef = {
  id: 'efs',
  name: 'Amazon EFS',
  short: 'EFS',
  category: 'storage',
  tier: 'advanced',
  behavior: 'object',
  icon: 'folder-tree',
  equivalents: { azure: 'Azure Files (NFS)', gcp: 'Filestore' },
  description: tx(
    'Elastic NFS file system shared by many EC2/ECS/Lambda clients at once; grows and shrinks automatically.',
    'Hệ thống file NFS co giãn, nhiều EC2/ECS/Lambda dùng chung cùng lúc; tự tăng giảm dung lượng.',
  ),
  docs: docs({
    use: [['Shared files for a fleet: CMS uploads, home directories, ML datasets.', 'File dùng chung cho cả fleet: file upload của CMS, thư mục home, dataset ML.']],
    not: [['Static assets served to users → S3 + CloudFront is ~10× cheaper per GB.', 'Tài nguyên tĩnh phục vụ user → S3 + CloudFront rẻ hơn ~10 lần mỗi GB.']],
    pros: [['POSIX file semantics, mounted by thousands of clients.', 'Ngữ nghĩa file POSIX, hàng nghìn client mount cùng lúc.']],
    cons: [['$0.30/GB-month Standard — far pricier than S3 or EBS.', '$0,30/GB-tháng bản Standard — đắt hơn nhiều so với S3 hay EBS.']],
    pitfalls: [['Not enabling lifecycle to Infrequent Access for cold files.', 'Không bật lifecycle chuyển file ít dùng sang Infrequent Access.']],
    pricing: ['Standard $0.30/GB-month (One Zone $0.16); Elastic throughput $0.03/GB read, $0.06/GB written.', 'Standard $0,30/GB-tháng (One Zone $0,16); Elastic throughput $0,03/GB đọc, $0,06/GB ghi.'],
  }),
  fields: [
    {
      key: 'class',
      kind: 'select',
      label: tx('Storage class', 'Lớp lưu trữ'),
      options: [
        { value: 'standard', label: tx('Standard (multi-AZ)', 'Standard (multi-AZ)') },
        { value: 'one-zone', label: tx('One Zone (−47%, single AZ)', 'One Zone (−47%, một AZ)') },
      ],
      default: 'standard',
    },
    { key: 'storageGB', kind: 'number', label: tx('Data stored', 'Dung lượng dữ liệu'), min: 1, max: 1_000_000, step: 10, unit: 'GB', default: 100 },
  ],
  model: (ctx) => {
    const oneZone = str(ctx, 'class') === 'one-zone';
    const kb = ctx.scenario.payloadKB;
    return {
      capacityRps: Infinity,
      baseLatencyMs: 3,
      availability: oneZone ? 0.999 : 0.9999,
      azLayout: oneZone ? 'single-az' : 'regional',
      costs: [
        line('Storage', 'Lưu trữ', p(ctx, num(ctx, 'storageGB', 100) * (oneZone ? 0.16 : 0.3)), 'storage'),
        line('Elastic throughput', 'Elastic throughput', p(ctx, gbPerMonth(ctx.avg.r, kb) * 0.03 + gbPerMonth(ctx.avg.w, kb) * 0.06), 'transfer'),
      ],
      summary: oneZone ? 'One Zone' : 'Standard',
    };
  },
};

export const fsxLustre: ServiceDef = {
  id: 'fsx',
  name: 'Amazon FSx for Lustre',
  short: 'FSx Lustre',
  category: 'storage',
  tier: 'advanced',
  behavior: 'object',
  icon: 'hard-drive',
  equivalents: { azure: 'Azure Managed Lustre', gcp: 'Managed Lustre / Parallelstore' },
  description: tx(
    'High-performance parallel file system (hundreds of GB/s) for HPC and ML training, linked to an S3 bucket.',
    'Hệ thống file song song hiệu năng cao (hàng trăm GB/s) cho HPC và train ML, liên kết với bucket S3.',
  ),
  docs: docs({
    use: [['GPU training, genomics, rendering — many nodes reading the same dataset fast.', 'Train GPU, genomics, render — nhiều node cùng đọc một dataset thật nhanh.']],
    not: [['General shared files for web apps → EFS is simpler.', 'File dùng chung thông thường cho web app → EFS đơn giản hơn.']],
    pros: [['Throughput scales with capacity; lazy-loads from S3.', 'Throughput tăng theo dung lượng; tự nạp dần dữ liệu từ S3.']],
    cons: [['Single-AZ; minimum 1.2 TB.', 'Chỉ một AZ; tối thiểu 1,2 TB.']],
    pitfalls: [['Leaving a persistent file system running after the training job ends.', 'Để file system persistent chạy tiếp sau khi job train đã xong.']],
    pricing: ['Persistent SSD 125 MB/s/TiB ~$0.145/GB-month; 250 MB/s/TiB ~$0.21/GB-month.', 'Persistent SSD 125 MB/s/TiB ~$0,145/GB-tháng; 250 MB/s/TiB ~$0,21/GB-tháng.'],
  }),
  fields: [
    {
      key: 'throughput',
      kind: 'select',
      label: tx('Throughput per TiB', 'Throughput mỗi TiB'),
      options: [
        { value: '125', label: '125 MB/s/TiB — $0.145/GB' },
        { value: '250', label: '250 MB/s/TiB — $0.21/GB' },
      ],
      default: '125',
    },
    { key: 'storageGB', kind: 'number', label: tx('Capacity', 'Dung lượng'), min: 1200, max: 1_000_000, step: 1200, unit: 'GB', default: 1200 },
  ],
  model: (ctx) => {
    const mbps = Number(str(ctx, 'throughput', '125')) || 125;
    const gb = Math.max(1200, num(ctx, 'storageGB', 1200));
    const totalMBps = (gb / 1024) * mbps;
    return {
      capacityRps: (totalMBps * 1000) / Math.max(ctx.scenario.payloadKB, 1),
      baseLatencyMs: 1,
      availability: 0.999,
      azLayout: 'single-az',
      costs: [line(`${gb} GB SSD`, `${gb} GB SSD`, p(ctx, gb * (mbps >= 250 ? 0.21 : 0.145)), 'storage')],
      summary: `${Math.round(totalMBps)} MB/s`,
    };
  },
};

export const glacierDeepArchive: ServiceDef = {
  id: 'glacier',
  name: 'Amazon S3 Glacier Deep Archive',
  short: 'Deep Archive',
  category: 'storage',
  tier: 'advanced',
  behavior: 'object',
  icon: 'snowflake',
  equivalents: { azure: 'Blob Storage Archive tier', gcp: 'Cloud Storage Archive class' },
  description: tx(
    'The cheapest storage on AWS (~$1/TB-month) for data you rarely read; retrieval takes 12–48 hours.',
    'Lưu trữ rẻ nhất AWS (~$1/TB-tháng) cho dữ liệu hiếm khi đọc; lấy lại mất 12–48 giờ.',
  ),
  docs: docs({
    use: [['Compliance archives, old backups, raw logs kept for 7–10 years.', 'Lưu trữ tuân thủ, backup cũ, log gốc giữ 7–10 năm.']],
    not: [['Anything a user waits for — reads are restore jobs measured in hours.', 'Thứ gì user phải chờ — đọc là job khôi phục tính bằng giờ.']],
    pros: [['~23× cheaper than S3 Standard per GB.', 'Rẻ hơn S3 Standard ~23 lần mỗi GB.']],
    cons: [['180-day minimum storage; retrieval fees and delays.', 'Tối thiểu lưu 180 ngày; có phí và thời gian chờ khi lấy lại.']],
    pitfalls: [['Archiving millions of tiny objects — per-object overhead and request fees dominate.', 'Archive hàng triệu object nhỏ — phí overhead mỗi object và phí request lấn át.']],
    pricing: ['$0.00099/GB-month; PUT $0.05 per 1,000; standard retrieval $0.02/GB (bulk $0.0025/GB).', '$0,00099/GB-tháng; PUT $0,05 mỗi 1.000; lấy lại standard $0,02/GB (bulk $0,0025/GB).'],
  }),
  fields: [{ key: 'storageGB', kind: 'number', label: tx('Data archived', 'Dung lượng lưu trữ'), min: 1, max: 10_000_000, step: 100, unit: 'GB', default: 10000 }],
  model: (ctx) => {
    const kb = ctx.scenario.payloadKB;
    return {
      capacityRps: Infinity,
      baseLatencyMs: 50,
      availability: 0.9999,
      azLayout: 'regional',
      costs: [
        line('Storage', 'Lưu trữ', p(ctx, num(ctx, 'storageGB', 10000) * 0.00099), 'storage'),
        line('PUT requests', 'Request PUT', p(ctx, millionsPerMonth(ctx.avg.w) * 1000 * 0.05), 'requests'),
        line('Retrievals', 'Lấy lại dữ liệu', p(ctx, gbPerMonth(ctx.avg.r, kb) * 0.02), 'transfer'),
      ],
      summary: 'archive',
    };
  },
};

// ──────────────────────────── Messaging ────────────────────────────

export const amazonMq: ServiceDef = {
  id: 'mq',
  name: 'Amazon MQ',
  short: 'Amazon MQ',
  category: 'messaging',
  tier: 'advanced',
  behavior: 'queue',
  icon: 'inbox',
  equivalents: { azure: 'Service Bus (AMQP)', gcp: 'Self-managed RabbitMQ on GKE' },
  description: tx(
    'Managed ActiveMQ / RabbitMQ brokers speaking standard protocols (AMQP, MQTT, STOMP, JMS).',
    'Broker ActiveMQ / RabbitMQ được quản lý, nói các giao thức chuẩn (AMQP, MQTT, STOMP, JMS).',
  ),
  docs: docs({
    use: [['Migrating apps that already use RabbitMQ/ActiveMQ/JMS without rewriting them.', 'Chuyển app đã dùng RabbitMQ/ActiveMQ/JMS lên mà không phải viết lại.']],
    not: [['New cloud-native apps → SQS/SNS are serverless and much cheaper.', 'App cloud-native mới → SQS/SNS serverless và rẻ hơn nhiều.']],
    pros: [['Standard protocols, routing exchanges, message priorities.', 'Giao thức chuẩn, exchange định tuyến, ưu tiên message.']],
    cons: [['Brokers are instances: capacity and cost are fixed per broker.', 'Broker là instance: dung lượng và chi phí cố định theo broker.']],
    pitfalls: [['Single-instance broker in production — no failover.', 'Broker single-instance cho production — không có failover.']],
    pricing: ['mq.m5.large ~$0.288/broker-hour (active/standby = 2 brokers) + storage ~$0.10/GB-month.', 'mq.m5.large ~$0,288/broker-giờ (active/standby = 2 broker) + lưu trữ ~$0,10/GB-tháng.'],
  }),
  fields: [
    {
      key: 'deployment',
      kind: 'select',
      label: tx('Deployment', 'Kiểu triển khai'),
      options: [
        { value: 'single', label: tx('Single-instance', 'Single-instance') },
        { value: 'active-standby', label: tx('Active/standby (Multi-AZ)', 'Active/standby (Multi-AZ)') },
      ],
      default: 'active-standby',
    },
  ],
  model: (ctx) => {
    const ha = str(ctx, 'deployment', 'active-standby') === 'active-standby';
    const brokers = ha ? 2 : 1;
    return {
      capacityRps: 4000,
      baseLatencyMs: 5,
      availability: ha ? 0.9995 : 0.995,
      azLayout: ha ? 'multi-az' : 'single-az',
      costs: [
        line(`${brokers}× mq.m5.large`, `${brokers}× mq.m5.large`, p(ctx, brokers * 0.288 * hours), 'compute'),
        line('Broker storage', 'Lưu trữ broker', p(ctx, 20 * 0.1), 'storage'),
      ],
      summary: ha ? 'active/standby' : 'single',
      instances: brokers,
    };
  },
};

export const msk: ServiceDef = {
  id: 'msk',
  name: 'Amazon MSK (Managed Streaming for Apache Kafka)',
  short: 'MSK',
  category: 'messaging',
  tier: 'advanced',
  behavior: 'pubsub',
  icon: 'activity',
  equivalents: { azure: 'Event Hubs (Kafka API) / Confluent', gcp: 'Managed Service for Apache Kafka' },
  description: tx(
    'Managed Apache Kafka clusters: durable, ordered, replayable event logs consumed by many independent consumer groups.',
    'Cluster Apache Kafka được quản lý: log sự kiện bền, có thứ tự, phát lại được, cho nhiều consumer group độc lập đọc.',
  ),
  docs: docs({
    use: [
      ['Teams standardised on Kafka (Kafka Connect, Streams, existing clients).', 'Team đã chuẩn hoá trên Kafka (Kafka Connect, Streams, client có sẵn).'],
      ['Very high, steady throughput where shard-based Kinesis gets expensive.', 'Throughput rất cao và đều, khi Kinesis tính theo shard trở nên đắt.'],
    ],
    not: [['Small or spiky streams → Kinesis On-Demand or MSK Serverless.', 'Stream nhỏ hoặc theo đợt → Kinesis On-Demand hoặc MSK Serverless.']],
    pros: [['Open-source Kafka API; long retention; huge ecosystem.', 'API Kafka mã nguồn mở; lưu lâu; hệ sinh thái lớn.']],
    cons: [['You still size brokers, partitions and storage.', 'Bạn vẫn phải tính cỡ broker, partition và lưu trữ.']],
    pitfalls: [['Fewer brokers than AZs, or replication factor 1 — data loss on failure.', 'Số broker ít hơn số AZ, hoặc replication factor 1 — mất dữ liệu khi có sự cố.']],
    pricing: ['kafka.m5.large ~$0.21/broker-hour + storage $0.10/GB-month per broker.', 'kafka.m5.large ~$0,21/broker-giờ + lưu trữ $0,10/GB-tháng mỗi broker.'],
  }),
  fields: [
    { key: 'brokers', kind: 'number', label: tx('Brokers (kafka.m5.large)', 'Số broker (kafka.m5.large)'), min: 1, max: 30, step: 1, default: 3 },
    { key: 'storageGB', kind: 'number', label: tx('Storage per broker', 'Lưu trữ mỗi broker'), min: 10, max: 16000, step: 10, unit: 'GB', default: 100 },
  ],
  model: (ctx) => {
    const n = num(ctx, 'brokers', 3);
    // ~10 MB/s of ingest per m5.large broker (with replication factor 3).
    const perBroker = 10_000 / Math.max(ctx.scenario.payloadKB, 1);
    return {
      capacityRps: n * perBroker,
      baseLatencyMs: 10,
      availability: n >= 3 ? 0.9999 : n >= 2 ? 0.9995 : 0.995,
      azLayout: n >= 2 ? 'multi-az' : 'single-az',
      costs: [
        line(`${n}× kafka.m5.large`, `${n}× kafka.m5.large`, p(ctx, n * 0.21 * hours), 'compute'),
        line('Broker storage', 'Lưu trữ broker', p(ctx, n * num(ctx, 'storageGB', 100) * 0.1), 'storage'),
      ],
      summary: `${n} brokers`,
      instances: n,
    };
  },
};

/** All advanced services, grouped in palette order. */
export const ADVANCED_SERVICES: readonly ServiceDef[] = [
  shieldAdvanced,
  appsync,
  vpcLattice,
  siteToSiteVpn,
  directConnect,
  appRunner,
  beanstalk,
  lightsail,
  batch,
  documentdb,
  neptune,
  redshift,
  memorydb,
  dax,
  keyspaces,
  efs,
  fsxLustre,
  glacierDeepArchive,
  amazonMq,
  msk,
];
