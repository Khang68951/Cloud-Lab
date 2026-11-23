import { PRICES } from '../pricing.ts';
import { tx, type FieldSpec, type ModelContext, type NodeModel, type ServiceDef } from '../types.ts';
import { bool, hours, line, millionsPerMonth, num, p, str, total } from '../util.ts';

/** Instances needed to keep utilisation under `target` for `load` rps. */
export function sized(load: number, perUnit: number, min: number, max: number, target = 0.7) {
  return Math.min(max, Math.max(min, Math.ceil(load / (perUnit * target))));
}

export const instanceField: FieldSpec = {
  key: 'instanceType',
  kind: 'select',
  label: tx('Instance type', 'Loại instance'),
  help: tx('Bigger instances serve more requests per second but cost more per hour.', 'Instance lớn phục vụ được nhiều request/giây hơn nhưng đắt hơn mỗi giờ.'),
  options: Object.keys(PRICES.ec2.hourly).map((k) => ({
    value: k,
    label: `${k} — $${PRICES.ec2.hourly[k]}/h, ~${PRICES.ec2.rpsPerInstance[k]} rps`,
  })),
  default: 't3.medium',
};

export const scalingFields: FieldSpec[] = [
  { key: 'count', kind: 'number', label: tx('Instances (minimum)', 'Số instance (tối thiểu)'), min: 1, max: 100, step: 1, default: 2 },
  {
    key: 'autoscaling',
    kind: 'toggle',
    label: tx('Auto Scaling', 'Auto Scaling'),
    help: tx('Add instances at peak, remove them when quiet (target 70% utilisation).', 'Thêm instance lúc cao điểm, bớt đi khi vắng (mục tiêu 70% tải).'),
    default: false,
  },
  { key: 'maxCount', kind: 'number', label: tx('Maximum instances', 'Số instance tối đa'), min: 1, max: 200, step: 1, default: 10 },
  {
    key: 'multiAz',
    kind: 'toggle',
    label: tx('Spread across 2 AZs', 'Trải trên 2 AZ'),
    help: tx('Survives the loss of one Availability Zone (needs ≥ 2 instances).', 'Chịu được việc mất một Availability Zone (cần ≥ 2 instance).'),
    default: true,
  },
];

/** Shared model for instance fleets (EC2, EKS nodes). */
export function fleetModel(ctx: ModelContext, perUnitRps: number, hourlyUsd: number, label: { en: string; vi: string }, spotLike: boolean) {
  const min = num(ctx, 'count', 1);
  const max = bool(ctx, 'autoscaling') ? Math.max(min, num(ctx, 'maxCount', min)) : min;
  const peakN = sized(total(ctx.peak), perUnitRps, min, max);
  const avgN = sized(total(ctx.avg), perUnitRps, min, max);
  const instanceAvail = spotLike ? 0.95 : 0.995;
  return {
    peakN,
    avgN,
    model: {
      capacityRps: peakN * perUnitRps,
      baseLatencyMs: 20,
      availability: 1 - Math.pow(1 - instanceAvail, peakN),
      azLayout: bool(ctx, 'multiAz') && peakN >= 2 ? 'multi-az' : 'single-az',
      costs: [
        line(
          `${avgN}× ${label.en} (avg)`,
          `${avgN}× ${label.vi} (trung bình)`,
          p(ctx, avgN * hourlyUsd * hours),
          'compute',
        ),
      ],
      summary: '',
      instances: peakN,
    } satisfies NodeModel,
  };
}

export const ec2: ServiceDef = {
  id: 'ec2',
  name: 'Amazon EC2',
  short: 'EC2',
  category: 'compute',
  behavior: 'app',
  icon: 'server',
  equivalents: { azure: 'Virtual Machines / VM Scale Sets', gcp: 'Compute Engine / MIGs' },
  description: tx(
    'Virtual machines. Full control of the OS; you patch, scale and operate them (with Auto Scaling groups).',
    'Máy ảo. Toàn quyền với hệ điều hành; bạn tự vá lỗi, scale và vận hành (với Auto Scaling group).',
  ),
  docs: {
    whenToUse: [
      tx('Steady, predictable load running 24/7 (cheapest with Savings Plans).', 'Tải đều, dự đoán được, chạy 24/7 (rẻ nhất khi dùng Savings Plans).'),
      tx('Software that needs OS access, GPUs, or long-running processes.', 'Phần mềm cần truy cập hệ điều hành, GPU hoặc tiến trình chạy lâu.'),
    ],
    whenNotTo: [
      tx('Spiky or rare traffic → Lambda/Fargate avoid paying for idle servers.', 'Traffic theo đợt hoặc ít → Lambda/Fargate tránh trả tiền cho server ngồi không.'),
      tx('Small team that does not want to patch servers.', 'Team nhỏ không muốn tự vá lỗi server.'),
    ],
    pros: [tx('Cheapest per unit of compute at steady load.', 'Rẻ nhất trên mỗi đơn vị compute khi tải đều.'), tx('Any software, any runtime.', 'Chạy được mọi phần mềm, mọi runtime.')],
    cons: [tx('You manage OS patches, scaling and capacity.', 'Bạn tự lo vá OS, scale và dung lượng.'), tx('You pay while instances idle.', 'Instance ngồi không vẫn tốn tiền.')],
    pitfalls: [
      tx('A single instance = a single point of failure (EC2 single-instance SLA is 99.5%).', 'Một instance duy nhất = điểm lỗi duy nhất (SLA của một instance EC2 là 99.5%).'),
      tx('Spot instances can be reclaimed with 2 minutes notice — only for interruption-tolerant work.', 'Spot instance có thể bị thu hồi với 2 phút báo trước — chỉ dùng cho việc chịu được gián đoạn.'),
    ],
    pricing: tx(
      'Per second, by instance type. Savings Plans (1–3 years) save ~28–72%; Spot saves up to ~90% but can be interrupted. Plus EBS storage.',
      'Tính theo giây, theo loại instance. Savings Plans (1–3 năm) tiết kiệm ~28–72%; Spot rẻ tới ~90% nhưng có thể bị ngắt. Cộng thêm ổ EBS.',
    ),
  },
  fields: [
    instanceField,
    ...scalingFields,
    {
      key: 'purchase',
      kind: 'select',
      label: tx('Pricing model', 'Mô hình giá'),
      options: [
        { value: 'on-demand', label: 'On-Demand' },
        { value: 'savings-plan-1y', label: tx('Savings Plan 1 year (−28%)', 'Savings Plan 1 năm (−28%)') },
        { value: 'spot', label: tx('Spot (−65%, interruptible)', 'Spot (−65%, có thể bị ngắt)') },
      ],
      default: 'on-demand',
    },
    { key: 'ebsGB', kind: 'number', label: tx('EBS disk per instance', 'Ổ EBS mỗi instance'), min: 8, max: 2000, step: 8, unit: 'GB', default: 30 },
  ],
  model: (ctx) => {
    const type = str(ctx, 'instanceType', 't3.medium');
    const purchase = str(ctx, 'purchase', 'on-demand');
    const hourly = (PRICES.ec2.hourly[type] ?? 0.0416) * (PRICES.ec2.purchase[purchase] ?? 1);
    const { model, avgN } = fleetModel(ctx, PRICES.ec2.rpsPerInstance[type] ?? 300, hourly, { en: type, vi: type }, purchase === 'spot');
    model.costs.push(
      line('EBS gp3 storage', 'Ổ EBS gp3', p(ctx, avgN * num(ctx, 'ebsGB', 30) * PRICES.ec2.ebsPerGBMonth), 'storage'),
    );
    model.summary = `${model.instances}× ${type}${purchase === 'spot' ? ' spot' : ''}`;
    return model;
  },
};

export const eks: ServiceDef = {
  id: 'eks',
  name: 'Amazon EKS',
  short: 'EKS',
  category: 'compute',
  behavior: 'app',
  icon: 'boxes',
  equivalents: { azure: 'AKS', gcp: 'GKE' },
  description: tx(
    'Managed Kubernetes control plane; workloads run on EC2 worker nodes (or Fargate).',
    'Control plane Kubernetes được quản lý; workload chạy trên worker node EC2 (hoặc Fargate).',
  ),
  docs: {
    whenToUse: [
      tx('Many microservices and a team that already knows Kubernetes.', 'Nhiều microservice và team đã thành thạo Kubernetes.'),
      tx('Portability across clouds / on-prem.', 'Cần chạy được trên nhiều cloud hoặc on-prem.'),
    ],
    whenNotTo: [tx('A few services and a small team → ECS/Fargate is far simpler.', 'Ít service và team nhỏ → ECS/Fargate đơn giản hơn nhiều.')],
    pros: [tx('Huge ecosystem (Helm, operators).', 'Hệ sinh thái khổng lồ (Helm, operator).')],
    cons: [tx('$73/month per cluster before any workload, plus real operational complexity.', '$73/tháng mỗi cluster trước khi chạy bất kỳ workload nào, cộng độ phức tạp vận hành thật sự.')],
    pitfalls: [tx('One cluster per tiny app multiplies the control-plane fee.', 'Mỗi app nhỏ một cluster sẽ nhân phí control plane lên.')],
    pricing: tx('$0.10/hour per cluster + the EC2 nodes.', '$0.10/giờ mỗi cluster + các node EC2.'),
  },
  fields: [instanceField, ...scalingFields],
  model: (ctx) => {
    const type = str(ctx, 'instanceType', 't3.medium');
    // ~10% of node capacity goes to Kubernetes system pods.
    const { model } = fleetModel(
      ctx,
      (PRICES.ec2.rpsPerInstance[type] ?? 300) * 0.9,
      PRICES.ec2.hourly[type] ?? 0.0416,
      { en: `${type} node`, vi: `node ${type}` },
      false,
    );
    model.costs.unshift(line('EKS control plane', 'Control plane EKS', p(ctx, PRICES.eks.clusterHour * hours), 'other'));
    model.summary = `${model.instances}× ${type}`;
    return model;
  },
};

const TASK_SIZES: Record<string, { vcpu: number; gb: number; rps: number }> = {
  '0.25-0.5': { vcpu: 0.25, gb: 0.5, rps: 60 },
  '0.5-1': { vcpu: 0.5, gb: 1, rps: 150 },
  '1-2': { vcpu: 1, gb: 2, rps: 350 },
  '2-4': { vcpu: 2, gb: 4, rps: 800 },
};

export const fargate: ServiceDef = {
  id: 'fargate',
  name: 'Amazon ECS on Fargate',
  short: 'Fargate',
  category: 'compute',
  behavior: 'app',
  icon: 'container',
  equivalents: { azure: 'Container Apps / ACI', gcp: 'Cloud Run' },
  description: tx(
    'Run containers without managing servers: you pick vCPU/memory per task, AWS runs them.',
    'Chạy container mà không cần quản lý server: bạn chọn vCPU/bộ nhớ cho mỗi task, AWS lo phần chạy.',
  ),
  docs: {
    whenToUse: [
      tx('Containerised web services and workers, small/medium teams.', 'Web service và worker đóng gói container, team nhỏ/vừa.'),
      tx('Long-running or >15-minute jobs that do not fit Lambda.', 'Job chạy lâu hoặc quá 15 phút, không vừa với Lambda.'),
    ],
    whenNotTo: [tx('Large steady fleets → EC2 with Savings Plans is ~20–40% cheaper.', 'Fleet lớn và tải đều → EC2 dùng Savings Plans rẻ hơn ~20–40%.')],
    pros: [tx('No servers to patch.', 'Không có server để vá lỗi.'), tx('Per-second billing, scales per task.', 'Tính tiền theo giây, scale theo từng task.')],
    cons: [tx('Higher price per vCPU than EC2.', 'Giá mỗi vCPU cao hơn EC2.'), tx('No GPU, limited host access.', 'Không có GPU, hạn chế truy cập host.')],
    pitfalls: [tx('Over-sizing tasks: memory you reserve is billed even if unused.', 'Chọn task quá lớn: bộ nhớ đã đặt vẫn bị tính tiền dù không dùng.')],
    pricing: tx('~$0.04048 per vCPU-hour + ~$0.004445 per GB-hour. Fargate Spot ~70% cheaper.', '~$0.04048 mỗi vCPU-giờ + ~$0.004445 mỗi GB-giờ. Fargate Spot rẻ hơn ~70%.'),
  },
  fields: [
    {
      key: 'taskSize',
      kind: 'select',
      label: tx('Task size (vCPU / GB)', 'Kích thước task (vCPU / GB)'),
      options: Object.entries(TASK_SIZES).map(([k, v]) => ({ value: k, label: `${v.vcpu} vCPU / ${v.gb} GB — ~${v.rps} rps` })),
      default: '0.5-1',
    },
    { key: 'count', kind: 'number', label: tx('Tasks (minimum)', 'Số task (tối thiểu)'), min: 1, max: 200, step: 1, default: 2 },
    { key: 'autoscaling', kind: 'toggle', label: tx('Service Auto Scaling', 'Service Auto Scaling'), default: true },
    { key: 'maxCount', kind: 'number', label: tx('Maximum tasks', 'Số task tối đa'), min: 1, max: 500, step: 1, default: 20 },
    { key: 'multiAz', kind: 'toggle', label: tx('Spread across 2 AZs', 'Trải trên 2 AZ'), default: true },
    { key: 'spot', kind: 'toggle', label: tx('Fargate Spot', 'Fargate Spot'), help: tx('~70% cheaper, tasks can be interrupted.', 'Rẻ hơn ~70%, task có thể bị ngắt.'), default: false },
  ],
  model: (ctx) => {
    const size = TASK_SIZES[str(ctx, 'taskSize', '0.5-1')] ?? TASK_SIZES['0.5-1']!;
    const min = num(ctx, 'count', 1);
    const max = bool(ctx, 'autoscaling') ? Math.max(min, num(ctx, 'maxCount', min)) : min;
    const peakN = sized(total(ctx.peak), size.rps, min, max);
    const avgN = sized(total(ctx.avg), size.rps, min, max);
    const spot = bool(ctx, 'spot');
    const perTaskHour = (size.vcpu * PRICES.fargate.vcpuHour + size.gb * PRICES.fargate.gbHour) * (spot ? 0.3 : 1);
    return {
      capacityRps: peakN * size.rps,
      baseLatencyMs: 20,
      availability: 1 - Math.pow(1 - (spot ? 0.95 : 0.995), peakN),
      azLayout: bool(ctx, 'multiAz') && peakN >= 2 ? 'multi-az' : 'single-az',
      costs: [line(`${avgN}× task (avg)`, `${avgN}× task (trung bình)`, p(ctx, avgN * perTaskHour * hours), 'compute')],
      summary: `${peakN}× ${size.vcpu}vCPU${spot ? ' spot' : ''}`,
      instances: peakN,
    };
  },
};

export const lambda: ServiceDef = {
  id: 'lambda',
  name: 'AWS Lambda',
  short: 'Lambda',
  category: 'compute',
  behavior: 'app',
  icon: 'function',
  equivalents: { azure: 'Azure Functions', gcp: 'Cloud Run functions' },
  description: tx(
    'Run code per request/event. No servers, scales to zero, pay per invocation and duration.',
    'Chạy code theo từng request/sự kiện. Không có server, scale về 0, trả tiền theo số lần gọi và thời gian chạy.',
  ),
  docs: {
    whenToUse: [
      tx('Spiky, unpredictable or low traffic.', 'Traffic theo đợt, khó đoán hoặc thấp.'),
      tx('Event processing: S3 uploads, SQS messages, schedules.', 'Xử lý sự kiện: upload S3, message SQS, lịch chạy định kỳ.'),
    ],
    whenNotTo: [
      tx('Steady high traffic 24/7 → often more expensive than containers/EC2.', 'Traffic cao và đều 24/7 → thường đắt hơn container/EC2.'),
      tx('Jobs longer than 15 minutes, or very latency-sensitive paths (cold starts).', 'Job dài hơn 15 phút, hoặc đường xử lý cực nhạy độ trễ (cold start).'),
    ],
    pros: [tx('Zero cost when idle.', 'Không tốn đồng nào khi rảnh.'), tx('No capacity planning, built-in multi-AZ.', 'Không cần tính dung lượng, sẵn multi-AZ.')],
    cons: [tx('Cold starts add latency.', 'Cold start làm tăng độ trễ.'), tx('Concurrency limit (default 1,000 per region).', 'Giới hạn concurrency (mặc định 1.000 mỗi region).')],
    pitfalls: [
      tx('Hundreds of Lambdas opening DB connections exhaust RDS — use RDS Proxy.', 'Hàng trăm Lambda cùng mở kết nối DB sẽ làm cạn RDS — dùng RDS Proxy.'),
      tx('Paying for waiting: duration includes time spent waiting on slow downstream calls.', 'Trả tiền cho việc chờ: thời gian chạy tính cả lúc chờ các lời gọi chậm phía sau.'),
    ],
    pricing: tx('$0.20 per million requests + ~$0.0000167 per GB-second.', '$0.20 mỗi triệu request + ~$0.0000167 mỗi GB-giây.'),
  },
  fields: [
    {
      key: 'memoryMB',
      kind: 'select',
      label: tx('Memory', 'Bộ nhớ'),
      help: tx('CPU scales with memory.', 'CPU tăng theo bộ nhớ.'),
      options: ['128', '256', '512', '1024', '2048'].map((m) => ({ value: m, label: `${m} MB` })),
      default: '512',
    },
    { key: 'durationMs', kind: 'number', label: tx('Avg duration', 'Thời gian chạy TB'), min: 1, max: 900000, step: 10, unit: 'ms', default: 100 },
    {
      key: 'concurrency',
      kind: 'number',
      label: tx('Concurrency limit', 'Giới hạn concurrency'),
      help: tx('Max simultaneous executions (account default 1,000).', 'Số lần chạy đồng thời tối đa (mặc định account 1.000).'),
      min: 1,
      max: 10000,
      step: 100,
      default: 1000,
    },
  ],
  model: (ctx) => {
    const memGB = Number(str(ctx, 'memoryMB', '512')) / 1024;
    const dur = num(ctx, 'durationMs', 100);
    const conc = num(ctx, 'concurrency', 1000);
    const rps = total(ctx.avg);
    const invM = millionsPerMonth(rps);
    const gbSeconds = invM * 1e6 * (dur / 1000) * memGB;
    return {
      capacityRps: conc / (dur / 1000),
      baseLatencyMs: dur + 5,
      availability: 0.9995,
      azLayout: 'regional',
      costs: [
        line('Invocations', 'Lượt gọi', p(ctx, invM * PRICES.lambda.perMillionRequests), 'requests'),
        line('Compute (GB-seconds)', 'Compute (GB-giây)', p(ctx, gbSeconds * PRICES.lambda.perGBSecond), 'compute'),
      ],
      summary: `${Math.round(memGB * 1024)}MB · ${dur}ms`,
    };
  },
};
