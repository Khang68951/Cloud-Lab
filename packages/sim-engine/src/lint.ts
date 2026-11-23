import { tx, type Flow, type Scenario } from '@cloudlab/catalog';
import type { Graph, GraphEdge, GraphNode } from './simulate.ts';
import type { Finding, NodeResult, SimTotals } from './types.ts';

interface LintInput {
  graph: Graph;
  results: Record<string, NodeResult>;
  scenario: Scenario;
  totals: Omit<SimTotals, 'survives'> & { survives?: boolean };
  edgeFlow: Map<GraphEdge, Flow>;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const usd = (x: number) => `$${x.toFixed(x < 10 ? 2 : 0)}`;

const PUBLIC_ENTRY = new Set(['users', 'route53', 'cloudfront', 'waf', 'alb', 'nlb', 'apigw']);

/**
 * Well-Architected style checks. Each finding explains the problem AND what to
 * do about it — they are the main teaching feedback of the simulator.
 */
export function lint({ graph, results, scenario }: LintInput): Finding[] {
  const out: Finding[] = [];
  const nodes = [...graph.nodes.values()];
  const name = (n: GraphNode) => n.def.short;

  if (!nodes.some((n) => n.def.behavior === 'client')) {
    out.push({
      id: 'no-users',
      severity: 'info',
      pillar: 'operational',
      nodeIds: [],
      title: tx('No traffic source', 'Chưa có nguồn traffic'),
      detail: tx('Add a "Users" node and connect it to your entry point.', 'Thêm node "Users" và nối nó vào điểm vào hệ thống.'),
    });
  }

  // Reachability from users (sync or async).
  const reached = new Set<string>();
  const stack = nodes.filter((n) => n.def.behavior === 'client');
  while (stack.length) {
    const n = stack.pop()!;
    if (reached.has(n.id)) continue;
    reached.add(n.id);
    for (const e of n.out) stack.push(e.target);
  }

  for (const n of nodes) {
    const r = results[n.id]!;
    const b = n.def.behavior;

    if (b !== 'client' && !reached.has(n.id)) {
      out.push({
        id: `unreachable-${n.id}`,
        severity: n.in.length + n.out.length === 0 ? 'info' : 'warning',
        pillar: 'operational',
        nodeIds: [n.id],
        title: tx(`${name(n)} receives no traffic`, `${name(n)} không nhận được traffic`),
        detail: tx(
          'Connect it to the request path (drag from a handle of another node), or delete it — it still costs money.',
          'Nối nó vào đường đi của request (kéo từ một chấm nối của node khác), hoặc xoá đi — nó vẫn tốn tiền.',
        ),
      });
      continue;
    }

    if (r.status === 'saturated') {
      out.push({
        id: `saturated-${n.id}`,
        severity: 'error',
        pillar: 'performance',
        nodeIds: [n.id],
        title: tx(`${name(n)} is overloaded (${pct(r.utilization)} at peak)`, `${name(n)} bị quá tải (${pct(r.utilization)} lúc cao điểm)`),
        detail: tx(
          `About ${pct(r.errorRate)} of its requests fail at peak. Scale out/up (more or bigger instances, Auto Scaling), add a cache in front, or move reads to replicas.`,
          `Khoảng ${pct(r.errorRate)} request tới nó bị lỗi lúc cao điểm. Hãy scale out/up (thêm hoặc dùng instance lớn hơn, Auto Scaling), đặt cache phía trước, hoặc chuyển việc đọc sang replica.`,
        ),
      });
    } else if (r.status === 'busy') {
      out.push({
        id: `busy-${n.id}`,
        severity: 'warning',
        pillar: 'performance',
        nodeIds: [n.id],
        title: tx(`${name(n)} runs hot (${pct(r.utilization)} at peak)`, `${name(n)} chạy gần ngưỡng (${pct(r.utilization)} lúc cao điểm)`),
        detail: tx(
          'Above ~80% utilisation, queueing makes latency climb fast and there is no headroom for spikes.',
          'Trên ~80% tải, hàng đợi khiến độ trễ tăng vọt và không còn dư địa cho các đợt tăng đột biến.',
        ),
      });
    } else if (
      // Only provisioned capacity can sit idle; serverless bills per request,
      // and caches are sized by memory, not requests/second.
      r.model.instances !== undefined &&
      b !== 'cache' &&
      Number.isFinite(r.model.capacityRps) &&
      r.utilization < 0.15 &&
      r.monthlyUsd > 50
    ) {
      out.push({
        id: `overprovisioned-${n.id}`,
        severity: 'info',
        pillar: 'cost',
        nodeIds: [n.id],
        title: tx(`${name(n)} is mostly idle (${pct(r.utilization)} at peak)`, `${name(n)} gần như ngồi không (${pct(r.utilization)} lúc cao điểm)`),
        detail: tx(
          `It costs ${usd(r.monthlyUsd)}/month. Consider a smaller size (rightsizing) or a serverless option.`,
          `Nó tốn ${usd(r.monthlyUsd)}/tháng. Cân nhắc dùng cỡ nhỏ hơn (rightsizing) hoặc một lựa chọn serverless.`,
        ),
      });
    }

    if (b === 'db' && r.model.azLayout === 'single-az') {
      out.push({
        id: `single-az-db-${n.id}`,
        severity: 'warning',
        pillar: 'reliability',
        nodeIds: [n.id],
        title: tx(`${name(n)} runs in a single AZ`, `${name(n)} chỉ chạy trong một AZ`),
        detail: tx(
          n.def.id === 'aurora'
            ? 'With no Aurora replica, failover means creating a new instance (minutes). Add ≥ 1 replica.'
            : 'If that Availability Zone fails, the database — and your app — goes down. Enable Multi-AZ for production.',
          n.def.id === 'aurora'
            ? 'Không có Aurora replica thì failover phải tạo instance mới (mất vài phút). Thêm ≥ 1 replica.'
            : 'Nếu Availability Zone đó gặp sự cố, database — và cả app — sẽ sập. Hãy bật Multi-AZ cho production.',
        ),
      });
    }

    if (b === 'app' && r.model.azLayout === 'single-az') {
      out.push({
        id: `single-az-app-${n.id}`,
        severity: 'warning',
        pillar: 'reliability',
        nodeIds: [n.id],
        title: tx(`${name(n)} is a single point of failure`, `${name(n)} là điểm lỗi duy nhất`),
        detail: tx(
          'Run at least 2 instances/tasks spread across 2 AZs behind a load balancer.',
          'Chạy ít nhất 2 instance/task trải trên 2 AZ, đứng sau một load balancer.',
        ),
      });
    }

    if (b === 'cache' && r.model.azLayout === 'single-az') {
      out.push({
        id: `single-cache-${n.id}`,
        severity: 'info',
        pillar: 'reliability',
        nodeIds: [n.id],
        title: tx(`${name(n)} has no replica`, `${name(n)} không có replica`),
        detail: tx(
          'If the node fails, every read suddenly hits the database. Add a replica in another AZ.',
          'Nếu node lỗi, mọi lượt đọc đột ngột dồn xuống database. Thêm một replica ở AZ khác.',
        ),
      });
    }

    if (b === 'nat') {
      const toAws = n.out.filter((e) => e.target.def.id === 's3' || e.target.def.id === 'dynamodb');
      if (toAws.length) {
        const natData = r.costs.filter((c) => c.kind === 'transfer').reduce((a, c) => a + c.usd, 0);
        out.push({
          id: `nat-to-aws-${n.id}`,
          severity: 'warning',
          pillar: 'cost',
          nodeIds: [n.id, ...toAws.map((e) => e.target.id)],
          title: tx('S3/DynamoDB traffic goes through NAT', 'Traffic tới S3/DynamoDB đi qua NAT'),
          detail: tx(
            `You pay ${usd(natData)}/month in NAT data processing. A Gateway VPC Endpoint for S3/DynamoDB is free — connect the app to a VPC Endpoint instead.`,
            `Bạn đang trả ${usd(natData)}/tháng phí xử lý dữ liệu NAT. Gateway VPC Endpoint cho S3/DynamoDB miễn phí — hãy nối app qua VPC Endpoint thay vì NAT.`,
          ),
        });
      }
      if (r.model.azLayout === 'single-az') {
        out.push({
          id: `single-nat-${n.id}`,
          severity: 'info',
          pillar: 'reliability',
          nodeIds: [n.id],
          title: tx('Single NAT Gateway', 'Chỉ có một NAT Gateway'),
          detail: tx(
            'If its AZ fails, private resources in every AZ lose outbound access. Use one NAT per AZ for production.',
            'Nếu AZ của nó gặp sự cố, tài nguyên private ở mọi AZ đều mất đường ra ngoài. Production nên dùng mỗi AZ một NAT.',
          ),
        });
      }
    }

    // Databases / caches reachable straight from the internet-facing tier.
    if ((b === 'db' || b === 'cache') && n.def.id !== 'cognito' && n.in.some((e) => PUBLIC_ENTRY.has(e.source.def.id) && !(e.source.def.id === 'apigw' && n.def.id === 'dynamodb'))) {
      out.push({
        id: `public-db-${n.id}`,
        severity: 'error',
        pillar: 'security',
        nodeIds: [n.id],
        title: tx(`${name(n)} is exposed to the internet tier`, `${name(n)} bị phơi ra phía internet`),
        detail: tx(
          'Databases and caches belong in private subnets, reachable only from your application tier.',
          'Database và cache phải nằm trong private subnet, chỉ tầng ứng dụng mới truy cập được.',
        ),
      });
    }

    // Read-heavy path without a cache, with the DB getting busy.
    if (b === 'app' && scenario.readRatio >= 0.7) {
      const hasCache = n.out.some((e) => e.target.def.behavior === 'cache');
      const busyDbs = n.out.filter((e) => e.target.def.behavior === 'db' && results[e.target.id]!.utilization >= 0.5);
      if (!hasCache && busyDbs.length) {
        out.push({
          id: `no-cache-${n.id}`,
          severity: 'warning',
          pillar: 'performance',
          nodeIds: [n.id, ...busyDbs.map((e) => e.target.id)],
          title: tx('Read-heavy load hits the database directly', 'Tải đọc nhiều dồn thẳng vào database'),
          detail: tx(
            `${pct(scenario.readRatio)} of requests are reads. An ElastiCache layer (or read replicas) can absorb most of them and let you use a smaller database.`,
            `${pct(scenario.readRatio)} request là đọc. Thêm một lớp ElastiCache (hoặc read replica) có thể gánh phần lớn số đó và cho phép dùng database nhỏ hơn.`,
          ),
        });
      }
    }

    // Lambda fleets opening connections to relational databases.
    if (n.def.id === 'lambda') {
      const concurrency = (r.peak.r + r.peak.w) * (Number(n.cfg.durationMs ?? 100) / 1000);
      const sqlTargets = n.out.filter((e) => e.target.def.id === 'rds' || e.target.def.id === 'aurora');
      if (sqlTargets.length && concurrency > 100) {
        out.push({
          id: `lambda-sql-${n.id}`,
          severity: 'warning',
          pillar: 'reliability',
          nodeIds: [n.id, ...sqlTargets.map((e) => e.target.id)],
          title: tx('Lambda may exhaust database connections', 'Lambda có thể làm cạn kết nối database'),
          detail: tx(
            `~${Math.round(concurrency)} concurrent executions at peak, each with its own connection. Put RDS Proxy in between or use DynamoDB.`,
            `~${Math.round(concurrency)} lượt chạy đồng thời lúc cao điểm, mỗi lượt giữ một kết nối riêng. Đặt RDS Proxy ở giữa hoặc dùng DynamoDB.`,
          ),
        });
      }
    }

    if (b === 'queue' && n.out.length === 0 && reached.has(n.id)) {
      out.push({
        id: `no-consumer-${n.id}`,
        severity: 'warning',
        pillar: 'operational',
        nodeIds: [n.id],
        title: tx(`${name(n)} has no consumer`, `${name(n)} chưa có consumer`),
        detail: tx(
          'Messages pile up and expire. Connect the queue to a Lambda or worker service.',
          'Message sẽ dồn lại rồi hết hạn. Hãy nối queue tới một Lambda hoặc worker service.',
        ),
      });
    }
  }

  // Big internet egress without a CDN.
  const egressUsd = nodes.reduce(
    (a, n) => a + results[n.id]!.costs.filter((c) => c.label.en.startsWith('Data transfer out to internet')).reduce((x, c) => x + c.usd, 0),
    0,
  );
  if (egressUsd > 100 && !nodes.some((n) => n.def.id === 'cloudfront')) {
    out.push({
      id: 'egress-no-cdn',
      severity: 'warning',
      pillar: 'cost',
      nodeIds: [],
      title: tx(`Internet egress costs ${usd(egressUsd)}/month`, `Egress ra internet tốn ${usd(egressUsd)}/tháng`),
      detail: tx(
        'CloudFront in front of your origin lowers the per-GB price, caches content, and AWS → CloudFront transfer is free.',
        'Đặt CloudFront trước origin giúp hạ giá mỗi GB và cache được nội dung, đồng thời data transfer từ AWS sang CloudFront là miễn phí.',
      ),
    });
  }

  // Public entry without WAF.
  const hasPublicApp = nodes.some((n) => n.def.behavior === 'client' && n.out.length > 0);
  if (hasPublicApp && scenario.rps >= 50 && !nodes.some((n) => n.def.id === 'waf')) {
    out.push({
      id: 'no-waf',
      severity: 'info',
      pillar: 'security',
      nodeIds: [],
      title: tx('No web application firewall', 'Chưa có tường lửa ứng dụng web'),
      detail: tx(
        'Public apps are scanned and attacked constantly. AWS WAF on CloudFront/ALB/API Gateway blocks common exploits and abusive IPs.',
        'App public bị dò quét và tấn công liên tục. AWS WAF gắn trên CloudFront/ALB/API Gateway sẽ chặn các kiểu khai thác phổ biến và IP lạm dụng.',
      ),
    });
  }

  const order = { error: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
