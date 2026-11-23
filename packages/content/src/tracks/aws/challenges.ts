import { buildDesign, tx, type Scenario } from '@cloudlab/catalog';
import type { CanvasChallenge, Requirement } from '@cloudlab/exercise-kit';

/**
 * Canvas challenges. Thresholds are calibrated with `npm run challenges:report`
 * so that the starter fails, the reference passes, and there is room for other
 * reasonable solutions. Tests enforce this (content/src/index.test.ts).
 */

const scenario = (s: Partial<Scenario>): Scenario => ({
  rps: 100,
  peakMultiplier: 3,
  readRatio: 0.8,
  payloadKB: 5,
  region: 'us-east-1',
  ...s,
});

const usersOnly = (s: Scenario) => buildDesign([['users', 'users', 0, 1]], [], s);

const R = {
  cost: (max: number): Requirement => ({ type: 'metric', metric: 'monthlyUsd', op: '<=', value: max }),
  p95: (max: number): Requirement => ({ type: 'metric', metric: 'p95Ms', op: '<=', value: max }),
  availability: (min: number): Requirement => ({ type: 'metric', metric: 'availability', op: '>=', value: min }),
  errors: (max = 0.01): Requirement => ({ type: 'metric', metric: 'errorRate', op: '<=', value: max }),
  survivesAz: (): Requirement => ({
    type: 'survives',
    chaos: { azDown: true },
    label: tx('Keeps serving users when one Availability Zone goes down', 'Vẫn phục vụ người dùng khi một Availability Zone bị sập'),
  }),
  noErrors: (): Requirement => ({ type: 'no-findings', severity: 'error' }),
};

// ---------------------------------------------------------------------------

const staticSiteScenario = scenario({ rps: 30, peakMultiplier: 3, readRatio: 1, payloadKB: 50 });
export const staticSite: CanvasChallenge = {
  id: 'aws.lab.static-site',
  kind: 'canvas-design',
  skills: ['aws.foundations.lab', 'aws.edge.cloudfront'],
  title: tx('Your first design: a static website', 'Thiết kế đầu tiên: một website tĩnh'),
  brief: tx(
    'A marketing site (HTML, CSS, images) gets ~30 requests/second, ~50 KB each.\n\nBuild it without any servers: drag services from the left, connect them by dragging from one node\'s dot to another, and watch the price on the right.',
    'Một website giới thiệu (HTML, CSS, ảnh) nhận ~30 request/giây, mỗi request ~50 KB.\n\nHãy dựng nó mà không dùng server nào: kéo dịch vụ từ cột bên trái, nối chúng bằng cách kéo từ chấm tròn của node này sang node kia, và theo dõi giá ở bên phải.',
  ),
  scenario: staticSiteScenario,
  starter: usersOnly(staticSiteScenario),
  requirements: [
    { type: 'uses', services: ['s3'], label: tx('Files are stored in Amazon S3', 'File được lưu trên Amazon S3') },
    { type: 'uses', services: ['cloudfront'], label: tx('Served through the CloudFront CDN', 'Phục vụ qua CDN CloudFront') },
    {
      type: 'not-uses',
      services: ['ec2', 'fargate', 'eks', 'lambda'],
      label: tx('No servers or functions to manage', 'Không có server hay function nào phải quản lý'),
    },
    R.cost(450),
    R.noErrors(),
  ],
  hints: [
    tx('Static files belong in object storage. Which service is that?', 'File tĩnh nên nằm trong object storage. Dịch vụ nào làm việc đó?'),
    tx('Put a CDN between the users and the bucket so most requests never reach S3.', 'Đặt một CDN giữa người dùng và bucket để phần lớn request không bao giờ tới S3.'),
    tx('Users → CloudFront → S3 (optionally Route 53 in front for your domain).', 'Users → CloudFront → S3 (có thể thêm Route 53 phía trước cho tên miền).'),
  ],
  debrief: tx(
    'S3 + CloudFront is the standard static hosting pattern: no servers to patch, practically unlimited scale, and CloudFront serves ~95% of requests from the edge. Notice that almost all of the cost is data transfer out — for content-heavy sites, bandwidth is the bill.',
    'S3 + CloudFront là mẫu host website tĩnh chuẩn: không có server phải vá, scale gần như vô hạn, CloudFront phục vụ ~95% request ngay từ edge. Để ý rằng gần như toàn bộ chi phí là data transfer ra ngoài — với site nhiều nội dung, băng thông chính là hoá đơn.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['dns', 'route53', 1, 1],
      ['cdn', 'cloudfront', 2, 1, { hitRatio: 0.95 }],
      ['bucket', 's3', 3, 1, { storageGB: 20 }],
    ],
    ['users>dns', 'dns>cdn', 'cdn>bucket'],
    staticSiteScenario,
  ),
};

// ---------------------------------------------------------------------------

const sideProjectScenario = scenario({ rps: 1, peakMultiplier: 5, readRatio: 0.7, payloadKB: 4 });
export const sideProject: CanvasChallenge = {
  id: 'aws.compute.side-project-api',
  kind: 'canvas-design',
  skills: ['aws.compute.choosing', 'aws.compute.lambda'],
  title: tx('A side-project API for under $12/month', 'API cho dự án cá nhân dưới $12/tháng'),
  brief: tx(
    'Your hobby app has a JSON API with ~1 request/second on average (bursts up to 5×). Data is simple key lookups.\n\nDesign it so it costs less than $12/month, never errors at peak, and survives an AZ outage.',
    'App sở thích của bạn có một JSON API, trung bình ~1 request/giây (có lúc tăng gấp 5). Dữ liệu chỉ là tra cứu theo key đơn giản.\n\nHãy thiết kế sao cho tốn dưới $12/tháng, không lỗi lúc cao điểm, và chịu được sự cố một AZ.',
  ),
  scenario: sideProjectScenario,
  starter: usersOnly(sideProjectScenario),
  requirements: [R.cost(12), R.errors(), R.survivesAz(), R.availability(0.998), R.noErrors()],
  hints: [
    tx('Look at the fixed monthly cost of a load balancer and of an always-on instance.', 'Hãy xem chi phí cố định mỗi tháng của một load balancer và của một instance chạy liên tục.'),
    tx('At ~1 request/second, paying per request beats paying per hour.', 'Ở mức ~1 request/giây, trả tiền theo request rẻ hơn trả theo giờ.'),
    tx('API Gateway → Lambda → DynamoDB has no idle cost and is multi-AZ by default.', 'API Gateway → Lambda → DynamoDB không tốn tiền khi rảnh và mặc định đã multi-AZ.'),
  ],
  debrief: tx(
    'An ALB alone costs ~$17/month before any traffic, and an instance runs (and bills) 24/7. At low or spiky traffic, serverless wins: you pay per request and the managed services are already spread across AZs. The crossover comes at steady, high traffic — try raising the RPS in a free Lab and compare.',
    'Chỉ riêng một ALB đã tốn ~$17/tháng khi chưa có traffic nào, còn instance thì chạy (và tính tiền) 24/7. Với traffic thấp hoặc theo đợt, serverless thắng: bạn trả theo request, và các dịch vụ được quản lý đã sẵn trải trên nhiều AZ. Điểm giao nhau xuất hiện khi traffic cao và đều — hãy thử tăng RPS trong Lab tự do để so sánh.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1],
      ['fn', 'lambda', 2, 1, { memoryMB: '256', durationMs: 50 }],
      ['table', 'dynamodb', 3, 1, { storageGB: 1 }],
    ],
    ['users>api', 'api>fn', 'fn>table'],
    sideProjectScenario,
  ),
};

// ---------------------------------------------------------------------------

const singleServerScenario = scenario({ rps: 300, peakMultiplier: 3, readRatio: 0.8, payloadKB: 5 });
export const singleServer: CanvasChallenge = {
  id: 'aws.compute.single-server-to-ha',
  kind: 'canvas-fix',
  skills: ['aws.compute.autoscaling', 'aws.reliability.multi-az'],
  title: tx('From one server to highly available', 'Từ một server lên hệ thống sẵn sàng cao'),
  brief: tx(
    'A startup runs everything on ONE EC2 instance and a single-AZ database. Peak traffic (900 req/s) is coming and investors want it to survive an AZ outage.\n\nFix it: no errors at peak, survive an AZ failure, ≥ 99.9% availability, within budget.',
    'Một startup chạy mọi thứ trên MỘT instance EC2 và một database single-AZ. Đỉnh traffic (900 req/s) sắp tới và nhà đầu tư muốn hệ thống chịu được sự cố một AZ.\n\nHãy sửa: không lỗi lúc cao điểm, sống sót khi sập một AZ, availability ≥ 99,9%, trong ngân sách.',
  ),
  scenario: singleServerScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['app', 'ec2', 1, 1, { instanceType: 't3.medium', count: 1, multiAz: false }],
      ['db', 'rds', 2, 1, { instanceClass: 'db.t3.medium', multiAz: false }],
    ],
    ['users>app', 'app>db'],
    singleServerScenario,
  ),
  requirements: [
    R.errors(),
    R.survivesAz(),
    R.availability(0.999),
    { type: 'uses', services: ['alb', 'nlb'], label: tx('Traffic is spread by a load balancer', 'Traffic được chia bởi một load balancer') },
    R.cost(1000),
  ],
  hints: [
    tx('One instance can never survive its AZ failing. You need several, in different AZs.', 'Một instance không bao giờ sống sót khi AZ của nó sập. Bạn cần nhiều instance, ở các AZ khác nhau.'),
    tx('Several instances need something in front to spread traffic — and Auto Scaling handles the peak.', 'Nhiều instance thì cần một thứ đứng trước để chia traffic — và Auto Scaling lo phần cao điểm.'),
    tx('Users → ALB → EC2 (≥ 2, Auto Scaling, 2 AZs) → RDS with Multi-AZ. Check the database utilisation too — it receives every request.', 'Users → ALB → EC2 (≥ 2, Auto Scaling, 2 AZ) → RDS bật Multi-AZ. Nhớ xem cả mức tải của database — nó nhận mọi request.'),
  ],
  debrief: tx(
    'This is the canonical HA web tier: an ALB spanning AZs, an Auto Scaling group spread across ≥ 2 AZs (sized for peak, scaling in when quiet), and a Multi-AZ database with a synchronous standby. Try the Chaos menu: kill an AZ — without Auto Scaling the fleet loses half its capacity; with it, replacements launch in the healthy AZ (in real life after a few minutes, which is why critical systems also keep spare headroom: "static stability").',
    'Đây là tầng web HA kinh điển: ALB trải nhiều AZ, Auto Scaling group trải trên ≥ 2 AZ (đủ cho cao điểm, tự thu nhỏ khi vắng), và database Multi-AZ có standby đồng bộ. Thử menu Chaos: tắt một AZ — không có Auto Scaling thì fleet mất một nửa capacity; có Auto Scaling thì instance thay thế được bật ở AZ còn lại (ngoài thực tế mất vài phút, nên hệ thống quan trọng còn chừa sẵn dư địa: "static stability").',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 't3.medium', count: 2, autoscaling: true, maxCount: 10, multiAz: true }],
      ['db', 'rds', 3, 1, { instanceClass: 'db.r6g.large', multiAz: true }],
    ],
    ['users>lb', 'lb>app', 'app>db'],
    singleServerScenario,
  ),
};

// ---------------------------------------------------------------------------

const readHeavyScenario = scenario({ rps: 1500, peakMultiplier: 2, readRatio: 0.9, payloadKB: 1 });
export const readHeavy: CanvasChallenge = {
  id: 'aws.databases.read-heavy',
  kind: 'canvas-fix',
  skills: ['aws.databases.read-scaling', 'aws.caching.elasticache'],
  title: tx('The database is melting', 'Database đang "chảy"'),
  brief: tx(
    'A product catalogue API: 1,500 req/s (3,000 at peak), 90% reads. The app tier scales fine, but the database is overloaded and users see errors.\n\nFix it without exceeding the budget.',
    'Một API danh mục sản phẩm: 1.500 req/s (3.000 lúc cao điểm), 90% là đọc. Tầng app scale tốt, nhưng database bị quá tải và người dùng gặp lỗi.\n\nHãy sửa mà không vượt ngân sách.',
  ),
  scenario: readHeavyScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '1-2', count: 2, autoscaling: true, maxCount: 30, multiAz: true }],
      ['db', 'rds', 3, 1, { instanceClass: 'db.t3.medium', multiAz: true }],
    ],
    ['users>lb', 'lb>app', 'app>db'],
    readHeavyScenario,
  ),
  requirements: [R.errors(), R.p95(150), R.availability(0.999), R.cost(1100)],
  hints: [
    tx('Open the Review tab: which node is red, and what kind of traffic dominates?', 'Mở tab Đánh giá: node nào đang đỏ, và loại traffic nào chiếm đa số?'),
    tx('90% of requests read the same catalogue data again and again.', '90% request đọc đi đọc lại cùng một dữ liệu danh mục.'),
    tx('Add ElastiCache and connect the app to it (keep the DB connection). Compare with just buying a bigger DB.', 'Thêm ElastiCache và nối app tới nó (giữ kết nối tới DB). So sánh với việc chỉ mua DB lớn hơn.'),
  ],
  debrief: tx(
    'A cache with a high hit ratio removes most reads from the database, so a small DB is enough — usually far cheaper than scaling the database up. Read replicas are the other option (good when data must be fresher or queries are complex). The trade-off: cached data can be slightly stale and you must think about invalidation.',
    'Cache có hit ratio cao loại bỏ phần lớn lượt đọc khỏi database, nên DB nhỏ là đủ — thường rẻ hơn nhiều so với nâng cấp database. Read replica là lựa chọn còn lại (hợp khi dữ liệu cần mới hơn hoặc truy vấn phức tạp). Đánh đổi: dữ liệu cache có thể hơi cũ và bạn phải tính tới invalidation.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '1-2', count: 2, autoscaling: true, maxCount: 30, multiAz: true }],
      ['cache', 'elasticache', 3, 0, { nodeType: 'cache.t3.medium', replicas: 1, hitRatio: 0.9 }],
      ['db', 'rds', 3, 2, { instanceClass: 'db.t3.medium', multiAz: true }],
    ],
    ['users>lb', 'lb>app', 'app>cache', 'app>db'],
    readHeavyScenario,
  ),
};

// ---------------------------------------------------------------------------

const natScenario = scenario({ rps: 200, peakMultiplier: 2, readRatio: 0.5, payloadKB: 20 });
export const natTrap: CanvasChallenge = {
  id: 'aws.networking.nat-trap',
  kind: 'canvas-fix',
  skills: ['aws.networking.nat', 'aws.networking.vpc-endpoints', 'aws.cost.data-transfer'],
  title: tx('The mysterious NAT bill', 'Hoá đơn NAT bí ẩn'),
  brief: tx(
    'An image service in private subnets reads and writes objects in S3. The finance team asks why "NAT Gateway" is one of the biggest lines on the bill.\n\nRemove the trap and bring the cost down.',
    'Một service xử lý ảnh trong private subnet đọc và ghi object vào S3. Phòng tài chính hỏi tại sao "NAT Gateway" là một trong những dòng lớn nhất trên hoá đơn.\n\nHãy gỡ cái bẫy này và giảm chi phí.',
  ),
  scenario: natScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 'm6i.large', count: 2, autoscaling: true, maxCount: 6, multiAz: true }],
      ['nat', 'nat', 3, 1],
      ['bucket', 's3', 4, 1, { storageGB: 2000 }],
    ],
    ['users>lb', 'lb>app', 'app>nat', 'nat>bucket'],
    natScenario,
  ),
  requirements: [
    {
      type: 'no-finding',
      prefix: 'nat-to-aws',
      label: tx('S3 traffic no longer goes through the NAT Gateway', 'Traffic tới S3 không còn đi qua NAT Gateway'),
    },
    { type: 'uses', services: ['s3'], label: tx('Objects still live in S3', 'Object vẫn nằm trên S3') },
    R.errors(),
    R.cost(3000),
  ],
  hints: [
    tx('Open the cost tab and expand the NAT Gateway line. What are you paying per GB for?', 'Mở tab Chi phí và mở rộng dòng NAT Gateway. Bạn đang trả tiền theo GB cho cái gì?'),
    tx('There is a way for private subnets to reach S3 without NAT, and it is free.', 'Có một cách để private subnet tới được S3 mà không cần NAT, và nó miễn phí.'),
    tx('Replace NAT with a VPC Endpoint (Gateway type): App → VPC Endpoint → S3.', 'Thay NAT bằng VPC Endpoint (loại Gateway): App → VPC Endpoint → S3.'),
  ],
  debrief: tx(
    'NAT Gateways charge ~$0.045 for every GB they process — on top of the hourly fee. A Gateway VPC Endpoint for S3 (and DynamoDB) is free and keeps the traffic on the AWS network. This is one of the most common surprise line items on real AWS bills.',
    'NAT Gateway tính ~$0.045 cho mỗi GB nó xử lý — cộng thêm phí theo giờ. Gateway VPC Endpoint cho S3 (và DynamoDB) miễn phí và giữ traffic trong mạng AWS. Đây là một trong những dòng chi phí "bất ngờ" phổ biến nhất trên hoá đơn AWS thật.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 'm6i.large', count: 2, autoscaling: true, maxCount: 6, multiAz: true }],
      ['vpce', 'vpce', 3, 1, { type: 'gateway' }],
      ['bucket', 's3', 4, 1, { storageGB: 2000 }],
    ],
    ['users>lb', 'lb>app', 'app>vpce', 'vpce>bucket'],
    natScenario,
  ),
};

// ---------------------------------------------------------------------------

const CDN_BUDGET = 13000;
const cdnScenario = scenario({ rps: 2000, peakMultiplier: 3, readRatio: 0.95, payloadKB: 10 });
export const cdnOffload: CanvasChallenge = {
  id: 'aws.caching.cdn-offload',
  kind: 'canvas-fix',
  skills: ['aws.edge.cloudfront', 'aws.caching.offload'],
  title: tx('Fast news for everyone', 'Tin tức nhanh cho mọi người'),
  brief: tx(
    'A news site: 2,000 req/s (6,000 at breaking-news peaks), 95% are reads of the same articles. The EC2 fleet hits its Auto Scaling maximum, users get errors, and the product team wants a p95 latency under 60 ms.\n\nFix the errors AND the latency within budget.',
    'Một trang tin tức: 2.000 req/s (6.000 lúc có tin nóng), 95% là đọc cùng các bài viết. Fleet EC2 chạm mức tối đa của Auto Scaling, người dùng gặp lỗi, và team sản phẩm muốn độ trễ p95 dưới 60 ms.\n\nHãy sửa cả lỗi LẪN độ trễ trong ngân sách.',
  ),
  scenario: cdnScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 't3.medium', count: 4, autoscaling: true, maxCount: 12, multiAz: true }],
      ['db', 'dynamodb', 3, 1],
    ],
    ['users>lb', 'lb>app', 'app>db'],
    cdnScenario,
  ),
  requirements: [R.errors(), R.p95(60), R.cost(CDN_BUDGET)],
  hints: [
    tx('Raising the Auto Scaling maximum fixes the errors — but check the p95. Where does the time go?', 'Tăng mức tối đa của Auto Scaling sẽ hết lỗi — nhưng hãy xem p95. Thời gian bị tiêu ở đâu?'),
    tx('Most requests ask for the same article. Who could answer them before they reach your servers?', 'Phần lớn request hỏi cùng một bài viết. Ai có thể trả lời chúng trước khi tới server của bạn?'),
    tx('Put CloudFront in front of the load balancer and set a realistic hit ratio (~0.9 for news).', 'Đặt CloudFront trước load balancer và đặt hit ratio thực tế (~0.9 cho tin tức).'),
    tx('Users → CloudFront → ALB → EC2 → DynamoDB.', 'Users → CloudFront → ALB → EC2 → DynamoDB.'),
  ],
  debrief: tx(
    'With CloudFront answering ~90% of reads at the edge, the origin only sees cache misses and writes — the fleet has plenty of headroom, and users get much lower latency. But open the cost tab: with billions of small requests, CloudFront’s per-request fee is a big line — a CDN is not automatically cheaper. It shines for latency, origin offload, large or static content and spike protection (heavy users also get flat-rate/savings plans).',
    'Khi CloudFront trả lời ~90% lượt đọc ngay ở edge, origin chỉ còn thấy cache miss và lượt ghi — fleet dư sức, và người dùng có độ trễ thấp hơn hẳn. Nhưng hãy mở tab Chi phí: với hàng tỉ request nhỏ, phí theo request của CloudFront là một dòng lớn — CDN không tự động rẻ hơn. Nó toả sáng ở độ trễ, giảm tải cho origin, nội dung lớn hoặc tĩnh và chống các đợt tăng vọt (người dùng lớn còn có gói giá cố định/tiết kiệm).',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['cdn', 'cloudfront', 1, 1, { hitRatio: 0.9 }],
      ['lb', 'alb', 2, 1],
      ['app', 'ec2', 3, 1, { instanceType: 't3.medium', count: 2, autoscaling: true, maxCount: 12, multiAz: true }],
      ['db', 'dynamodb', 4, 1],
    ],
    ['users>cdn', 'cdn>lb', 'lb>app', 'app>db'],
    cdnScenario,
  ),
};

// ---------------------------------------------------------------------------

const flashSaleScenario = scenario({ rps: 150, peakMultiplier: 10, readRatio: 0, payloadKB: 2 });
export const flashSale: CanvasChallenge = {
  id: 'aws.messaging.flash-sale',
  kind: 'canvas-fix',
  skills: ['aws.messaging.sqs', 'aws.messaging.load-levelling'],
  title: tx('Surviving the flash sale', 'Sống sót qua flash sale'),
  brief: tx(
    'An order API normally takes 150 orders/second, but a flash sale brings 10× spikes. Every order is written straight into the database, which collapses at peak.\n\nAccept every order at peak, without paying for a database sized for the spike.',
    'Một API đặt hàng bình thường nhận 150 đơn/giây, nhưng flash sale đẩy lên gấp 10 lần. Mỗi đơn được ghi thẳng vào database, và database sập lúc cao điểm.\n\nHãy nhận được mọi đơn lúc cao điểm, mà không phải trả tiền cho một database đủ lớn cho đợt tăng vọt.',
  ),
  scenario: flashSaleScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1],
      ['fn', 'lambda', 2, 1, { durationMs: 60 }, 'Place order'],
      ['db', 'rds', 3, 1, { instanceClass: 'db.t3.medium', multiAz: true }],
    ],
    ['users>api', 'api>fn', 'fn>db'],
    flashSaleScenario,
  ),
  requirements: [
    R.errors(),
    { type: 'uses', services: ['sqs'], label: tx('Orders are buffered in a queue', 'Đơn hàng được đệm trong một queue') },
    { type: 'not-uses', services: ['aurora'], label: tx('Keeps the existing RDS database', 'Giữ nguyên database RDS hiện có') },
    R.cost(1700),
  ],
  hints: [
    tx('Does the order have to be in the database before you reply "order received"?', 'Đơn hàng có nhất thiết phải vào database trước khi bạn trả lời "đã nhận đơn" không?'),
    tx('A queue absorbs the spike; a worker drains it at a steady pace the DB can handle.', 'Queue hấp thụ đợt tăng vọt; một worker rút dần với nhịp đều mà DB chịu được.'),
    tx('Place order (Lambda) → SQS → worker Lambda → RDS. Remove the direct Lambda → RDS connection.', 'Place order (Lambda) → SQS → Lambda worker → RDS. Bỏ kết nối trực tiếp Lambda → RDS.'),
  ],
  debrief: tx(
    'Queue-based load levelling: the API only enqueues (fast, cheap, scales almost infinitely) and the worker writes to the database at the average rate. The trade-off is eventual consistency — the order is "accepted" before it is stored, so the worker must be idempotent and you need a dead-letter queue for failures.',
    'Load levelling bằng queue: API chỉ việc đẩy vào queue (nhanh, rẻ, scale gần như vô hạn), còn worker ghi vào database theo nhịp trung bình. Đánh đổi là eventual consistency — đơn được "nhận" trước khi được lưu, nên worker phải idempotent và bạn cần một dead-letter queue cho các lỗi.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1],
      ['fn', 'lambda', 2, 1, { durationMs: 30 }, 'Place order'],
      ['q', 'sqs', 3, 0],
      ['worker', 'lambda', 4, 0, { durationMs: 60 }, 'Save order'],
      ['db', 'rds', 4, 2, { instanceClass: 'db.t3.medium', multiAz: true }],
    ],
    ['users>api', 'api>fn', 'fn>q', 'q>worker', 'worker>db'],
    flashSaleScenario,
  ),
};

// ---------------------------------------------------------------------------

const ninesScenario = scenario({ rps: 100, peakMultiplier: 3, readRatio: 0.8, payloadKB: 5 });
export const fourNines: CanvasChallenge = {
  id: 'aws.reliability.three-and-a-half-nines',
  kind: 'canvas-design',
  skills: ['aws.reliability.availability-math', 'aws.reliability.multi-az'],
  title: tx('Hit 99.95% availability', 'Đạt availability 99,95%'),
  brief: tx(
    'A payments status API (100 req/s) promises customers 99.95% availability — at most ~22 minutes of downtime a month.\n\nDesign it from scratch. Remember: availabilities of things in series multiply.',
    'Một API trạng thái thanh toán (100 req/s) cam kết với khách hàng availability 99,95% — tối đa ~22 phút downtime mỗi tháng.\n\nHãy thiết kế từ đầu. Nhớ rằng: availability của các thành phần nối tiếp nhau sẽ nhân với nhau.',
  ),
  scenario: ninesScenario,
  starter: usersOnly(ninesScenario),
  requirements: [R.availability(0.9995), R.survivesAz(), R.errors(), R.cost(500), R.noErrors()],
  hints: [
    tx('Look at each component\'s availability: API Gateway and Lambda are 99.95% each — two in a row are already below target.', 'Xem availability của từng thành phần: API Gateway và Lambda mỗi cái 99,95% — hai cái nối tiếp đã thấp hơn mục tiêu.'),
    tx('RDS Multi-AZ is 99.95% on its own, so anything in front of it pulls you below. Which database offers 99.99%?', 'Riêng RDS Multi-AZ đã là 99,95%, nên bất cứ thứ gì đứng trước nó cũng kéo bạn xuống dưới mục tiêu. Database nào cho 99,99%?'),
    tx('ALB (99.99%) → EC2 in 2 AZs (redundant ≈ 100%) → DynamoDB (99.99%).', 'ALB (99,99%) → EC2 trên 2 AZ (dự phòng ≈ 100%) → DynamoDB (99,99%).'),
  ],
  debrief: tx(
    'Serial availability multiplies: 99.99% × 99.99% ≈ 99.98%, but 99.95% × 99.95% ≈ 99.90%. Redundancy (several instances across AZs) pushes a tier close to 100%, so the weakest single component sets your ceiling. In real life, SLAs are lower bounds — but the arithmetic is exactly how architects reason about it.',
    'Availability nối tiếp sẽ nhân: 99,99% × 99,99% ≈ 99,98%, còn 99,95% × 99,95% ≈ 99,90%. Dự phòng (nhiều instance trên nhiều AZ) đẩy một tầng lên gần 100%, nên thành phần đơn lẻ yếu nhất quyết định trần của bạn. Ngoài thực tế, SLA là cận dưới — nhưng phép tính này đúng là cách các kiến trúc sư lập luận.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 't3.medium', count: 2, autoscaling: true, maxCount: 4, multiAz: true }],
      ['db', 'dynamodb', 3, 1, { storageGB: 10 }],
    ],
    ['users>lb', 'lb>app', 'app>db'],
    ninesScenario,
  ),
};

// ---------------------------------------------------------------------------

const overprovScenario = scenario({ rps: 100, peakMultiplier: 2, readRatio: 0.8, payloadKB: 5 });
export const cutTheBill: CanvasChallenge = {
  id: 'aws.cost.cut-the-bill',
  kind: 'canvas-fix',
  skills: ['aws.cost.rightsizing', 'aws.cost.savings-plans'],
  title: tx('Cut the bill by more than 60%', 'Cắt giảm hơn 60% hoá đơn'),
  brief: tx(
    'A team sized everything "just in case": huge instances, a big database with replicas, a large cache — for only 100 req/s.\n\nCut the monthly bill below the target while keeping it reliable: no errors at peak, survives an AZ outage, ≥ 99.9% availability.',
    'Một team chọn mọi thứ "cho chắc": instance khổng lồ, database lớn kèm replica, cache to — cho vỏn vẹn 100 req/s.\n\nHãy cắt hoá đơn hằng tháng xuống dưới mục tiêu mà vẫn tin cậy: không lỗi lúc cao điểm, chịu được sự cố một AZ, availability ≥ 99,9%.',
  ),
  scenario: overprovScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 'm6i.2xlarge', count: 4, autoscaling: false, multiAz: true }],
      ['cache', 'elasticache', 3, 0, { nodeType: 'cache.r6g.large', replicas: 2 }],
      ['db', 'rds', 3, 2, { instanceClass: 'db.r6g.2xlarge', multiAz: true, replicas: 2 }],
    ],
    ['users>lb', 'lb>app', 'app>cache', 'app>db'],
    overprovScenario,
  ),
  requirements: [R.cost(1700), R.errors(), R.survivesAz(), R.availability(0.999)],
  hints: [
    tx('Check utilisation on each node: anything under ~15% at peak is paying for idle capacity.', 'Xem mức tải của từng node: thứ gì dưới ~15% lúc cao điểm là đang trả tiền cho phần ngồi không.'),
    tx('Right-size first (smaller instance classes, fewer replicas), then consider a Savings Plan for the steady part.', 'Rightsize trước (loại instance nhỏ hơn, ít replica hơn), sau đó mới cân nhắc Savings Plan cho phần tải đều.'),
    tx('2× t3.medium with Auto Scaling, db.t3.medium Multi-AZ, and drop or shrink the cache.', '2× t3.medium có Auto Scaling, db.t3.medium Multi-AZ, và bỏ hoặc thu nhỏ cache.'),
  ],
  debrief: tx(
    'Rightsizing is the biggest, fastest cost lever: measure utilisation, pick the smallest size that keeps headroom at peak, and let Auto Scaling handle bursts. Only then commit with Savings Plans — committing to oversized instances just locks in waste.',
    'Rightsizing là đòn bẩy chi phí lớn nhất và nhanh nhất: đo mức tải, chọn cỡ nhỏ nhất vẫn còn dư địa lúc cao điểm, và để Auto Scaling lo các đợt tăng. Chỉ sau đó mới cam kết bằng Savings Plans — cam kết cho instance quá cỡ chỉ là khoá chặt sự lãng phí.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 't3.medium', count: 2, autoscaling: true, maxCount: 4, multiAz: true, purchase: 'savings-plan-1y' }],
      ['db', 'rds', 3, 1, { instanceClass: 'db.t3.medium', multiAz: true }],
    ],
    ['users>lb', 'lb>app', 'app>db'],
    overprovScenario,
  ),
};

// ---------------------------------------------------------------------------

const shortenerScenario = scenario({ rps: 1000, peakMultiplier: 3, readRatio: 0.95, payloadKB: 1 });
export const urlShortener: CanvasChallenge = {
  id: 'aws.capstone.url-shortener',
  kind: 'canvas-design',
  skills: ['aws.capstone.design', 'aws.databases.choosing', 'aws.caching.elasticache'],
  title: tx('Capstone: a URL shortener', 'Dự án tổng hợp: dịch vụ rút gọn URL'),
  brief: tx(
    'Build the backend of a URL shortener: 1,000 req/s (3,000 at peak), 95% are redirects (reads), 5% create short links. Responses are tiny (~1 KB).\n\nTargets: fast redirects, no errors at peak, survives an AZ outage, ≥ 99.9% availability, no security problems, within budget. There are several good answers.',
    'Xây backend cho một dịch vụ rút gọn URL: 1.000 req/s (3.000 lúc cao điểm), 95% là redirect (đọc), 5% là tạo link mới. Response rất nhỏ (~1 KB).\n\nMục tiêu: redirect nhanh, không lỗi lúc cao điểm, chịu được sự cố một AZ, availability ≥ 99,9%, không có lỗi bảo mật, trong ngân sách. Có nhiều đáp án tốt.',
  ),
  scenario: shortenerScenario,
  starter: usersOnly(shortenerScenario),
  requirements: [R.p95(100), R.errors(), R.survivesAz(), R.availability(0.999), R.noErrors(), R.cost(1200)],
  hints: [
    tx('The data model is a single key → value lookup (short code → long URL). Which database is built for that?', 'Mô hình dữ liệu chỉ là tra cứu key → value (mã ngắn → URL dài). Database nào sinh ra cho việc đó?'),
    tx('Redirects are extremely read-heavy and repetitive: caching pays off.', 'Redirect cực kỳ thiên về đọc và lặp lại: cache rất đáng giá.'),
    tx('One option: Route 53 → ALB → Fargate (Auto Scaling, 2 AZs) → ElastiCache + DynamoDB.', 'Một lựa chọn: Route 53 → ALB → Fargate (Auto Scaling, 2 AZ) → ElastiCache + DynamoDB.'),
  ],
  debrief: tx(
    'Key-value access at scale is DynamoDB\'s sweet spot, and a cache (or CloudFront for public redirects) absorbs the hot links. A serverless version (API Gateway + Lambda) also works but costs more at this steady volume — compare both in the free Lab. What would you change at 100× the traffic?',
    'Truy cập key-value ở quy mô lớn là sở trường của DynamoDB, và cache (hoặc CloudFront cho redirect public) gánh các link nóng. Phiên bản serverless (API Gateway + Lambda) cũng chạy được nhưng đắt hơn ở lưu lượng đều như thế này — hãy so sánh cả hai trong Lab tự do. Bạn sẽ thay đổi gì nếu traffic gấp 100 lần?',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['dns', 'route53', 1, 1],
      ['lb', 'alb', 2, 1],
      ['app', 'fargate', 3, 1, { taskSize: '0.5-1', count: 2, autoscaling: true, maxCount: 40, multiAz: true }],
      ['cache', 'elasticache', 4, 0, { nodeType: 'cache.t3.medium', replicas: 1, hitRatio: 0.9 }],
      ['db', 'dynamodb', 4, 2, { storageGB: 20 }],
    ],
    ['users>dns', 'dns>lb', 'lb>app', 'app>cache', 'app>db'],
    shortenerScenario,
  ),
};

export const ALL_CHALLENGES: CanvasChallenge[] = [
  staticSite,
  sideProject,
  singleServer,
  readHeavy,
  natTrap,
  cdnOffload,
  flashSale,
  fourNines,
  cutTheBill,
  urlShortener,
];
