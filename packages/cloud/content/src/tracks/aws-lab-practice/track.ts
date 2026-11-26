import { tx } from '@learninglab/cloud-catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-lab-practice',
  icon: 'trophy',
  hue: 25,
  level: 'intermediate',
  stage: 2,
  prerequisites: ['aws'],
  estHours: 12,
  title: tx('Lab Practice: classic exercises', 'Luyện tập Lab: bài kinh điển'),
  tagline: tx('Well-known exercises from the community, rebuilt as graded Lab challenges.', 'Các bài tập nổi tiếng của cộng đồng, dựng lại thành thử thách Lab có chấm điểm.'),
  description: tx('Extra hands-on practice adapted from public sources: the Cloud Resume Challenge, the System Design Primer, AWS reference architectures, AWS workshops and AWS Solutions, Serverless Land patterns, the "Scaling up to your first 10 million users" talk and the Well-Architected cost labs. Each challenge checks the whole request flow, not just the numbers.', 'Thực hành bổ sung, phỏng theo các nguồn công khai: Cloud Resume Challenge, System Design Primer, kiến trúc tham chiếu của AWS, các workshop và AWS Solutions, các pattern của Serverless Land, bài talk "Scaling up to your first 10 million users" và các bài lab chi phí của Well-Architected. Mỗi thử thách kiểm tra cả luồng request, không chỉ các con số.'),
  outcomes: [
    tx('Build complete front door → compute → data flows from a blank canvas', 'Tự dựng trọn luồng cửa trước → compute → dữ liệu từ canvas trống'),
    tx('Apply event-driven patterns: S3 events, storage-first webhooks, fan-out', 'Áp dụng các mẫu event-driven: S3 event, webhook lưu trước xử lý sau, fan-out'),
    tx('Scale a design up — and a dev environment down', 'Scale một thiết kế lên — và thu nhỏ một môi trường dev xuống'),
    tx('Rebuild AWS workshops, AWS Solutions and famous real-world systems', 'Dựng lại các workshop của AWS, AWS Solutions và các hệ thống thực tế nổi tiếng'),
  ],
  modules: [
    mod('web-apps', 'globe', tx('Classic web apps', 'Ứng dụng web kinh điển'), tx('Static sites, APIs and CMSs.', 'Website tĩnh, API và CMS.'), [
      lesson('classic-web', tx('Resume site, Pastebin, WordPress', 'Website CV, Pastebin, WordPress'), tx('Cloud Resume Challenge, System Design Primer, AWS reference architecture.', 'Cloud Resume Challenge, System Design Primer, kiến trúc tham chiếu AWS.'), 45),
    ]),
    mod('event-driven', 'workflow', tx('Event-driven pipelines', 'Pipeline hướng sự kiện'), tx('Work that happens after the response.', 'Việc xảy ra sau khi đã trả response.'), [
      lesson('pipelines', tx('Thumbnails, webhooks, notifications', 'Thumbnail, webhook, thông báo'), tx('AWS tutorials, Serverless Land patterns, a system-design classic.', 'Tutorial của AWS, pattern Serverless Land, một bài system design kinh điển.'), 50),
    ]),
    mod('scale-cost', 'rocket', tx('Scale and cost', 'Scale và chi phí'), tx('Growing up, and slimming down.', 'Lớn lên, và thu gọn lại.'), [
      lesson('scale-and-cost', tx('A million users, a leaderboard, a dev bill', 'Một triệu người dùng, bảng xếp hạng, hoá đơn dev'), tx('AWS scaling talk, an interview classic, Well-Architected cost labs.', 'Talk về scale của AWS, một câu phỏng vấn kinh điển, lab chi phí Well-Architected.'), 50),
    ]),
    mod('workshops', 'function', tx('AWS workshops', 'Workshop của AWS'), tx('Free hands-on labs AWS publishes, rebuilt on the canvas.', 'Các bài lab thực hành miễn phí của AWS, dựng lại trên canvas.'), [
      lesson('aws-workshops', tx('Wild Rydes, WebSocket chat, order saga', 'Wild Rydes, chat WebSocket, saga đơn hàng'), tx('Serverless web app workshop, an AWS open-source sample, the Step Functions saga.', 'Workshop web app serverless, một sample mã nguồn mở của AWS, saga Step Functions.'), 50),
    ]),
    mod('data-iot', 'waves', tx('Data, streaming and IoT', 'Dữ liệu, streaming và IoT'), tx('Pipelines from AWS Solutions and reference architectures.', 'Pipeline từ AWS Solutions và kiến trúc tham chiếu.'), [
      lesson('streams-and-search', tx('Clickstream, IoT telemetry, product search', 'Clickstream, telemetry IoT, tìm kiếm sản phẩm'), tx('Clickstream Analytics on AWS, IoT ingestion, DynamoDB → OpenSearch.', 'Clickstream Analytics on AWS, nạp dữ liệu IoT, DynamoDB → OpenSearch.'), 50),
    ]),
    mod('case-studies', 'building', tx('Famous real-world systems', 'Các hệ thống thực tế nổi tiếng'), tx('How well-known products solved their hardest problem.', 'Các sản phẩm nổi tiếng đã giải bài toán khó nhất của mình thế nào.'), [
      lesson('famous-systems', tx('Twitter timeline, video streaming, ticket drops', 'Timeline Twitter, stream video, mở bán vé'), tx('System Design Primer, Video on Demand on AWS, Virtual Waiting Room on AWS.', 'System Design Primer, Video on Demand on AWS, Virtual Waiting Room on AWS.'), 55),
    ]),
  ],
});
