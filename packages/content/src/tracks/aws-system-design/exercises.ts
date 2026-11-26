import { buildDesign, tx } from '@cloudlab/catalog';
import type { CourseExercises } from '../../define.ts';
import { exerciseBuilders, R, scenario, usersOnly, withSecurityGroups } from '../../helpers.ts';

const { quiz, estimate, challenge } = exerciseBuilders('aws-system-design');

// ---------------------------------------------------------------- news feed
const feedScenario = scenario({ rps: 20000, peakMultiplier: 2, readRatio: 0.95, payloadKB: 4 });

export const newsFeed = challenge({
  id: 'news-feed',
  kind: 'canvas-design',
  skills: ['system-design.feeds', 'aws.caching.elasticache', 'aws.architecture.decoupling'],
  title: tx('Design a news feed', 'Thiết kế news feed'),
  brief: tx(
    'A social app: 20,000 req/s (2× in the evening), 95% are "load my feed", 5% are new posts. Feeds must load fast (p95 ≤ 100 ms), and posting must not wait for the post to be copied into followers\' timelines.\n\nDesign it so it also survives an AZ outage.',
    'Một ứng dụng mạng xã hội: 20.000 req/s (gấp đôi buổi tối), 95% là "tải feed của tôi", 5% là bài đăng mới. Feed phải tải nhanh (p95 ≤ 100 ms), và việc đăng bài không được phải chờ bài đó được chép vào timeline của người theo dõi.\n\nThiết kế sao cho hệ thống cũng chịu được sự cố một AZ.',
  ),
  scenario: feedScenario,
  starter: usersOnly(feedScenario),
  requirements: [
    R.connected(),
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    { type: 'flow', steps: ['entry', 'compute', 'async', 'compute', 'data'] },
    R.errors(),
    R.p95(100),
    R.survivesAz(),
    { type: 'uses', services: ['elasticache'], label: tx('Timelines served from an in-memory cache', 'Timeline được phục vụ từ cache trong bộ nhớ') },
    { type: 'uses', services: ['sqs', 'sns', 'kinesis', 'eventbridge'], label: tx('Fan-out happens asynchronously', 'Fan-out diễn ra bất đồng bộ') },
    R.cost(55000),
  ],
  hints: [
    tx('Reads dominate 19:1 — precompute each user\'s timeline (fan-out on write) and serve it from Redis.', 'Lượt đọc áp đảo 19:1 — tính sẵn timeline của mỗi user (fan-out khi ghi) và phục vụ nó từ Redis.'),
    tx('A new post goes to a queue; workers copy it into followers\' timelines in the background.', 'Bài đăng mới được đưa vào queue; worker chép nó vào timeline của người theo dõi ở chạy nền.'),
    tx('Users → ALB → Fargate (autoscaling) → ElastiCache (with a replica) + DynamoDB; Fargate → SQS → Lambda fan-out workers → DynamoDB.', 'Users → ALB → Fargate (autoscaling) → ElastiCache (có replica) + DynamoDB; Fargate → SQS → Lambda fan-out worker → DynamoDB.'),
  ],
  debrief: tx(
    'Fan-out on write makes reads cheap: a feed is one cache lookup. Its weakness is celebrities with millions of followers — real systems use a hybrid: fan-out on write for normal users, and merge celebrity posts at read time. The queue keeps posting fast and absorbs bursts, and the cache replica keeps feeds fast through an AZ outage.',
    'Fan-out khi ghi làm việc đọc trở nên rẻ: một feed chỉ là một lần tra cache. Điểm yếu của nó là người nổi tiếng có hàng triệu người theo dõi — hệ thống thật dùng cách lai: fan-out khi ghi cho người dùng bình thường, và trộn bài của người nổi tiếng lúc đọc. Queue giúp việc đăng bài nhanh và hấp thụ các đợt tăng vọt, còn replica của cache giữ feed nhanh khi mất một AZ.',
  ),
  reference: withSecurityGroups(buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '2-4', count: 4, autoscaling: true, maxCount: 70, multiAz: true }],
      ['vpce-if', 'vpce', 1, 2, { type: 'interface' }, 'Interface endpoint'],
      ['vpce', 'vpce', 2, 2, { type: 'gateway' }, 'S3/DynamoDB endpoint'],
      ['cache', 'elasticache', 3, 0, { nodeType: 'cache.r6g.large', replicas: 1, hitRatio: 0.95 }],
      ['posts', 'dynamodb', 3, 1, { mode: 'on-demand' }],
      ['q', 'sqs', 3, 2],
      ['fan', 'lambda', 4, 2, { memoryMB: '512', durationMs: 200 }],
      ['timelines', 'dynamodb', 5, 2, { mode: 'on-demand' }],
    ],
    ['users>lb', 'lb>app', 'app>cache', 'app>posts', 'app>q', 'q>fan', 'fan>timelines'],
    feedScenario,
  )),
});

// ---------------------------------------------------------- video streaming
const videoScenario = scenario({ rps: 200, peakMultiplier: 2, readRatio: 0.99, payloadKB: 1000 });

export const videoStreaming = challenge({
  id: 'video-streaming',
  kind: 'canvas-design',
  skills: ['system-design.media', 'aws.edge.cloudfront', 'aws.cost.transfer'],
  title: tx('Design video streaming', 'Thiết kế video streaming'),
  brief: tx(
    'A video platform serves 200 segment requests per second (2× at peak), each segment ~1 MB — about 500 TB a month leaving AWS. Videos are already transcoded and stored as segments.\n\nServe them with low latency worldwide, without a fleet of servers, and keep the bill under control.',
    'Một nền tảng video phục vụ 200 request segment mỗi giây (gấp đôi lúc cao điểm), mỗi segment ~1 MB — khoảng 500 TB mỗi tháng đi ra khỏi AWS. Video đã được chuyển mã sẵn và lưu dưới dạng segment.\n\nHãy phục vụ chúng với độ trễ thấp trên toàn cầu, không cần một fleet server, và giữ hoá đơn trong tầm kiểm soát.',
  ),
  scenario: videoScenario,
  starter: usersOnly(videoScenario),
  requirements: [
    R.connected(),
    { type: 'flow', steps: [['cloudfront'], ['s3']] },
    R.errors(),
    R.p95(150),
    { type: 'uses', services: ['cloudfront'], label: tx('Served through a CDN', 'Phục vụ qua CDN') },
    { type: 'uses', services: ['s3'], label: tx('Segments stored in S3', 'Segment lưu trên S3') },
    { type: 'not-uses', services: ['ec2', 'fargate', 'eks'], label: tx('No server fleet on the delivery path', 'Không có fleet server trên đường phân phối') },
    R.cost(52000),
  ],
  hints: [
    tx('Video segments are static files — the same segment is watched by many people.', 'Segment video là file tĩnh — cùng một segment được nhiều người xem.'),
    tx('A CDN caches popular segments at the edge (high hit ratio), and CloudFront egress is cheaper than serving from the origin.', 'CDN cache các segment phổ biến ở edge (tỉ lệ hit cao), và egress của CloudFront rẻ hơn phục vụ từ origin.'),
    tx('Users → CloudFront (hit ratio ~0.95) → S3.', 'Users → CloudFront (tỉ lệ hit ~0,95) → S3.'),
  ],
  debrief: tx(
    'Delivery is a CDN problem: segments are immutable, so they cache perfectly and the origin sees only a few percent of requests. Data transfer dominates the bill — at this scale you would negotiate CloudFront volume pricing. The upload side (presigned S3 uploads → S3 event → MediaConvert → segments + manifests) is a separate asynchronous pipeline.',
    'Phân phối là bài toán của CDN: segment là bất biến nên cache rất tốt, và origin chỉ nhận vài phần trăm request. Truyền dữ liệu chiếm phần lớn hoá đơn — ở quy mô này bạn sẽ thương lượng giá theo khối lượng với CloudFront. Phía upload (presigned upload lên S3 → S3 event → MediaConvert → segment + manifest) là một pipeline bất đồng bộ riêng.',
  ),
  reference: withSecurityGroups(buildDesign(
    [
      ['users', 'users', 0, 1],
      ['cdn', 'cloudfront', 1, 1, { hitRatio: 0.95 }],
      ['media', 's3', 2, 1, { storageClass: 'standard' }],
    ],
    ['users>cdn', 'cdn>media'],
    videoScenario,
  )),
});

// --------------------------------------------------------------- flash sale
const flashScenario = scenario({ rps: 500, peakMultiplier: 20, readRatio: 0.9, payloadKB: 2 });

export const flashSale = challenge({
  id: 'flash-sale',
  kind: 'canvas-design',
  skills: ['system-design.overload', 'aws.messaging.sqs', 'aws.edge.cloudfront'],
  title: tx('Design a flash-sale store', 'Thiết kế cửa hàng flash sale'),
  brief: tx(
    'A store normally sees 500 req/s, but at 12:00 sharp a flash sale brings 20× traffic for a few minutes. 90% of requests are product-page views; 10% are orders. Orders must never be lost, and the database must not melt.\n\nDesign for the spike without paying for 20× capacity all day.',
    'Một cửa hàng bình thường nhận 500 req/s, nhưng đúng 12:00 một đợt flash sale mang tới lượng traffic gấp 20 lần trong vài phút. 90% request là xem trang sản phẩm; 10% là đặt hàng. Đơn hàng không bao giờ được mất, và database không được sập.\n\nHãy thiết kế để chịu được đợt tăng vọt mà không phải trả tiền cho 20 lần capacity cả ngày.',
  ),
  scenario: flashScenario,
  starter: usersOnly(flashScenario),
  requirements: [
    R.connected(),
    { type: 'flow', steps: ['entry', 'compute', 'queue', 'compute', 'data'] },
    R.errors(),
    R.p95(200),
    { type: 'uses', services: ['cloudfront'], label: tx('Product pages cached at the edge', 'Trang sản phẩm được cache ở edge') },
    { type: 'uses', services: ['sqs'], label: tx('Orders buffered in a queue', 'Đơn hàng được đệm trong queue') },
    R.cost(3000),
  ],
  hints: [
    tx('Two very different flows: views (cacheable, huge) and orders (must be durable, can be processed a little later).', 'Hai luồng rất khác nhau: lượt xem (cache được, rất lớn) và đơn hàng (phải bền vững, có thể xử lý trễ một chút).'),
    tx('Absorb views at the CDN; accept orders into a queue and process them at a steady pace (load levelling).', 'Hấp thụ lượt xem ở CDN; nhận đơn hàng vào queue và xử lý với nhịp ổn định (load levelling).'),
    tx('Users → CloudFront → API Gateway → Lambda (intake) → SQS → Lambda (workers, limited concurrency) → DynamoDB.', 'Users → CloudFront → API Gateway → Lambda (nhận đơn) → SQS → Lambda (worker, giới hạn concurrency) → DynamoDB.'),
  ],
  debrief: tx(
    'Flash sales are an overload problem. The CDN absorbs the read storm, the queue turns a 20× write spike into a steady stream the database can handle, and serverless intake scales instantly without paying for idle peak capacity. Inventory is reserved with a conditional write (stock > 0) so you never oversell; users get "order received" immediately and a confirmation when processed.',
    'Flash sale là bài toán quá tải. CDN hấp thụ cơn bão lượt đọc, queue biến đợt ghi tăng 20 lần thành một dòng đều đặn mà database chịu được, và tầng nhận đơn serverless scale tức thì mà không phải trả tiền cho capacity cao điểm lúc rảnh. Tồn kho được giữ chỗ bằng conditional write (stock > 0) để không bao giờ bán quá số lượng; người dùng nhận "đã nhận đơn" ngay lập tức và nhận xác nhận khi đơn được xử lý.',
  ),
  reference: withSecurityGroups(buildDesign(
    [
      ['users', 'users', 0, 1],
      ['cdn', 'cloudfront', 1, 1, { hitRatio: 0.9 }],
      ['api', 'apigw', 2, 1, { type: 'http' }],
      ['intake', 'lambda', 3, 1, { memoryMB: '256', durationMs: 30, concurrency: 1000 }],
      ['q', 'sqs', 4, 1],
      ['worker', 'lambda', 5, 1, { memoryMB: '512', durationMs: 100, concurrency: 100 }],
      ['orders', 'dynamodb', 6, 1, { mode: 'on-demand' }],
    ],
    ['users>cdn', 'cdn>api', 'api>intake', 'intake>q', 'q>worker', 'worker>orders'],
    flashScenario,
  )),
});

// ------------------------------------------------------------------- chat
const chatScenario = scenario({ rps: 3000, peakMultiplier: 2, readRatio: 0.5, payloadKB: 0.5 });

export const chatApp = challenge({
  id: 'chat-app',
  kind: 'canvas-design',
  skills: ['system-design.realtime', 'aws.serverless.apigw', 'aws.databases.dynamodb'],
  title: tx('Design a chat application', 'Thiết kế ứng dụng chat'),
  brief: tx(
    'A chat app keeps 100,000 users connected at any time and handles 3,000 messages per second (2× at peak). Messages must be pushed to recipients instantly and stored for history.\n\nDesign it serverless (no fleet to manage) and resilient to an AZ outage.\n\nTip: set API Gateway to the WebSocket type with 100,000 connections.',
    'Một ứng dụng chat luôn có 100.000 người dùng kết nối và xử lý 3.000 tin nhắn mỗi giây (gấp đôi lúc cao điểm). Tin nhắn phải được đẩy tới người nhận ngay lập tức và lưu lại làm lịch sử.\n\nHãy thiết kế theo kiểu serverless (không có fleet phải quản lý) và chịu được sự cố một AZ.\n\nGợi ý: đặt API Gateway ở loại WebSocket với 100.000 kết nối.',
  ),
  scenario: chatScenario,
  starter: usersOnly(chatScenario),
  requirements: [
    R.connected(),
    { type: 'flow', steps: [['apigw'], 'compute', 'data'] },
    R.errors(),
    R.p95(150),
    R.survivesAz(),
    { type: 'uses', services: ['apigw'], label: tx('Persistent connections via API Gateway (WebSocket)', 'Kết nối lâu dài qua API Gateway (WebSocket)') },
    { type: 'uses', services: ['dynamodb'], label: tx('Messages stored in DynamoDB', 'Tin nhắn lưu trong DynamoDB') },
    { type: 'not-uses', services: ['ec2', 'eks', 'fargate'], label: tx('Serverless only', 'Chỉ dùng serverless') },
    R.cost(17500),
  ],
  hints: [
    tx('HTTP request/response cannot push messages to clients; WebSockets keep a two-way connection open.', 'Request/response HTTP không đẩy được tin nhắn tới client; WebSocket giữ một kết nối hai chiều luôn mở.'),
    tx('API Gateway WebSocket APIs manage the connections and invoke Lambda per message; Lambda pushes to recipients via the connection IDs.', 'WebSocket API của API Gateway quản lý kết nối và gọi Lambda cho mỗi tin nhắn; Lambda đẩy tới người nhận qua connection ID.'),
    tx('Users → API Gateway (WebSocket, 100,000 connections) → Lambda → DynamoDB (messages keyed by conversation, sorted by time).', 'Users → API Gateway (WebSocket, 100.000 kết nối) → Lambda → DynamoDB (tin nhắn theo key cuộc trò chuyện, sắp theo thời gian).'),
  ],
  debrief: tx(
    'API Gateway WebSockets give you managed persistent connections priced by messages and connection-minutes. DynamoDB stores messages with PK = conversation ID and SK = timestamp, so history is one Query, and a connections table maps users to connection IDs. For very large rooms, fan out through SNS/SQS or move to a fleet with a pub/sub backbone (e.g. ElastiCache Pub/Sub).',
    'WebSocket của API Gateway cho bạn kết nối lâu dài được quản lý, tính giá theo tin nhắn và phút kết nối. DynamoDB lưu tin nhắn với PK = ID cuộc trò chuyện và SK = timestamp, nên lịch sử chỉ là một lần Query, và một bảng kết nối ánh xạ user tới connection ID. Với các phòng rất lớn, fan-out qua SNS/SQS hoặc chuyển sang một fleet có lõi pub/sub (vd ElastiCache Pub/Sub).',
  ),
  reference: withSecurityGroups(buildDesign(
    [
      ['users', 'users', 0, 1],
      ['ws', 'apigw', 1, 1, { type: 'websocket', connections: 100000 }],
      ['fn', 'lambda', 2, 1, { memoryMB: '256', durationMs: 30 }],
      ['msgs', 'dynamodb', 3, 1, { mode: 'on-demand' }],
    ],
    ['users>ws', 'ws>fn', 'fn>msgs'],
    chatScenario,
  )),
});

// ------------------------------------------------------------- ride hailing
const rideScenario = scenario({ rps: 25000, peakMultiplier: 1.5, readRatio: 0.2, payloadKB: 0.2 });

export const rideHailing = challenge({
  id: 'ride-hailing',
  kind: 'canvas-design',
  skills: ['system-design.geo', 'aws.messaging.kinesis', 'aws.caching.elasticache'],
  title: tx('Design real-time ride-hailing locations', 'Thiết kế vị trí gọi xe realtime'),
  brief: tx(
    '100,000 active drivers send their GPS position every 4 seconds — 25,000 req/s, 1.5× at rush hour, 80% of them writes. Riders query "drivers near me" (20%). Location updates also feed analytics and pricing, which may replay recent data.\n\nDesign the ingestion and lookup path. Note: an API Gateway account limit is 10,000 req/s by default.',
    '100.000 tài xế đang hoạt động gửi vị trí GPS mỗi 4 giây — 25.000 req/s, gấp 1,5 lần giờ cao điểm, 80% trong đó là ghi. Hành khách truy vấn "tài xế gần tôi" (20%). Các cập nhật vị trí cũng cung cấp dữ liệu cho phân tích và tính giá, vốn có thể cần phát lại dữ liệu gần đây.\n\nHãy thiết kế đường nạp dữ liệu và tra cứu. Lưu ý: giới hạn mặc định của API Gateway là 10.000 req/s mỗi account.',
  ),
  scenario: rideScenario,
  starter: usersOnly(rideScenario),
  requirements: [
    R.connected(),
    { type: 'flow', steps: ['entry', 'compute', 'cache'] },
    { type: 'flow', steps: ['entry', 'compute', ['kinesis']] },
    R.errors(),
    R.p95(150),
    R.survivesAz(),
    { type: 'uses', services: ['kinesis'], label: tx('Location stream with replay', 'Luồng vị trí có phát lại') },
    { type: 'uses', services: ['elasticache'], label: tx('Geo lookups from memory (Redis GEO)', 'Tra cứu vị trí từ bộ nhớ (Redis GEO)') },
    R.cost(16500),
  ],
  hints: [
    tx('25,000 req/s of tiny writes: API Gateway would hit its limit and charge per request. A load balancer in front of a container fleet scales further and costs less per request.', '25.000 req/s toàn là lượt ghi nhỏ: API Gateway sẽ chạm giới hạn và tính tiền theo request. Load balancer đứng trước một fleet container scale xa hơn và rẻ hơn trên mỗi request.'),
    tx('Write positions into a stream (many consumers, replay); answer "nearby" from an in-memory geo index.', 'Ghi vị trí vào một stream (nhiều consumer, phát lại được); trả lời "gần tôi" từ một geo index trong bộ nhớ.'),
    tx('Users → NLB → Fargate (autoscaling) → ElastiCache (GEO, with replica) and → Kinesis (enough shards for the peak) → Firehose → S3 (history).', 'Users → NLB → Fargate (autoscaling) → ElastiCache (GEO, có replica) và → Kinesis (đủ shard cho cao điểm) → Firehose → S3 (lịch sử).'),
  ],
  debrief: tx(
    'High-frequency location data is a streaming problem: the latest position lives in Redis (GEOADD / GEOSEARCH, or geohash cells), while the full stream goes through Kinesis to history, analytics and pricing consumers that can replay it. Partition the stream by driver ID to keep each driver\'s updates in order. A load balancer + containers handles this request rate far cheaper than per-request API pricing.',
    'Dữ liệu vị trí tần suất cao là bài toán streaming: vị trí mới nhất nằm trong Redis (GEOADD / GEOSEARCH, hoặc ô geohash), còn toàn bộ luồng đi qua Kinesis tới các consumer lịch sử, phân tích và tính giá, vốn có thể phát lại. Partition stream theo ID tài xế để giữ đúng thứ tự cập nhật của mỗi tài xế. Load balancer + container xử lý mức request này rẻ hơn nhiều so với giá API theo request.',
  ),
  reference: withSecurityGroups(buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'nlb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '2-4', count: 6, autoscaling: true, maxCount: 100, multiAz: true }],
      ['vpce-if', 'vpce', 2, 2, { type: 'interface' }, 'Interface endpoint'],
      ['geo', 'elasticache', 3, 0, { nodeType: 'cache.r6g.large', replicas: 1, hitRatio: 0.95 }],
      ['stream', 'kinesis', 3, 2, { shards: 50 }],
      ['fh', 'firehose', 4, 2],
      ['history', 's3', 5, 2, { storageClass: 'standard' }],
    ],
    ['users>lb', 'lb>app', 'app>geo', 'app>stream', 'stream>fh', 'fh>history'],
    rideScenario,
  )),
});

// --------------------------------------------------------- payments ledger
const ledgerScenario = scenario({ rps: 200, peakMultiplier: 3, readRatio: 0.3, payloadKB: 1 });

export const paymentsLedger = challenge({
  id: 'payments-ledger',
  kind: 'canvas-design',
  skills: ['system-design.payments', 'aws.databases.aurora', 'aws.security.edge'],
  title: tx('Design a payments ledger', 'Thiết kế sổ cái thanh toán'),
  brief: tx(
    'A payments service records money movements: 200 req/s (3× at peak), 70% writes. Every entry must be ACID (double-entry: debits = credits), the API is exposed to the internet and must be protected, it must survive an AZ outage with ≥ 99.95% availability, and notifications and reporting must not slow down payments.\n\nDesign it.',
    'Một dịch vụ thanh toán ghi nhận các dòng tiền: 200 req/s (gấp 3 lúc cao điểm), 70% là ghi. Mọi bút toán phải ACID (bút toán kép: tổng nợ = tổng có), API mở ra internet và phải được bảo vệ, phải chịu được sự cố một AZ với availability ≥ 99,95%, và việc gửi thông báo cùng báo cáo không được làm chậm thanh toán.\n\nHãy thiết kế nó.',
  ),
  scenario: ledgerScenario,
  starter: usersOnly(ledgerScenario),
  requirements: [
    R.connected(),
    { type: 'flow', steps: ['entry', 'compute', ['aurora', 'rds']] },
    { type: 'flow', steps: ['entry', 'compute', 'async', 'compute'] },
    R.errors(),
    R.survivesAz(),
    R.availability(0.9995),
    { type: 'uses', services: ['aurora', 'rds'], label: tx('Relational, ACID ledger', 'Sổ cái quan hệ, ACID') },
    { type: 'uses', services: ['waf'], label: tx('API protected by a web application firewall', 'API được bảo vệ bằng web application firewall') },
    { type: 'uses', services: ['sqs', 'sns', 'eventbridge'], label: tx('Side effects handled asynchronously', 'Các tác vụ phụ được xử lý bất đồng bộ') },
    R.noFindings('error', 'security'),
    R.cost(2500),
  ],
  hints: [
    tx('Money needs transactions across several rows (debit + credit) — a relational database with Multi-AZ failover.', 'Tiền cần transaction trên nhiều dòng (nợ + có) — một database quan hệ có failover Multi-AZ.'),
    tx('Availability multiplies along the path: pick components with high SLAs (Aurora with a replica, ALB) and keep the synchronous path short.', 'Availability nhân dần dọc theo đường đi: chọn thành phần có SLA cao (Aurora có replica, ALB) và giữ đường đồng bộ thật ngắn.'),
    tx('Users → WAF → ALB → Fargate → Aurora (1 replica); Fargate → SQS → Lambda (notifications, reporting) → DynamoDB.', 'Users → WAF → ALB → Fargate → Aurora (1 replica); Fargate → SQS → Lambda (thông báo, báo cáo) → DynamoDB.'),
  ],
  debrief: tx(
    'A ledger is append-only, double-entry and transactional — a relational database is the natural fit, with every request carrying an idempotency key so retries never double-charge. Keep the synchronous path minimal (WAF → ALB → service → Aurora) for availability, and push everything else (receipts, webhooks, reporting) through a queue, ideally via a transactional outbox so events are never lost. Audit with immutable logs (CloudTrail, S3 Object Lock).',
    'Sổ cái chỉ ghi thêm, ghi kép và cần transaction — database quan hệ là lựa chọn tự nhiên, với mỗi request mang một idempotency key để retry không bao giờ trừ tiền hai lần. Giữ đường đồng bộ tối thiểu (WAF → ALB → service → Aurora) để có availability cao, và đẩy mọi thứ khác (biên lai, webhook, báo cáo) qua queue, tốt nhất là qua transactional outbox để sự kiện không bao giờ bị mất. Kiểm toán bằng log bất biến (CloudTrail, S3 Object Lock).',
  ),
  reference: withSecurityGroups(buildDesign(
    [
      ['users', 'users', 0, 1],
      ['waf', 'waf', 1, 1],
      ['lb', 'alb', 2, 1],
      ['app', 'fargate', 3, 1, { taskSize: '0.5-1', count: 2, autoscaling: true, maxCount: 10, multiAz: true }],
      ['vpce-if', 'vpce', 3, 2, { type: 'interface' }, 'Interface endpoint'],
      ['ledger', 'aurora', 4, 0, { instanceClass: 'db.r6g.large', replicas: 1 }],
      ['q', 'sqs', 4, 2],
      ['side', 'lambda', 5, 2, { memoryMB: '256', durationMs: 100 }],
      ['reports', 'dynamodb', 6, 2, { mode: 'on-demand' }],
    ],
    ['users>waf', 'waf>lb', 'lb>app', 'app>ledger', 'app>q', 'q>side', 'side>reports'],
    ledgerScenario,
  )),
});

export const exercises: CourseExercises = {
  method: {
    'design-interview': [
      quiz(
        'first-step',
        ['system-design.method'],
        tx('"Design Instagram." What do you do first?', '"Thiết kế Instagram." Bạn làm gì đầu tiên?'),
        [
          ['a', tx('Clarify requirements: core features, users, scale, latency and availability targets', 'Làm rõ yêu cầu: tính năng cốt lõi, người dùng, quy mô, mục tiêu độ trễ và availability'), true, tx('Scope decides everything; designing the wrong system perfectly still fails.', 'Phạm vi quyết định mọi thứ; thiết kế hoàn hảo một hệ thống sai vẫn là thất bại.')],
          ['b', tx('Draw microservices and Kafka', 'Vẽ microservice và Kafka'), false, tx('Jumping to boxes before knowing the requirements is the classic mistake.', 'Nhảy vào vẽ hộp trước khi biết yêu cầu là sai lầm kinh điển.')],
        ],
      ),
      estimate(
        'qps',
        ['system-design.estimation'],
        tx('10 million daily active users each make 20 requests a day. Average requests per second (1 day ≈ 86,400 s, round to the nearest whole number)?', '10 triệu người dùng hoạt động mỗi ngày, mỗi người tạo 20 request mỗi ngày. Trung bình bao nhiêu request mỗi giây (1 ngày ≈ 86.400 giây, làm tròn tới số nguyên gần nhất)?'),
        'req/s',
        2315,
        0.05,
        tx('200 M ÷ 86,400 ≈ 2,315 req/s. A quick shortcut: 1 M requests/day ≈ 12 req/s. Peak is often 2–5× the average.', '200 triệu ÷ 86.400 ≈ 2.315 req/s. Mẹo nhanh: 1 triệu request/ngày ≈ 12 req/s. Cao điểm thường gấp 2–5 lần trung bình.'),
      ),
      estimate(
        'storage',
        ['system-design.estimation'],
        tx('Users upload 2 million photos a day, 500 KB each. Storage added per year, in TB (1 TB = 1,000,000,000 KB, 365 days)?', 'Người dùng upload 2 triệu ảnh mỗi ngày, mỗi ảnh 500 KB. Mỗi năm tăng thêm bao nhiêu dung lượng, tính bằng TB (1 TB = 1.000.000.000 KB, 365 ngày)?'),
        'TB',
        365,
        0.05,
        tx('2 M × 500 KB = 1 TB/day → 365 TB/year (before replicas and thumbnails). Object storage (S3) with lifecycle tiers is the natural fit.', '2 triệu × 500 KB = 1 TB/ngày → 365 TB/năm (chưa tính bản sao và thumbnail). Object storage (S3) với các tầng lifecycle là lựa chọn tự nhiên.'),
      ),
      quiz(
        'trade-offs',
        ['system-design.method'],
        tx('What makes a system-design answer strong?', 'Điều gì làm cho một câu trả lời thiết kế hệ thống trở nên tốt?'),
        [
          ['a', tx('Explicit trade-offs: why this option, what it costs, and what you would change at 10× scale', 'Nêu rõ các đánh đổi: vì sao chọn phương án này, nó tốn gì, và bạn sẽ thay đổi gì khi quy mô gấp 10 lần'), true, tx('There is no perfect design — only justified choices for given requirements.', 'Không có thiết kế hoàn hảo — chỉ có lựa chọn có lý do cho những yêu cầu cụ thể.')],
          ['b', tx('Using as many services as possible', 'Dùng càng nhiều dịch vụ càng tốt'), false, tx('Every component adds cost, latency and failure modes.', 'Mỗi thành phần đều thêm chi phí, độ trễ và kiểu lỗi.')],
        ],
      ),
    ],
  },
  systems: {
    'news-feed': [
      quiz(
        'fanout',
        ['system-design.feeds'],
        tx('A celebrity with 50 million followers posts. Why is pure fan-out on write a problem?', 'Một người nổi tiếng có 50 triệu người theo dõi đăng bài. Vì sao fan-out khi ghi thuần tuý là vấn đề?'),
        [
          ['a', tx('One post triggers 50 million timeline writes; use a hybrid — merge celebrity posts at read time', 'Một bài đăng kích hoạt 50 triệu lượt ghi timeline; hãy dùng cách lai — trộn bài của người nổi tiếng lúc đọc'), true, tx('Fan-out on write for normal users, on read for accounts with huge follower counts.', 'Fan-out khi ghi cho người dùng thường, khi đọc cho các tài khoản có số người theo dõi khổng lồ.')],
          ['b', tx('It is not a problem', 'Không có vấn đề gì'), false, tx('It creates massive write amplification and delays.', 'Nó gây khuếch đại ghi khổng lồ và độ trễ.')],
        ],
      ),
      estimate(
        'timeline-cache',
        ['system-design.feeds', 'aws.caching.elasticache'],
        tx('You cache the latest 500 post IDs (8 bytes each) for 20 million users. Memory needed in GB (1 GB = 1,000,000,000 bytes)?', 'Bạn cache 500 ID bài đăng mới nhất (mỗi ID 8 byte) cho 20 triệu người dùng. Cần bao nhiêu bộ nhớ, tính bằng GB (1 GB = 1.000.000.000 byte)?'),
        'GB',
        80,
        0.05,
        tx('20 M × 500 × 8 B = 80 GB (+ overhead) — cache only IDs, fetch post bodies from a separate cache.', '20 triệu × 500 × 8 B = 80 GB (+ overhead) — chỉ cache ID, lấy nội dung bài từ một cache riêng.'),
      ),
      newsFeed,
    ],
    'video-streaming': [
      quiz(
        'abr',
        ['system-design.media'],
        tx('Why are videos cut into small segments in several bitrates (HLS/DASH)?', 'Vì sao video được cắt thành các segment nhỏ ở nhiều bitrate (HLS/DASH)?'),
        [
          ['a', tx('The player switches quality as bandwidth changes, and small static segments cache well on CDNs', 'Trình phát đổi chất lượng khi băng thông thay đổi, và segment tĩnh nhỏ cache rất tốt trên CDN'), true, tx('Adaptive bitrate streaming + CDN is how every major platform works.', 'Adaptive bitrate streaming + CDN là cách mọi nền tảng lớn vận hành.')],
          ['b', tx('To make files harder to download', 'Để file khó tải về hơn'), false, tx('Protection comes from signed URLs/cookies and DRM.', 'Bảo vệ đến từ signed URL/cookie và DRM.')],
        ],
      ),
      estimate(
        'egress',
        ['system-design.media', 'aws.cost.transfer'],
        tx('1 million views a day, 300 MB each. Data transferred per month (30 days), in TB (1 TB = 1,000,000 MB)?', '1 triệu lượt xem mỗi ngày, mỗi lượt 300 MB. Lượng dữ liệu truyền mỗi tháng (30 ngày), tính bằng TB (1 TB = 1.000.000 MB)?'),
        'TB',
        9000,
        0.05,
        tx('1 M × 300 MB × 30 = 9,000 TB (9 PB) a month — egress is THE cost of video, hence CDNs, efficient codecs and negotiated pricing.', '1 triệu × 300 MB × 30 = 9.000 TB (9 PB) mỗi tháng — egress chính là chi phí của video, vì vậy cần CDN, codec hiệu quả và giá thương lượng.'),
      ),
      quiz(
        'upload',
        ['system-design.media'],
        tx('How does a new video get from the creator to viewers?', 'Một video mới đi từ người tạo tới người xem như thế nào?'),
        [
          ['a', tx('Presigned multipart upload to S3 → S3 event → MediaConvert transcodes to HLS renditions → S3 → CloudFront', 'Presigned multipart upload lên S3 → S3 event → MediaConvert chuyển mã sang các phiên bản HLS → S3 → CloudFront'), true, tx('An asynchronous pipeline; the creator gets "processing" and a notification when ready.', 'Một pipeline bất đồng bộ; người tạo nhận trạng thái "đang xử lý" và thông báo khi xong.')],
          ['b', tx('Upload through the API servers, which transcode synchronously', 'Upload qua server API, server chuyển mã đồng bộ'), false, tx('Huge files and minutes of CPU on the request path.', 'File khổng lồ và hàng phút CPU ngay trên đường xử lý request.')],
        ],
      ),
      videoStreaming,
    ],
    'flash-sale-store': [
      quiz(
        'oversell',
        ['system-design.overload', 'aws.databases.dynamodb'],
        tx('How do you guarantee you never sell more items than in stock under heavy concurrency?', 'Làm sao đảm bảo không bao giờ bán quá số lượng tồn kho khi có rất nhiều request đồng thời?'),
        [
          ['a', tx('An atomic conditional update: decrement stock only if stock > 0', 'Một cập nhật có điều kiện, nguyên tử: chỉ giảm tồn kho khi stock > 0'), true, tx('The database enforces the invariant; no read-then-write race.', 'Database đảm bảo bất biến; không có tình trạng đua giữa đọc rồi ghi.')],
          ['b', tx('Read the stock, then write the new value', 'Đọc tồn kho rồi ghi giá trị mới'), false, tx('Two buyers read "1 left" at the same time and both succeed.', 'Hai người mua cùng đọc "còn 1" và cả hai đều thành công.')],
        ],
      ),
      quiz(
        'waiting-room',
        ['system-design.overload'],
        tx('Traffic will exceed even the queue-based design\'s limits. What protects the system and keeps it fair?', 'Traffic sẽ vượt cả giới hạn của thiết kế dùng queue. Cái gì bảo vệ hệ thống và giữ sự công bằng?'),
        [
          ['a', tx('A virtual waiting room that admits users at a controlled rate, plus throttling', 'Một phòng chờ ảo cho người dùng vào với tốc độ có kiểm soát, cộng throttling'), true, tx('Admission control turns overload into a fair queue instead of errors for everyone.', 'Kiểm soát lượt vào biến quá tải thành một hàng đợi công bằng thay vì lỗi cho tất cả.')],
          ['b', tx('Hope autoscaling is fast enough', 'Hy vọng autoscaling đủ nhanh'), false, tx('Scaling takes minutes; the spike takes seconds.', 'Scale mất vài phút; đợt tăng vọt chỉ trong vài giây.')],
        ],
      ),
      estimate(
        'workers',
        ['system-design.overload', 'aws.messaging.sqs'],
        tx('A 10-minute sale produces 600,000 orders. Workers process 500 orders/s. How many minutes until the queue is fully drained (from the start of the sale)?', 'Một đợt sale 10 phút tạo ra 600.000 đơn hàng. Worker xử lý 500 đơn/giây. Mất bao nhiêu phút để queue được xử lý hết (tính từ lúc bắt đầu sale)?'),
        'minutes',
        20,
        0.05,
        tx('600,000 ÷ 500 = 1,200 s = 20 minutes. Users see "order received" instantly; confirmations arrive within 20 minutes — an acceptable trade-off for a database that never melts.', '600.000 ÷ 500 = 1.200 giây = 20 phút. Người dùng thấy "đã nhận đơn" ngay; xác nhận tới trong vòng 20 phút — một đánh đổi chấp nhận được để database không bao giờ sập.'),
      ),
      flashSale,
    ],
    'chat-app': [
      quiz(
        'ordering',
        ['system-design.realtime'],
        tx('How do you show messages in a conversation in the right order?', 'Làm sao hiển thị tin nhắn trong một cuộc trò chuyện đúng thứ tự?'),
        [
          ['a', tx('Server-assigned, per-conversation sortable IDs (e.g. timestamp + sequence) as the sort key', 'ID sắp xếp được, do server gán theo từng cuộc trò chuyện (vd timestamp + số thứ tự) làm sort key'), true, tx('Ordering only matters within a conversation, so the partition is the conversation.', 'Thứ tự chỉ quan trọng trong một cuộc trò chuyện, nên partition chính là cuộc trò chuyện.')],
          ['b', tx('Client device clocks', 'Đồng hồ trên thiết bị của client'), false, tx('Device clocks drift and can be wrong.', 'Đồng hồ thiết bị bị lệch và có thể sai.')],
        ],
      ),
      quiz(
        'offline',
        ['system-design.realtime'],
        tx('A recipient is offline. What happens to the message?', 'Người nhận đang offline. Tin nhắn sẽ ra sao?'),
        [
          ['a', tx('It is stored; the client syncs from its last-seen message ID on reconnect, and a push notification is sent', 'Tin nhắn được lưu; client đồng bộ từ ID tin nhắn cuối đã thấy khi kết nối lại, và một push notification được gửi đi'), true, tx('Delivery = durable storage + sync, not just the live socket.', 'Phân phối = lưu trữ bền vững + đồng bộ, không chỉ là socket đang mở.')],
          ['b', tx('It is dropped', 'Tin nhắn bị bỏ'), false, tx('Users expect messages to arrive later.', 'Người dùng mong tin nhắn tới sau.')],
        ],
      ),
      estimate(
        'connection-cost',
        ['system-design.realtime', 'aws.serverless.apigw'],
        tx('API Gateway WebSocket charges $0.25 per million connection-minutes. 100,000 always-connected users for a 30-day month cost how much in connection fees (USD)?', 'API Gateway WebSocket tính $0.25 mỗi triệu phút kết nối. 100.000 người dùng luôn kết nối trong một tháng 30 ngày tốn bao nhiêu phí kết nối (USD)?'),
        'USD',
        1080,
        0.05,
        tx('100,000 × 43,200 min = 4,320 M connection-minutes × $0.25 = $1,080/month (plus $1 per million messages).', '100.000 × 43.200 phút = 4.320 triệu phút kết nối × $0.25 = $1.080/tháng (cộng $1 mỗi triệu tin nhắn).'),
      ),
      chatApp,
    ],
    'ride-hailing': [
      quiz(
        'geo-index',
        ['system-design.geo'],
        tx('How do you answer "drivers within 2 km" quickly for 100,000 moving drivers?', 'Làm sao trả lời nhanh "tài xế trong bán kính 2 km" với 100.000 tài xế đang di chuyển?'),
        [
          ['a', tx('A geo index — geohash/H3 cells or Redis GEOSEARCH — query nearby cells only', 'Một geo index — ô geohash/H3 hoặc Redis GEOSEARCH — chỉ truy vấn các ô lân cận'), true, tx('Spatial indexing turns a full scan into a handful of cell lookups.', 'Index không gian biến việc quét toàn bộ thành vài lần tra cứu ô.')],
          ['b', tx('Compute the distance to every driver per request', 'Tính khoảng cách tới mọi tài xế cho mỗi request'), false, tx('100,000 distance calculations per query does not scale.', '100.000 phép tính khoảng cách cho mỗi truy vấn thì không scale được.')],
        ],
      ),
      estimate(
        'location-rate',
        ['system-design.estimation'],
        tx('200,000 drivers send their position every 5 seconds. How many updates per second?', '200.000 tài xế gửi vị trí mỗi 5 giây. Có bao nhiêu cập nhật mỗi giây?'),
        'updates/s',
        40000,
        0.001,
        tx('200,000 ÷ 5 = 40,000 updates/s — mostly writes, small payloads, and only the latest position matters for matching.', '200.000 ÷ 5 = 40.000 cập nhật/giây — phần lớn là ghi, payload nhỏ, và chỉ vị trí mới nhất là quan trọng cho việc ghép chuyến.'),
      ),
      quiz(
        'latest-only',
        ['system-design.geo'],
        tx('Which data needs to be strongly durable: the stream of every GPS ping, or completed trips and payments?', 'Dữ liệu nào cần bền vững tuyệt đối: luồng mọi điểm GPS, hay các chuyến đi đã hoàn tất và thanh toán?'),
        [
          ['a', tx('Trips and payments; individual pings are ephemeral (the next one arrives in seconds)', 'Chuyến đi và thanh toán; từng điểm GPS chỉ là tạm thời (điểm tiếp theo tới sau vài giây)'), true, tx('Match durability to value: in-memory for latest positions, durable stores for business records.', 'Chọn độ bền theo giá trị: trong bộ nhớ cho vị trí mới nhất, kho bền vững cho dữ liệu nghiệp vụ.')],
          ['b', tx('Every ping in a Multi-AZ relational database', 'Mọi điểm GPS trong một database quan hệ Multi-AZ'), false, tx('Expensive and unnecessary for data that expires in seconds.', 'Tốn kém và không cần thiết cho dữ liệu hết hạn sau vài giây.')],
        ],
      ),
      rideHailing,
    ],
    'payments-ledger': [
      quiz(
        'double-entry',
        ['system-design.payments'],
        tx('Why do ledgers record every movement as two entries (debit and credit)?', 'Vì sao sổ cái ghi mỗi dòng tiền thành hai bút toán (nợ và có)?'),
        [
          ['a', tx('Every transfer must balance to zero, so errors are detectable and balances are derived from immutable entries', 'Mỗi giao dịch phải cân bằng về 0, nên lỗi phát hiện được và số dư được suy ra từ các bút toán bất biến'), true, tx('Append-only entries + derived balances give a full audit trail.', 'Bút toán chỉ ghi thêm + số dư được suy ra cho một lịch sử kiểm toán đầy đủ.')],
          ['b', tx('To use more storage', 'Để dùng nhiều bộ nhớ hơn'), false, tx('It is about correctness and auditability.', 'Đây là vấn đề về tính đúng đắn và khả năng kiểm toán.')],
        ],
      ),
      quiz(
        'idempotency-key',
        ['system-design.payments', 'aws.architecture.idempotency'],
        tx('The client times out and retries a "charge $50" request. How do you avoid charging twice?', 'Client bị timeout và retry request "trừ $50". Làm sao tránh trừ tiền hai lần?'),
        [
          ['a', tx('The client sends an idempotency key; the server stores it with the result and returns the stored result on retries', 'Client gửi idempotency key; server lưu key cùng kết quả và trả lại kết quả đã lưu khi bị retry'), true, tx('Exactly what payment APIs like Stripe do.', 'Đúng như cách các API thanh toán như Stripe làm.')],
          ['b', tx('Tell clients never to retry', 'Bảo client đừng bao giờ retry'), false, tx('Networks fail; retries are inevitable.', 'Mạng sẽ lỗi; retry là điều không tránh khỏi.')],
        ],
      ),
      estimate(
        'downtime',
        ['aws.reliability.availability-math'],
        tx('At 99.95% availability, how many minutes of downtime are allowed in a 30-day month?', 'Với availability 99,95%, mỗi tháng 30 ngày được phép bao nhiêu phút downtime?'),
        'minutes',
        21.6,
        0.03,
        tx('43,200 min × 0.05% = 21.6 minutes a month.', '43.200 phút × 0,05% = 21,6 phút mỗi tháng.'),
      ),
      paymentsLedger,
    ],
  },
};
