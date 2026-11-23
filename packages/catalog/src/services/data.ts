import { PRICES } from '../pricing.ts';
import { tx, type FieldSpec, type ServiceDef } from '../types.ts';
import { bool, gbPerMonth, hours, line, millionsPerMonth, num, p, str, total } from '../util.ts';

const storageField = (def: number): FieldSpec => ({
  key: 'storageGB',
  kind: 'number',
  label: tx('Data stored', 'Dung lượng dữ liệu'),
  min: 1,
  max: 1_000_000,
  step: 10,
  unit: 'GB',
  default: def,
});

/**
 * Capacity of a primary + read replicas setup, expressed in "total rps" so the
 * engine can compute utilisation as load / capacity. The busiest instance is
 * the primary: it takes every write plus its share of reads.
 */
export function replicatedCapacity(peak: { r: number; w: number }, perInstance: number, replicas: number) {
  const busiest = peak.w + peak.r / (replicas + 1);
  const t = peak.r + peak.w;
  return busiest <= 0 ? perInstance * (replicas + 1) : (t * perInstance) / busiest;
}

export const rds: ServiceDef = {
  id: 'rds',
  name: 'Amazon RDS',
  short: 'RDS',
  category: 'database',
  behavior: 'db',
  icon: 'database',
  equivalents: { azure: 'Azure Database for PostgreSQL/MySQL', gcp: 'Cloud SQL' },
  description: tx(
    'Managed relational database (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle). Backups, patching and failover handled for you.',
    'Database quan hệ được quản lý (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle). Backup, vá lỗi và failover được lo sẵn.',
  ),
  docs: {
    whenToUse: [
      tx('Relational data with joins, transactions and constraints.', 'Dữ liệu quan hệ cần join, transaction và ràng buộc.'),
      tx('Most business apps start here.', 'Phần lớn ứng dụng nghiệp vụ nên bắt đầu từ đây.'),
    ],
    whenNotTo: [
      tx('Massive write throughput or unpredictable spikes on simple key lookups → DynamoDB.', 'Lượng ghi cực lớn hoặc tăng đột biến khó đoán cho truy vấn theo key đơn giản → DynamoDB.'),
    ],
    pros: [tx('SQL, joins, ACID transactions.', 'SQL, join, transaction ACID.'), tx('Read replicas for read scaling.', 'Read replica để scale việc đọc.')],
    cons: [
      tx('Writes scale only vertically (bigger instance).', 'Ghi chỉ scale theo chiều dọc (instance lớn hơn).'),
      tx('Multi-AZ doubles the instance cost.', 'Multi-AZ làm chi phí instance tăng gấp đôi.'),
    ],
    pitfalls: [
      tx('Single-AZ in production: an AZ outage takes your database down.', 'Dùng Single-AZ cho production: sự cố một AZ là database sập theo.'),
      tx('Read replicas are asynchronous — reads may be slightly stale.', 'Read replica là bất đồng bộ — dữ liệu đọc có thể hơi cũ.'),
    ],
    pricing: tx(
      'Per instance-hour (×2 with Multi-AZ) + storage (~$0.115/GB-month gp3) + backups beyond the DB size.',
      'Theo giờ chạy instance (×2 khi bật Multi-AZ) + lưu trữ (~$0.115/GB-tháng gp3) + backup vượt quá dung lượng DB.',
    ),
  },
  fields: [
    {
      key: 'engine',
      kind: 'select',
      label: tx('Engine', 'Engine'),
      options: [
        { value: 'postgres', label: 'PostgreSQL' },
        { value: 'mysql', label: 'MySQL' },
      ],
      default: 'postgres',
    },
    {
      key: 'instanceClass',
      kind: 'select',
      label: tx('Instance class', 'Loại instance'),
      options: Object.keys(PRICES.rds.hourly).map((k) => ({
        value: k,
        label: `${k} — $${PRICES.rds.hourly[k]}/h, ~${PRICES.rds.rpsPerInstance[k]} qps`,
      })),
      default: 'db.t3.medium',
    },
    {
      key: 'multiAz',
      kind: 'toggle',
      label: tx('Multi-AZ (standby)', 'Multi-AZ (standby)'),
      help: tx('Synchronous standby in a second AZ, automatic failover in ~1–2 min.', 'Standby đồng bộ ở AZ thứ hai, tự failover trong ~1–2 phút.'),
      default: false,
    },
    { key: 'replicas', kind: 'number', label: tx('Read replicas', 'Read replica'), min: 0, max: 5, step: 1, default: 0 },
    storageField(100),
  ],
  model: (ctx) => {
    const cls = str(ctx, 'instanceClass', 'db.t3.medium');
    const multi = bool(ctx, 'multiAz');
    const replicas = num(ctx, 'replicas', 0);
    const hourly = PRICES.rds.hourly[cls] ?? 0.068;
    const storage = num(ctx, 'storageGB', 100);
    return {
      capacityRps: replicatedCapacity(ctx.peak, PRICES.rds.rpsPerInstance[cls] ?? 800, replicas),
      baseLatencyMs: 5,
      availability: multi ? 0.9995 : 0.995,
      azLayout: multi ? 'multi-az' : 'single-az',
      costs: [
        line(
          multi ? `Primary + standby (${cls})` : `Primary (${cls})`,
          multi ? `Primary + standby (${cls})` : `Primary (${cls})`,
          p(ctx, hourly * hours * (multi ? 2 : 1)),
          'compute',
        ),
        ...(replicas > 0
          ? [line(`${replicas}× read replica`, `${replicas}× read replica`, p(ctx, replicas * hourly * hours), 'compute')]
          : []),
        line(
          `Storage ${storage} GB`,
          `Lưu trữ ${storage} GB`,
          p(ctx, storage * PRICES.rds.storagePerGBMonth * (multi ? 2 : 1) * (1 + replicas)),
          'storage',
        ),
      ],
      summary: `${cls}${multi ? ' · Multi-AZ' : ''}${replicas ? ` · ${replicas}R` : ''}`,
      instances: (multi ? 2 : 1) + replicas,
    };
  },
};

export const aurora: ServiceDef = {
  id: 'aurora',
  name: 'Amazon Aurora',
  short: 'Aurora',
  category: 'database',
  behavior: 'db',
  icon: 'database-zap',
  equivalents: { azure: 'Azure Cosmos DB for PostgreSQL / Hyperscale', gcp: 'AlloyDB' },
  description: tx(
    'AWS-built MySQL/PostgreSQL-compatible database: storage replicated 6 ways across 3 AZs, up to 15 low-lag replicas, fast failover.',
    'Database tương thích MySQL/PostgreSQL do AWS xây: storage nhân bản 6 bản trên 3 AZ, tối đa 15 replica độ trễ thấp, failover nhanh.',
  ),
  docs: {
    whenToUse: [
      tx('High availability and read scaling beyond what RDS gives.', 'Cần độ sẵn sàng và khả năng scale đọc vượt mức RDS cho phép.'),
      tx('Large databases where storage auto-growth matters.', 'Database lớn, cần storage tự tăng dung lượng.'),
    ],
    whenNotTo: [tx('Small/dev databases — RDS on a t3 instance is much cheaper.', 'Database nhỏ hoặc môi trường dev — RDS trên instance t3 rẻ hơn nhiều.')],
    pros: [tx('Failover in ~30 s to a replica.', 'Failover sang replica trong ~30 giây.'), tx('Storage is always multi-AZ.', 'Storage luôn multi-AZ.')],
    cons: [tx('Smallest production instances cost more than RDS.', 'Instance production nhỏ nhất vẫn đắt hơn RDS.'), tx('I/O charges (Standard) can surprise you.', 'Phí I/O (bản Standard) có thể gây bất ngờ.')],
    pitfalls: [tx('Zero replicas: failover means creating a new instance (minutes).', 'Không có replica: failover nghĩa là phải tạo instance mới (mất vài phút).')],
    pricing: tx('Per instance-hour (writer + replicas) + ~$0.10/GB-month + ~$0.20 per million I/O.', 'Theo giờ chạy instance (writer + replica) + ~$0.10/GB-tháng + ~$0.20 mỗi triệu I/O.'),
  },
  fields: [
    {
      key: 'instanceClass',
      kind: 'select',
      label: tx('Instance class', 'Loại instance'),
      options: Object.keys(PRICES.aurora.hourly).map((k) => ({
        value: k,
        label: `${k} — $${PRICES.aurora.hourly[k]}/h, ~${PRICES.aurora.rpsPerInstance[k]} qps`,
      })),
      default: 'db.r6g.large',
    },
    {
      key: 'replicas',
      kind: 'number',
      label: tx('Aurora replicas', 'Aurora replica'),
      help: tx('Also the failover targets. ≥ 1 for high availability.', 'Cũng là đích failover. Cần ≥ 1 để có độ sẵn sàng cao.'),
      min: 0,
      max: 15,
      step: 1,
      default: 1,
    },
    storageField(200),
  ],
  model: (ctx) => {
    const cls = str(ctx, 'instanceClass', 'db.r6g.large');
    const replicas = num(ctx, 'replicas', 1);
    const hourly = PRICES.aurora.hourly[cls] ?? 0.26;
    const storage = num(ctx, 'storageGB', 200);
    const ioM = millionsPerMonth(ctx.avg.w + 0.2 * ctx.avg.r);
    return {
      capacityRps: replicatedCapacity(ctx.peak, PRICES.aurora.rpsPerInstance[cls] ?? 4000, replicas),
      baseLatencyMs: 4,
      availability: replicas >= 1 ? 0.9999 : 0.999,
      azLayout: replicas >= 1 ? 'multi-az' : 'single-az',
      costs: [
        line(`${1 + replicas}× ${cls}`, `${1 + replicas}× ${cls}`, p(ctx, (1 + replicas) * hourly * hours), 'compute'),
        line(`Storage ${storage} GB`, `Lưu trữ ${storage} GB`, p(ctx, storage * PRICES.aurora.storagePerGBMonth), 'storage'),
        line('I/O requests', 'Request I/O', p(ctx, ioM * PRICES.aurora.perMillionIO), 'requests'),
      ],
      summary: `${cls} · ${replicas}R`,
      instances: 1 + replicas,
    };
  },
};

export const dynamodb: ServiceDef = {
  id: 'dynamodb',
  name: 'Amazon DynamoDB',
  short: 'DynamoDB',
  category: 'database',
  behavior: 'db',
  icon: 'table',
  equivalents: { azure: 'Cosmos DB', gcp: 'Firestore / Bigtable' },
  description: tx(
    'Serverless key-value / document database. Single-digit-ms latency at any scale, pay per request or provisioned capacity.',
    'Database key-value / document dạng serverless. Độ trễ vài ms ở mọi quy mô, trả theo request hoặc capacity đặt trước.',
  ),
  docs: {
    whenToUse: [
      tx('Known access patterns by key (user profile, sessions, carts, IoT events).', 'Mẫu truy cập biết trước theo key (hồ sơ user, session, giỏ hàng, sự kiện IoT).'),
      tx('Unpredictable spikes, serverless apps with Lambda.', 'Traffic tăng đột biến khó đoán, ứng dụng serverless với Lambda.'),
    ],
    whenNotTo: [
      tx('Ad-hoc queries, joins, reporting → relational DB or analytics store.', 'Truy vấn tuỳ ý, join, báo cáo → DB quan hệ hoặc kho phân tích.'),
      tx('Access patterns you do not know yet.', 'Mẫu truy cập mà bạn chưa biết trước.'),
    ],
    pros: [tx('No servers, multi-AZ built in, 99.99% SLA.', 'Không có server, sẵn multi-AZ, SLA 99.99%.'), tx('Scales horizontally almost without limit.', 'Scale ngang gần như không giới hạn.')],
    cons: [tx('Data model must follow access patterns.', 'Mô hình dữ liệu phải đi theo mẫu truy cập.'), tx('Scans are slow and expensive.', 'Scan vừa chậm vừa đắt.')],
    pitfalls: [
      tx('Hot partitions: one popular key gets throttled.', 'Hot partition: một key quá phổ biến sẽ bị throttle.'),
      tx('Large items: cost grows per 1 KB written / 4 KB read.', 'Item lớn: chi phí tăng theo mỗi 1 KB ghi / 4 KB đọc.'),
    ],
    pricing: tx(
      'On-demand: ~$0.625 per million writes, ~$0.125 per million reads; or provisioned RCU/WCU per hour. Storage ~$0.25/GB-month.',
      'On-demand: ~$0.625 mỗi triệu lượt ghi, ~$0.125 mỗi triệu lượt đọc; hoặc RCU/WCU đặt trước theo giờ. Lưu trữ ~$0.25/GB-tháng.',
    ),
  },
  fields: [
    {
      key: 'mode',
      kind: 'select',
      label: tx('Capacity mode', 'Chế độ capacity'),
      options: [
        { value: 'on-demand', label: 'On-demand' },
        { value: 'provisioned', label: 'Provisioned' },
      ],
      default: 'on-demand',
    },
    { key: 'rcu', kind: 'number', label: tx('Read capacity units', 'Read capacity unit'), min: 1, max: 100000, step: 50, default: 500 },
    { key: 'wcu', kind: 'number', label: tx('Write capacity units', 'Write capacity unit'), min: 1, max: 100000, step: 50, default: 200 },
    storageField(50),
  ],
  model: (ctx) => {
    const kb = ctx.scenario.payloadKB;
    const ruPerRead = Math.ceil(kb / 4) * 0.5; // eventually consistent
    const wuPerWrite = Math.ceil(kb);
    const storage = num(ctx, 'storageGB', 50);
    const provisioned = str(ctx, 'mode') === 'provisioned';
    const storageLine = line(`Storage ${storage} GB`, `Lưu trữ ${storage} GB`, p(ctx, storage * PRICES.dynamodb.storagePerGBMonth), 'storage');
    if (!provisioned) {
      return {
        capacityRps: Infinity,
        baseLatencyMs: 6,
        availability: 0.9999,
        azLayout: 'regional',
        costs: [
          line('Read requests', 'Request đọc', p(ctx, millionsPerMonth(ctx.avg.r) * ruPerRead * PRICES.dynamodb.onDemandPerMillionReads), 'requests'),
          line('Write requests', 'Request ghi', p(ctx, millionsPerMonth(ctx.avg.w) * wuPerWrite * PRICES.dynamodb.onDemandPerMillionWrites), 'requests'),
          storageLine,
        ],
        summary: 'on-demand',
      };
    }
    const rcu = num(ctx, 'rcu', 500);
    const wcu = num(ctx, 'wcu', 200);
    const rho = Math.max((ctx.peak.r * ruPerRead) / rcu, (ctx.peak.w * wuPerWrite) / wcu);
    const t = total(ctx.peak);
    return {
      capacityRps: rho > 0 ? t / rho : Infinity,
      baseLatencyMs: 6,
      availability: 0.9999,
      azLayout: 'regional',
      costs: [
        line(`${rcu} RCU`, `${rcu} RCU`, p(ctx, rcu * PRICES.dynamodb.rcuHour * hours), 'requests'),
        line(`${wcu} WCU`, `${wcu} WCU`, p(ctx, wcu * PRICES.dynamodb.wcuHour * hours), 'requests'),
        storageLine,
      ],
      summary: `${rcu} RCU · ${wcu} WCU`,
    };
  },
};

export const elasticache: ServiceDef = {
  id: 'elasticache',
  name: 'Amazon ElastiCache',
  short: 'ElastiCache',
  category: 'database',
  behavior: 'cache',
  icon: 'zap',
  equivalents: { azure: 'Azure Cache for Redis', gcp: 'Memorystore' },
  description: tx(
    'In-memory cache (Valkey/Redis/Memcached). Sub-millisecond reads that take load off your database.',
    'Cache trong bộ nhớ (Valkey/Redis/Memcached). Đọc dưới 1 ms, giảm tải cho database.',
  ),
  docs: {
    whenToUse: [
      tx('Read-heavy workloads hitting the same data repeatedly.', 'Workload đọc nhiều, lặp lại trên cùng một dữ liệu.'),
      tx('Sessions, leaderboards, rate limiting.', 'Session, bảng xếp hạng, rate limiting.'),
    ],
    whenNotTo: [tx('Write-heavy data or data read only once.', 'Dữ liệu ghi nhiều hoặc chỉ được đọc một lần.')],
    pros: [tx('Huge throughput per node.', 'Throughput cực lớn trên mỗi node.'), tx('Can let you use a much smaller database.', 'Có thể giúp bạn dùng database nhỏ hơn nhiều.')],
    cons: [tx('Cache invalidation and stale data are now your problem.', 'Invalidation cache và dữ liệu cũ giờ là việc của bạn.')],
    pitfalls: [
      tx('Cache stampede: many misses at once after expiry overload the DB.', 'Cache stampede: nhiều miss cùng lúc sau khi hết hạn làm quá tải DB.'),
      tx('No replica = losing the node empties the cache and hammers the DB.', 'Không có replica = mất node là cache trống trơn và DB bị dội tải.'),
    ],
    pricing: tx('Per node-hour (each replica is another node).', 'Theo giờ chạy node (mỗi replica là một node nữa).'),
  },
  fields: [
    {
      key: 'nodeType',
      kind: 'select',
      label: tx('Node type', 'Loại node'),
      options: Object.keys(PRICES.elasticache.hourly).map((k) => ({ value: k, label: `${k} — $${PRICES.elasticache.hourly[k]}/h` })),
      default: 'cache.t3.medium',
    },
    { key: 'replicas', kind: 'number', label: tx('Replicas', 'Replica'), help: tx('≥ 1 for Multi-AZ failover.', '≥ 1 để có failover Multi-AZ.'), min: 0, max: 5, step: 1, default: 1 },
    {
      key: 'hitRatio',
      kind: 'number',
      label: tx('Cache hit ratio', 'Tỉ lệ cache hit'),
      help: tx('Share of reads answered by the cache; misses go to the database.', 'Tỉ lệ lượt đọc được cache trả lời; miss sẽ đi xuống database.'),
      min: 0,
      max: 0.99,
      step: 0.05,
      default: 0.85,
    },
  ],
  model: (ctx) => {
    const type = str(ctx, 'nodeType', 'cache.t3.medium');
    const replicas = num(ctx, 'replicas', 1);
    return {
      capacityRps: (PRICES.elasticache.rpsPerNode[type] ?? 50000) * (1 + replicas),
      baseLatencyMs: 1,
      availability: replicas >= 1 ? 0.9999 : 0.999,
      azLayout: replicas >= 1 ? 'multi-az' : 'single-az',
      costs: [line(`${1 + replicas}× ${type}`, `${1 + replicas}× ${type}`, p(ctx, (1 + replicas) * (PRICES.elasticache.hourly[type] ?? 0.068) * hours), 'compute')],
      summary: `${type} · hit ${Math.round(num(ctx, 'hitRatio', 0.85) * 100)}%`,
      instances: 1 + replicas,
    };
  },
};

export const s3: ServiceDef = {
  id: 's3',
  name: 'Amazon S3',
  short: 'S3',
  category: 'storage',
  behavior: 'object',
  icon: 'archive',
  equivalents: { azure: 'Blob Storage', gcp: 'Cloud Storage' },
  description: tx(
    'Object storage with 11 nines of durability. Files, images, backups, data lakes, static websites.',
    'Lưu trữ object với độ bền 11 số 9. File, ảnh, backup, data lake, website tĩnh.',
  ),
  docs: {
    whenToUse: [
      tx('Any files/blobs: uploads, media, logs, backups.', 'Mọi loại file/blob: upload, media, log, backup.'),
      tx('Static website or asset origin behind CloudFront.', 'Website tĩnh hoặc origin cho asset đứng sau CloudFront.'),
    ],
    whenNotTo: [tx('Low-latency random updates inside a file → EBS/EFS or a database.', 'Cập nhật ngẫu nhiên, độ trễ thấp bên trong một file → EBS/EFS hoặc database.')],
    pros: [tx('Practically unlimited, very cheap per GB.', 'Gần như vô hạn, mỗi GB rất rẻ.'), tx('Storage classes and lifecycle rules cut cost further.', 'Storage class và lifecycle rule giúp giảm chi phí thêm.')],
    cons: [tx('Request charges add up for many tiny objects.', 'Phí request cộng dồn nhanh khi có rất nhiều object nhỏ.')],
    pitfalls: [
      tx('Serving files to the internet directly from S3: egress at full price — put CloudFront in front.', 'Phục vụ file ra internet trực tiếp từ S3: egress tính giá đầy đủ — hãy đặt CloudFront phía trước.'),
      tx('Infrequent-access classes charge per GB retrieved — bad for hot data.', 'Các class truy cập không thường xuyên tính phí theo GB truy xuất — không hợp với dữ liệu nóng.'),
    ],
    pricing: tx(
      'Standard ~$0.023/GB-month; PUT $0.005 per 1,000; GET $0.0004 per 1,000. IA/Glacier cheaper to store, cost to retrieve.',
      'Standard ~$0.023/GB-tháng; PUT $0.005 mỗi 1.000; GET $0.0004 mỗi 1.000. IA/Glacier lưu rẻ hơn nhưng tốn phí khi truy xuất.',
    ),
  },
  fields: [
    {
      key: 'storageClass',
      kind: 'select',
      label: tx('Storage class', 'Storage class'),
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'intelligent-tiering', label: 'Intelligent-Tiering' },
        { value: 'standard-ia', label: 'Standard-IA' },
        { value: 'glacier-ir', label: 'Glacier Instant Retrieval' },
      ],
      default: 'standard',
    },
    storageField(500),
  ],
  model: (ctx) => {
    const cls = str(ctx, 'storageClass', 'standard');
    const storage = num(ctx, 'storageGB', 500);
    const readGB = gbPerMonth(ctx.avg.r, ctx.scenario.payloadKB);
    const retrieval = (PRICES.s3.retrievalPerGB[cls] ?? 0) * readGB;
    return {
      capacityRps: Infinity,
      baseLatencyMs: 25,
      availability: cls === 'standard' || cls === 'intelligent-tiering' ? 0.9999 : 0.999,
      azLayout: 'regional',
      costs: [
        line(`Storage ${storage} GB (${cls})`, `Lưu trữ ${storage} GB (${cls})`, p(ctx, storage * (PRICES.s3.storagePerGBMonth[cls] ?? 0.023)), 'storage'),
        line('GET requests', 'Request GET', p(ctx, (millionsPerMonth(ctx.avg.r) * 1000) * PRICES.s3.perThousandGet), 'requests'),
        line('PUT requests', 'Request PUT', p(ctx, (millionsPerMonth(ctx.avg.w) * 1000) * PRICES.s3.perThousandPut), 'requests'),
        ...(retrieval > 0 ? [line('Retrieval fees', 'Phí truy xuất', p(ctx, retrieval), 'transfer')] : []),
      ],
      summary: `${storage} GB · ${cls}`,
    };
  },
};
