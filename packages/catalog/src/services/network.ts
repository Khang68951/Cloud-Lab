import { PRICES } from '../pricing.ts';
import { tx, type ServiceDef } from '../types.ts';
import { gbPerMonth, hours, line, millionsPerMonth, num, p, str, total } from '../util.ts';

export const alb: ServiceDef = {
  id: 'alb',
  name: 'Application Load Balancer',
  short: 'ALB',
  category: 'network',
  behavior: 'router',
  icon: 'split',
  equivalents: { azure: 'Application Gateway', gcp: 'HTTP(S) Load Balancing' },
  description: tx(
    'Layer-7 (HTTP/HTTPS) load balancer: path/host routing, TLS termination, health checks across AZs.',
    'Load balancer tầng 7 (HTTP/HTTPS): định tuyến theo path/host, kết thúc TLS, health check qua nhiều AZ.',
  ),
  docs: {
    whenToUse: [
      tx('HTTP APIs and websites running on EC2, ECS/Fargate or EKS.', 'HTTP API và website chạy trên EC2, ECS/Fargate hoặc EKS.'),
      tx('Routing /api and /admin to different services.', 'Định tuyến /api và /admin tới các service khác nhau.'),
    ],
    whenNotTo: [
      tx('Raw TCP/UDP or millions of connections with static IPs → NLB.', 'TCP/UDP thuần hoặc hàng triệu kết nối cần IP tĩnh → NLB.'),
      tx('Low, spiky traffic to Lambda → API Gateway can be cheaper (no hourly fee).', 'Traffic thấp, theo đợt tới Lambda → API Gateway có thể rẻ hơn (không có phí theo giờ).'),
    ],
    pros: [tx('Scales automatically, spans multiple AZs.', 'Tự scale, trải trên nhiều AZ.'), tx('Health checks remove bad targets.', 'Health check tự loại target lỗi.')],
    cons: [tx('Fixed hourly cost (~$16/month) even with zero traffic.', 'Phí cố định theo giờ (~$16/tháng) kể cả khi không có traffic.')],
    pitfalls: [tx('Targets in a single AZ make the multi-AZ ALB pointless.', 'Target chỉ ở một AZ thì ALB multi-AZ cũng vô nghĩa.')],
    pricing: tx('~$0.0225/hour + $0.008 per LCU-hour (LCU = new connections, active connections, GB processed, rule evaluations).', '~$0.0225/giờ + $0.008 mỗi LCU-giờ (LCU tính theo kết nối mới, kết nối đang mở, GB xử lý, số rule).'),
  },
  fields: [],
  model: (ctx) => {
    const t = total(ctx.avg);
    const gbPerHour = (t * ctx.scenario.payloadKB * 3600) / 1e6;
    // 1 LCU ≈ 1 GB/hour processed or 25 new connections/s (assume 1 new conn per 10 requests).
    const lcu = Math.max(gbPerHour, t / 250, 0.1);
    return {
      capacityRps: Infinity,
      baseLatencyMs: 2,
      availability: 0.9999,
      azLayout: 'regional',
      costs: [
        line('Load balancer hours', 'Giờ chạy load balancer', p(ctx, PRICES.alb.hourly * hours), 'compute'),
        line(`LCU (~${lcu.toFixed(1)}/h)`, `LCU (~${lcu.toFixed(1)}/giờ)`, p(ctx, lcu * PRICES.alb.lcuHour * hours), 'requests'),
      ],
      summary: 'L7',
    };
  },
};

export const nlb: ServiceDef = {
  id: 'nlb',
  name: 'Network Load Balancer',
  short: 'NLB',
  category: 'network',
  behavior: 'router',
  icon: 'network',
  equivalents: { azure: 'Azure Load Balancer', gcp: 'Network Load Balancing' },
  description: tx(
    'Layer-4 (TCP/UDP/TLS) load balancer: ultra-low latency, millions of requests per second, static IPs.',
    'Load balancer tầng 4 (TCP/UDP/TLS): độ trễ cực thấp, hàng triệu request/giây, IP tĩnh.',
  ),
  docs: {
    whenToUse: [
      tx('Non-HTTP protocols (gaming, IoT, MQTT, databases).', 'Giao thức không phải HTTP (game, IoT, MQTT, database).'),
      tx('Clients that need fixed IP addresses (firewall allow-lists).', 'Client cần địa chỉ IP cố định (allow-list trên firewall).'),
    ],
    whenNotTo: [tx('You need path-based routing or HTTP features → ALB.', 'Cần routing theo path hoặc tính năng HTTP → ALB.')],
    pros: [tx('Lowest latency of the AWS load balancers.', 'Độ trễ thấp nhất trong các load balancer của AWS.')],
    cons: [tx('No HTTP-aware routing.', 'Không định tuyến theo nội dung HTTP.')],
    pitfalls: [tx('Cross-zone load balancing is off by default and costs cross-AZ data when enabled.', 'Cross-zone load balancing mặc định tắt, và khi bật sẽ tốn phí data cross-AZ.')],
    pricing: tx('~$0.0225/hour + $0.006 per NLCU-hour.', '~$0.0225/giờ + $0.006 mỗi NLCU-giờ.'),
  },
  fields: [],
  model: (ctx) => {
    const t = total(ctx.avg);
    const gbPerHour = (t * ctx.scenario.payloadKB * 3600) / 1e6;
    const nlcu = Math.max(gbPerHour, t / 800, 0.1);
    return {
      capacityRps: Infinity,
      baseLatencyMs: 1,
      availability: 0.9999,
      azLayout: 'regional',
      costs: [
        line('Load balancer hours', 'Giờ chạy load balancer', p(ctx, PRICES.nlb.hourly * hours), 'compute'),
        line('NLCU', 'NLCU', p(ctx, nlcu * PRICES.nlb.nlcuHour * hours), 'requests'),
      ],
      summary: 'L4',
    };
  },
};

export const apigw: ServiceDef = {
  id: 'apigw',
  name: 'Amazon API Gateway',
  short: 'API Gateway',
  category: 'network',
  behavior: 'router',
  icon: 'door-open',
  equivalents: { azure: 'API Management', gcp: 'API Gateway / Apigee' },
  description: tx(
    'Managed API front door: auth, throttling, API keys, request validation. Pay per request, no idle cost.',
    'Cổng API được quản lý: xác thực, throttling, API key, validate request. Trả theo request, không tốn tiền khi rảnh.',
  ),
  docs: {
    whenToUse: [
      tx('Serverless APIs in front of Lambda.', 'API serverless đứng trước Lambda.'),
      tx('Low or unpredictable traffic (no hourly fee).', 'Traffic thấp hoặc khó đoán (không có phí theo giờ).'),
    ],
    whenNotTo: [
      tx('Very high, steady traffic: per-request pricing gets expensive vs an ALB.', 'Traffic rất cao và đều: giá theo request trở nên đắt hơn ALB.'),
    ],
    pros: [tx('Built-in auth (JWT/Cognito), throttling and usage plans.', 'Có sẵn xác thực (JWT/Cognito), throttling và usage plan.')],
    cons: [
      tx('Default account limit 10,000 requests/second (can be raised).', 'Giới hạn mặc định 10.000 request/giây mỗi account (có thể xin tăng).'),
      tx('29-second integration timeout (REST).', 'Timeout tích hợp 29 giây (REST).'),
    ],
    pitfalls: [tx('Choosing REST API when HTTP API ($1 vs $3.50 per million) is enough.', 'Chọn REST API trong khi HTTP API ($1 so với $3.50 mỗi triệu) là đủ dùng.')],
    pricing: tx('HTTP API $1.00 / REST API $3.50 per million requests.', 'HTTP API $1.00 / REST API $3.50 mỗi triệu request.'),
  },
  fields: [
    {
      key: 'type',
      kind: 'select',
      label: tx('API type', 'Loại API'),
      options: [
        { value: 'http', label: 'HTTP API' },
        { value: 'rest', label: 'REST API' },
        { value: 'websocket', label: 'WebSocket API' },
      ],
      default: 'http',
    },
    {
      key: 'connections',
      kind: 'number',
      label: tx('Concurrent connections (WebSocket)', 'Kết nối đồng thời (WebSocket)'),
      help: tx('Billed per million connection-minutes.', 'Tính phí theo triệu phút kết nối.'),
      min: 0,
      max: 10_000_000,
      step: 100,
      default: 1000,
    },
  ],
  model: (ctx) => {
    const type = str(ctx, 'type', 'http');
    if (type === 'websocket') {
      // $1 per million messages + $0.25 per million connection-minutes.
      const connMinutesM = (num(ctx, 'connections', 1000) * hours * 60) / 1e6;
      return {
        capacityRps: 10000,
        baseLatencyMs: 5,
        availability: 0.9995,
        azLayout: 'regional',
        costs: [
          line('WebSocket messages', 'Message WebSocket', p(ctx, millionsPerMonth(total(ctx.avg)) * 1.0), 'requests'),
          line('Connection minutes', 'Phút kết nối', p(ctx, connMinutesM * 0.25), 'requests'),
        ],
        summary: `WebSocket · ${num(ctx, 'connections', 1000).toLocaleString('en-US')} conn`,
      };
    }
    const rest = type === 'rest';
    const per = rest ? PRICES.apigw.restPerMillion : PRICES.apigw.httpPerMillion;
    return {
      capacityRps: 10000,
      baseLatencyMs: rest ? 15 : 8,
      availability: 0.9995,
      azLayout: 'regional',
      costs: [line('API requests', 'Request API', p(ctx, millionsPerMonth(total(ctx.avg)) * per), 'requests')],
      summary: rest ? 'REST' : 'HTTP',
    };
  },
};

export const nat: ServiceDef = {
  id: 'nat',
  name: 'NAT Gateway',
  short: 'NAT GW',
  category: 'network',
  behavior: 'nat',
  icon: 'arrow-right-left',
  equivalents: { azure: 'NAT Gateway', gcp: 'Cloud NAT' },
  description: tx(
    'Lets resources in private subnets reach the internet (or AWS public endpoints) without being reachable from it.',
    'Cho tài nguyên trong private subnet ra internet (hoặc endpoint public của AWS) mà không bị truy cập ngược từ ngoài vào.',
  ),
  docs: {
    whenToUse: [tx('Private instances that must call external APIs or download updates.', 'Instance private cần gọi API bên ngoài hoặc tải bản cập nhật.')],
    whenNotTo: [
      tx('Traffic to S3 or DynamoDB → use a free Gateway VPC Endpoint instead.', 'Traffic tới S3 hoặc DynamoDB → dùng Gateway VPC Endpoint miễn phí.'),
      tx('Traffic to other AWS services at high volume → Interface endpoints are often cheaper.', 'Traffic lớn tới các dịch vụ AWS khác → Interface endpoint thường rẻ hơn.'),
    ],
    pros: [tx('Managed, scales to 100 Gbps.', 'Được quản lý, scale tới 100 Gbps.')],
    cons: [tx('Charges per GB processed on top of the hourly fee.', 'Tính phí theo GB xử lý, cộng thêm phí theo giờ.')],
    pitfalls: [
      tx('The classic cost trap: pushing terabytes to S3 through NAT ($0.045/GB) instead of a free gateway endpoint.', 'Bẫy chi phí kinh điển: đẩy hàng TB lên S3 qua NAT ($0.045/GB) thay vì gateway endpoint miễn phí.'),
      tx('One NAT per AZ is needed for AZ-independent egress.', 'Cần một NAT cho mỗi AZ thì egress mới không phụ thuộc vào một AZ.'),
    ],
    pricing: tx('~$0.045/hour per gateway + $0.045 per GB processed.', '~$0.045/giờ mỗi gateway + $0.045 mỗi GB xử lý.'),
  },
  fields: [
    {
      key: 'gateways',
      kind: 'select',
      label: tx('Gateways', 'Số gateway'),
      help: tx('One per AZ survives an AZ failure.', 'Mỗi AZ một gateway thì chịu được sự cố AZ.'),
      options: [
        { value: '1', label: tx('1 (single AZ)', '1 (một AZ)') },
        { value: '2', label: tx('2 (one per AZ)', '2 (mỗi AZ một cái)') },
      ],
      default: '1',
    },
    {
      key: 'internetShare',
      kind: 'number',
      label: tx('Share of app requests going to the internet', 'Tỉ lệ request của app đi ra internet'),
      help: tx('E.g. 0.1 if one in ten requests calls an external API through this NAT.', 'Vd 0,1 nếu cứ mười request thì có một request gọi API bên ngoài qua NAT này.'),
      min: 0,
      max: 1,
      step: 0.05,
      default: 1,
    },
  ],
  model: (ctx) => {
    const n = Number(str(ctx, 'gateways', '1'));
    const gb = gbPerMonth(total(ctx.avg), ctx.scenario.payloadKB);
    return {
      capacityRps: Infinity,
      baseLatencyMs: 1,
      availability: 0.9999,
      azLayout: n >= 2 ? 'multi-az' : 'single-az',
      costs: [
        line(`${n}× gateway hours`, `${n}× giờ chạy gateway`, p(ctx, n * PRICES.nat.hourly * hours), 'compute'),
        line(`Data processed (${gb.toFixed(0)} GB)`, `Dữ liệu xử lý (${gb.toFixed(0)} GB)`, p(ctx, gb * PRICES.nat.perGB), 'transfer'),
      ],
      summary: `${n}× NAT`,
      instances: n,
    };
  },
};

export const vpce: ServiceDef = {
  id: 'vpce',
  name: 'VPC Endpoint',
  short: 'VPC Endpoint',
  category: 'network',
  behavior: 'endpoint',
  icon: 'plug',
  equivalents: { azure: 'Private Endpoint / Service Endpoint', gcp: 'Private Service Connect' },
  description: tx(
    'Private connection from your VPC to AWS services. Gateway type (S3, DynamoDB) is free.',
    'Kết nối private từ VPC tới dịch vụ AWS. Loại Gateway (S3, DynamoDB) miễn phí.',
  ),
  docs: {
    whenToUse: [
      tx('Private subnets talking to S3 or DynamoDB (gateway endpoint, free).', 'Private subnet nói chuyện với S3 hoặc DynamoDB (gateway endpoint, miễn phí).'),
      tx('Keeping traffic off the internet for compliance.', 'Giữ traffic không đi qua internet để đáp ứng yêu cầu tuân thủ.'),
    ],
    whenNotTo: [tx('Calling third-party internet APIs — endpoints only reach AWS/PrivateLink services.', 'Gọi API bên thứ ba trên internet — endpoint chỉ tới được dịch vụ AWS/PrivateLink.')],
    pros: [tx('Removes NAT data-processing charges for S3/DynamoDB.', 'Loại bỏ phí xử lý dữ liệu của NAT cho S3/DynamoDB.')],
    cons: [tx('Interface endpoints cost per AZ per hour.', 'Interface endpoint tính phí theo giờ cho mỗi AZ.')],
    pitfalls: [tx('Forgetting to add the gateway endpoint to the private route tables.', 'Quên thêm gateway endpoint vào route table của private subnet.')],
    pricing: tx('Gateway: free. Interface: ~$0.01/hour per AZ + $0.01/GB.', 'Gateway: miễn phí. Interface: ~$0.01/giờ mỗi AZ + $0.01/GB.'),
  },
  fields: [
    {
      key: 'type',
      kind: 'select',
      label: tx('Endpoint type', 'Loại endpoint'),
      options: [
        { value: 'gateway', label: tx('Gateway (S3/DynamoDB, free)', 'Gateway (S3/DynamoDB, miễn phí)') },
        { value: 'interface', label: tx('Interface (PrivateLink)', 'Interface (PrivateLink)') },
      ],
      default: 'gateway',
    },
  ],
  model: (ctx) => {
    const iface = str(ctx, 'type') === 'interface';
    const gb = gbPerMonth(total(ctx.avg), ctx.scenario.payloadKB);
    return {
      capacityRps: Infinity,
      baseLatencyMs: 0.5,
      availability: 0.9999,
      azLayout: 'regional',
      costs: iface
        ? [
            line('Endpoint hours (2 AZ)', 'Giờ chạy endpoint (2 AZ)', p(ctx, 2 * PRICES.vpceInterface.hourlyPerAz * hours), 'compute'),
            line('Data processed', 'Dữ liệu xử lý', p(ctx, gb * PRICES.vpceInterface.perGB), 'transfer'),
          ]
        : [],
      summary: iface ? 'Interface' : 'Gateway',
    };
  },
};
