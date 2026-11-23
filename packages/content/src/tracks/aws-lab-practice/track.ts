import { defineCourse } from '../../define.ts';
import { L, lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-lab-practice',
  icon: 'trophy',
  hue: 25,
  level: 'intermediate',
  stage: 2,
  prerequisites: ['aws'],
  estHours: 6,
  title: L(['Lab Practice: classic exercises', 'Luyện tập Lab: bài kinh điển']),
  tagline: L([
    'Well-known exercises from the community, rebuilt as graded Lab challenges.',
    'Các bài tập nổi tiếng của cộng đồng, dựng lại thành thử thách Lab có chấm điểm.',
  ]),
  description: L([
    'Extra hands-on practice adapted from public sources: the Cloud Resume Challenge, the System Design Primer, AWS reference architectures, Serverless Land patterns, the "Scaling up to your first 10 million users" talk and the Well-Architected cost labs. Each challenge checks the whole request flow, not just the numbers.',
    'Thực hành bổ sung, phỏng theo các nguồn công khai: Cloud Resume Challenge, System Design Primer, kiến trúc tham chiếu của AWS, các pattern của Serverless Land, bài talk "Scaling up to your first 10 million users" và các bài lab chi phí của Well-Architected. Mỗi thử thách kiểm tra cả luồng request, không chỉ các con số.',
  ]),
  outcomes: [
    L(['Build complete front door → compute → data flows from a blank canvas', 'Tự dựng trọn luồng cửa trước → compute → dữ liệu từ canvas trống']),
    L(['Apply event-driven patterns: S3 events, storage-first webhooks, fan-out', 'Áp dụng các mẫu event-driven: S3 event, webhook lưu trước xử lý sau, fan-out']),
    L(['Scale a design up — and a dev environment down', 'Scale một thiết kế lên — và thu nhỏ một môi trường dev xuống']),
  ],
  modules: [
    mod('web-apps', 'globe', ['Classic web apps', 'Ứng dụng web kinh điển'], ['Static sites, APIs and CMSs.', 'Website tĩnh, API và CMS.'], ['canvas-design', 'canvas-fix'], [
      lesson('classic-web', ['Resume site, Pastebin, WordPress', 'Website CV, Pastebin, WordPress'], ['Cloud Resume Challenge, System Design Primer, AWS reference architecture.', 'Cloud Resume Challenge, System Design Primer, kiến trúc tham chiếu AWS.'], 45, 'available'),
    ]),
    mod('event-driven', 'workflow', ['Event-driven pipelines', 'Pipeline hướng sự kiện'], ['Work that happens after the response.', 'Việc xảy ra sau khi đã trả response.'], ['canvas-design', 'canvas-fix'], [
      lesson('pipelines', ['Thumbnails, webhooks, notifications', 'Thumbnail, webhook, thông báo'], ['AWS tutorials, Serverless Land patterns, a system-design classic.', 'Tutorial của AWS, pattern Serverless Land, một bài system design kinh điển.'], 50, 'available'),
    ]),
    mod('scale-cost', 'rocket', ['Scale and cost', 'Scale và chi phí'], ['Growing up, and slimming down.', 'Lớn lên, và thu gọn lại.'], ['canvas-design', 'canvas-fix'], [
      lesson('scale-and-cost', ['A million users, a leaderboard, a dev bill', 'Một triệu người dùng, bảng xếp hạng, hoá đơn dev'], ['AWS scaling talk, an interview classic, Well-Architected cost labs.', 'Talk về scale của AWS, một câu phỏng vấn kinh điển, lab chi phí Well-Architected.'], 50, 'available'),
    ]),
  ],
});
