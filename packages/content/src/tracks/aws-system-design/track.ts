import { tx } from '@learninglab/catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-system-design',
  icon: 'trophy',
  hue: 265,
  level: 'advanced',
  stage: 5,
  prerequisites: ['aws-serverless', 'aws-reliability', 'aws-cost'],
  estHours: 12,
  title: tx('System Design on AWS', 'System Design trên AWS'),
  tagline: tx('Design six real systems end to end — and defend every trade-off.', 'Thiết kế trọn vẹn sáu hệ thống thật — và bảo vệ được mọi quyết định đánh đổi.'),
  description: tx('The capstone course: an interview-style design method, then news feeds, video streaming, a flash-sale store, chat, realtime ride-hailing locations and a payments ledger — each built and stress-tested in the Lab.', 'Khoá tổng hợp: phương pháp thiết kế kiểu phỏng vấn, rồi news feed, video streaming, cửa hàng flash sale, chat, vị trí gọi xe realtime và sổ cái thanh toán — mỗi hệ thống đều được dựng và thử tải trong Lab.'),
  outcomes: [
    tx('Run a structured system-design conversation', 'Dẫn dắt một buổi thiết kế hệ thống có cấu trúc'),
    tx('Estimate scale and cost before drawing boxes', 'Ước lượng quy mô và chi phí trước khi vẽ sơ đồ'),
    tx('Design for hot spots, spikes and failures', 'Thiết kế cho điểm nóng, đợt tăng vọt và sự cố'),
    tx('Explain the trade-offs of your design out loud', 'Giải thích rõ ràng các đánh đổi trong thiết kế của mình'),
  ],
  modules: [
    mod('method', 'compass', tx('Method', 'Phương pháp'), tx('A repeatable way to approach any design.', 'Một cách tiếp cận lặp lại được cho mọi bài thiết kế.'), [
      lesson('design-interview', tx('The system-design method', 'Phương pháp thiết kế hệ thống'), tx('Requirements, estimates, APIs, data, architecture, deep dives.', 'Yêu cầu, ước lượng, API, dữ liệu, kiến trúc, đào sâu.'), 15),
    ]),
    mod('systems', 'trophy', tx('Systems', 'Các hệ thống'), tx('Six classic designs, built in the Lab.', 'Sáu thiết kế kinh điển, dựng trong Lab.'), [
      lesson('news-feed', tx('News feed', 'News feed'), tx('Fan-out on write vs read and timeline caches.', 'Fan-out khi ghi và khi đọc, cache timeline.'), 30),
      lesson('video-streaming', tx('Video streaming', 'Video streaming'), tx('Upload, transcoding, CDN and egress cost.', 'Upload, chuyển mã, CDN và chi phí egress.'), 30),
      lesson('flash-sale-store', tx('Flash-sale store', 'Cửa hàng flash sale'), tx('Queues, inventory reservation and overload protection.', 'Hàng đợi, giữ chỗ tồn kho và chống quá tải.'), 30),
      lesson('chat-app', tx('Chat application', 'Ứng dụng chat'), tx('WebSockets, fan-out and message storage.', 'WebSocket, fan-out và lưu trữ tin nhắn.'), 30),
      lesson('ride-hailing', tx('Ride-hailing locations', 'Vị trí gọi xe realtime'), tx('High-frequency location streams and geo lookups.', 'Luồng vị trí tần suất cao và tra cứu theo vị trí địa lý.'), 30),
      lesson('payments-ledger', tx('Payments ledger', 'Sổ cái thanh toán'), tx('Idempotency, durability, four nines and auditability.', 'Idempotency, độ bền, bốn số 9 và khả năng kiểm toán.'), 30),
    ]),
  ],
});
