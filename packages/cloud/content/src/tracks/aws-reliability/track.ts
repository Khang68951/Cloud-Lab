import { tx } from '@learninglab/cloud-catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-reliability',
  icon: 'activity',
  hue: 150,
  level: 'advanced',
  stage: 3,
  prerequisites: ['aws-compute', 'aws-networking'],
  estHours: 8,
  title: tx('Reliability & Observability', 'Độ tin cậy & Observability'),
  tagline: tx('Expect failure, contain it, recover fast — and see it coming.', 'Chấp nhận lỗi sẽ xảy ra, khoanh vùng nó, phục hồi nhanh — và thấy trước khi nó tới.'),
  description: tx('Failure modes and resilience patterns, static stability, disaster-recovery strategies, multi-Region architectures, metrics/logs/traces in depth and incident management.', 'Các kiểu lỗi và mẫu chống chịu, static stability, các chiến lược khôi phục thảm hoạ, kiến trúc multi-Region, metrics/logs/traces chuyên sâu và quản lý sự cố.'),
  outcomes: [
    tx('Apply timeouts, retries, circuit breakers and bulkheads correctly', 'Áp dụng đúng timeout, retry, circuit breaker và bulkhead'),
    tx('Choose a DR strategy from RTO/RPO and budget', 'Chọn chiến lược DR từ RTO/RPO và ngân sách'),
    tx('Design multi-Region active-passive and active-active systems', 'Thiết kế hệ thống multi-Region active-passive và active-active'),
    tx('Build alarms and dashboards that catch real user pain', 'Xây alarm và dashboard bắt được đúng nỗi đau của người dùng'),
  ],
  modules: [
    mod('resilience', 'life-buoy', tx('Resilience', 'Khả năng chống chịu'), tx('Surviving partial failure.', 'Sống sót qua lỗi cục bộ.'), [
      lesson('failure-modes', tx('Failure modes and defences', 'Các kiểu lỗi và cách phòng thủ'), tx('Timeouts, retries with backoff, circuit breakers, bulkheads.', 'Timeout, retry có backoff, circuit breaker, bulkhead.'), 12),
      lesson('static-stability', tx('Static stability and blast radius', 'Static stability và bán kính ảnh hưởng'), tx('Headroom, cells and limiting the damage.', 'Dư địa, cell và giới hạn thiệt hại.'), 12),
    ]),
    mod('dr', 'refresh-cw', tx('Disaster recovery', 'Khôi phục thảm hoạ'), tx('From backups to active-active.', 'Từ backup tới active-active.'), [
      lesson('dr-strategies', tx('DR strategies', 'Các chiến lược DR'), tx('Backup/restore, pilot light, warm standby, multi-site.', 'Backup/restore, pilot light, warm standby, multi-site.'), 12),
      lesson('multi-region', tx('Multi-Region architectures', 'Kiến trúc multi-Region'), tx('Data replication, failover and active-active trade-offs.', 'Nhân bản dữ liệu, failover và đánh đổi của active-active.'), 12),
    ]),
    mod('observability', 'radar', tx('Observability', 'Observability'), tx('Seeing inside your system.', 'Nhìn được bên trong hệ thống.'), [
      lesson('observability-deep', tx('Metrics, logs and traces', 'Metrics, logs và traces'), tx('CloudWatch, X-Ray/OpenTelemetry, dashboards, burn-rate alarms.', 'CloudWatch, X-Ray/OpenTelemetry, dashboard, alarm theo burn rate.'), 12),
      lesson('incident-management', tx('Incident management', 'Quản lý sự cố'), tx('On-call, runbooks and blameless postmortems.', 'On-call, runbook và postmortem không đổ lỗi.'), 10),
    ]),
  ],
});
