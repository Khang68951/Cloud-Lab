import { buildDesign, tx, type Scenario } from '@cloudlab/catalog';
import type { CanvasChallenge, Exercise, Requirement } from '@cloudlab/exercise-kit';

/**
 * Extra Lab practice adapted from well-known public exercises (Cloud Resume
 * Challenge, System Design Primer, AWS reference architectures, Serverless
 * Land patterns, "Scaling up to your first 10 million users"…). Thresholds are
 * calibrated with `npm run challenges:report -- aws-lab-practice`: the starter
 * fails, the reference passes with some headroom for other good answers.
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
  noServers: (): Requirement => ({
    type: 'not-uses',
    services: ['ec2', 'fargate', 'eks', 'ecs-ec2', 'lightsail', 'beanstalk'],
    label: tx('No servers or containers to manage', 'Không có server hay container nào phải quản lý'),
  }),
};

// ===========================================================================
// Module: classic web apps
// ===========================================================================

const resumeScenario = scenario({ rps: 0.5, peakMultiplier: 20, readRatio: 0.9, payloadKB: 40 });
export const resume: CanvasChallenge = {
  id: 'aws-lab-practice.cloud-resume',
  kind: 'canvas-design',
  skills: ['aws.edge.cloudfront', 'aws.compute.lambda'],
  title: tx('The Cloud Resume Challenge', 'Cloud Resume Challenge'),
  brief: tx(
    'A classic first cloud project: host your CV as a static website, and show a **visitor counter** that is read and incremented through an API.\n\n~0.5 requests/second on average (20× when your post goes viral), ~40 KB per page.\n\nBuild both halves: the static site AND the counter API with a place to store the count. No servers to manage.',
    'Một dự án cloud "nhập môn" kinh điển: host CV của bạn thành website tĩnh, và hiển thị **bộ đếm lượt xem** được đọc và tăng qua một API.\n\ntrung bình ~0,5 request/giây (gấp 20 khi bài đăng của bạn viral), mỗi trang ~40 KB.\n\nHãy dựng đủ cả hai nửa: website tĩnh VÀ API bộ đếm có chỗ lưu số đếm. Không có server nào phải quản lý.',
  ),
  scenario: resumeScenario,
  starter: usersOnly(resumeScenario),
  requirements: [
    { type: 'flow', steps: [['cloudfront'], ['s3']], label: tx('Static site: CloudFront and S3', 'Website tĩnh: CloudFront và S3') },
    {
      type: 'flow',
      steps: ['entry', 'compute', ['dynamodb', 'aurora-serverless', 'aurora-dsql']],
      label: tx('Counter API: Users → API front door → function → serverless database', 'API bộ đếm: Users → cửa trước API → function → database serverless'),
    },
    R.noServers(),
    R.errors(),
    R.cost(15),
  ],
  hints: [
    tx('Two separate paths start at Users: one for the page, one for the counter.', 'Có hai đường riêng xuất phát từ Users: một cho trang web, một cho bộ đếm.'),
    tx('The page is static files: object storage behind a CDN.', 'Trang web là file tĩnh: object storage đứng sau CDN.'),
    tx('Users → CloudFront → S3, and Users → API Gateway (HTTP) → Lambda → DynamoDB (on-demand).', 'Users → CloudFront → S3, và Users → API Gateway (HTTP) → Lambda → DynamoDB (on-demand).'),
  ],
  debrief: tx(
    'This is exactly the Cloud Resume Challenge architecture. Everything is pay-per-use, so a personal site costs a few dollars a month and survives going viral. In the real challenge you also add a domain (Route 53), HTTPS (ACM), infrastructure as code and a CI/CD pipeline — the parts that turn a demo into something you can show an employer.',
    'Đây đúng là kiến trúc của Cloud Resume Challenge. Mọi thứ đều trả theo mức dùng, nên một website cá nhân chỉ tốn vài đô mỗi tháng và vẫn chịu được khi viral. Ở bản đầy đủ của thử thách, bạn còn thêm tên miền (Route 53), HTTPS (ACM), infrastructure as code và pipeline CI/CD — những phần biến một bản demo thành thứ có thể cho nhà tuyển dụng xem.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['cdn', 'cloudfront', 1, 0, { hitRatio: 0.95 }],
      ['site', 's3', 2, 0, { storageGB: 1 }],
      ['api', 'apigw', 1, 2, { type: 'http' }],
      ['fn', 'lambda', 2, 2, { memoryMB: '128', durationMs: 30 }],
      ['table', 'dynamodb', 3, 2, { storageGB: 1 }],
    ],
    ['users>cdn', 'cdn>site', 'users>api', 'api>fn', 'fn>table'],
    resumeScenario,
  ),
};

// ---------------------------------------------------------------------------

const pastebinScenario = scenario({ rps: 400, peakMultiplier: 3, readRatio: 0.9, payloadKB: 10 });
export const pastebin: CanvasChallenge = {
  id: 'aws-lab-practice.pastebin',
  kind: 'canvas-design',
  skills: ['aws.databases.choosing', 'aws.storage.s3'],
  title: tx('Design Pastebin', 'Thiết kế Pastebin'),
  brief: tx(
    'From the System Design Primer: users paste text and get a short link; anyone with the link can read it.\n\n~400 requests/second (3× at peak), 90% reads, ~10 KB per paste. Paste **content** is a blob that should live in object storage; the **metadata** (short id → object key, expiry, owner) needs fast key lookups.\n\nDesign it: no errors at peak, p95 under the limit, survives an AZ outage, within budget.',
    'Từ System Design Primer: người dùng dán một đoạn văn bản và nhận về link ngắn; ai có link đều đọc được.\n\n~400 request/giây (gấp 3 lúc cao điểm), 90% là đọc, mỗi paste ~10 KB. **Nội dung** paste là blob nên nằm trong object storage; **metadata** (id ngắn → key của object, hạn dùng, chủ sở hữu) cần tra cứu theo key thật nhanh.\n\nHãy thiết kế: không lỗi lúc cao điểm, p95 dưới giới hạn, chịu được sự cố một AZ, trong ngân sách.',
  ),
  scenario: pastebinScenario,
  starter: usersOnly(pastebinScenario),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', ['s3']], label: tx('Paste content goes to S3 through your app', 'Nội dung paste đi qua app vào S3') },
    {
      type: 'flow',
      steps: ['entry', 'compute', ['dynamodb', 'rds', 'aurora', 'aurora-serverless']],
      label: tx('Metadata is stored in a database', 'Metadata được lưu trong database'),
    },
    R.errors(),
    R.p95(200),
    R.survivesAz(),
    R.cost(3500),
  ],
  hints: [
    tx('Your app writes to TWO stores: the blob and the metadata row. Connect the compute node to both.', 'App của bạn ghi vào HAI nơi: blob và dòng metadata. Nối node compute tới cả hai.'),
    tx('Short-id lookups at hundreds per second are a key-value workload.', 'Tra cứu theo id ngắn với hàng trăm lượt mỗi giây là bài toán key-value.'),
    tx('Users → ALB → Fargate (multi-AZ, auto scaling) → DynamoDB + S3. A CDN in front is a bonus for popular pastes.', 'Users → ALB → Fargate (multi-AZ, auto scaling) → DynamoDB + S3. Thêm CDN phía trước là điểm cộng cho các paste phổ biến.'),
  ],
  debrief: tx(
    'Splitting blob and metadata is the key idea: S3 is cheap and unlimited for content, while DynamoDB answers "short id → where is it" in single-digit milliseconds. The primer\'s full solution adds a cache for hot pastes, a CDN, and an analytics pipeline over the access logs.',
    'Ý chính là tách blob và metadata: S3 rẻ và không giới hạn cho nội dung, còn DynamoDB trả lời "id ngắn → nó nằm đâu" trong vài mili giây. Lời giải đầy đủ trong primer còn thêm cache cho paste nóng, CDN, và pipeline phân tích trên log truy cập.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '0.5-1', count: 2, autoscaling: true, maxCount: 12, multiAz: true }],
      ['meta', 'dynamodb', 3, 0, { storageGB: 20 }],
      ['blobs', 's3', 3, 2, { storageGB: 500 }],
    ],
    ['users>lb', 'lb>app', 'app>meta', 'app>blobs'],
    pastebinScenario,
  ),
};

// ---------------------------------------------------------------------------

const wordpressScenario = scenario({ rps: 150, peakMultiplier: 4, readRatio: 0.95, payloadKB: 60 });
export const wordpress: CanvasChallenge = {
  id: 'aws-lab-practice.wordpress-ha',
  kind: 'canvas-fix',
  skills: ['aws.reliability.multi-az', 'aws.edge.cloudfront'],
  title: tx('WordPress, the AWS reference way', 'WordPress theo kiến trúc tham chiếu của AWS'),
  brief: tx(
    'A news blog runs WordPress on ONE EC2 instance with MySQL in a single AZ. ~150 requests/second, 4× when a story trends, 95% reads, pages ~60 KB.\n\nRebuild it along the lines of AWS\'s WordPress reference architecture: a CDN for pages and media, a load balancer, a multi-AZ fleet and a highly available database.',
    'Một blog tin tức chạy WordPress trên MỘT instance EC2 với MySQL ở một AZ. ~150 request/giây, gấp 4 khi có bài hot, 95% là đọc, mỗi trang ~60 KB.\n\nHãy dựng lại theo hướng kiến trúc tham chiếu WordPress của AWS: CDN cho trang và media, load balancer, fleet trải nhiều AZ và database sẵn sàng cao.',
  ),
  scenario: wordpressScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['wp', 'ec2', 1, 1, { instanceType: 'm6i.large', count: 1, autoscaling: false, multiAz: false }],
      ['db', 'rds', 2, 1, { instanceClass: 'db.t3.medium', multiAz: false }],
    ],
    ['users>wp', 'wp>db'],
    wordpressScenario,
  ),
  requirements: [
    {
      type: 'flow',
      steps: [['cloudfront'], ['alb'], 'compute', 'data'],
      label: tx('Users → CloudFront → ALB → app servers → database', 'Users → CloudFront → ALB → app server → database'),
    },
    R.errors(),
    R.survivesAz(),
    R.availability(0.999),
    R.p95(120),
    R.cost(3200),
  ],
  hints: [
    tx('Most of the traffic is the same pages again and again — where can they be served without touching WordPress?', 'Phần lớn traffic là các trang giống nhau lặp lại — chúng có thể được phục vụ ở đâu mà không chạm tới WordPress?'),
    tx('One instance and one single-AZ database are two single points of failure.', 'Một instance và một database single-AZ là hai điểm lỗi đơn.'),
    tx('CloudFront (high hit ratio) → ALB → EC2 Auto Scaling across 2 AZs → RDS Multi-AZ.', 'CloudFront (hit ratio cao) → ALB → EC2 Auto Scaling trên 2 AZ → RDS Multi-AZ.'),
  ],
  debrief: tx(
    'With a 90%+ hit ratio, CloudFront absorbs almost all reads, so a small fleet behind the ALB is enough and the database barely notices a trending story. AWS\'s full reference architecture also puts uploads on shared storage (EFS or S3 with an offload plugin) and an object cache (ElastiCache) in front of MySQL.',
    'Với hit ratio trên 90%, CloudFront gánh gần hết lượt đọc, nên một fleet nhỏ sau ALB là đủ và database gần như không cảm thấy khi có bài hot. Kiến trúc tham chiếu đầy đủ của AWS còn đặt file upload lên storage dùng chung (EFS hoặc S3 qua plugin offload) và một object cache (ElastiCache) trước MySQL.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['cdn', 'cloudfront', 1, 1, { hitRatio: 0.9 }],
      ['lb', 'alb', 2, 1],
      ['wp', 'ec2', 3, 1, { instanceType: 't3.medium', count: 2, autoscaling: true, maxCount: 6, multiAz: true }],
      ['db', 'rds', 4, 1, { instanceClass: 'db.t3.medium', multiAz: true }],
    ],
    ['users>cdn', 'cdn>lb', 'lb>wp', 'wp>db'],
    wordpressScenario,
  ),
};

// ===========================================================================
// Module: event-driven pipelines
// ===========================================================================

const thumbScenario = scenario({ rps: 20, peakMultiplier: 5, readRatio: 0.3, payloadKB: 200 });
export const thumbnails: CanvasChallenge = {
  id: 'aws-lab-practice.thumbnails',
  kind: 'canvas-design',
  skills: ['aws.storage.s3', 'aws.compute.lambda'],
  title: tx('Image upload with automatic thumbnails', 'Upload ảnh và tự tạo thumbnail'),
  brief: tx(
    'A well-known AWS tutorial: users upload photos, and every new photo must get a thumbnail automatically.\n\n~20 requests/second (5× at peak), 70% uploads, ~200 KB per image.\n\nThe upload request must NOT wait for resizing. Design it so the arrival of a new object in storage triggers the resize, and the thumbnail is written back to storage. No servers.',
    'Một tutorial nổi tiếng của AWS: người dùng upload ảnh, và mỗi ảnh mới phải tự động có thumbnail.\n\n~20 request/giây (gấp 5 lúc cao điểm), 70% là upload, mỗi ảnh ~200 KB.\n\nRequest upload KHÔNG được chờ việc resize. Hãy thiết kế sao cho việc một object mới xuất hiện trong storage sẽ kích hoạt resize, và thumbnail được ghi ngược lại vào storage. Không dùng server.',
  ),
  scenario: thumbScenario,
  starter: usersOnly(thumbScenario),
  requirements: [
    {
      type: 'flow',
      steps: ['entry', 'compute', ['s3'], ['lambda'], ['s3']],
      label: tx('Upload → S3 → (S3 event) → Lambda resizes → S3', 'Upload → S3 → (S3 event) → Lambda resize → S3'),
    },
    R.noServers(),
    R.errors(),
    R.p95(300),
    R.cost(2000),
  ],
  hints: [
    tx('S3 can invoke a Lambda function when an object is created — draw an edge from the bucket to a function.', 'S3 có thể gọi một Lambda function khi có object mới — hãy kéo một cạnh từ bucket tới function.'),
    tx('Keep the user-facing path short: API → small function (e.g. issues a presigned URL / stores the file) → bucket.', 'Giữ đường đi của người dùng thật ngắn: API → function nhỏ (vd cấp presigned URL / lưu file) → bucket.'),
    tx('Users → API Gateway → Lambda → S3 (uploads) → Lambda (resize, 1024 MB) → S3 (thumbnails).', 'Users → API Gateway → Lambda → S3 (uploads) → Lambda (resize, 1024 MB) → S3 (thumbnails).'),
  ],
  debrief: tx(
    'The S3 event makes resizing asynchronous: the user gets "uploaded" immediately and the dashed edge is off the request path. Use a SEPARATE bucket (or prefix filter) for thumbnails, otherwise each thumbnail triggers the function again — the infamous recursive-invocation bill. In production, upload straight to S3 with a presigned URL so large files never pass through API Gateway\'s payload limit.',
    'S3 event làm việc resize thành bất đồng bộ: người dùng nhận "đã upload" ngay, và cạnh nét đứt nằm ngoài đường request. Hãy dùng bucket RIÊNG (hoặc lọc theo prefix) cho thumbnail, nếu không mỗi thumbnail lại kích hoạt function lần nữa — hoá đơn "gọi đệ quy" nổi tiếng. Trên production, upload thẳng lên S3 bằng presigned URL để file lớn không phải đi qua giới hạn payload của API Gateway.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'http' }],
      ['upload', 'lambda', 2, 1, { memoryMB: '256', durationMs: 50 }],
      ['originals', 's3', 3, 1, { storageGB: 500 }],
      ['resize', 'lambda', 4, 1, { memoryMB: '1024', durationMs: 400 }],
      ['thumbs', 's3', 5, 1, { storageGB: 50 }],
    ],
    ['users>api', 'api>upload', 'upload>originals', 'originals>resize', 'resize>thumbs'],
    thumbScenario,
  ),
};

// ---------------------------------------------------------------------------

const webhookScenario = scenario({ rps: 50, peakMultiplier: 20, readRatio: 0, payloadKB: 3 });
export const webhooks: CanvasChallenge = {
  id: 'aws-lab-practice.webhooks',
  kind: 'canvas-fix',
  skills: ['aws.messaging.queues', 'aws.compute.lambda'],
  title: tx('A webhook receiver that never drops events', 'Webhook receiver không bao giờ làm rơi sự kiện'),
  brief: tx(
    'A payment provider sends you webhooks: ~50/second, but 20× bursts at month-end. Each one is processed into a PostgreSQL database. If you answer slowly or with errors, the provider retries and eventually gives up.\n\nToday API Gateway calls a Lambda that writes straight into RDS, and bursts overwhelm the database.\n\nFix it in the Serverless Land style: acknowledge fast, buffer, and process at a pace the database can take.',
    'Một nhà cung cấp thanh toán gửi webhook cho bạn: ~50 cái/giây, nhưng tăng gấp 20 vào cuối tháng. Mỗi webhook được xử lý rồi ghi vào database PostgreSQL. Nếu bạn trả lời chậm hoặc báo lỗi, nhà cung cấp sẽ gửi lại và cuối cùng bỏ cuộc.\n\nHiện tại API Gateway gọi một Lambda ghi thẳng vào RDS, và các đợt tăng vọt làm quá tải database.\n\nHãy sửa theo phong cách Serverless Land: xác nhận nhanh, đệm lại, và xử lý theo nhịp mà database chịu được.',
  ),
  scenario: webhookScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'http' }],
      ['fn', 'lambda', 2, 1, { memoryMB: '512', durationMs: 120 }],
      ['db', 'rds', 3, 1, { instanceClass: 'db.t3.medium', multiAz: true }],
    ],
    ['users>api', 'api>fn', 'fn>db'],
    webhookScenario,
  ),
  requirements: [
    {
      type: 'flow',
      steps: ['entry', ['sqs'], 'compute', ['rds', 'aurora']],
      label: tx('Webhooks are buffered in SQS before a worker writes to the database', 'Webhook được đệm trong SQS trước khi worker ghi vào database'),
    },
    { type: 'not-uses', services: ['aurora', 'dynamodb'], label: tx('Keep the existing PostgreSQL (RDS)', 'Giữ PostgreSQL (RDS) hiện có') },
    R.errors(),
    R.p95(120),
    R.cost(750),
  ],
  hints: [
    tx('The provider only needs a quick 200 OK — the processing can happen later.', 'Nhà cung cấp chỉ cần một 200 OK thật nhanh — việc xử lý có thể làm sau.'),
    tx('API Gateway can send the request body straight into an SQS queue, no function needed in front.', 'API Gateway có thể đẩy thẳng body của request vào một queue SQS, không cần function đứng trước.'),
    tx('Users → API Gateway → SQS → Lambda → RDS. The queue absorbs the burst; the worker drains it at the database\'s pace.', 'Users → API Gateway → SQS → Lambda → RDS. Queue hấp thụ đợt tăng vọt; worker rút dần theo nhịp của database.'),
  ],
  debrief: tx(
    'Storage-first: once the message is in SQS it is durable, so you can answer in milliseconds and let workers catch up after the burst. Make the processing idempotent (providers DO send duplicates), add a dead-letter queue, and cap the worker\'s concurrency so it never opens more database connections than RDS can hold.',
    'Lưu trước, xử lý sau: khi message đã vào SQS là nó bền vững, nên bạn có thể trả lời trong vài mili giây và để worker xử lý bù sau đợt tăng vọt. Hãy làm phần xử lý idempotent (nhà cung cấp CÓ gửi trùng), thêm dead-letter queue, và giới hạn concurrency của worker để nó không bao giờ mở nhiều kết nối hơn mức RDS chịu được.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'http' }],
      ['q', 'sqs', 2, 1],
      ['fn', 'lambda', 3, 1, { memoryMB: '512', durationMs: 120 }],
      ['db', 'rds', 4, 1, { instanceClass: 'db.t3.medium', multiAz: true }],
    ],
    ['users>api', 'api>q', 'q>fn', 'fn>db'],
    webhookScenario,
  ),
};

// ---------------------------------------------------------------------------

const notifyScenario = scenario({ rps: 50, peakMultiplier: 5, readRatio: 0, payloadKB: 2 });
export const notifications: CanvasChallenge = {
  id: 'aws-lab-practice.notifications',
  kind: 'canvas-design',
  skills: ['aws.messaging.fanout', 'aws.messaging.queues'],
  title: tx('A multi-channel notification service', 'Dịch vụ thông báo đa kênh'),
  brief: tx(
    'A classic system-design interview question: other teams call your API to notify a user. Each event must go out by **email** and by **SMS/push**, and a slow channel must never block the others.\n\n~50 events/second (5× during campaigns).\n\nDesign it with one fan-out point, a separate buffer per channel, and workers that call the delivery services.',
    'Một câu phỏng vấn system design kinh điển: các team khác gọi API của bạn để gửi thông báo cho người dùng. Mỗi sự kiện phải được gửi qua **email** và qua **SMS/push**, và một kênh chậm không bao giờ được làm nghẽn các kênh khác.\n\n~50 sự kiện/giây (gấp 5 khi chạy chiến dịch).\n\nHãy thiết kế với một điểm fan-out, một bộ đệm riêng cho từng kênh, và các worker gọi tới dịch vụ gửi tin.',
  ),
  scenario: notifyScenario,
  starter: usersOnly(notifyScenario),
  requirements: [
    {
      type: 'flow',
      steps: ['entry', 'compute', 'pubsub', ['sqs'], 'compute', ['ses']],
      label: tx('Email channel: … → topic → queue → worker → SES', 'Kênh email: … → topic → queue → worker → SES'),
    },
    {
      type: 'flow',
      steps: ['entry', 'compute', 'pubsub', ['sqs'], 'compute', ['sms-messaging', 'end-user-messaging-push']],
      label: tx('SMS/push channel: … → topic → queue → worker → End User Messaging / Pinpoint', 'Kênh SMS/push: … → topic → queue → worker → End User Messaging / Pinpoint'),
    },
    R.errors(),
    R.p95(250),
    R.cost(20000),
  ],
  hints: [
    tx('One event, several independent consumers: that is fan-out (SNS or EventBridge).', 'Một sự kiện, nhiều consumer độc lập: đó là fan-out (SNS hoặc EventBridge).'),
    tx('Give each channel its own SQS queue so retries and slowness stay isolated.', 'Cho mỗi kênh một queue SQS riêng để retry và sự chậm trễ được cô lập.'),
    tx('API Gateway → Lambda → SNS → SQS (email) → Lambda → SES, and SNS → SQS (push) → Lambda → Pinpoint push (or End User Messaging SMS).', 'API Gateway → Lambda → SNS → SQS (email) → Lambda → SES, và SNS → SQS (push) → Lambda → Pinpoint push (hoặc End User Messaging SMS).'),
  ],
  debrief: tx(
    'SNS → per-channel SQS queues is the standard fan-out: each channel retries on its own, has its own DLQ, and can be throttled to the provider\'s rate limit. The real design also stores user preferences and templates, de-duplicates by event id, and tracks delivery status. Try swapping push for SMS and watch the cost tab: at this volume SMS costs hundreds of thousands of dollars a month, which is why products default to push or email and keep SMS for one-time codes.',
    'SNS → mỗi kênh một queue SQS là mẫu fan-out chuẩn: mỗi kênh tự retry, có DLQ riêng, và có thể giới hạn tốc độ theo hạn mức của nhà cung cấp. Thiết kế thật còn lưu tuỳ chọn và template của người dùng, loại trùng theo id sự kiện, và theo dõi trạng thái gửi. Thử đổi push sang SMS rồi xem tab Chi phí: ở lưu lượng này SMS tốn hàng trăm nghìn đô mỗi tháng, nên các sản phẩm thường mặc định dùng push hoặc email và chỉ giữ SMS cho mã OTP.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'http' }],
      ['ingest', 'lambda', 2, 1, { memoryMB: '256', durationMs: 30 }],
      ['topic', 'sns', 3, 1],
      ['qEmail', 'sqs', 4, 0],
      ['qPush', 'sqs', 4, 2],
      ['wEmail', 'lambda', 5, 0, { memoryMB: '256', durationMs: 80 }],
      ['wPush', 'lambda', 5, 2, { memoryMB: '256', durationMs: 80 }],
      ['email', 'ses', 6, 0],
      ['push', 'end-user-messaging-push', 6, 2],
    ],
    ['users>api', 'api>ingest', 'ingest>topic', 'topic>qEmail', 'topic>qPush', 'qEmail>wEmail', 'qPush>wPush', 'wEmail>email', 'wPush>push'],
    notifyScenario,
  ),
};

// ===========================================================================
// Module: scale and cost
// ===========================================================================

const millionScenario = scenario({ rps: 3000, peakMultiplier: 3, readRatio: 0.9, payloadKB: 20 });
export const million: CanvasChallenge = {
  id: 'aws-lab-practice.million-users',
  kind: 'canvas-fix',
  skills: ['aws.compute.autoscaling', 'aws.databases.scaling-reads'],
  title: tx('Scaling up to your first million users', 'Scale lên một triệu người dùng đầu tiên'),
  brief: tx(
    'Based on the famous AWS talk "Scaling up to your first 10 million users": the app started on one EC2 instance and one database. Now it serves ~3,000 requests/second (9,000 at peak), 90% reads, ~20 KB each.\n\nTake it to the "1 million users" stage of the talk: no errors at peak, survive an AZ outage, fast reads, within budget.',
    'Dựa trên bài talk nổi tiếng của AWS "Scaling up to your first 10 million users": app bắt đầu với một instance EC2 và một database. Giờ nó phục vụ ~3.000 request/giây (9.000 lúc cao điểm), 90% là đọc, mỗi response ~20 KB.\n\nHãy đưa nó tới giai đoạn "1 triệu người dùng" trong bài talk: không lỗi lúc cao điểm, chịu được sự cố một AZ, đọc nhanh, trong ngân sách.',
  ),
  scenario: millionScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['app', 'ec2', 1, 1, { instanceType: 'm6i.2xlarge', count: 1, autoscaling: false, multiAz: false }],
      ['db', 'rds', 2, 1, { instanceClass: 'db.r6g.xlarge', multiAz: false }],
    ],
    ['users>app', 'app>db'],
    millionScenario,
  ),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    { type: 'flow', steps: ['entry', 'compute', 'cache'], label: tx('Hot reads are served from a cache', 'Lượt đọc nóng được phục vụ từ cache') },
    R.errors(),
    R.survivesAz(),
    R.availability(0.999),
    R.p95(100),
    R.cost(28000),
  ],
  hints: [
    tx('The talk\'s order: separate tiers, add a load balancer and multi-AZ, then take reads off the database.', 'Thứ tự trong bài talk: tách tầng, thêm load balancer và multi-AZ, rồi giảm tải đọc khỏi database.'),
    tx('A cache in front of the database (and a CDN in front of everything) removes most of the reads.', 'Cache trước database (và CDN trước tất cả) loại bỏ phần lớn lượt đọc.'),
    tx('CloudFront → ALB → EC2 Auto Scaling (multi-AZ) → ElastiCache (with replica) + RDS Multi-AZ.', 'CloudFront → ALB → EC2 Auto Scaling (multi-AZ) → ElastiCache (có replica) + RDS Multi-AZ.'),
  ],
  debrief: tx(
    'This is the talk\'s middle stage: stateless web tier behind a load balancer, Auto Scaling in several AZs, caching at the edge and in memory, and a Multi-AZ database. The next steps toward 10 million are read replicas, moving some data to purpose-built stores (DynamoDB), splitting into services, and eventually sharding.',
    'Đây là giai đoạn giữa trong bài talk: tầng web không trạng thái sau load balancer, Auto Scaling trên nhiều AZ, cache ở edge và trong bộ nhớ, và database Multi-AZ. Các bước tiếp theo để lên 10 triệu là read replica, chuyển một phần dữ liệu sang kho chuyên dụng (DynamoDB), tách thành nhiều service, và cuối cùng là sharding.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['cdn', 'cloudfront', 1, 1, { hitRatio: 0.6 }],
      ['lb', 'alb', 2, 1],
      ['app', 'ec2', 3, 1, { instanceType: 'c6i.xlarge', count: 2, autoscaling: true, maxCount: 8, multiAz: true }],
      ['cache', 'elasticache', 4, 0, { nodeType: 'cache.r6g.large', replicas: 1, hitRatio: 0.9 }],
      ['db', 'rds', 4, 2, { instanceClass: 'db.r6g.large', multiAz: true }],
    ],
    ['users>cdn', 'cdn>lb', 'lb>app', 'app>cache', 'app>db'],
    millionScenario,
  ),
};

// ---------------------------------------------------------------------------

const leaderboardScenario = scenario({ rps: 5000, peakMultiplier: 4, readRatio: 0.8, payloadKB: 1 });
export const leaderboard: CanvasChallenge = {
  id: 'aws-lab-practice.leaderboard',
  kind: 'canvas-design',
  skills: ['aws.data.caching', 'aws.databases.choosing'],
  title: tx('A real-time game leaderboard', 'Bảng xếp hạng game thời gian thực'),
  brief: tx(
    'Another interview classic: a mobile game shows the top 10 and "your rank" live. ~5,000 requests/second (4× at the evening peak), 80% reads, tiny payloads.\n\nRanks must be computed in memory (think sorted sets), but scores must also be stored durably so a cache failure loses nothing.\n\nDesign it: no errors at peak, very low p95, survives an AZ outage.',
    'Thêm một câu phỏng vấn kinh điển: game mobile hiển thị top 10 và "hạng của bạn" theo thời gian thực. ~5.000 request/giây (gấp 4 lúc cao điểm buổi tối), 80% là đọc, payload rất nhỏ.\n\nThứ hạng phải được tính trong bộ nhớ (nghĩ tới sorted set), nhưng điểm số cũng phải được lưu bền vững để cache có hỏng cũng không mất gì.\n\nHãy thiết kế: không lỗi lúc cao điểm, p95 rất thấp, chịu được sự cố một AZ.',
  ),
  scenario: leaderboardScenario,
  starter: usersOnly(leaderboardScenario),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', ['elasticache', 'elasticache-serverless', 'memorydb']], label: tx('Ranks computed in an in-memory store (Redis/Valkey)', 'Thứ hạng được tính trong kho in-memory (Redis/Valkey)') },
    { type: 'flow', steps: ['entry', 'compute', ['dynamodb', 'rds', 'aurora']], label: tx('Scores are also stored durably in a database', 'Điểm số cũng được lưu bền vững trong database') },
    R.errors(),
    R.p95(100),
    R.survivesAz(),
    R.cost(6000),
  ],
  hints: [
    tx('Redis sorted sets give you ZADD (update score) and ZREVRANK (my rank) in O(log n).', 'Sorted set của Redis cho bạn ZADD (cập nhật điểm) và ZREVRANK (hạng của tôi) với O(log n).'),
    tx('Write every score to a database too, so you can rebuild the sorted set after a failure.', 'Ghi mọi điểm số vào database nữa, để có thể dựng lại sorted set sau sự cố.'),
    tx('ALB → Fargate (multi-AZ, auto scaling) → ElastiCache (with a replica) + DynamoDB.', 'ALB → Fargate (multi-AZ, auto scaling) → ElastiCache (có replica) + DynamoDB.'),
  ],
  debrief: tx(
    'The in-memory sorted set answers rank queries in well under a millisecond; DynamoDB is the source of truth. At much larger scale you would shard the leaderboard (by region or score bucket) or keep only the top N in memory. MemoryDB is an alternative when you want Redis semantics with durability built in.',
    'Sorted set in-memory trả lời truy vấn thứ hạng trong chưa tới một mili giây; DynamoDB là nguồn sự thật. Ở quy mô lớn hơn nhiều, bạn sẽ shard bảng xếp hạng (theo region hoặc theo khoảng điểm) hoặc chỉ giữ top N trong bộ nhớ. MemoryDB là lựa chọn thay thế khi bạn muốn ngữ nghĩa của Redis kèm sẵn độ bền dữ liệu.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '2-4', count: 6, autoscaling: true, maxCount: 40, multiAz: true }],
      ['ranks', 'elasticache', 3, 0, { nodeType: 'cache.r6g.large', replicas: 1, hitRatio: 0.95 }],
      ['scores', 'dynamodb', 3, 2, { storageGB: 10 }],
    ],
    ['users>lb', 'lb>app', 'app>ranks', 'app>scores'],
    leaderboardScenario,
  ),
};

// ---------------------------------------------------------------------------

const devScenario = scenario({ rps: 3, peakMultiplier: 3, readRatio: 0.8, payloadKB: 5 });
export const devEnv: CanvasChallenge = {
  id: 'aws-lab-practice.dev-environment',
  kind: 'canvas-fix',
  skills: ['aws.cost.levers'],
  title: tx('A dev environment that costs like production', 'Môi trường dev tốn tiền như production'),
  brief: tx(
    'From the Well-Architected cost labs: the team cloned production to create a **dev** environment. It serves ~3 requests/second from a handful of developers, yet the bill matches production.\n\nCut the cost drastically. Dev does not need to survive an AZ outage, but it must still work (no errors) and keep the same shape: front door → app → database.',
    'Từ các bài lab chi phí của Well-Architected: team đã nhân bản production để tạo môi trường **dev**. Nó chỉ phục vụ ~3 request/giây từ vài lập trình viên, nhưng hoá đơn thì bằng production.\n\nHãy cắt giảm chi phí thật mạnh. Dev không cần chịu được sự cố AZ, nhưng vẫn phải chạy được (không lỗi) và giữ nguyên hình dạng: cửa trước → app → database.',
  ),
  scenario: devScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 'm6i.2xlarge', count: 4, autoscaling: false, multiAz: true }],
      ['cache', 'elasticache', 3, 0, { nodeType: 'cache.r6g.large', replicas: 2 }],
      ['db', 'rds', 3, 2, { instanceClass: 'db.r6g.2xlarge', multiAz: true, replicas: 1 }],
    ],
    ['users>lb', 'lb>app', 'app>cache', 'app>db'],
    devScenario,
  ),
  requirements: [{ type: 'flow', steps: ['entry', 'compute', 'data'] }, R.errors(), R.cost(120)],
  hints: [
    tx('Open the cost tab: which lines are sized for production traffic?', 'Mở tab Chi phí: những dòng nào đang được định cỡ cho traffic production?'),
    tx('At 3 requests/second you need one small instance, no cache, and the smallest database — or go serverless.', 'Ở 3 request/giây bạn chỉ cần một instance nhỏ, không cần cache, và database nhỏ nhất — hoặc chuyển sang serverless.'),
    tx('e.g. ALB → 1× t3.small (single AZ) → RDS db.t3.micro single-AZ; or API Gateway → Lambda → DynamoDB for almost $0.', 'vd ALB → 1× t3.small (một AZ) → RDS db.t3.micro single-AZ; hoặc API Gateway → Lambda → DynamoDB gần như $0.'),
  ],
  debrief: tx(
    'Non-production environments are one of the biggest sources of waste: right-size them, drop Multi-AZ and replicas, and schedule them off at night and on weekends (that alone saves ~65%). Tag everything by environment so the bill shows where the money goes.',
    'Môi trường không phải production là một trong những nguồn lãng phí lớn nhất: định cỡ lại cho đúng, bỏ Multi-AZ và replica, và hẹn giờ tắt vào ban đêm và cuối tuần (riêng việc này đã tiết kiệm ~65%). Gắn tag theo môi trường cho mọi thứ để hoá đơn cho thấy tiền đi đâu.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 't3.small', count: 1, autoscaling: false, multiAz: false }],
      ['db', 'rds', 3, 1, { instanceClass: 'db.t3.micro', multiAz: false }],
    ],
    ['users>lb', 'lb>app', 'app>db'],
    devScenario,
  ),
};

export const exercises: Record<string, Record<string, Exercise[]>> = {
  'web-apps': { 'classic-web': [resume, pastebin, wordpress] },
  'event-driven': { pipelines: [thumbnails, webhooks, notifications] },
  'scale-cost': { 'scale-and-cost': [million, leaderboard, devEnv] },
};
