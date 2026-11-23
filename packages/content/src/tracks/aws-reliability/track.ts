import { defineCourse } from '../../define.ts';
import { L, lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-reliability',
  icon: 'activity',
  hue: 150,
  level: 'advanced',
  stage: 3,
  prerequisites: ['aws-compute', 'aws-networking'],
  estHours: 8,
  title: L(['Reliability & Observability', 'Độ tin cậy & Observability']),
  tagline: L(['Expect failure, contain it, recover fast — and see it coming.', 'Chấp nhận lỗi sẽ xảy ra, khoanh vùng nó, phục hồi nhanh — và thấy trước khi nó tới.']),
  description: L([
    'Failure modes and resilience patterns, static stability, disaster-recovery strategies, multi-Region architectures, metrics/logs/traces in depth and incident management.',
    'Các kiểu lỗi và mẫu chống chịu, static stability, các chiến lược khôi phục thảm hoạ, kiến trúc multi-Region, metrics/logs/traces chuyên sâu và quản lý sự cố.',
  ]),
  outcomes: [
    L(['Apply timeouts, retries, circuit breakers and bulkheads correctly', 'Áp dụng đúng timeout, retry, circuit breaker và bulkhead']),
    L(['Choose a DR strategy from RTO/RPO and budget', 'Chọn chiến lược DR từ RTO/RPO và ngân sách']),
    L(['Design multi-Region active-passive and active-active systems', 'Thiết kế hệ thống multi-Region active-passive và active-active']),
    L(['Build alarms and dashboards that catch real user pain', 'Xây alarm và dashboard bắt được đúng nỗi đau của người dùng']),
  ],
  modules: [
    mod('resilience', 'life-buoy', ['Resilience', 'Khả năng chống chịu'], ['Surviving partial failure.', 'Sống sót qua lỗi cục bộ.'], ['scenario-quiz', 'estimation', 'canvas-fix'], [
      lesson('failure-modes', ['Failure modes and defences', 'Các kiểu lỗi và cách phòng thủ'], ['Timeouts, retries with backoff, circuit breakers, bulkheads.', 'Timeout, retry có backoff, circuit breaker, bulkhead.'], 12, 'available'),
      lesson('static-stability', ['Static stability and blast radius', 'Static stability và bán kính ảnh hưởng'], ['Headroom, cells and limiting the damage.', 'Dư địa, cell và giới hạn thiệt hại.'], 12, 'available'),
    ]),
    mod('dr', 'refresh-cw', ['Disaster recovery', 'Khôi phục thảm hoạ'], ['From backups to active-active.', 'Từ backup tới active-active.'], ['scenario-quiz', 'estimation', 'canvas-design'], [
      lesson('dr-strategies', ['DR strategies', 'Các chiến lược DR'], ['Backup/restore, pilot light, warm standby, multi-site.', 'Backup/restore, pilot light, warm standby, multi-site.'], 12, 'available'),
      lesson('multi-region', ['Multi-Region architectures', 'Kiến trúc multi-Region'], ['Data replication, failover and active-active trade-offs.', 'Nhân bản dữ liệu, failover và đánh đổi của active-active.'], 12, 'available'),
    ]),
    mod('observability', 'radar', ['Observability', 'Observability'], ['Seeing inside your system.', 'Nhìn được bên trong hệ thống.'], ['scenario-quiz', 'estimation'], [
      lesson('observability-deep', ['Metrics, logs and traces', 'Metrics, logs và traces'], ['CloudWatch, X-Ray/OpenTelemetry, dashboards, burn-rate alarms.', 'CloudWatch, X-Ray/OpenTelemetry, dashboard, alarm theo burn rate.'], 12, 'available'),
      lesson('incident-management', ['Incident management', 'Quản lý sự cố'], ['On-call, runbooks and blameless postmortems.', 'On-call, runbook và postmortem không đổ lỗi.'], 10, 'available'),
    ]),
  ],
});
