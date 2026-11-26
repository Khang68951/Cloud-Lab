import { PRICES } from '../pricing.ts';
import { tx, type ServiceDef } from '../types.ts';
import { gbPerMonth, line, millionsPerMonth, num, p, total } from '../util.ts';

export const users: ServiceDef = {
  id: 'users',
  name: 'Users',
  short: 'Users',
  category: 'client',
  behavior: 'client',
  icon: 'users',
  description: tx(
    'Where traffic comes from. Its volume is set in the Scenario (requests/second).',
    'Nơi traffic bắt đầu. Lưu lượng được đặt trong Kịch bản (request/giây).',
  ),
  docs: {
    whenToUse: [tx('Every design needs at least one traffic source.', 'Thiết kế nào cũng cần ít nhất một nguồn traffic.')],
    whenNotTo: [],
    pros: [],
    cons: [],
    pitfalls: [
      tx('Design for peak traffic, not the average.', 'Thiết kế theo traffic đỉnh, không phải trung bình.'),
    ],
    pricing: tx('Free — users pay you, hopefully.', 'Miễn phí — hy vọng là người dùng trả tiền cho bạn.'),
  },
  fields: [],
  model: () => ({
    capacityRps: Infinity,
    baseLatencyMs: 0,
    availability: 1,
    azLayout: 'regional',
    costs: [],
    summary: '',
  }),
};

export const route53: ServiceDef = {
  id: 'route53',
  name: 'Amazon Route 53',
  short: 'Route 53',
  category: 'edge',
  behavior: 'router',
  icon: 'signpost',
  equivalents: { azure: 'Azure DNS / Traffic Manager', gcp: 'Cloud DNS' },
  description: tx(
    'Managed DNS with health checks and routing policies (latency, weighted, failover, geolocation).',
    'DNS được quản lý, có health check và routing policy (latency, weighted, failover, geolocation).',
  ),
  docs: {
    whenToUse: [
      tx('Your domain name, and failover between regions or endpoints.', 'Tên miền của bạn, và failover giữa các region hoặc endpoint.'),
      tx('Routing users to the closest region (latency-based).', 'Đưa người dùng tới region gần nhất (latency-based).'),
    ],
    whenNotTo: [tx('Fast in-region load balancing — DNS is cached, so changes are slow to apply.', 'Cân bằng tải nhanh trong một region — DNS bị cache nên thay đổi áp dụng chậm.')],
    pros: [tx('100% availability SLA.', 'SLA availability 100%.'), tx('Very cheap.', 'Rất rẻ.')],
    cons: [tx('Failover speed depends on TTL and client caching.', 'Tốc độ failover phụ thuộc TTL và cache của client.')],
    pitfalls: [tx('Long TTLs make failover take minutes or hours.', 'TTL dài khiến failover mất hàng phút, thậm chí hàng giờ.')],
    pricing: tx('$0.50 per hosted zone/month + $0.40 per million queries.', '$0.50 mỗi hosted zone/tháng + $0.40 mỗi triệu truy vấn.'),
  },
  fields: [],
  model: (ctx) => {
    // Resolvers cache answers: roughly 1 DNS query per 100 requests.
    const queriesM = millionsPerMonth(total(ctx.avg) / 100);
    return {
      capacityRps: Infinity,
      baseLatencyMs: 1,
      availability: 1,
      azLayout: 'regional',
      costs: [
        line('Hosted zone', 'Hosted zone', PRICES.route53.zoneMonth, 'other'),
        line('DNS queries', 'Truy vấn DNS', queriesM * PRICES.route53.perMillionQueries, 'requests'),
      ],
      summary: 'DNS',
    };
  },
};

export const cloudfront: ServiceDef = {
  id: 'cloudfront',
  name: 'Amazon CloudFront',
  short: 'CloudFront',
  category: 'edge',
  behavior: 'cdn',
  icon: 'globe',
  equivalents: { azure: 'Azure Front Door / CDN', gcp: 'Cloud CDN' },
  description: tx(
    'CDN with 600+ edge locations. Serves cached content close to users and shields your origin.',
    'CDN với hơn 600 điểm edge. Phục vụ nội dung đã cache ở gần người dùng và che chắn cho origin.',
  ),
  docs: {
    whenToUse: [
      tx('Static assets, images, video, downloads.', 'Asset tĩnh, ảnh, video, file tải về.'),
      tx('Reducing load and latency for read-heavy APIs with cacheable responses.', 'Giảm tải và độ trễ cho API đọc nhiều có response cache được.'),
      tx('Cutting data-transfer cost: CloudFront egress is cheaper than EC2/ALB egress.', 'Giảm chi phí data transfer: egress qua CloudFront rẻ hơn qua EC2/ALB.'),
    ],
    whenNotTo: [tx('Highly personalised, uncacheable responses (gains are small).', 'Response cá nhân hoá cao, không cache được (lợi ích nhỏ).')],
    pros: [
      tx('Lower latency worldwide.', 'Độ trễ thấp trên toàn cầu.'),
      tx('Data transfer from AWS origins to CloudFront is free.', 'Data transfer từ origin AWS tới CloudFront miễn phí.'),
    ],
    cons: [tx('Cache invalidation needs planning.', 'Invalidation cache cần được lên kế hoạch.')],
    pitfalls: [
      tx('A low cache hit ratio (bad cache keys, no Cache-Control) wastes most of the benefit.', 'Cache hit ratio thấp (cache key sai, thiếu Cache-Control) làm mất gần hết lợi ích.'),
    ],
    pricing: tx('~$0.085/GB out (first 10 TB, NA/EU) + ~$1 per million HTTPS requests.', '~$0.085/GB ra ngoài (10 TB đầu, Bắc Mỹ/EU) + ~$1 mỗi triệu request HTTPS.'),
  },
  fields: [
    {
      key: 'hitRatio',
      kind: 'number',
      label: tx('Cache hit ratio (reads)', 'Tỉ lệ cache hit (đọc)'),
      help: tx('Share of read requests served from the edge.', 'Tỉ lệ request đọc được phục vụ từ edge.'),
      min: 0,
      max: 0.99,
      step: 0.05,
      default: 0.8,
    },
  ],
  model: (ctx) => {
    const t = total(ctx.avg);
    const gb = gbPerMonth(t, ctx.scenario.payloadKB);
    const hit = num(ctx, 'hitRatio', 0.8);
    return {
      capacityRps: Infinity,
      // Hits are fast; misses add the origin's latency (counted downstream).
      baseLatencyMs: 12,
      availability: 0.9999,
      azLayout: 'regional',
      costs: [
        line('Data transfer out (edge)', 'Data transfer ra ngoài (edge)', p(ctx, gb * PRICES.cloudfront.perGB), 'transfer'),
        line('HTTPS requests', 'Request HTTPS', p(ctx, millionsPerMonth(t) * PRICES.cloudfront.perMillionHttps), 'requests'),
      ],
      summary: `hit ${Math.round(hit * 100)}%`,
    };
  },
};

export const waf: ServiceDef = {
  id: 'waf',
  name: 'AWS WAF',
  short: 'WAF',
  category: 'edge',
  behavior: 'router',
  icon: 'shield',
  equivalents: { azure: 'Azure WAF', gcp: 'Cloud Armor' },
  description: tx(
    'Web application firewall: blocks SQL injection, XSS, bad bots and abusive IPs before they reach your app.',
    'Tường lửa ứng dụng web: chặn SQL injection, XSS, bot xấu và IP lạm dụng trước khi chúng tới app.',
  ),
  docs: {
    whenToUse: [tx('Any public-facing web app or API (attach to CloudFront, ALB or API Gateway).', 'Mọi web app hoặc API public (gắn vào CloudFront, ALB hoặc API Gateway).')],
    whenNotTo: [tx('Internal-only services with no internet exposure.', 'Service chỉ dùng nội bộ, không ra internet.')],
    pros: [tx('Managed rule groups block common attacks out of the box.', 'Managed rule group chặn các kiểu tấn công phổ biến ngay từ đầu.'), tx('Rate limiting per IP.', 'Rate limit theo IP.')],
    cons: [tx('Rules need tuning to avoid false positives.', 'Rule cần tinh chỉnh để tránh chặn nhầm.')],
    pitfalls: [tx('Attaching WAF to the ALB but leaving the ALB reachable directly around CloudFront.', 'Gắn WAF ở CloudFront nhưng ALB vẫn truy cập trực tiếp được, đi vòng qua CloudFront.')],
    pricing: tx('$5 per web ACL/month + $1 per rule/month + $0.60 per million requests.', '$5 mỗi web ACL/tháng + $1 mỗi rule/tháng + $0.60 mỗi triệu request.'),
  },
  fields: [{ key: 'rules', kind: 'number', label: tx('Rules', 'Số rule'), min: 1, max: 50, step: 1, default: 5 }],
  model: (ctx) => ({
    capacityRps: Infinity,
    baseLatencyMs: 1,
    availability: 0.9999,
    azLayout: 'regional',
    costs: [
      line('Web ACL + rules', 'Web ACL + rule', p(ctx, PRICES.waf.aclMonth + num(ctx, 'rules', 5) * PRICES.waf.ruleMonth), 'other'),
      line('Inspected requests', 'Request được kiểm tra', p(ctx, millionsPerMonth(total(ctx.avg)) * PRICES.waf.perMillionRequests), 'requests'),
    ],
    summary: `${num(ctx, 'rules', 5)} rules`,
  }),
};
