import { buildDesign, tx } from '@cloudlab/catalog';
import type { CourseExercises } from '../../define.ts';
import { exerciseBuilders, R, scenario, usersOnly } from '../../helpers.ts';

const { challenge } = exerciseBuilders('aws-lab-practice');

/**
 * Extra Lab practice adapted from well-known public exercises (Cloud Resume
 * Challenge, System Design Primer, AWS reference architectures, Serverless
 * Land patterns, "Scaling up to your first 10 million users"…). Thresholds are
 * calibrated with `npm run challenges:report -- aws-lab-practice`: the starter
 * fails, the reference passes with some headroom for other good answers.
 */

// ===========================================================================
// Module: classic web apps
// ===========================================================================

const resumeScenario = scenario({ rps: 0.5, peakMultiplier: 20, readRatio: 0.9, payloadKB: 40 });
export const resume = challenge({
  id: 'cloud-resume',
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
});

// ---------------------------------------------------------------------------

const pastebinScenario = scenario({ rps: 400, peakMultiplier: 3, readRatio: 0.9, payloadKB: 10 });
export const pastebin = challenge({
  id: 'pastebin',
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
      ['vpce', 'vpce', 2, 2, { type: 'gateway' }, 'S3/DynamoDB endpoint'],
      ['meta', 'dynamodb', 3, 0, { storageGB: 20 }],
      ['blobs', 's3', 3, 2, { storageGB: 500 }],
    ],
    ['users>lb', 'lb>app', 'app>meta', 'app>blobs'],
    pastebinScenario,
  ),
});

// ---------------------------------------------------------------------------

const wordpressScenario = scenario({ rps: 150, peakMultiplier: 4, readRatio: 0.95, payloadKB: 60 });
export const wordpress = challenge({
  id: 'wordpress-ha',
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
      ['wp', 'ec2', 1, 1, { subnet: 'public', sg: '80<0.0.0.0/0', instanceType: 'm6i.large', count: 1, autoscaling: false, multiAz: false }],
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
});

// ===========================================================================
// Module: event-driven pipelines
// ===========================================================================

const thumbScenario = scenario({ rps: 20, peakMultiplier: 5, readRatio: 0.3, payloadKB: 200 });
export const thumbnails = challenge({
  id: 'thumbnails',
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
});

// ---------------------------------------------------------------------------

const webhookScenario = scenario({ rps: 50, peakMultiplier: 20, readRatio: 0, payloadKB: 3 });
export const webhooks = challenge({
  id: 'webhooks',
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
      ['fn', 'lambda', 2, 1, { subnet: 'private', memoryMB: '512', durationMs: 120 }],
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
      ['fn', 'lambda', 3, 1, { subnet: 'private', memoryMB: '512', durationMs: 120 }],
      ['db', 'rds', 4, 1, { instanceClass: 'db.t3.medium', multiAz: true }],
    ],
    ['users>api', 'api>q', 'q>fn', 'fn>db'],
    webhookScenario,
  ),
});

// ---------------------------------------------------------------------------

const notifyScenario = scenario({ rps: 50, peakMultiplier: 5, readRatio: 0, payloadKB: 2 });
export const notifications = challenge({
  id: 'notifications',
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
});

// ===========================================================================
// Module: scale and cost
// ===========================================================================

const millionScenario = scenario({ rps: 3000, peakMultiplier: 3, readRatio: 0.9, payloadKB: 20 });
export const million = challenge({
  id: 'million-users',
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
      ['app', 'ec2', 1, 1, { subnet: 'public', sg: '80<0.0.0.0/0', instanceType: 'm6i.2xlarge', count: 1, autoscaling: false, multiAz: false }],
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
});

// ---------------------------------------------------------------------------

const leaderboardScenario = scenario({ rps: 5000, peakMultiplier: 4, readRatio: 0.8, payloadKB: 1 });
export const leaderboard = challenge({
  id: 'leaderboard',
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
      ['vpce', 'vpce', 2, 2, { type: 'gateway' }, 'S3/DynamoDB endpoint'],
      ['ranks', 'elasticache', 3, 0, { nodeType: 'cache.r6g.large', replicas: 1, hitRatio: 0.95 }],
      ['scores', 'dynamodb', 3, 2, { storageGB: 10 }],
    ],
    ['users>lb', 'lb>app', 'app>ranks', 'app>scores'],
    leaderboardScenario,
  ),
});

// ---------------------------------------------------------------------------

const devScenario = scenario({ rps: 3, peakMultiplier: 3, readRatio: 0.8, payloadKB: 5 });
export const devEnv = challenge({
  id: 'dev-environment',
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
});

// ===========================================================================
// Module: AWS workshops (hands-on labs AWS publishes for free)
// ===========================================================================

const ridesScenario = scenario({ rps: 30, peakMultiplier: 5, readRatio: 0.6, payloadKB: 2 });
export const wildRydes = challenge({
  id: 'wild-rydes',
  kind: 'canvas-design',
  skills: ['aws.security.cognito', 'aws.serverless.apigw'],
  title: tx('Wild Rydes: a serverless ride-hailing web app', 'Wild Rydes: web app gọi xe serverless'),
  brief: tx(
    'From AWS\'s free workshop "Build a Serverless Web Application": riders sign in, tap the map, and a unicorn is dispatched to pick them up.\n\n~30 requests/second (5× at rush hour), 60% reads, tiny JSON payloads.\n\nBuild all four parts of the workshop: **static web hosting**, **user sign-up/sign-in**, a **ride API** behind an authorizer, and a **table of rides**. No servers.',
    'Từ workshop miễn phí của AWS "Build a Serverless Web Application": người đi xe đăng nhập, chạm vào bản đồ, và một chú kỳ lân được điều tới đón.\n\n~30 request/giây (gấp 5 giờ cao điểm), 60% là đọc, payload JSON rất nhỏ.\n\nHãy dựng đủ bốn phần của workshop: **host web tĩnh**, **đăng ký/đăng nhập người dùng**, **API đặt xe** có authorizer, và **bảng lưu chuyến xe**. Không dùng server.',
  ),
  scenario: ridesScenario,
  starter: usersOnly(ridesScenario),
  requirements: [
    { type: 'flow', steps: [['amplify', 'cloudfront']], label: tx('Static web app: Amplify Hosting (or CloudFront + S3)', 'Web app tĩnh: Amplify Hosting (hoặc CloudFront + S3)') },
    { type: 'flow', steps: [['cognito']], label: tx('Users sign in with a Cognito user pool', 'Người dùng đăng nhập bằng Cognito user pool') },
    {
      type: 'flow',
      steps: [['apigw'], ['lambda'], ['dynamodb']],
      label: tx('Ride API: API Gateway → Lambda → DynamoDB', 'API đặt xe: API Gateway → Lambda → DynamoDB'),
    },
    R.noServers(),
    R.errors(),
    R.p95(150),
    R.cost(200),
  ],
  hints: [
    tx('Three things start at Users: loading the site, signing in, and calling the API.', 'Có ba thứ xuất phát từ Users: tải website, đăng nhập, và gọi API.'),
    tx('The browser gets a JWT from Cognito and sends it to API Gateway, whose Cognito authorizer checks it before Lambda runs.', 'Trình duyệt lấy JWT từ Cognito rồi gửi kèm tới API Gateway; Cognito authorizer kiểm tra token trước khi Lambda chạy.'),
    tx('Users → Amplify; Users → Cognito; Users → API Gateway (REST) → Lambda → DynamoDB.', 'Users → Amplify; Users → Cognito; Users → API Gateway (REST) → Lambda → DynamoDB.'),
  ],
  debrief: tx(
    'This is the exact Wild Rydes architecture, and it is the template for most serverless web apps: hosting, identity, API, data — every part scales to zero and is billed per use. Cognito is free up to tens of thousands of monthly active users, which is why it shows up in almost every workshop. The authorizer means your Lambda code never sees an unauthenticated request.',
    'Đây chính xác là kiến trúc Wild Rydes, và cũng là khuôn mẫu cho hầu hết web app serverless: hosting, danh tính, API, dữ liệu — mọi phần đều scale về 0 và tính tiền theo mức dùng. Cognito miễn phí tới vài chục nghìn người dùng hoạt động mỗi tháng, nên nó xuất hiện trong gần như mọi workshop. Nhờ authorizer, code Lambda của bạn không bao giờ thấy một request chưa xác thực.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['web', 'amplify', 1, 0],
      ['idp', 'cognito', 1, 1, { mau: 5000 }],
      ['api', 'apigw', 1, 2, { type: 'rest' }],
      ['fn', 'lambda', 2, 2, { memoryMB: '256', durationMs: 60 }],
      ['rides', 'dynamodb', 3, 2, { storageGB: 5 }],
    ],
    ['users>web', 'users>idp', 'users>api', 'api>fn', 'fn>rides'],
    ridesScenario,
  ),
});

// ---------------------------------------------------------------------------

const chatScenario = scenario({ rps: 200, peakMultiplier: 4, readRatio: 0.3, payloadKB: 1 });
export const wsChat = challenge({
  id: 'websocket-chat',
  kind: 'canvas-design',
  skills: ['aws.serverless.apigw', 'aws.databases.dynamodb'],
  title: tx('A serverless WebSocket chat room', 'Phòng chat WebSocket serverless'),
  brief: tx(
    'Based on AWS\'s open-source sample "simple-websockets-chat-app": clients keep a WebSocket open; `$connect` stores the connection id, `sendmessage` broadcasts to every stored connection, `$disconnect` removes it.\n\n~200 messages/second (4× in the evening), tiny payloads.\n\nDesign it with a WebSocket front door, functions for the routes, and a table of live connections. No servers.',
    'Dựa trên sample mã nguồn mở của AWS "simple-websockets-chat-app": client giữ một kết nối WebSocket; `$connect` lưu connection id, `sendmessage` phát tin tới mọi connection đã lưu, `$disconnect` xoá nó đi.\n\n~200 tin nhắn/giây (gấp 4 vào buổi tối), payload rất nhỏ.\n\nHãy thiết kế với cửa trước WebSocket, các function xử lý route, và một bảng lưu các kết nối đang mở. Không dùng server.',
  ),
  scenario: chatScenario,
  starter: usersOnly(chatScenario),
  requirements: [
    {
      type: 'flow',
      steps: [['apigw', 'appsync'], ['lambda'], ['dynamodb']],
      label: tx('WebSocket API (API Gateway or AppSync) → Lambda → connections table in DynamoDB', 'WebSocket API (API Gateway hoặc AppSync) → Lambda → bảng connection trong DynamoDB'),
    },
    { type: 'not-uses', services: ['alb', 'nlb'], label: tx('No load balancer: the managed API holds the connections', 'Không dùng load balancer: API được quản lý giữ các kết nối') },
    R.noServers(),
    R.errors(),
    R.p95(150),
    R.cost(1500),
  ],
  hints: [
    tx('API Gateway has a WebSocket API type: it keeps the connections open, your code only runs per message.', 'API Gateway có loại WebSocket API: nó giữ các kết nối mở, code của bạn chỉ chạy theo từng tin nhắn.'),
    tx('Connection ids must survive between invocations — store them in a key-value table.', 'Connection id phải tồn tại giữa các lần gọi — hãy lưu chúng vào một bảng key-value.'),
    tx('Users → API Gateway (type: WebSocket) → Lambda → DynamoDB (on-demand).', 'Users → API Gateway (type: WebSocket) → Lambda → DynamoDB (on-demand).'),
  ],
  debrief: tx(
    'API Gateway WebSocket APIs bill per message and per connection-minute, so an idle chat costs almost nothing — unlike a fleet of servers holding sockets 24/7. The weak spot of the sample is the broadcast: one message triggers a scan of the connections table and one post per client, so large rooms should partition connections by room id. AppSync subscriptions (GraphQL) are the managed alternative when you want this done for you.',
    'WebSocket API của API Gateway tính tiền theo tin nhắn và theo phút kết nối, nên phòng chat vắng gần như không tốn gì — khác hẳn một fleet server giữ socket 24/7. Điểm yếu của sample là phần broadcast: một tin nhắn kích hoạt việc quét bảng connection và gửi tới từng client, nên phòng lớn cần chia connection theo room id. AppSync subscription (GraphQL) là lựa chọn được quản lý sẵn khi bạn muốn có người làm việc này hộ.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['ws', 'apigw', 1, 1, { type: 'websocket', connections: 2000 }],
      ['fn', 'lambda', 2, 1, { memoryMB: '256', durationMs: 40 }],
      ['conns', 'dynamodb', 3, 1, { storageGB: 1 }],
    ],
    ['users>ws', 'ws>fn', 'fn>conns'],
    chatScenario,
  ),
});

// ---------------------------------------------------------------------------

const orderScenario = scenario({ rps: 40, peakMultiplier: 5, readRatio: 0.2, payloadKB: 3 });
export const orderSaga = challenge({
  id: 'order-saga',
  kind: 'canvas-fix',
  skills: ['aws.serverless.stepfunctions', 'aws.architecture.sagas'],
  title: tx('Order processing with a Step Functions saga', 'Xử lý đơn hàng bằng saga Step Functions'),
  brief: tx(
    'Adapted from the saga pattern on Serverless Land and the AWS Step Functions workshop: placing an order must **reserve stock, charge the card, and confirm**, and if any step fails the earlier ones must be undone.\n\nToday one big Lambda does everything in sequence, and a failure halfway leaves stock reserved but no payment.\n\n~40 orders/second (5× on sale days). Put a **workflow orchestrator** between the API and the step functions, keep orders in DynamoDB, and send the confirmation through a topic.',
    'Phỏng theo saga pattern trên Serverless Land và workshop AWS Step Functions: đặt hàng phải **giữ hàng trong kho, trừ tiền thẻ, và xác nhận**, và nếu bước nào lỗi thì các bước trước phải được hoàn tác.\n\nHiện tại một Lambda to làm mọi thứ tuần tự, và lỗi giữa chừng để lại hàng đã giữ nhưng chưa thanh toán.\n\n~40 đơn/giây (gấp 5 vào ngày sale). Hãy đặt một **bộ điều phối workflow** giữa API và các function từng bước, lưu đơn trong DynamoDB, và gửi xác nhận qua một topic.',
  ),
  scenario: orderScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'rest' }],
      ['fn', 'lambda', 2, 1, { memoryMB: '1024', durationMs: 900 }],
      ['orders', 'dynamodb', 3, 1, { storageGB: 20 }],
    ],
    ['users>api', 'api>fn', 'fn>orders'],
    orderScenario,
  ),
  requirements: [
    {
      type: 'flow',
      steps: ['entry', ['stepfunctions'], ['lambda'], ['dynamodb']],
      label: tx('API → Step Functions → step functions (Lambda) → DynamoDB', 'API → Step Functions → các bước (Lambda) → DynamoDB'),
    },
    { type: 'flow', steps: [['stepfunctions'], ['sns', 'eventbridge']], label: tx('The workflow publishes "order confirmed" to a topic or bus', 'Workflow publish "đã xác nhận đơn" lên topic hoặc bus') },
    R.noServers(),
    R.errors(),
    R.cost(2500),
  ],
  hints: [
    tx('Each step (reserve, charge, confirm) becomes its own small function; the orchestrator calls them and runs the compensations on failure.', 'Mỗi bước (giữ hàng, trừ tiền, xác nhận) thành một function nhỏ riêng; bộ điều phối gọi chúng và chạy bước bù trừ khi có lỗi.'),
    tx('Step Functions has a native SNS integration for the final notification — no extra Lambda needed.', 'Step Functions tích hợp sẵn với SNS cho thông báo cuối — không cần thêm Lambda.'),
    tx('Users → API Gateway → Step Functions → Lambda (reserve / charge) → DynamoDB, and Step Functions → SNS.', 'Users → API Gateway → Step Functions → Lambda (giữ hàng / trừ tiền) → DynamoDB, và Step Functions → SNS.'),
  ],
  debrief: tx(
    'The orchestrator keeps the state of every order: which steps finished, retries with back-off, and the compensating "release stock" / "refund" steps when something fails — logic that was hidden (and buggy) inside one big function. Open the cost tab: Standard workflows bill per state transition, so at high volume Express workflows (billed per execution and duration) are often much cheaper for short, idempotent flows.',
    'Bộ điều phối giữ trạng thái của từng đơn: bước nào đã xong, retry có back-off, và các bước bù trừ "trả hàng về kho" / "hoàn tiền" khi có lỗi — thứ logic trước đây bị giấu (và đầy bug) trong một function to. Mở tab Chi phí: Standard workflow tính tiền theo mỗi lần chuyển trạng thái, nên ở lưu lượng cao Express workflow (tính theo lượt chạy và thời gian) thường rẻ hơn nhiều cho các luồng ngắn, idempotent.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'rest' }],
      ['flow', 'stepfunctions', 2, 1, { type: 'express', steps: 6, durationMs: 800 }],
      ['steps', 'lambda', 3, 0, { memoryMB: '256', durationMs: 150 }],
      ['orders', 'dynamodb', 4, 0, { storageGB: 20 }],
      ['done', 'sns', 3, 2],
    ],
    ['users>api', 'api>flow', 'flow>steps', 'steps>orders', 'flow>done'],
    orderScenario,
  ),
});

// ===========================================================================
// Module: data, streaming and IoT (AWS Solutions & reference architectures)
// ===========================================================================

const clickScenario = scenario({ rps: 2000, peakMultiplier: 3, readRatio: 0, payloadKB: 1 });
export const clickstream = challenge({
  id: 'clickstream',
  kind: 'canvas-fix',
  skills: ['aws.analytics.streaming', 'aws.analytics.data-lake'],
  title: tx('Clickstream analytics into a data lake', 'Phân tích clickstream vào data lake'),
  brief: tx(
    'Modelled on the AWS Solution "Clickstream Analytics on AWS": a web/mobile SDK sends ~2,000 click events/second (3× at peak), ~1 KB each. Analysts query them with SQL the next morning.\n\nToday every event goes API → Lambda → **one INSERT into RDS**, the database is the bill and the bottleneck.\n\nRebuild it as a streaming pipeline into S3 with serverless SQL on top.',
    'Mô phỏng theo AWS Solution "Clickstream Analytics on AWS": SDK web/mobile gửi ~2.000 sự kiện click/giây (gấp 3 lúc cao điểm), mỗi cái ~1 KB. Sáng hôm sau analyst truy vấn chúng bằng SQL.\n\nHiện tại mỗi sự kiện đi API → Lambda → **một lệnh INSERT vào RDS**, database vừa là hoá đơn vừa là nút thắt cổ chai.\n\nHãy dựng lại thành pipeline streaming đổ vào S3, có SQL serverless ở trên.',
  ),
  scenario: clickScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'http' }],
      ['fn', 'lambda', 2, 1, { subnet: 'private', memoryMB: '256', durationMs: 40 }],
      ['db', 'rds', 3, 1, { instanceClass: 'db.r6g.xlarge', multiAz: true }],
    ],
    ['users>api', 'api>fn', 'fn>db'],
    clickScenario,
  ),
  requirements: [
    {
      type: 'flow',
      steps: ['entry', ['kinesis', 'msk', 'msk-serverless'], ['firehose'], ['s3']],
      label: tx('Events → stream → Firehose → S3 data lake', 'Sự kiện → stream → Firehose → data lake S3'),
    },
    { type: 'flow', steps: [['athena'], ['s3']], label: tx('Analysts query the lake with Athena', 'Analyst truy vấn data lake bằng Athena') },
    { type: 'not-uses', services: ['rds', 'aurora'], label: tx('No relational database on the ingest path', 'Không có database quan hệ trên đường nạp dữ liệu') },
    R.errors(),
    R.cost(7500),
  ],
  hints: [
    tx('Raw events are append-only and read in bulk later — that is a stream and a data lake, not a transactional database.', 'Sự kiện thô chỉ ghi thêm và được đọc hàng loạt về sau — đó là stream và data lake, không phải database giao dịch.'),
    tx('API Gateway can put records straight into Kinesis; Firehose batches them into files in S3.', 'API Gateway có thể đẩy record thẳng vào Kinesis; Firehose gom chúng thành file trong S3.'),
    tx('Users → API Gateway → Kinesis Data Streams → Firehose → S3, and Athena → S3.', 'Users → API Gateway → Kinesis Data Streams → Firehose → S3, và Athena → S3.'),
  ],
  debrief: tx(
    'Firehose turns millions of tiny events into a few large files (ideally Parquet, partitioned by date), which is exactly what Athena wants: it bills per data scanned, so columnar + partitioned data cuts query cost by 10–100×. The stream in front gives you a replay buffer and lets you add real-time consumers later (fraud detection, live dashboards) without touching the producers.',
    'Firehose biến hàng triệu sự kiện nhỏ thành vài file lớn (lý tưởng là Parquet, partition theo ngày), đúng thứ Athena cần: Athena tính tiền theo dữ liệu quét, nên dữ liệu dạng cột + partition giảm chi phí truy vấn 10–100 lần. Stream đứng trước cho bạn bộ đệm để phát lại và cho phép thêm consumer thời gian thực về sau (phát hiện gian lận, dashboard trực tiếp) mà không cần sửa phía gửi.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'http' }],
      ['stream', 'kinesis', 2, 1, { shards: 8 }],
      ['fh', 'firehose', 3, 1],
      ['lake', 's3', 4, 1, { storageGB: 2000 }],
      ['sql', 'athena', 4, 2],
    ],
    ['users>api', 'api>stream', 'stream>fh', 'fh>lake', 'sql>lake'],
    clickScenario,
  ),
});

// ---------------------------------------------------------------------------

const iotScenario = scenario({ rps: 5000, peakMultiplier: 2, readRatio: 0, payloadKB: 0.5 });
export const iotTelemetry = challenge({
  id: 'iot-telemetry',
  kind: 'canvas-design',
  skills: ['aws.analytics.streaming', 'aws.databases.choosing'],
  title: tx('IoT sensor telemetry', 'Telemetry cảm biến IoT'),
  brief: tx(
    'Inspired by the AWS IoT workshops and the "IoT data ingestion" reference architecture: 50,000 smart meters each publish a reading every 10 seconds over MQTT — ~5,000 messages/second (2× when meters reconnect after an outage), ~0.5 KB each.\n\nOperators need a live dashboard of the last 24 hours (time-series queries), and all raw readings must be archived cheaply for years.\n\nDesign the ingest with a device gateway, a time-series store for the hot data, and an S3 archive.',
    'Lấy cảm hứng từ các workshop AWS IoT và kiến trúc tham chiếu "IoT data ingestion": 50.000 đồng hồ điện thông minh, mỗi cái gửi một số đo mỗi 10 giây qua MQTT — ~5.000 message/giây (gấp 2 khi các đồng hồ kết nối lại sau sự cố), mỗi message ~0,5 KB.\n\nNgười vận hành cần dashboard trực tiếp của 24 giờ gần nhất (truy vấn chuỗi thời gian), và mọi số đo thô phải được lưu trữ giá rẻ trong nhiều năm.\n\nHãy thiết kế luồng nạp dữ liệu với cổng thiết bị, kho time-series cho dữ liệu nóng, và kho lưu trữ S3.',
  ),
  scenario: iotScenario,
  starter: usersOnly(iotScenario),
  requirements: [
    { type: 'flow', steps: [['iot-core'], 'compute', ['timestream', 'dynamodb']], label: tx('Hot path: IoT Core → processing → time-series store', 'Đường nóng: IoT Core → xử lý → kho time-series') },
    { type: 'flow', steps: [['iot-core'], ['firehose'], ['s3']], label: tx('Cold path: IoT Core → Firehose → S3 archive', 'Đường lạnh: IoT Core → Firehose → lưu trữ S3') },
    { type: 'not-uses', services: ['alb', 'nlb', 'ec2'], label: tx('No self-managed MQTT brokers', 'Không tự vận hành MQTT broker') },
    R.errors(),
    R.cost(22000),
  ],
  hints: [
    tx('IoT Core is the managed MQTT broker; its rules engine routes each message to several targets.', 'IoT Core là MQTT broker được quản lý; rules engine của nó định tuyến mỗi message tới nhiều đích.'),
    tx('Two consumers of the same data with different needs → a hot path and a cold path (lambda architecture).', 'Hai nơi dùng cùng dữ liệu với nhu cầu khác nhau → một đường nóng và một đường lạnh.'),
    tx('Users (devices) → IoT Core → Lambda → Timestream, and IoT Core → Firehose → S3.', 'Users (thiết bị) → IoT Core → Lambda → Timestream, và IoT Core → Firehose → S3.'),
  ],
  debrief: tx(
    'IoT Core terminates millions of MQTT connections and its rules fan messages out with no code. Timestream keeps recent data in memory for fast "last hour per meter" queries and ages it to cheap storage automatically, while Firehose batches the raw stream into S3 for years of retention and Athena analysis. In the real workshops a rule can also write straight to Timestream — the Lambda is only needed for enrichment or validation.',
    'IoT Core giữ hàng triệu kết nối MQTT và rule của nó fan-out message mà không cần code. Timestream giữ dữ liệu gần đây trong bộ nhớ để truy vấn "giờ vừa qua của từng đồng hồ" thật nhanh rồi tự chuyển dữ liệu cũ sang kho rẻ, còn Firehose gom luồng thô thành file trong S3 để lưu nhiều năm và phân tích bằng Athena. Trong workshop thật, một rule còn có thể ghi thẳng vào Timestream — Lambda chỉ cần khi phải làm giàu hoặc kiểm tra dữ liệu.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['iot', 'iot-core', 1, 1],
      ['fn', 'lambda', 2, 0, { memoryMB: '256', durationMs: 20 }],
      ['ts', 'timestream', 3, 0, { storageGB: 200 }],
      ['fh', 'firehose', 2, 2],
      ['archive', 's3', 3, 2, { storageClass: 'intelligent-tiering', storageGB: 5000 }],
    ],
    ['users>iot', 'iot>fn', 'fn>ts', 'iot>fh', 'fh>archive'],
    iotScenario,
  ),
});

// ---------------------------------------------------------------------------

const searchScenario = scenario({ rps: 600, peakMultiplier: 3, readRatio: 0.9, payloadKB: 4 });
export const productSearch = challenge({
  id: 'product-search',
  kind: 'canvas-design',
  skills: ['aws.analytics.search', 'aws.databases.dynamodb'],
  title: tx('Full-text product search next to DynamoDB', 'Tìm kiếm sản phẩm toàn văn bên cạnh DynamoDB'),
  brief: tx(
    'A pattern from many AWS blog posts and the DynamoDB → OpenSearch integration: a shop keeps its catalog in DynamoDB (perfect for "get product by id"), but customers also type free text like "red running shoes under $100" — something DynamoDB cannot do.\n\n~600 requests/second (3× at peak), 90% reads.\n\nKeep DynamoDB as the source of truth, **sync every change** into a search index through the table\'s change stream, and serve searches from the index. Survive an AZ outage.',
    'Một pattern xuất hiện trong nhiều bài blog của AWS và tích hợp DynamoDB → OpenSearch: cửa hàng lưu catalog trong DynamoDB (hoàn hảo cho "lấy sản phẩm theo id"), nhưng khách hàng còn gõ tự do kiểu "giày chạy bộ màu đỏ dưới 100 đô" — thứ DynamoDB không làm được.\n\n~600 request/giây (gấp 3 lúc cao điểm), 90% là đọc.\n\nGiữ DynamoDB làm nguồn sự thật, **đồng bộ mọi thay đổi** sang search index qua change stream của bảng, và phục vụ tìm kiếm từ index. Chịu được sự cố một AZ.',
  ),
  scenario: searchScenario,
  starter: usersOnly(searchScenario),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', ['dynamodb']], label: tx('Catalog API reads and writes DynamoDB', 'API catalog đọc và ghi DynamoDB') },
    {
      type: 'flow',
      steps: [['dynamodb'], ['lambda'], ['opensearch']],
      label: tx('DynamoDB Streams → Lambda → OpenSearch keeps the index in sync', 'DynamoDB Streams → Lambda → OpenSearch giữ index luôn đồng bộ'),
    },
    R.errors(),
    R.p95(200),
    R.survivesAz(),
    R.cost(5000),
  ],
  hints: [
    tx('Draw an edge from the table to a function: that is DynamoDB Streams.', 'Kéo một cạnh từ bảng tới một function: đó chính là DynamoDB Streams.'),
    tx('The API function talks to both stores: DynamoDB for writes and lookups by id, OpenSearch for text queries.', 'Function API nói chuyện với cả hai kho: DynamoDB cho ghi và tra theo id, OpenSearch cho truy vấn văn bản.'),
    tx('Users → API Gateway → Lambda → DynamoDB + OpenSearch (4× r6g.xlarge, zone-aware); DynamoDB → Lambda (sync) → OpenSearch.', 'Users → API Gateway → Lambda → DynamoDB + OpenSearch (4× r6g.xlarge, zone-aware); DynamoDB → Lambda (đồng bộ) → OpenSearch.'),
  ],
  debrief: tx(
    'Each store does what it is good at: DynamoDB for consistent key lookups and writes, OpenSearch for relevance-ranked text and facets. The stream makes the index eventually consistent (usually under a second behind) without dual writes in your API — if the API wrote to both, one failure would leave them out of sync forever. AWS now offers a zero-ETL integration that does the sync for you.',
    'Mỗi kho làm việc nó giỏi: DynamoDB cho tra cứu theo key và ghi nhất quán, OpenSearch cho tìm kiếm văn bản có xếp hạng liên quan và bộ lọc. Stream làm index nhất quán sau (thường trễ dưới một giây) mà API không phải ghi kép — nếu API tự ghi vào cả hai, chỉ một lần lỗi là chúng lệch nhau mãi mãi. Hiện AWS còn có tích hợp zero-ETL làm phần đồng bộ này hộ bạn.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'http' }],
      ['fn', 'lambda', 2, 1, { subnet: 'private', memoryMB: '512', durationMs: 40 }],
      ['vpce', 'vpce', 2, 2, { type: 'gateway' }, 'S3/DynamoDB endpoint'],
      ['table', 'dynamodb', 3, 0, { storageGB: 20 }],
      ['sync', 'lambda', 4, 0, { subnet: 'private', memoryMB: '256', durationMs: 50 }],
      ['search', 'opensearch', 3, 2, { nodeType: 'r6g.xlarge.search', count: 4, zoneAware: true, storageGB: 50 }],
    ],
    ['users>api', 'api>fn', 'fn>table', 'fn>search', 'table>sync', 'sync>search'],
    searchScenario,
  ),
});

// ===========================================================================
// Module: real-world case studies (System Design Primer, AWS Solutions)
// ===========================================================================

const timelineScenario = scenario({ rps: 8000, peakMultiplier: 3, readRatio: 0.95, payloadKB: 8 });
export const timeline = challenge({
  id: 'twitter-timeline',
  kind: 'canvas-design',
  skills: ['aws.messaging.fanout', 'aws.caching.elasticache'],
  title: tx('Design the Twitter home timeline', 'Thiết kế home timeline của Twitter'),
  brief: tx(
    'A System Design Primer classic: users post short messages, and opening the app shows a **home timeline** of posts from everyone they follow.\n\n~8,000 requests/second (3× during big events), 95% are timeline reads, ~8 KB per response.\n\nUse **fan-out on write**: when someone posts, the post is stored durably and an asynchronous worker pushes its id into each follower\'s timeline list kept **in memory**. Reading a timeline is then one cache lookup. Survive an AZ outage.',
    'Một bài kinh điển trong System Design Primer: người dùng đăng tin ngắn, và mở app sẽ thấy **home timeline** gồm bài của mọi người họ theo dõi.\n\n~8.000 request/giây (gấp 3 khi có sự kiện lớn), 95% là đọc timeline, mỗi response ~8 KB.\n\nDùng **fan-out on write**: khi ai đó đăng bài, bài được lưu bền vững và một worker bất đồng bộ đẩy id bài vào danh sách timeline **trong bộ nhớ** của từng follower. Khi đó đọc timeline chỉ là một lần tra cache. Chịu được sự cố một AZ.',
  ),
  scenario: timelineScenario,
  starter: usersOnly(timelineScenario),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', 'cache'], label: tx('Timelines are read from an in-memory cache', 'Timeline được đọc từ cache trong bộ nhớ') },
    { type: 'flow', steps: ['entry', 'compute', 'data'], label: tx('Posts are stored durably', 'Bài đăng được lưu bền vững') },
    { type: 'flow', steps: ['compute', 'async', ['lambda', 'fargate', 'ecs-ec2']], label: tx('Fan-out runs asynchronously through a queue/topic to workers', 'Fan-out chạy bất đồng bộ qua queue/topic tới worker') },
    R.errors(),
    R.p95(100),
    R.survivesAz(),
    R.cost(30000),
  ],
  hints: [
    tx('Reads dominate 20 to 1 — precompute every timeline so a read never has to join "who do I follow" with "their posts".', 'Lượt đọc gấp 20 lần lượt ghi — hãy tính sẵn mọi timeline để lúc đọc không bao giờ phải join "tôi theo dõi ai" với "bài của họ".'),
    tx('Posting must return fast; pushing to thousands of followers happens behind a queue.', 'Đăng bài phải trả về nhanh; việc đẩy tới hàng nghìn follower diễn ra phía sau một queue.'),
    tx('ALB → Fargate (multi-AZ) → ElastiCache (replica) + DynamoDB; Fargate → SQS → Lambda (fan-out workers).', 'ALB → Fargate (multi-AZ) → ElastiCache (có replica) + DynamoDB; Fargate → SQS → Lambda (worker fan-out).'),
  ],
  debrief: tx(
    'This is Twitter\'s actual design as described in the primer: timelines live in Redis lists, so reads are O(1) and never touch the database. The catch is celebrities — fanning one post out to 50 million followers is expensive — so the real system mixes in fan-out on READ for accounts with huge follower counts and merges their posts in at read time.',
    'Đây chính là thiết kế thật của Twitter như primer mô tả: timeline nằm trong Redis list, nên đọc là O(1) và không bao giờ chạm tới database. Điểm vướng là người nổi tiếng — fan-out một bài tới 50 triệu follower rất tốn kém — nên hệ thống thật trộn thêm fan-out on READ cho các tài khoản có lượng follower khổng lồ và ghép bài của họ vào lúc đọc.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '2-4', count: 8, autoscaling: true, maxCount: 60, multiAz: true }],
      ['vpce-if', 'vpce', 1, 2, { type: 'interface' }, 'Interface endpoint'],
      ['vpce', 'vpce', 2, 2, { type: 'gateway' }, 'S3/DynamoDB endpoint'],
      ['timelines', 'elasticache', 3, 0, { nodeType: 'cache.r6g.large', replicas: 1, hitRatio: 0.95 }],
      ['posts', 'dynamodb', 3, 1, { storageGB: 200 }],
      ['q', 'sqs', 3, 2],
      ['fanout', 'lambda', 4, 2, { memoryMB: '512', durationMs: 100 }],
    ],
    ['users>lb', 'lb>app', 'app>timelines', 'app>posts', 'app>q', 'q>fanout'],
    timelineScenario,
  ),
});

// ---------------------------------------------------------------------------

const vodScenario = scenario({ rps: 300, peakMultiplier: 4, readRatio: 0.98, payloadKB: 2000 });
export const vod = challenge({
  id: 'video-on-demand',
  kind: 'canvas-fix',
  skills: ['aws.edge.cloudfront', 'aws.storage.s3'],
  title: tx('Video on Demand, the AWS Solutions way', 'Video theo yêu cầu theo cách của AWS Solutions'),
  brief: tx(
    'Based on the AWS Solution "Video on Demand on AWS": creators upload source videos, which are transcoded into adaptive-bitrate (HLS) renditions and streamed to viewers worldwide.\n\n~300 requests/second (4× in the evening), almost all of them video segment downloads of ~2 MB.\n\nToday an EC2 fleet both transcodes with ffmpeg and serves the segments from its disks. Rebuild it: creators upload straight into an S3 bucket (presigned URLs, so the viewers on the canvas are only the watchers), an **S3 event** starts a managed transcoding job, outputs go back to S3, and viewers stream through a CDN.',
    'Dựa trên AWS Solution "Video on Demand on AWS": nhà sáng tạo upload video gốc, video được chuyển mã thành các bản adaptive-bitrate (HLS) và stream tới người xem khắp thế giới.\n\n~300 request/giây (gấp 4 vào buổi tối), gần như toàn bộ là tải các đoạn video ~2 MB.\n\nHiện tại một fleet EC2 vừa chuyển mã bằng ffmpeg vừa phục vụ các đoạn video từ ổ đĩa của nó. Hãy dựng lại: nhà sáng tạo upload thẳng vào một bucket S3 (qua presigned URL, nên Users trên canvas chỉ là người xem), một **S3 event** khởi chạy job chuyển mã được quản lý, kết quả ghi lại vào S3, và người xem stream qua CDN.',
  ),
  scenario: vodScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['fleet', 'ec2', 2, 1, { instanceType: 'm6i.2xlarge', count: 6, autoscaling: false, multiAz: true }],
    ],
    ['users>lb', 'lb>fleet'],
    vodScenario,
  ),
  requirements: [
    { type: 'flow', steps: [['cloudfront'], ['s3']], label: tx('Viewers stream from S3 through CloudFront', 'Người xem stream từ S3 qua CloudFront') },
    {
      type: 'flow',
      steps: [['s3'], ['lambda'], ['mediaconvert'], ['s3']],
      label: tx('S3 event → Lambda → MediaConvert → S3', 'S3 event → Lambda → MediaConvert → S3'),
    },
    { type: 'not-uses', services: ['ec2'], label: tx('No transcoding servers to manage', 'Không có server chuyển mã nào phải quản lý') },
    R.errors(),
    R.p95(150),
    R.cost(145000),
  ],
  hints: [
    tx('Video segments are static files, read millions of times — the CDN should serve nearly all of them.', 'Các đoạn video là file tĩnh, được đọc hàng triệu lần — CDN nên phục vụ gần như toàn bộ.'),
    tx('Uploading a source file to S3 can invoke a Lambda that submits a MediaConvert job.', 'Upload file gốc lên S3 có thể gọi một Lambda để gửi job MediaConvert.'),
    tx('Users → CloudFront (high hit ratio) → S3 (outputs); and a sources bucket → Lambda → MediaConvert → S3 (outputs).', 'Users → CloudFront (hit ratio cao) → S3 (kết quả); và bucket file gốc → Lambda → MediaConvert → S3 (kết quả).'),
  ],
  debrief: tx(
    'The AWS solution is fully event-driven (it adds Step Functions to orchestrate ingest, process and publish, plus SNS notifications). Delivery dominates the bill — data transfer out — so the CDN hit ratio and the bitrate ladder matter far more than the transcoding cost. Transcoding happens once per video; delivery happens on every view.',
    'Giải pháp của AWS hoàn toàn hướng sự kiện (nó thêm Step Functions để điều phối các bước nạp, xử lý và phát hành, cùng thông báo SNS). Phần phân phối chiếm phần lớn hoá đơn — data transfer ra ngoài — nên hit ratio của CDN và bậc bitrate quan trọng hơn nhiều so với chi phí chuyển mã. Chuyển mã chỉ diễn ra một lần mỗi video; phân phối thì diễn ra ở mỗi lượt xem.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['cdn', 'cloudfront', 1, 0, { hitRatio: 0.95 }],
      ['out', 's3', 5, 0, { storageGB: 20000 }],
      ['src', 's3', 3, 2, { storageGB: 5000 }],
      ['submit', 'lambda', 4, 2, { memoryMB: '128', durationMs: 100 }],
      ['mc', 'mediaconvert', 5, 2],
    ],
    ['users>cdn', 'cdn>out', 'src>submit', 'submit>mc', 'mc>out'],
    vodScenario,
  ),
});

// ---------------------------------------------------------------------------

const waitingScenario = scenario({ rps: 300, peakMultiplier: 30, readRatio: 0.3, payloadKB: 2 });
export const waitingRoom = challenge({
  id: 'virtual-waiting-room',
  kind: 'canvas-fix',
  skills: ['aws.messaging.flash-sale', 'aws.messaging.load-levelling'],
  title: tx('A virtual waiting room for a ticket drop', 'Phòng chờ ảo cho đợt mở bán vé'),
  brief: tx(
    'Inspired by the AWS Solution "Virtual Waiting Room on AWS" (and every concert-ticket meltdown): normally ~300 requests/second, but when tickets go on sale traffic jumps **30×** within seconds.\n\nToday ALB → a fixed EC2 fleet → Aurora, and the database falls over at the drop.\n\nAdd a waiting room: the edge serves the static pages, purchase requests are **admitted through a queue** at a rate the backend can take, and the queue position lives in a fast key-value store. Survive an AZ outage.',
    'Lấy cảm hứng từ AWS Solution "Virtual Waiting Room on AWS" (và mọi vụ sập web bán vé concert): bình thường ~300 request/giây, nhưng lúc mở bán vé traffic tăng **gấp 30** chỉ trong vài giây.\n\nHiện tại ALB → fleet EC2 cố định → Aurora, và database gục ngay lúc mở bán.\n\nHãy thêm phòng chờ: edge phục vụ các trang tĩnh, request mua vé được **cho vào qua một queue** theo nhịp backend chịu được, và vị trí trong hàng lưu ở kho key-value nhanh. Chịu được sự cố một AZ.',
  ),
  scenario: waitingScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 'c6i.xlarge', count: 4, autoscaling: false, multiAz: true }],
      ['db', 'aurora', 3, 1, { instanceClass: 'db.r6g.large', replicas: 1 }],
    ],
    ['users>lb', 'lb>app', 'app>db'],
    waitingScenario,
  ),
  requirements: [
    { type: 'flow', steps: [['cloudfront'], 'entry'], label: tx('A CDN in front absorbs the page loads', 'CDN phía trước hấp thụ lượt tải trang') },
    { type: 'flow', steps: ['entry', 'compute', ['sqs'], 'compute', ['aurora', 'rds']], label: tx('Purchases wait in SQS before reaching the database', 'Lượt mua vé chờ trong SQS trước khi tới database') },
    { type: 'flow', steps: ['compute', ['dynamodb', 'elasticache', 'elasticache-serverless']], label: tx('Queue positions in DynamoDB or ElastiCache', 'Vị trí trong hàng lưu ở DynamoDB hoặc ElastiCache') },
    R.errors(),
    R.survivesAz(),
    R.cost(6000),
  ],
  hints: [
    tx('You cannot scale a relational database 30× in seconds — so do not send it 30× the traffic.', 'Bạn không thể scale một database quan hệ lên gấp 30 trong vài giây — vậy thì đừng gửi cho nó gấp 30 traffic.'),
    tx('Hand every visitor a token and a position fast; let a worker admit purchases from a queue at a steady rate.', 'Đưa cho mỗi người một token và một vị trí thật nhanh; để worker cho lượt mua vào từ queue với nhịp ổn định.'),
    tx('Users → CloudFront → API Gateway → Lambda → DynamoDB (positions) + SQS → Lambda (reserved concurrency) → Aurora.', 'Users → CloudFront → API Gateway → Lambda → DynamoDB (vị trí) + SQS → Lambda (giới hạn concurrency) → Aurora.'),
  ],
  debrief: tx(
    'The waiting room turns an unpredictable spike into a controlled flow: everything in front of the queue is serverless and scales instantly, everything behind it sees a constant rate. The AWS solution issues signed tokens, lets clients poll their position, and raises the admission rate as the backend proves it can cope — the same idea used by large ticketing and sneaker-drop sites.',
    'Phòng chờ biến một đợt tăng vọt khó lường thành dòng chảy được kiểm soát: mọi thứ trước queue đều serverless và scale tức thì, mọi thứ sau queue chỉ thấy một nhịp không đổi. Giải pháp của AWS cấp token có chữ ký, cho client hỏi định kỳ vị trí của mình, và tăng dần tốc độ cho vào khi backend chứng tỏ chịu được — đúng ý tưởng mà các trang bán vé lớn và trang mở bán giày "drop" đang dùng.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['cdn', 'cloudfront', 1, 1, { hitRatio: 0.7 }],
      ['api', 'apigw', 2, 1, { type: 'http' }],
      ['gate', 'lambda', 3, 1, { memoryMB: '256', durationMs: 30 }],
      ['pos', 'dynamodb', 4, 0, { storageGB: 5 }],
      ['q', 'sqs', 4, 2],
      ['buy', 'lambda', 5, 2, { subnet: 'private', memoryMB: '512', durationMs: 150, concurrency: 50 }],
      ['db', 'aurora', 6, 2, { instanceClass: 'db.r6g.large', replicas: 1 }],
    ],
    ['users>cdn', 'cdn>api', 'api>gate', 'gate>pos', 'gate>q', 'q>buy', 'buy>db'],
    waitingScenario,
  ),
});

export const exercises: CourseExercises = {
  'web-apps': { 'classic-web': [resume, pastebin, wordpress] },
  'event-driven': { pipelines: [thumbnails, webhooks, notifications] },
  'scale-cost': { 'scale-and-cost': [million, leaderboard, devEnv] },
  workshops: { 'aws-workshops': [wildRydes, wsChat, orderSaga] },
  'data-iot': { 'streams-and-search': [clickstream, iotTelemetry, productSearch] },
  'case-studies': { 'famous-systems': [timeline, vod, waitingRoom] },
};
