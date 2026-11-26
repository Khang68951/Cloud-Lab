import { tx } from '@learninglab/catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-serverless',
  icon: 'workflow',
  hue: 330,
  level: 'advanced',
  stage: 3,
  prerequisites: ['aws-compute', 'aws-data'],
  estHours: 8,
  title: tx('Serverless & Event-driven', 'Serverless & Event-driven'),
  tagline: tx('Build systems from events, functions and managed services — and know when not to.', 'Xây hệ thống từ sự kiện, function và dịch vụ được quản lý — và biết khi nào không nên.'),
  description: tx('API Gateway in depth, SQS/SNS/EventBridge, streams with Kinesis and MSK, Step Functions orchestration, event-driven patterns, and the economics of serverless.', 'API Gateway chuyên sâu, SQS/SNS/EventBridge, stream với Kinesis và MSK, điều phối bằng Step Functions, các mẫu event-driven, và bài toán kinh tế của serverless.'),
  outcomes: [
    tx('Design APIs with the right Gateway type, auth and throttling', 'Thiết kế API với đúng loại Gateway, xác thực và throttling'),
    tx('Pick queues, topics, buses or streams for each flow', 'Chọn queue, topic, bus hay stream cho từng luồng'),
    tx('Build reliable workflows with sagas and idempotency', 'Xây workflow tin cậy với saga và idempotency'),
    tx('Know when serverless gets more expensive than containers', 'Biết khi nào serverless đắt hơn container'),
  ],
  modules: [
    mod('api', 'door-open', tx('APIs', 'API'), tx('The front door of serverless apps.', 'Cửa trước của ứng dụng serverless.'), [
      lesson('api-gateway-deep', tx('API Gateway in depth', 'API Gateway chuyên sâu'), tx('REST, HTTP and WebSocket APIs, auth, throttling, caching.', 'REST, HTTP và WebSocket API, xác thực, throttling, cache.'), 12),
    ]),
    mod('events', 'mail', tx('Events & streams', 'Sự kiện & stream'), tx('Moving messages reliably.', 'Chuyển message một cách tin cậy.'), [
      lesson('messaging-deep', tx('SQS, SNS and EventBridge in depth', 'SQS, SNS và EventBridge chuyên sâu'), tx('FIFO, visibility, DLQs, batching, filtering, rules and pipes.', 'FIFO, visibility, DLQ, batching, lọc, rule và pipe.'), 15),
      lesson('streams', tx('Streams: Kinesis and MSK', 'Stream: Kinesis và MSK'), tx('Shards, ordering, fan-out and replay.', 'Shard, thứ tự, fan-out và phát lại.'), 12),
    ]),
    mod('orchestration', 'git-branch', tx('Orchestration', 'Điều phối'), tx('Multi-step workflows.', 'Workflow nhiều bước.'), [
      lesson('step-functions', tx('Step Functions', 'Step Functions'), tx('Standard vs Express, retries, error handling and sagas.', 'Standard và Express, retry, xử lý lỗi và saga.'), 12),
    ]),
    mod('patterns', 'layers', tx('Patterns & economics', 'Mẫu thiết kế & kinh tế'), tx('Getting correctness and cost right.', 'Làm đúng cả về tính chính xác lẫn chi phí.'), [
      lesson('event-patterns', tx('Event-driven patterns', 'Các mẫu event-driven'), tx('Outbox, idempotency, choreography vs orchestration.', 'Outbox, idempotency, choreography và orchestration.'), 12),
      lesson('serverless-cost', tx('When serverless gets expensive', 'Khi nào serverless trở nên đắt'), tx('Break-even points and hidden costs.', 'Điểm hoà vốn và chi phí ẩn.'), 10),
    ]),
  ],
});
