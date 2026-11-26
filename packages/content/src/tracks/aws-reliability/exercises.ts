import { buildDesign, tx } from '@learninglab/catalog';
import type { CourseExercises } from '../../define.ts';
import { exerciseBuilders, R, scenario, withSecurityGroups } from '../../helpers.ts';

const { quiz, estimate, challenge } = exerciseBuilders('aws-reliability');

const shopScenario = scenario({ rps: 1000, peakMultiplier: 1.4, readRatio: 0.85, payloadKB: 4 });

export const surviveAz = challenge({
  id: 'survive-az',
  kind: 'canvas-fix',
  skills: ['aws.reliability.static-stability', 'aws.reliability.multi-az'],
  title: tx('Lose an AZ at peak — and keep selling', 'Mất một AZ lúc cao điểm — mà vẫn bán hàng'),
  brief: tx(
    'An online shop runs a fixed fleet of 6 Fargate tasks across two AZs, a single-AZ RDS database and a single-node Redis cache. Load tests look fine — until a game day takes one AZ away at peak.\n\nMake the shop survive the loss of an Availability Zone at peak traffic.',
    'Một shop online chạy fleet cố định 6 task Fargate trên hai AZ, database RDS single-AZ và cache Redis một node. Load test trông ổn — cho tới khi buổi game day tắt một AZ lúc cao điểm.\n\nHãy làm cho shop sống sót khi mất một Availability Zone lúc traffic cao điểm.',
  ),
  scenario: shopScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '1-2', count: 6, autoscaling: false, multiAz: true }],
      ['cache', 'elasticache', 3, 0, { replicas: 0 }],
      ['db', 'rds', 3, 2, { instanceClass: 'db.r6g.large', multiAz: false }],
    ],
    ['users>lb', 'lb>app', 'app>cache', 'app>db'],
    shopScenario,
  ),
  requirements: [
    R.connected(),
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    R.errors(),
    R.survivesAz(tx('Survives an AZ outage at peak', 'Chịu được sự cố một AZ lúc cao điểm')),
    R.availability(0.999),
    R.cost(2500),
  ],
  hints: [
    tx('Run the "AZ down" chaos test and look at which nodes go red: what is single-AZ, and what loses half its capacity?', 'Chạy chaos "AZ down" và xem node nào chuyển đỏ: cái gì là single-AZ, và cái gì mất một nửa capacity?'),
    tx('The cache is not on the critical path — the app falls back to the database. The database and the fleet are.', 'Cache không nằm trên đường sống còn — app có thể quay về database. Database và fleet thì có.'),
    tx('Turn on RDS Multi-AZ, and give the fleet enough capacity in ONE AZ for peak: ≥ 9 tasks pre-provisioned (static stability), or Auto Scaling with room to grow.', 'Bật RDS Multi-AZ, và cho fleet đủ capacity trong MỘT AZ để chịu cao điểm: ≥ 9 task dựng sẵn (static stability), hoặc Auto Scaling có dư địa tăng.'),
  ],
  debrief: tx(
    'A statically stable system survives an AZ loss without having to do anything: each AZ already holds enough capacity for peak, and the database fails over to its standby. Auto Scaling also works, but it must launch new capacity during the incident — exactly when control planes are busiest. Pre-provisioning ~150% (for 2 AZs) or ~133% (3 AZs) trades money for that certainty.',
    'Một hệ thống static stable sống sót khi mất AZ mà không cần làm gì: mỗi AZ đã có sẵn đủ capacity cho cao điểm, và database tự failover sang standby. Auto Scaling cũng được, nhưng nó phải khởi chạy capacity mới ngay trong sự cố — đúng lúc control plane bận nhất. Dựng sẵn ~150% (với 2 AZ) hoặc ~133% (3 AZ) là đổi tiền lấy sự chắc chắn đó.',
  ),
  reference: withSecurityGroups(buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '1-2', count: 9, autoscaling: false, multiAz: true }],
      ['cache', 'elasticache', 3, 0, { replicas: 0 }],
      ['db', 'rds', 3, 2, { instanceClass: 'db.r6g.large', multiAz: true }],
    ],
    ['users>lb', 'lb>app', 'app>cache', 'app>db'],
    shopScenario,
  )),
});

const paymentsScenario = scenario({ rps: 300, peakMultiplier: 2, readRatio: 0.5, payloadKB: 1 });

export const paymentsNines = challenge({
  id: 'payments-four-nines',
  kind: 'canvas-design',
  skills: ['aws.reliability.multi-region', 'aws.reliability.availability-math'],
  title: tx('A payments API with four nines', 'API thanh toán với bốn số 9'),
  brief: tx(
    'Design a payments API (300 req/s, 2× at peak) with ≥ 99.99% availability — about 4 minutes of downtime a month — that also survives an AZ outage.\n\nTip: compute the availability of a single-Region stack first.',
    'Thiết kế một API thanh toán (300 req/s, gấp đôi lúc cao điểm) có availability ≥ 99,99% — khoảng 4 phút downtime mỗi tháng — và cũng chịu được sự cố một AZ.\n\nGợi ý: hãy tính availability của một stack trong một Region trước.',
  ),
  scenario: paymentsScenario,
  starter: buildDesign([['users', 'users', 0, 1]], [], paymentsScenario),
  requirements: [
    R.connected(),
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    R.errors(),
    R.availability(0.9999),
    R.survivesAz(),
    R.p95(200),
    R.cost(3500),
  ],
  hints: [
    tx('In series, availabilities multiply: ALB 99.99% × Aurora 99.99% ≈ 99.98% — one Region cannot reach 99.99% here.', 'Nối tiếp thì availability nhân với nhau: ALB 99,99% × Aurora 99,99% ≈ 99,98% — một Region không thể đạt 99,99% ở đây.'),
    tx('In parallel, failures multiply: two independent stacks at 99.98% give 1 − 0.0002² ≈ 99.99999%.', 'Song song thì xác suất lỗi nhân với nhau: hai stack độc lập 99,98% cho 1 − 0,0002² ≈ 99,99999%.'),
    tx('Route 53 (failover or latency routing) → two stacks of ALB → Fargate → Aurora (think Aurora Global Database or DynamoDB Global Tables).', 'Route 53 (định tuyến failover hoặc latency) → hai stack ALB → Fargate → Aurora (hình dung Aurora Global Database hoặc DynamoDB Global Tables).'),
  ],
  debrief: tx(
    'Four nines is beyond what a single chain of 99.99% components can deliver, so you need redundancy at the highest level: whole stacks in two Regions behind Route 53 health checks. The hard part in reality is the data — synchronous cross-Region writes are slow, so payments systems usually choose a primary Region with fast replication (Aurora Global Database, ~1 s RPO) or partition users across Regions.',
    'Bốn số 9 vượt quá khả năng của một chuỗi thành phần 99,99%, nên bạn cần dự phòng ở tầng cao nhất: nguyên cả stack ở hai Region phía sau health check của Route 53. Phần khó trong thực tế là dữ liệu — ghi đồng bộ xuyên Region thì chậm, nên hệ thống thanh toán thường chọn một Region chính với nhân bản nhanh (Aurora Global Database, RPO ~1 giây) hoặc chia người dùng theo Region.',
  ),
  reference: withSecurityGroups(buildDesign(
    [
      ['users', 'users', 0, 2],
      ['dns', 'route53', 1, 2],
      ['lb1', 'alb', 2, 1],
      ['app1', 'fargate', 3, 1, { taskSize: '0.5-1', count: 2, autoscaling: true, maxCount: 12, multiAz: true }],
      ['db1', 'aurora', 4, 1, { instanceClass: 'db.r6g.large', replicas: 1 }],
      ['lb2', 'alb', 2, 3],
      ['app2', 'fargate', 3, 3, { taskSize: '0.5-1', count: 2, autoscaling: true, maxCount: 12, multiAz: true }],
      ['db2', 'aurora', 4, 3, { instanceClass: 'db.r6g.large', replicas: 1 }],
    ],
    ['users>dns', 'dns>lb1', 'dns>lb2', 'lb1>app1', 'app1>db1', 'lb2>app2', 'app2>db2'],
    paymentsScenario,
  )),
});

export const exercises: CourseExercises = {
  resilience: {
    'failure-modes': [
      quiz(
        'backoff',
        ['aws.reliability.retries'],
        tx('A dependency blips and thousands of clients retry immediately, keeping it down. What should clients do?', 'Một dependency chập chờn và hàng nghìn client retry ngay lập tức, khiến nó sập luôn. Client nên làm gì?'),
        [
          ['a', tx('Retry with exponential backoff and jitter, capped, with a retry budget', 'Retry với exponential backoff và jitter, có giới hạn, kèm retry budget'), true, tx('Spreading retries out lets the dependency recover instead of facing a retry storm.', 'Giãn các lần retry giúp dependency hồi phục thay vì hứng một cơn bão retry.')],
          ['b', tx('Retry immediately, up to 10 times', 'Retry ngay, tối đa 10 lần'), false, tx('That multiplies load by up to 10× exactly when the service is weakest.', 'Như vậy nhân tải lên tới 10 lần đúng lúc service yếu nhất.')],
        ],
      ),
      quiz(
        'circuit-breaker',
        ['aws.reliability.circuit-breaker'],
        tx('A recommendations service is timing out. What stops it from dragging down the whole product page?', 'Service gợi ý đang bị timeout. Cái gì ngăn nó kéo sập cả trang sản phẩm?'),
        [
          ['a', tx('A short timeout plus a circuit breaker that fails fast and shows a fallback (e.g. "popular items")', 'Timeout ngắn cộng circuit breaker để lỗi nhanh và hiển thị phương án dự phòng (vd "sản phẩm phổ biến")'), true, tx('Graceful degradation: a non-critical dependency must never take down the critical path.', 'Xuống cấp có kiểm soát: một dependency không quan trọng không bao giờ được làm sập đường xử lý chính.')],
          ['b', tx('Increase the timeout to 60 s', 'Tăng timeout lên 60 giây'), false, tx('Threads pile up waiting, and the page itself times out.', 'Các thread dồn lại chờ, và chính trang đó cũng timeout.')],
        ],
      ),
      quiz(
        'bulkhead',
        ['aws.reliability.bulkheads'],
        tx('A slow reporting endpoint uses up all database connections and checkout fails. Which pattern prevents this?', 'Một endpoint báo cáo chậm chiếm hết kết nối database và checkout bị lỗi. Mẫu nào ngăn được điều này?'),
        [
          ['a', tx('Bulkheads: separate pools (connections, threads, even services) per workload', 'Bulkhead: tách riêng pool (kết nối, thread, thậm chí service) cho từng loại workload'), true, tx('Like a ship\'s compartments — one flooded section does not sink the ship.', 'Giống các khoang tàu — một khoang ngập không làm chìm cả con tàu.')],
          ['b', tx('A bigger database', 'Database lớn hơn'), false, tx('The slow endpoint would eventually use up the bigger pool too.', 'Endpoint chậm rồi cũng sẽ ăn hết pool lớn hơn.')],
        ],
      ),
    ],
    'static-stability': [
      estimate(
        'headroom',
        ['aws.reliability.static-stability'],
        tx('Peak needs 12 instances. To be statically stable against losing one of 3 AZs, how many instances must run in total?', 'Cao điểm cần 12 instance. Để static stable khi mất một trong 3 AZ, tổng cộng phải chạy bao nhiêu instance?'),
        'instances',
        18,
        0.001,
        tx('The 2 surviving AZs must hold 12 → 6 per AZ → 6 × 3 = 18 (150%). With 2 AZs it would be 24 (200%).', '2 AZ còn lại phải gánh 12 → mỗi AZ 6 → 6 × 3 = 18 (150%). Với 2 AZ thì cần 24 (200%).'),
      ),
      quiz(
        'control-plane',
        ['aws.reliability.static-stability'],
        tx('Why is "pre-provisioned capacity" more stable than "scale up when an AZ fails"?', 'Vì sao "dựng sẵn capacity" ổn định hơn "scale lên khi AZ hỏng"?'),
        [
          ['a', tx('Recovery then depends only on the data plane, not on launching resources (control plane) during an incident', 'Khi đó việc phục hồi chỉ dựa vào data plane, không phụ thuộc việc khởi chạy tài nguyên (control plane) giữa sự cố'), true, tx('During big events, control planes are slow or throttled — everyone is launching at once.', 'Trong sự cố lớn, control plane chậm hoặc bị throttle — ai cũng đang khởi chạy cùng lúc.')],
          ['b', tx('It is cheaper', 'Vì nó rẻ hơn'), false, tx('It costs more; you are buying certainty.', 'Nó đắt hơn; bạn đang mua sự chắc chắn.')],
        ],
      ),
      quiz(
        'cells',
        ['aws.reliability.blast-radius'],
        tx('A bad config push takes down every customer at once. Which architecture limits the blast radius?', 'Một lần đẩy config lỗi làm sập tất cả khách hàng cùng lúc. Kiến trúc nào giới hạn bán kính ảnh hưởng?'),
        [
          ['a', tx('Cell-based architecture with staged (wave) deployments', 'Kiến trúc dạng cell kết hợp triển khai theo đợt (wave)'), true, tx('Each cell serves a slice of customers; a bad change hits one cell first and is rolled back.', 'Mỗi cell phục vụ một phần khách hàng; thay đổi lỗi chỉ chạm một cell trước và được rollback.')],
          ['b', tx('A bigger single cluster', 'Một cluster duy nhất lớn hơn'), false, tx('Bigger shared fate, bigger blast radius.', 'Chung số phận lớn hơn, bán kính ảnh hưởng càng lớn.')],
        ],
      ),
      surviveAz,
    ],
  },
  dr: {
    'dr-strategies': [
      quiz(
        'rpo-rto',
        ['aws.reliability.dr'],
        tx('RPO = 1 hour and RTO = 4 hours. What do they mean?', 'RPO = 1 giờ và RTO = 4 giờ. Nghĩa là gì?'),
        [
          ['a', tx('Lose at most 1 hour of data; be back up within 4 hours', 'Mất tối đa 1 giờ dữ liệu; hoạt động lại trong vòng 4 giờ'), true, tx('RPO is about data loss (how far back), RTO about downtime (how long).', 'RPO nói về mất dữ liệu (lùi về bao xa), RTO nói về thời gian ngừng (bao lâu).')],
          ['b', tx('Back up every 4 hours; restore in 1 hour', 'Backup mỗi 4 giờ; khôi phục trong 1 giờ'), false, tx('Swapped: that would be RPO 4 h and RTO 1 h.', 'Bị đảo: đó là RPO 4 giờ và RTO 1 giờ.')],
        ],
      ),
      quiz(
        'pilot-light',
        ['aws.reliability.dr'],
        tx('RTO of ~30 minutes at low cost: data is replicated to the DR Region, but servers there are off until needed. This is:', 'RTO ~30 phút với chi phí thấp: dữ liệu được nhân bản sang Region DR, nhưng server ở đó tắt cho tới khi cần. Đây là:'),
        [
          ['a', tx('Pilot light', 'Pilot light'), true, tx('Core data is "lit"; compute is started (from IaC) during the disaster.', 'Phần dữ liệu cốt lõi luôn "cháy"; compute được bật lên (từ IaC) khi có thảm hoạ.')],
          ['b', tx('Warm standby', 'Warm standby'), false, tx('Warm standby runs a scaled-down but working copy all the time.', 'Warm standby luôn chạy một bản thu nhỏ nhưng hoạt động được.')],
          ['c', tx('Backup and restore', 'Backup và restore'), false, tx('That restores everything from backups — hours, not minutes.', 'Cách đó khôi phục mọi thứ từ backup — mất hàng giờ, không phải vài phút.')],
        ],
      ),
      quiz(
        'test-dr',
        ['aws.reliability.dr'],
        tx('What most often makes a DR plan fail on the day?', 'Điều gì thường khiến kế hoạch DR thất bại vào ngày thật?'),
        [
          ['a', tx('It was never tested — restores, runbooks and DNS failover were never practiced', 'Nó chưa từng được kiểm thử — khôi phục, runbook và failover DNS chưa bao giờ được tập'), true, tx('Run regular game days; an untested backup is only a hope.', 'Tổ chức game day định kỳ; backup chưa thử khôi phục chỉ là niềm hy vọng.')],
          ['b', tx('Choosing the wrong Region', 'Chọn sai Region'), false, tx('Possible, but untested plans are by far the most common failure.', 'Có thể, nhưng kế hoạch chưa kiểm thử mới là nguyên nhân phổ biến nhất.')],
        ],
      ),
    ],
    'multi-region': [
      estimate(
        'parallel',
        ['aws.reliability.availability-math'],
        tx('Two independent Regional stacks, each 99.9% available, behind a perfect failover. Combined availability in % (e.g. 99.99)?', 'Hai stack Region độc lập, mỗi stack availability 99,9%, phía sau một cơ chế failover hoàn hảo. Availability tổng hợp tính bằng % (vd 99,99)?'),
        '%',
        99.9999,
        0.00001,
        tx('Both must fail: 0.001 × 0.001 = 0.000001 → 99.9999%. In practice, shared dependencies and failover mistakes lower this.', 'Cả hai phải cùng hỏng: 0,001 × 0,001 = 0,000001 → 99,9999%. Thực tế, các phụ thuộc chung và lỗi failover làm con số này thấp hơn.'),
      ),
      quiz(
        'active-active-data',
        ['aws.reliability.multi-region'],
        tx('What is the hardest part of active-active across Regions?', 'Phần khó nhất của active-active đa Region là gì?'),
        [
          ['a', tx('Data: conflicting writes and replication lag between Regions', 'Dữ liệu: ghi xung đột và độ trễ nhân bản giữa các Region'), true, tx('DynamoDB Global Tables use last-writer-wins; many teams route each user to a "home" Region.', 'DynamoDB Global Tables dùng last-writer-wins; nhiều team định tuyến mỗi user về một Region "nhà".')],
          ['b', tx('Copying the code', 'Sao chép code'), false, tx('IaC and pipelines make that the easy part.', 'IaC và pipeline làm phần đó trở nên dễ.')],
        ],
      ),
      quiz(
        'failover-routing',
        ['aws.reliability.multi-region', 'aws.networking.route53'],
        tx('How does traffic move to the second Region when the first fails?', 'Traffic chuyển sang Region thứ hai thế nào khi Region đầu hỏng?'),
        [
          ['a', tx('Route 53 health checks with failover (or latency) routing, or Global Accelerator', 'Health check của Route 53 với định tuyến failover (hoặc latency), hoặc Global Accelerator'), true, tx('DNS TTLs add delay; Global Accelerator shifts traffic in seconds with static anycast IPs.', 'TTL của DNS gây thêm độ trễ; Global Accelerator chuyển traffic trong vài giây với IP anycast cố định.')],
          ['b', tx('An ALB spanning both Regions', 'Một ALB trải trên cả hai Region'), false, tx('ALBs are Regional.', 'ALB chỉ nằm trong một Region.')],
        ],
      ),
      paymentsNines,
    ],
  },
  observability: {
    'observability-deep': [
      quiz(
        'three-pillars',
        ['aws.operations.observability'],
        tx('A request is slow somewhere across 6 microservices. Which signal shows where the time goes?', 'Một request bị chậm ở đâu đó qua 6 microservice. Tín hiệu nào cho thấy thời gian bị tiêu ở đâu?'),
        [
          ['a', tx('Distributed traces (X-Ray / OpenTelemetry)', 'Distributed trace (X-Ray / OpenTelemetry)'), true, tx('A trace shows each hop\'s span and duration for a single request.', 'Một trace cho thấy span và thời gian của từng chặng trong một request.')],
          ['b', tx('CPU metrics', 'Metric CPU'), false, tx('Metrics tell you something is wrong, rarely where in a call chain.', 'Metric cho biết có vấn đề, hiếm khi cho biết ở đâu trong chuỗi gọi.')],
        ],
      ),
      estimate(
        'error-budget',
        ['aws.operations.slo'],
        tx('An SLO of 99.9% over a 30-day month allows how many minutes of downtime (error budget)?', 'SLO 99,9% trong một tháng 30 ngày cho phép bao nhiêu phút downtime (error budget)?'),
        'minutes',
        43.2,
        0.02,
        tx('30 × 24 × 60 = 43,200 min × 0.1% = 43.2 minutes. 99.99% leaves only 4.3 minutes.', '30 × 24 × 60 = 43.200 phút × 0,1% = 43,2 phút. 99,99% chỉ còn 4,3 phút.'),
      ),
      quiz(
        'burn-rate',
        ['aws.operations.slo', 'aws.operations.alarms'],
        tx('Which alarm best wakes someone up only for problems that matter?', 'Alarm nào gọi người dậy chỉ khi vấn đề thật sự quan trọng?'),
        [
          ['a', tx('An SLO burn-rate alarm (e.g. budget burning 14× faster over 1 h and 5 min)', 'Alarm theo burn rate của SLO (vd error budget cháy nhanh gấp 14 lần trong cả 1 giờ lẫn 5 phút)'), true, tx('It pages on user-visible impact, not on every CPU spike.', 'Nó gọi khi người dùng thật sự bị ảnh hưởng, không phải mỗi lần CPU tăng vọt.')],
          ['b', tx('CPU > 70% for 1 minute on any instance', 'CPU > 70% trong 1 phút trên bất kỳ instance nào'), false, tx('Noisy: high CPU is often fine. Alert fatigue makes people ignore real pages.', 'Gây nhiễu: CPU cao thường vẫn ổn. Bị báo động quá nhiều khiến người ta bỏ qua cả cảnh báo thật.')],
        ],
      ),
    ],
    'incident-management': [
      quiz(
        'first-step',
        ['aws.operations.incidents'],
        tx('A bad deploy went out 10 minutes ago and errors spiked. What first?', 'Một bản deploy lỗi lên production 10 phút trước và lỗi tăng vọt. Làm gì đầu tiên?'),
        [
          ['a', tx('Mitigate first: roll back (or shift traffic), then investigate the root cause', 'Giảm thiệt hại trước: rollback (hoặc chuyển traffic), sau đó mới điều tra nguyên nhân gốc'), true, tx('Restore service, then understand. Debugging live while users suffer extends the outage.', 'Khôi phục dịch vụ trước, hiểu sau. Debug trực tiếp trong khi người dùng chịu ảnh hưởng chỉ kéo dài sự cố.')],
          ['b', tx('Find the exact bug in the code', 'Tìm chính xác lỗi trong code'), false, tx('That can take hours; rollback takes minutes.', 'Việc đó có thể mất hàng giờ; rollback chỉ mất vài phút.')],
        ],
      ),
      quiz(
        'blameless',
        ['aws.operations.incidents'],
        tx('What is the purpose of a blameless postmortem?', 'Mục đích của một postmortem không đổ lỗi là gì?'),
        [
          ['a', tx('Learn how the system allowed the failure and fix that, with owned action items', 'Hiểu vì sao hệ thống cho phép lỗi xảy ra và sửa điều đó, với các việc cần làm có người chịu trách nhiệm'), true, tx('People hide information when they fear blame; systems and processes are what you can fix.', 'Người ta giấu thông tin khi sợ bị đổ lỗi; thứ bạn sửa được là hệ thống và quy trình.')],
          ['b', tx('Find who made the mistake', 'Tìm ra ai gây lỗi'), false, tx('That discourages honesty and does not prevent the next incident.', 'Điều đó làm mọi người ngại trung thực và không ngăn được sự cố tiếp theo.')],
        ],
      ),
      quiz(
        'roles',
        ['aws.operations.incidents'],
        tx('During a major incident, who coordinates and communicates while engineers debug?', 'Trong một sự cố lớn, ai điều phối và truyền thông trong khi kỹ sư debug?'),
        [
          ['a', tx('An incident commander, with a separate communications lead', 'Một incident commander, cùng một người phụ trách truyền thông riêng'), true, tx('Clear roles stop everyone from debugging the same thing while nobody updates customers.', 'Vai trò rõ ràng giúp tránh việc mọi người cùng debug một chỗ mà không ai cập nhật cho khách hàng.')],
          ['b', tx('Whoever is most senior', 'Người có thâm niên cao nhất'), false, tx('Seniority is not a role; the commander can be anyone trained for it.', 'Thâm niên không phải là một vai trò; commander có thể là bất kỳ ai được đào tạo cho việc đó.')],
        ],
      ),
    ],
  },
};
