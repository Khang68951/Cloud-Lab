import { PRICES } from '../pricing.ts';
import { tx, type ServiceDef } from '../types.ts';
import { hours, line, millionsPerMonth, num, p, str, total } from '../util.ts';

export const sqs: ServiceDef = {
  id: 'sqs',
  name: 'Amazon SQS',
  short: 'SQS',
  category: 'messaging',
  behavior: 'queue',
  icon: 'list-ordered',
  equivalents: { azure: 'Queue Storage / Service Bus queues', gcp: 'Pub/Sub (pull) / Cloud Tasks' },
  description: tx(
    'Fully managed message queue. Decouples producers from consumers and absorbs traffic spikes.',
    'Hàng đợi message được quản lý hoàn toàn. Tách producer khỏi consumer và hấp thụ các đợt traffic tăng vọt.',
  ),
  docs: {
    whenToUse: [
      tx('Background work: emails, image processing, order fulfilment.', 'Việc chạy nền: gửi email, xử lý ảnh, xử lý đơn hàng.'),
      tx('Protecting a slow downstream from bursts (load levelling).', 'Bảo vệ hệ thống phía sau chạy chậm khỏi các đợt dồn tải (load levelling).'),
    ],
    whenNotTo: [
      tx('Many independent consumers need every message → SNS/EventBridge fan-out.', 'Nhiều consumer độc lập đều cần nhận mọi message → fan-out bằng SNS/EventBridge.'),
      tx('Replay/ordered streams for analytics → Kinesis/MSK.', 'Stream có thứ tự, cần phát lại cho phân tích → Kinesis/MSK.'),
    ],
    pros: [tx('Practically unlimited throughput (standard).', 'Throughput gần như không giới hạn (standard).'), tx('Dead-letter queues for poison messages.', 'Dead-letter queue cho các message lỗi.')],
    cons: [tx('At-least-once delivery: consumers must be idempotent.', 'Gửi ít nhất một lần: consumer phải idempotent.'), tx('FIFO queues are limited in throughput.', 'FIFO queue bị giới hạn throughput.')],
    pitfalls: [tx('Visibility timeout shorter than processing time → duplicates.', 'Visibility timeout ngắn hơn thời gian xử lý → bị xử lý trùng.')],
    pricing: tx('$0.40 per million requests (≈3 requests per message: send, receive, delete). FIFO $0.50.', '$0.40 mỗi triệu request (≈3 request mỗi message: send, receive, delete). FIFO $0.50.'),
  },
  fields: [
    {
      key: 'type',
      kind: 'select',
      label: tx('Queue type', 'Loại queue'),
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'fifo', label: 'FIFO' },
      ],
      default: 'standard',
    },
  ],
  model: (ctx) => {
    const fifo = str(ctx, 'type') === 'fifo';
    const reqM = millionsPerMonth(total(ctx.avg)) * 3;
    return {
      capacityRps: fifo ? 3000 : Infinity,
      baseLatencyMs: 8,
      availability: 0.9999,
      azLayout: 'regional',
      costs: [line('Queue requests', 'Request queue', p(ctx, reqM * PRICES.sqs.perMillionRequests * (fifo ? 1.25 : 1)), 'requests')],
      summary: fifo ? 'FIFO' : 'Standard',
    };
  },
};

export const sns: ServiceDef = {
  id: 'sns',
  name: 'Amazon SNS',
  short: 'SNS',
  category: 'messaging',
  behavior: 'pubsub',
  icon: 'megaphone',
  equivalents: { azure: 'Service Bus topics / Event Grid', gcp: 'Pub/Sub' },
  description: tx(
    'Pub/sub topics: one message is pushed to every subscriber (SQS queues, Lambda, HTTP, email, SMS).',
    'Topic pub/sub: một message được đẩy tới mọi subscriber (SQS queue, Lambda, HTTP, email, SMS).',
  ),
  docs: {
    whenToUse: [tx('Fan-out: "order placed" must reach billing, shipping and email services.', 'Fan-out: sự kiện "đã đặt hàng" phải tới được dịch vụ thanh toán, giao hàng và email.')],
    whenNotTo: [tx('Content-based routing across many event types → EventBridge.', 'Định tuyến theo nội dung cho nhiều loại sự kiện → EventBridge.')],
    pros: [tx('Push delivery, very cheap, SNS→SQS delivery is free.', 'Đẩy message chủ động, rất rẻ, gửi từ SNS sang SQS miễn phí.')],
    cons: [tx('No storage/replay: unsubscribed messages are gone.', 'Không lưu trữ hay phát lại: message không có subscriber là mất.')],
    pitfalls: [tx('Subscribing Lambdas directly without a queue loses the retry buffer.', 'Cho Lambda subscribe trực tiếp mà không có queue là mất bộ đệm để retry.')],
    pricing: tx('$0.50 per million publishes; deliveries to SQS/Lambda free.', '$0.50 mỗi triệu lượt publish; gửi tới SQS/Lambda miễn phí.'),
  },
  fields: [],
  model: (ctx) => ({
    capacityRps: Infinity,
    baseLatencyMs: 10,
    availability: 0.9999,
    azLayout: 'regional',
    costs: [line('Publishes', 'Lượt publish', p(ctx, millionsPerMonth(total(ctx.avg)) * PRICES.sns.perMillionPublishes), 'requests')],
    summary: 'fan-out',
  }),
};

export const eventbridge: ServiceDef = {
  id: 'eventbridge',
  name: 'Amazon EventBridge',
  short: 'EventBridge',
  category: 'messaging',
  behavior: 'pubsub',
  icon: 'radio-tower',
  equivalents: { azure: 'Event Grid', gcp: 'Eventarc' },
  description: tx(
    'Serverless event bus: route events to targets by matching rules on their content; also schedules.',
    'Event bus serverless: định tuyến sự kiện tới các đích bằng rule khớp theo nội dung; có cả lịch chạy định kỳ.',
  ),
  docs: {
    whenToUse: [
      tx('Event-driven microservices with many event types and consumers.', 'Microservice event-driven với nhiều loại sự kiện và consumer.'),
      tx('Reacting to AWS service events (EC2 state, S3, CodePipeline...).', 'Phản ứng với sự kiện từ dịch vụ AWS (trạng thái EC2, S3, CodePipeline...).'),
    ],
    whenNotTo: [tx('Very high-throughput simple fan-out → SNS is cheaper.', 'Fan-out đơn giản với throughput rất cao → SNS rẻ hơn.')],
    pros: [tx('Content-based filtering, schema registry, archive & replay.', 'Lọc theo nội dung, schema registry, lưu trữ và phát lại.')],
    cons: [tx('Higher per-event price than SNS.', 'Giá mỗi sự kiện cao hơn SNS.')],
    pitfalls: [tx('Rules matching too broadly trigger unexpected targets.', 'Rule khớp quá rộng sẽ kích hoạt những đích không mong muốn.')],
    pricing: tx('$1.00 per million custom events published.', '$1.00 mỗi triệu sự kiện tuỳ chỉnh được publish.'),
  },
  fields: [],
  model: (ctx) => ({
    capacityRps: 10000,
    baseLatencyMs: 15,
    availability: 0.9999,
    azLayout: 'regional',
    costs: [line('Events', 'Sự kiện', p(ctx, millionsPerMonth(total(ctx.avg)) * PRICES.eventbridge.perMillionEvents), 'requests')],
    summary: 'event bus',
  }),
};

export const kinesis: ServiceDef = {
  id: 'kinesis',
  name: 'Amazon Kinesis Data Streams',
  short: 'Kinesis',
  category: 'messaging',
  behavior: 'pubsub',
  icon: 'waves',
  equivalents: { azure: 'Event Hubs', gcp: 'Pub/Sub (streaming) / Dataflow' },
  description: tx(
    'Ordered, replayable data streams for real-time analytics, clickstreams, logs and IoT telemetry.',
    'Luồng dữ liệu có thứ tự, phát lại được, cho phân tích realtime, clickstream, log và dữ liệu IoT.',
  ),
  docs: {
    whenToUse: [
      tx('High-volume event streams read by several consumers, with replay (24h–365d).', 'Luồng sự kiện khối lượng lớn, được nhiều consumer đọc, có phát lại (24 giờ–365 ngày).'),
      tx('Per-key ordering (e.g. per device).', 'Giữ thứ tự theo từng key (vd theo từng thiết bị).'),
    ],
    whenNotTo: [tx('Simple job queues → SQS is cheaper and simpler.', 'Queue công việc đơn giản → SQS rẻ và đơn giản hơn.')],
    pros: [tx('Multiple consumers read the same data independently.', 'Nhiều consumer đọc cùng một dữ liệu một cách độc lập.')],
    cons: [tx('Capacity planned in shards (1 MB/s or 1,000 records/s in per shard).', 'Dung lượng tính theo shard (mỗi shard nhận 1 MB/s hoặc 1.000 record/s).')],
    pitfalls: [tx('Hot shard from a poorly chosen partition key.', 'Shard bị nóng do chọn partition key kém.')],
    pricing: tx('~$0.015 per shard-hour + $0.014 per million PUT payload units (provisioned mode).', '~$0.015 mỗi shard-giờ + $0.014 mỗi triệu PUT payload unit (chế độ provisioned).'),
  },
  fields: [{ key: 'shards', kind: 'number', label: tx('Shards', 'Số shard'), min: 1, max: 500, step: 1, default: 2 }],
  model: (ctx) => {
    const shards = num(ctx, 'shards', 2);
    const kb = ctx.scenario.payloadKB;
    // Each shard ingests 1,000 records/s or 1 MB/s, whichever comes first.
    const perShard = Math.min(1000, 1000 / Math.max(kb, 1));
    const unitsM = millionsPerMonth(total(ctx.avg)) * Math.ceil(kb / 25);
    return {
      capacityRps: shards * perShard,
      baseLatencyMs: 20,
      availability: 0.9999,
      azLayout: 'regional',
      costs: [
        line(`${shards} shards`, `${shards} shard`, p(ctx, shards * PRICES.kinesis.shardHour * hours), 'compute'),
        line('PUT payload units', 'PUT payload unit', p(ctx, unitsM * PRICES.kinesis.perMillionPutUnits), 'requests'),
      ],
      summary: `${shards} shards`,
    };
  },
};
