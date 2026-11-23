import { buildDesign, tx, type Scenario } from '@cloudlab/catalog';
import type { CanvasChallenge, Exercise } from '@cloudlab/exercise-kit';
import { exerciseBuilders } from '../../helpers.ts';

const { quiz, estimate } = exerciseBuilders('aws-serverless');

const ordersScenario: Scenario = { rps: 200, peakMultiplier: 4, readRatio: 0.3, payloadKB: 2, region: 'us-east-1' };

export const fanOut: CanvasChallenge = {
  id: 'aws-serverless.fan-out',
  kind: 'canvas-fix',
  skills: ['aws.messaging.sns', 'aws.messaging.sqs', 'aws.architecture.decoupling'],
  title: tx('Fan out the "order placed" event', 'Fan-out sự kiện "đã đặt hàng"'),
  brief: tx(
    'When an order is placed, the orders Lambda calls billing, shipping and email one after another — synchronously. Checkout is slow, and when the email service has a bad day, orders fail.\n\nRedesign it so the user only waits for the order to be saved, and every downstream service still gets every order, with retries.',
    'Khi có đơn hàng mới, Lambda xử lý đơn gọi lần lượt billing, shipping và email — một cách đồng bộ. Checkout chậm, và khi dịch vụ email gặp sự cố thì đơn hàng cũng thất bại theo.\n\nHãy thiết kế lại để người dùng chỉ phải chờ đơn được lưu, còn mọi dịch vụ phía sau vẫn nhận được mọi đơn hàng, có retry.',
  ),
  scenario: ordersScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'http' }],
      ['orders', 'lambda', 2, 1, { memoryMB: '512', durationMs: 80 }],
      ['table', 'dynamodb', 3, 0, { mode: 'on-demand' }],
      ['billing', 'lambda', 3, 1, { memoryMB: '512', durationMs: 300 }],
      ['shipping', 'lambda', 3, 2, { memoryMB: '512', durationMs: 400 }],
      ['email', 'lambda', 3, 3, { memoryMB: '256', durationMs: 900 }],
    ],
    ['users>api', 'api>orders', 'orders>table', 'orders>billing', 'orders>shipping', 'orders>email'],
    ordersScenario,
  ),
  requirements: [
    { type: 'metric', metric: 'errorRate', op: '<=', value: 0.01 },
    { type: 'metric', metric: 'p95Ms', op: '<=', value: 250 },
    { type: 'metric', metric: 'availability', op: '>=', value: 0.998 },
    { type: 'uses', services: ['sns', 'eventbridge'], label: tx('Publishes the event to a topic or bus', 'Publish sự kiện lên topic hoặc bus') },
    { type: 'uses', services: ['sqs'], label: tx('Each consumer has a queue (retry buffer)', 'Mỗi consumer có một queue (bộ đệm để retry)') },
  ],
  hints: [
    tx('Which edges are on the user\'s latency path? Every synchronous call adds its latency and its failure rate.', 'Những cạnh nào nằm trên đường độ trễ của người dùng? Mỗi lời gọi đồng bộ cộng thêm độ trễ và tỉ lệ lỗi của nó.'),
    tx('One message must reach three independent consumers: that is pub/sub fan-out. Give each consumer its own queue so it can retry at its own pace.', 'Một message phải tới ba consumer độc lập: đó là fan-out pub/sub. Cho mỗi consumer một queue riêng để nó retry theo nhịp của mình.'),
    tx('orders → SNS → three SQS queues → billing / shipping / email Lambdas. Keep orders → DynamoDB.', 'orders → SNS → ba queue SQS → Lambda billing / shipping / email. Giữ nguyên orders → DynamoDB.'),
  ],
  debrief: tx(
    'The SNS → SQS fan-out is the classic serverless decoupling pattern: the publisher returns as soon as the event is accepted, each consumer reads from its own durable queue (with a DLQ for poison messages), and a slow or broken consumer no longer affects checkout or the other consumers. Consumers must be idempotent, since delivery is at-least-once.',
    'Fan-out SNS → SQS là mẫu tách rời kinh điển của serverless: publisher trả về ngay khi sự kiện được nhận, mỗi consumer đọc từ queue bền vững của riêng nó (kèm DLQ cho message lỗi), và một consumer chậm hay hỏng không còn ảnh hưởng tới checkout hay các consumer khác. Consumer phải idempotent vì message được gửi ít nhất một lần.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'http' }],
      ['orders', 'lambda', 2, 1, { memoryMB: '512', durationMs: 80 }],
      ['table', 'dynamodb', 3, 0, { mode: 'on-demand' }],
      ['topic', 'sns', 3, 2],
      ['qb', 'sqs', 4, 1],
      ['qs', 'sqs', 4, 2],
      ['qe', 'sqs', 4, 3],
      ['billing', 'lambda', 5, 1, { memoryMB: '512', durationMs: 300 }],
      ['shipping', 'lambda', 5, 2, { memoryMB: '512', durationMs: 400 }],
      ['email', 'lambda', 5, 3, { memoryMB: '256', durationMs: 900 }],
    ],
    ['users>api', 'api>orders', 'orders>table', 'orders>topic', 'topic>qb', 'topic>qs', 'topic>qe', 'qb>billing', 'qs>shipping', 'qe>email'],
    ordersScenario,
  ),
};

const steadyScenario: Scenario = { rps: 2000, peakMultiplier: 1.3, readRatio: 0.8, payloadKB: 2, region: 'us-east-1' };

export const steadyApi: CanvasChallenge = {
  id: 'aws-serverless.steady-api',
  kind: 'canvas-fix',
  skills: ['aws.cost.serverless', 'aws.compute.choosing'],
  title: tx('2,000 req/s, 24/7: serverless or containers?', '2.000 req/s, 24/7: serverless hay container?'),
  brief: tx(
    'A catalogue API started small on REST API Gateway + Lambda. It now serves a steady 2,000 req/s around the clock (peaks only +30%), and the bill has exploded.\n\nKeep the same latency target and DynamoDB, but bring the monthly cost under budget.',
    'Một API catalog bắt đầu nhỏ với REST API Gateway + Lambda. Giờ nó phục vụ đều đặn 2.000 req/s suốt ngày đêm (đỉnh chỉ cao hơn 30%), và hoá đơn đã tăng vọt.\n\nGiữ nguyên mục tiêu độ trễ và DynamoDB, nhưng đưa chi phí hàng tháng xuống dưới ngân sách.',
  ),
  scenario: steadyScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1, { type: 'rest' }],
      ['fn', 'lambda', 2, 1, { memoryMB: '1024', durationMs: 60 }],
      ['table', 'dynamodb', 3, 1, { mode: 'provisioned', rcu: 1200, wcu: 1200 }],
    ],
    ['users>api', 'api>fn', 'fn>table'],
    steadyScenario,
  ),
  requirements: [
    { type: 'metric', metric: 'errorRate', op: '<=', value: 0.01 },
    { type: 'metric', metric: 'p95Ms', op: '<=', value: 300 },
    { type: 'uses', services: ['dynamodb'], label: tx('Keeps DynamoDB', 'Vẫn dùng DynamoDB') },
    { type: 'metric', metric: 'monthlyUsd', op: '<=', value: 3000 },
  ],
  hints: [
    tx('Open the cost panel: which lines grow with every single request?', 'Mở bảng chi phí: dòng nào tăng theo từng request?'),
    tx('At ~5 billion requests a month, per-request pricing (API Gateway + Lambda) loses to capacity you pay for by the hour.', 'Với ~5 tỉ request mỗi tháng, giá theo request (API Gateway + Lambda) thua capacity trả theo giờ.'),
    tx('Replace API Gateway + Lambda with an ALB and an autoscaling Fargate service across AZs.', 'Thay API Gateway + Lambda bằng một ALB và một service Fargate có autoscaling trải nhiều AZ.'),
  ],
  debrief: tx(
    'Serverless is cheapest when traffic is low, spiky or idle. For steady, high throughput, you pay a premium per request that dwarfs hourly capacity: here API Gateway REST alone costs more than the whole container fleet. A common path is to start serverless and move hot, steady endpoints to containers once the break-even point is crossed.',
    'Serverless rẻ nhất khi traffic thấp, theo đợt hoặc hay rảnh. Với throughput cao và đều, bạn trả một khoản phụ trội cho mỗi request, lớn hơn nhiều so với capacity theo giờ: ở đây riêng API Gateway REST đã đắt hơn toàn bộ fleet container. Hướng đi phổ biến là bắt đầu bằng serverless, rồi chuyển các endpoint nóng và đều sang container khi đã vượt điểm hoà vốn.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '1-2', count: 4, autoscaling: true, maxCount: 30, multiAz: true }],
      ['table', 'dynamodb', 3, 1, { mode: 'provisioned', rcu: 1200, wcu: 1200 }],
    ],
    ['users>lb', 'lb>app', 'app>table'],
    steadyScenario,
  ),
};

export const exercises: Record<string, Record<string, Exercise[]>> = {
  api: {
    'api-gateway-deep': [
      quiz(
        'http-vs-rest',
        ['aws.serverless.apigw'],
        ['A JSON API needs JWT auth from Cognito and nothing else fancy. Which API Gateway type?', 'Một JSON API cần xác thực JWT từ Cognito và không cần gì đặc biệt khác. Chọn loại API Gateway nào?'],
        [
          ['a', ['HTTP API', 'HTTP API'], true, ['Cheaper (~$1 vs $3.50 per million), faster, with built-in JWT authorizers.', 'Rẻ hơn (~$1 so với $3.50 mỗi triệu), nhanh hơn, có sẵn JWT authorizer.']],
          ['b', ['REST API', 'REST API'], false, ['Choose REST only for its extras: API keys and usage plans, request transformation, caching, WAF, private endpoints.', 'Chỉ chọn REST khi cần các tính năng thêm: API key và usage plan, biến đổi request, cache, WAF, private endpoint.']],
          ['c', ['WebSocket API', 'WebSocket API'], false, ['For two-way, long-lived connections such as chat — not request/response.', 'Dành cho kết nối hai chiều, sống lâu như chat — không phải request/response.']],
        ],
      ),
      quiz(
        'throttling',
        ['aws.serverless.apigw'],
        ['A partner floods your API and other customers get 429 errors. What protects them?', 'Một đối tác dội request vào API của bạn và các khách hàng khác bị lỗi 429. Cách nào bảo vệ họ?'],
        [
          ['a', ['Usage plans with API keys: per-client rate and burst limits and quotas', 'Usage plan với API key: giới hạn rate, burst và quota cho từng client'], true, ['Per-client throttling keeps one noisy client from consuming the whole account limit.', 'Throttle theo từng client giúp một client ồn ào không ăn hết giới hạn của cả account.']],
          ['b', ['Raise the Lambda memory', 'Tăng bộ nhớ Lambda'], false, ['The problem is fairness between clients, not function speed.', 'Vấn đề là sự công bằng giữa các client, không phải tốc độ function.']],
        ],
      ),
      quiz(
        'timeout',
        ['aws.serverless.apigw'],
        ['A report endpoint takes 2–4 minutes to generate a file. How should the API work?', 'Một endpoint tạo báo cáo mất 2–4 phút để sinh file. API nên hoạt động thế nào?'],
        [
          ['a', ['Return 202 with a job ID, process asynchronously, let the client poll or get notified', 'Trả về 202 kèm job ID, xử lý bất đồng bộ, client hỏi lại hoặc được thông báo'], true, ['API Gateway integrations time out (29 s by default); long work belongs in a queue or workflow.', 'Tích hợp của API Gateway có timeout (mặc định 29 giây); việc dài nên đưa vào queue hoặc workflow.']],
          ['b', ['Keep the request open for 4 minutes', 'Giữ request mở suốt 4 phút'], false, ['It hits the integration timeout and ties up clients.', 'Nó sẽ chạm timeout tích hợp và giữ chân client.']],
        ],
      ),
      estimate(
        'apigw-cost',
        ['aws.serverless.apigw', 'aws.cost.serverless'],
        ['300 million requests per month on an HTTP API at $1.00 per million. Monthly cost in USD?', '300 triệu request mỗi tháng trên HTTP API, giá $1.00 mỗi triệu. Chi phí mỗi tháng (USD)?'],
        'USD',
        300,
        0.02,
        ['300 × $1 = $300. The same on a REST API ($3.50) would be $1,050.', '300 × $1 = $300. Cũng lượng đó trên REST API ($3.50) sẽ là $1.050.'],
      ),
    ],
  },
  events: {
    'messaging-deep': [
      quiz(
        'visibility',
        ['aws.messaging.sqs'],
        ['Workers take up to 90 s per message, and some messages get processed twice. Most likely cause?', 'Worker mất tới 90 giây cho mỗi message, và một số message bị xử lý hai lần. Nguyên nhân có khả năng nhất?'],
        [
          ['a', ['The visibility timeout (30 s default) is shorter than the processing time', 'Visibility timeout (mặc định 30 giây) ngắn hơn thời gian xử lý'], true, ['The message reappears while still being worked on. Set it to ~6× the processing time, and make consumers idempotent anyway.', 'Message xuất hiện lại khi vẫn đang được xử lý. Đặt khoảng 6 lần thời gian xử lý, và dù sao consumer vẫn phải idempotent.']],
          ['b', ['SQS loses messages', 'SQS làm mất message'], false, ['Duplicates, not losses — SQS is at-least-once.', 'Đây là trùng lặp chứ không phải mất — SQS gửi ít nhất một lần.']],
        ],
      ),
      quiz(
        'dlq',
        ['aws.messaging.sqs'],
        ['One malformed message keeps failing and blocks a worker forever. What do you add?', 'Một message sai định dạng cứ lỗi mãi và chặn worker. Bạn thêm gì?'],
        [
          ['a', ['A dead-letter queue with maxReceiveCount (e.g. 5), plus an alarm on it', 'Một dead-letter queue với maxReceiveCount (vd 5), kèm alarm trên nó'], true, ['After N failures the message is moved aside for inspection and redrive.', 'Sau N lần lỗi, message được chuyển sang một bên để kiểm tra và đẩy lại sau.']],
          ['b', ['A longer retention period', 'Thời gian lưu giữ dài hơn'], false, ['That keeps the poison message around even longer.', 'Như vậy chỉ giữ message lỗi lâu hơn.']],
        ],
      ),
      quiz(
        'eventbridge-vs-sns',
        ['aws.messaging.eventbridge'],
        ['Dozens of event types from many services; each consumer wants only events matching rules like "order.total > 1000 and country = VN". Use:', 'Hàng chục loại sự kiện từ nhiều dịch vụ; mỗi consumer chỉ muốn sự kiện khớp rule như "order.total > 1000 và country = VN". Dùng:'],
        [
          ['a', ['EventBridge with content-based rules', 'EventBridge với rule lọc theo nội dung'], true, ['Rules match on any field of the event, with archive and replay and a schema registry.', 'Rule khớp trên bất kỳ trường nào của sự kiện, có archive, replay và schema registry.']],
          ['b', ['One SQS queue shared by everyone', 'Một queue SQS dùng chung cho tất cả'], false, ['Each message goes to only one consumer.', 'Mỗi message chỉ tới được một consumer.']],
        ],
      ),
      fanOut,
    ],
    streams: [
      quiz(
        'stream-vs-queue',
        ['aws.messaging.kinesis'],
        ['Clickstream events must be read by three teams independently, in order per user, and replayed after a bug fix. Use:', 'Sự kiện clickstream phải được ba team đọc độc lập, đúng thứ tự theo từng user, và phát lại được sau khi sửa lỗi. Dùng:'],
        [
          ['a', ['Kinesis Data Streams with partition key = user ID', 'Kinesis Data Streams với partition key = user ID'], true, ['Ordered per shard, multiple independent consumers, retention for replay.', 'Có thứ tự trong mỗi shard, nhiều consumer độc lập, lưu giữ để phát lại.']],
          ['b', ['SQS standard', 'SQS standard'], false, ['Messages are deleted once consumed, with no ordering and no replay.', 'Message bị xoá khi đã được xử lý, không có thứ tự và không phát lại được.']],
        ],
      ),
      estimate(
        'shards',
        ['aws.messaging.kinesis'],
        ['You ingest 6,000 records/s of 0.5 KB. Each shard accepts 1,000 records/s or 1 MB/s. Minimum number of shards?', 'Bạn nạp 6.000 record/giây, mỗi record 0,5 KB. Mỗi shard nhận 1.000 record/giây hoặc 1 MB/giây. Số shard tối thiểu?'],
        'shards',
        6,
        0.001,
        ['Records: 6,000 ÷ 1,000 = 6. Bytes: 3 MB/s ÷ 1 = 3. The larger limit wins: 6 shards (or use on-demand mode).', 'Theo record: 6.000 ÷ 1.000 = 6. Theo byte: 3 MB/s ÷ 1 = 3. Lấy giới hạn lớn hơn: 6 shard (hoặc dùng chế độ on-demand).'],
      ),
      quiz(
        'efo',
        ['aws.messaging.kinesis'],
        ['Five consumers read the same stream and they slow each other down. What helps?', 'Năm consumer cùng đọc một stream và làm chậm lẫn nhau. Cách nào giúp được?'],
        [
          ['a', ['Enhanced fan-out: each consumer gets its own 2 MB/s per shard', 'Enhanced fan-out: mỗi consumer có riêng 2 MB/s cho mỗi shard'], true, ['Without it, all consumers share 2 MB/s per shard of read throughput.', 'Nếu không có nó, mọi consumer dùng chung 2 MB/s mỗi shard cho việc đọc.']],
          ['b', ['Switch to SNS', 'Chuyển sang SNS'], false, ['You would lose ordering and replay.', 'Bạn sẽ mất thứ tự và khả năng phát lại.']],
        ],
      ),
    ],
  },
  orchestration: {
    'step-functions': [
      quiz(
        'standard-express',
        ['aws.serverless.stepfunctions'],
        ['An order workflow waits up to 3 days for a warehouse confirmation. Which workflow type?', 'Một workflow đơn hàng chờ tới 3 ngày để kho xác nhận. Chọn loại workflow nào?'],
        [
          ['a', ['Standard — runs up to a year, exactly-once steps, full history', 'Standard — chạy tới một năm, các bước exactly-once, có đầy đủ lịch sử'], true, ['Waits cost nothing; you pay per state transition.', 'Thời gian chờ không tốn tiền; bạn trả theo số lần chuyển trạng thái.']],
          ['b', ['Express — max 5 minutes', 'Express — tối đa 5 phút'], false, ['Express is for high-volume, short flows like stream processing.', 'Express dành cho flow ngắn, khối lượng lớn như xử lý stream.']],
        ],
      ),
      quiz(
        'saga',
        ['aws.serverless.stepfunctions', 'aws.architecture.sagas'],
        ['Booking a trip reserves a flight, a hotel and a car. The car step fails. What should the workflow do?', 'Đặt chuyến đi gồm giữ vé máy bay, khách sạn và xe. Bước đặt xe thất bại. Workflow nên làm gì?'],
        [
          ['a', ['Run compensating steps: cancel the hotel, then the flight (a saga)', 'Chạy các bước bù trừ: huỷ khách sạn, rồi huỷ vé máy bay (saga)'], true, ['Distributed transactions are replaced by local steps plus compensations, wired with Catch.', 'Transaction phân tán được thay bằng các bước cục bộ cộng các bước bù trừ, nối bằng Catch.']],
          ['b', ['Roll back a database transaction across the three services', 'Rollback một transaction database xuyên ba dịch vụ'], false, ['Separate services do not share one transaction.', 'Các dịch vụ tách biệt không dùng chung một transaction.']],
        ],
      ),
      estimate(
        'sfn-cost',
        ['aws.serverless.stepfunctions', 'aws.cost.serverless'],
        ['A Standard workflow has 10 state transitions and runs 1 million times a month, at $0.025 per 1,000 transitions. Monthly cost in USD?', 'Một workflow Standard có 10 lần chuyển trạng thái, chạy 1 triệu lần mỗi tháng, giá $0.025 mỗi 1.000 lần chuyển. Chi phí mỗi tháng (USD)?'],
        'USD',
        250,
        0.02,
        ['10 M transitions ÷ 1,000 × $0.025 = $250. As an Express workflow of ~1 s, it would cost only a few dollars.', '10 triệu lần chuyển ÷ 1.000 × $0.025 = $250. Nếu là workflow Express chạy ~1 giây thì chỉ tốn vài đô.'],
      ),
    ],
  },
  patterns: {
    'event-patterns': [
      quiz(
        'outbox',
        ['aws.architecture.outbox'],
        ['A service saves an order to the database, then publishes an event — sometimes the publish fails and the event is lost. Fix?', 'Một service lưu đơn vào database rồi publish sự kiện — đôi khi publish lỗi và sự kiện bị mất. Sửa thế nào?'],
        [
          ['a', ['Transactional outbox: write the event to an outbox table in the same transaction, then relay it (e.g. DynamoDB Streams or CDC)', 'Transactional outbox: ghi sự kiện vào bảng outbox trong cùng transaction, rồi chuyển tiếp (vd DynamoDB Streams hoặc CDC)'], true, ['The write and the event become atomic; the relay retries until it succeeds.', 'Việc ghi và sự kiện trở thành nguyên tử; bộ chuyển tiếp retry tới khi thành công.']],
          ['b', ['Publish first, then save', 'Publish trước rồi mới lưu'], false, ['Now the save can fail after consumers already acted.', 'Khi đó việc lưu có thể lỗi sau khi consumer đã hành động.']],
        ],
      ),
      quiz(
        'idempotency',
        ['aws.architecture.idempotency'],
        ['Payment messages can be delivered twice. How do you avoid charging twice?', 'Message thanh toán có thể được gửi hai lần. Làm sao tránh trừ tiền hai lần?'],
        [
          ['a', ['Store an idempotency key (e.g. payment ID) with a conditional write; skip if it already exists', 'Lưu idempotency key (vd payment ID) bằng conditional write; bỏ qua nếu đã tồn tại'], true, ['Processing the same message N times then has the same effect as once.', 'Xử lý cùng một message N lần khi đó có tác dụng như một lần.']],
          ['b', ['Use a standard SQS queue', 'Dùng SQS standard'], false, ['Standard queues are exactly where duplicates come from.', 'Queue standard chính là nơi sinh ra trùng lặp.']],
        ],
      ),
      quiz(
        'choreography',
        ['aws.architecture.choreography'],
        ['Choreography vs orchestration — which statement is true?', 'Choreography và orchestration — phát biểu nào đúng?'],
        [
          ['a', ['Choreography: services react to events with no central coordinator; orchestration: one workflow (e.g. Step Functions) directs each step', 'Choreography: các service phản ứng với sự kiện, không có điều phối trung tâm; orchestration: một workflow (vd Step Functions) chỉ đạo từng bước'], true, ['Choreography is loosely coupled but harder to follow; orchestration is explicit and easier to debug.', 'Choreography liên kết lỏng nhưng khó theo dõi; orchestration rõ ràng và dễ debug hơn.']],
          ['b', ['They are the same thing', 'Hai cái là một'], false, ['They differ in who decides the next step.', 'Chúng khác nhau ở chỗ ai quyết định bước tiếp theo.']],
        ],
      ),
    ],
    'serverless-cost': [
      estimate(
        'lambda-cost',
        ['aws.cost.serverless'],
        ['100 million invocations a month, 200 ms each at 512 MB. Compute cost at $0.0000167 per GB-second, in USD (ignore request fees)?', '100 triệu lượt gọi mỗi tháng, mỗi lượt 200 ms với 512 MB. Chi phí compute với giá $0.0000167 mỗi GB-giây, tính bằng USD (bỏ qua phí request)?'],
        'USD',
        167,
        0.05,
        ['100 M × 0.2 s × 0.5 GB = 10 M GB-s × $0.0000167 ≈ $167. Halving duration halves this line.', '100 triệu × 0,2 giây × 0,5 GB = 10 triệu GB-giây × $0.0000167 ≈ $167. Giảm một nửa thời gian chạy là giảm một nửa dòng này.'],
      ),
      quiz(
        'hidden-costs',
        ['aws.cost.serverless'],
        ['Which is a "hidden" serverless cost people often forget?', 'Đâu là chi phí "ẩn" của serverless mà mọi người hay quên?'],
        [
          ['a', ['CloudWatch Logs ingestion from chatty functions, and paying Lambda duration while waiting on slow calls', 'Phí nạp CloudWatch Logs từ function ghi log nhiều, và trả tiền thời gian chạy Lambda khi chờ lời gọi chậm'], true, ['Logs at $0.50/GB and idle waiting time often rival the compute bill.', 'Log $0.50/GB và thời gian chờ thường ngang ngửa hoá đơn compute.']],
          ['b', ['Idle functions', 'Function đang rảnh'], false, ['Idle Lambdas cost nothing — that is the point.', 'Lambda rảnh không tốn đồng nào — đó chính là ưu điểm.']],
        ],
      ),
      quiz(
        'break-even',
        ['aws.cost.serverless', 'aws.compute.choosing'],
        ['When is Lambda usually cheaper than an always-on container service?', 'Khi nào Lambda thường rẻ hơn một service container chạy liên tục?'],
        [
          ['a', ['Low, spiky or idle-heavy traffic', 'Traffic thấp, theo đợt hoặc rảnh nhiều'], true, ['You pay nothing between requests and need no headroom.', 'Bạn không trả gì giữa các request và không cần dư capacity.']],
          ['b', ['High, steady traffic around the clock', 'Traffic cao và đều suốt ngày đêm'], false, ['Steady load is where per-request pricing loses to hourly capacity.', 'Tải đều chính là lúc giá theo request thua capacity theo giờ.']],
        ],
      ),
      steadyApi,
    ],
  },
};
