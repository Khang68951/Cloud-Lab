import { defineCourse } from '../../define.ts';
import { L, lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-serverless',
  icon: 'workflow',
  hue: 330,
  level: 'advanced',
  stage: 3,
  prerequisites: ['aws-compute', 'aws-data'],
  estHours: 8,
  title: L(['Serverless & Event-driven', 'Serverless & Event-driven']),
  tagline: L(['Build systems from events, functions and managed services — and know when not to.', 'Xây hệ thống từ sự kiện, function và dịch vụ được quản lý — và biết khi nào không nên.']),
  description: L([
    'API Gateway in depth, SQS/SNS/EventBridge, streams with Kinesis and MSK, Step Functions orchestration, event-driven patterns, and the economics of serverless.',
    'API Gateway chuyên sâu, SQS/SNS/EventBridge, stream với Kinesis và MSK, điều phối bằng Step Functions, các mẫu event-driven, và bài toán kinh tế của serverless.',
  ]),
  outcomes: [
    L(['Design APIs with the right Gateway type, auth and throttling', 'Thiết kế API với đúng loại Gateway, xác thực và throttling']),
    L(['Pick queues, topics, buses or streams for each flow', 'Chọn queue, topic, bus hay stream cho từng luồng']),
    L(['Build reliable workflows with sagas and idempotency', 'Xây workflow tin cậy với saga và idempotency']),
    L(['Know when serverless gets more expensive than containers', 'Biết khi nào serverless đắt hơn container']),
  ],
  modules: [
    mod('api', 'door-open', ['APIs', 'API'], ['The front door of serverless apps.', 'Cửa trước của ứng dụng serverless.'], ['scenario-quiz', 'estimation'], [
      lesson('api-gateway-deep', ['API Gateway in depth', 'API Gateway chuyên sâu'], ['REST, HTTP and WebSocket APIs, auth, throttling, caching.', 'REST, HTTP và WebSocket API, xác thực, throttling, cache.'], 12, 'available'),
    ]),
    mod('events', 'mail', ['Events & streams', 'Sự kiện & stream'], ['Moving messages reliably.', 'Chuyển message một cách tin cậy.'], ['scenario-quiz', 'estimation', 'canvas-fix'], [
      lesson('messaging-deep', ['SQS, SNS and EventBridge in depth', 'SQS, SNS và EventBridge chuyên sâu'], ['FIFO, visibility, DLQs, batching, filtering, rules and pipes.', 'FIFO, visibility, DLQ, batching, lọc, rule và pipe.'], 15, 'available'),
      lesson('streams', ['Streams: Kinesis and MSK', 'Stream: Kinesis và MSK'], ['Shards, ordering, fan-out and replay.', 'Shard, thứ tự, fan-out và phát lại.'], 12, 'available'),
    ]),
    mod('orchestration', 'git-branch', ['Orchestration', 'Điều phối'], ['Multi-step workflows.', 'Workflow nhiều bước.'], ['scenario-quiz'], [
      lesson('step-functions', ['Step Functions', 'Step Functions'], ['Standard vs Express, retries, error handling and sagas.', 'Standard và Express, retry, xử lý lỗi và saga.'], 12, 'available'),
    ]),
    mod('patterns', 'layers', ['Patterns & economics', 'Mẫu thiết kế & kinh tế'], ['Getting correctness and cost right.', 'Làm đúng cả về tính chính xác lẫn chi phí.'], ['scenario-quiz', 'estimation', 'canvas-fix'], [
      lesson('event-patterns', ['Event-driven patterns', 'Các mẫu event-driven'], ['Outbox, idempotency, choreography vs orchestration.', 'Outbox, idempotency, choreography và orchestration.'], 12, 'available'),
      lesson('serverless-cost', ['When serverless gets expensive', 'Khi nào serverless trở nên đắt'], ['Break-even points and hidden costs.', 'Điểm hoà vốn và chi phí ẩn.'], 10, 'available'),
    ]),
  ],
});
