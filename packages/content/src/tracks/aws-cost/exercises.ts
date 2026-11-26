import { buildDesign, tx } from '@cloudlab/catalog';
import type { CourseExercises } from '../../define.ts';
import { exerciseBuilders, R, scenario } from '../../helpers.ts';

const { quiz, estimate, challenge } = exerciseBuilders('aws-cost');

const saasScenario = scenario({ rps: 1500, peakMultiplier: 2, readRatio: 0.9, payloadKB: 4 });

export const cutHalf = challenge({
  id: 'cut-half',
  kind: 'canvas-fix',
  skills: ['aws.cost.rightsizing', 'aws.cost.commitments', 'aws.caching.elasticache'],
  title: tx('Cut the bill in half — keep the SLO', 'Cắt nửa hoá đơn — giữ nguyên SLO'),
  brief: tx(
    'The CFO wants this SaaS backend\'s monthly bill cut by at least half. It was sized "to be safe" at launch: big instances running 24/7 on-demand, and the largest database class with an extra replica.\n\nTraffic: 1,500 req/s, 2× at peak, 90% reads. You must keep the SLO: survives an AZ outage, ≥ 99.9% availability, p95 ≤ 150 ms.',
    'CFO muốn hoá đơn hàng tháng của backend SaaS này giảm ít nhất một nửa. Lúc ra mắt nó được định cỡ "cho chắc": instance lớn chạy on-demand 24/7, và database loại lớn nhất kèm thêm một replica.\n\nTraffic: 1.500 req/s, gấp đôi lúc cao điểm, 90% là đọc. Bạn phải giữ SLO: chịu được sự cố một AZ, availability ≥ 99,9%, p95 ≤ 150 ms.',
  ),
  scenario: saasScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 'm6i.2xlarge', count: 6, autoscaling: false, multiAz: true, purchase: 'on-demand', ebsGB: 200 }],
      ['db', 'rds', 3, 1, { instanceClass: 'db.r6g.2xlarge', multiAz: true, replicas: 1 }],
    ],
    ['users>lb', 'lb>app', 'app>db'],
    saasScenario,
  ),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    R.errors(),
    R.survivesAz(),
    R.availability(0.999),
    R.p95(150),
    R.cost(2750),
  ],
  hints: [
    tx('Check utilisation on every node: what is mostly idle? Peak needs ~3,000 req/s; the fleet can serve 14,400.', 'Xem utilization của từng node: cái gì phần lớn đang rảnh? Cao điểm cần ~3.000 req/s; fleet phục vụ được 14.400.'),
    tx('Three levers: rightsize (smaller instances + Auto Scaling for peaks), commit (Savings Plan for the steady baseline), and take reads off the database (a cache).', 'Ba đòn bẩy: rightsize (instance nhỏ hơn + Auto Scaling cho cao điểm), cam kết (Savings Plan cho phần tải nền ổn định), và giảm tải đọc cho database (cache).'),
    tx('e.g. c6i.xlarge × 2–6 with Auto Scaling and a 1-year Savings Plan, ElastiCache (with a replica) in front of a db.r6g.large Multi-AZ, 30 GB disks.', 'vd c6i.xlarge × 2–6 có Auto Scaling và Savings Plan 1 năm, ElastiCache (có replica) đứng trước db.r6g.large Multi-AZ, ổ 30 GB.'),
  ],
  debrief: tx(
    'Typical first-year savings come from exactly these levers, in this order: turn off or shrink what is idle (rightsizing), scale with demand instead of provisioning for peak 24/7, commit to the steady baseline (Savings Plans / Reserved Instances), and move load to cheaper tiers (a cache absorbs reads for a fraction of a database\'s price). Measure first — rightsizing before committing, or you lock in waste.',
    'Phần tiết kiệm của năm đầu thường đến từ đúng các đòn bẩy này, theo thứ tự: tắt hoặc thu nhỏ cái đang rảnh (rightsizing), scale theo nhu cầu thay vì dựng cho cao điểm 24/7, cam kết cho phần tải nền ổn định (Savings Plans / Reserved Instances), và chuyển tải sang tầng rẻ hơn (cache gánh lượt đọc với giá chỉ bằng một phần database). Hãy đo trước — rightsize trước rồi mới cam kết, nếu không bạn sẽ khoá luôn phần lãng phí.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 'c6i.xlarge', count: 2, autoscaling: true, maxCount: 6, multiAz: true, purchase: 'savings-plan-1y', ebsGB: 30 }],
      ['cache', 'elasticache', 3, 0, { nodeType: 'cache.t3.medium', replicas: 1, hitRatio: 0.85 }],
      ['db', 'rds', 3, 2, { instanceClass: 'db.r6g.large', multiAz: true, replicas: 0 }],
    ],
    ['users>lb', 'lb>app', 'app>cache', 'app>db'],
    saasScenario,
  ),
});

export const exercises: CourseExercises = {
  bill: {
    'pricing-deep': [
      quiz(
        'dimensions',
        ['aws.cost.pricing'],
        tx('Which three dimensions make up most AWS bills?', 'Ba chiều tính giá nào tạo nên phần lớn hoá đơn AWS?'),
        [
          ['a', tx('Compute time, storage, and data transfer (plus requests for serverless)', 'Thời gian compute, lưu trữ, và truyền dữ liệu (cộng thêm số request với serverless)'), true, tx('Nearly every line item is a variation of these.', 'Gần như mọi dòng trong hoá đơn đều là biến thể của những chiều này.')],
          ['b', tx('Number of users, features and regions', 'Số người dùng, số tính năng và số region'), false, tx('AWS does not price by your users or features.', 'AWS không tính giá theo người dùng hay tính năng của bạn.')],
        ],
      ),
      quiz(
        'inbound',
        ['aws.cost.transfer'],
        tx('Which data transfer is usually free?', 'Loại truyền dữ liệu nào thường miễn phí?'),
        [
          ['a', tx('Data coming in from the internet to AWS', 'Dữ liệu từ internet đi vào AWS'), true, tx('Inbound is free; outbound to the internet, cross-Region and cross-AZ are not.', 'Chiều vào miễn phí; chiều ra internet, liên Region và cross-AZ thì không.')],
          ['b', tx('Traffic between two AZs', 'Traffic giữa hai AZ'), false, tx('Cross-AZ costs ~$0.01/GB in each direction.', 'Cross-AZ tốn ~$0.01/GB mỗi chiều.')],
          ['c', tx('Data out to the internet', 'Dữ liệu ra internet'), false, tx('After the first 100 GB/month, about $0.09/GB.', 'Sau 100 GB đầu mỗi tháng, khoảng $0.09/GB.')],
        ],
      ),
      quiz(
        'cur',
        ['aws.cost.visibility'],
        tx('You need hourly, per-resource cost data to analyse in Athena. Which tool?', 'Bạn cần dữ liệu chi phí theo giờ, theo từng tài nguyên để phân tích bằng Athena. Dùng công cụ nào?'),
        [
          ['a', tx('Cost and Usage Report (CUR / Data Exports) to S3', 'Cost and Usage Report (CUR / Data Exports) xuất ra S3'), true, tx('The most detailed billing data, queryable with Athena or QuickSight.', 'Dữ liệu chi phí chi tiết nhất, truy vấn được bằng Athena hoặc QuickSight.')],
          ['b', tx('The Pricing Calculator', 'Pricing Calculator'), false, tx('The calculator estimates future costs; it does not report actual spend.', 'Calculator chỉ ước tính chi phí tương lai; nó không báo cáo chi tiêu thực tế.')],
        ],
      ),
    ],
  },
  optimize: {
    commitments: [
      quiz(
        'sp-type',
        ['aws.cost.commitments'],
        tx('You run a mix of EC2 (changing families), Fargate and Lambda. Which commitment fits best?', 'Bạn chạy kết hợp EC2 (đổi họ instance thường xuyên), Fargate và Lambda. Loại cam kết nào phù hợp nhất?'),
        [
          ['a', tx('Compute Savings Plan', 'Compute Savings Plan'), true, tx('It applies across instance families, Regions, Fargate and Lambda.', 'Nó áp dụng xuyên họ instance, Region, Fargate và Lambda.')],
          ['b', tx('EC2 Instance Savings Plan for m6i in us-east-1', 'EC2 Instance Savings Plan cho m6i ở us-east-1'), false, tx('Deeper discount but locked to one family and Region — risky when you keep changing.', 'Giảm sâu hơn nhưng bị khoá vào một họ instance và Region — rủi ro khi bạn hay thay đổi.')],
        ],
      ),
      estimate(
        'commit-baseline',
        ['aws.cost.commitments'],
        tx('Your compute spend ranges between $40/h at night and $100/h at peak, never below $40. To keep a Savings Plan near 100% utilisation, how many $/h should you commit?', 'Chi phí compute dao động từ $40/giờ ban đêm tới $100/giờ lúc cao điểm, không bao giờ dưới $40. Để Savings Plan được dùng gần 100%, nên cam kết bao nhiêu $/giờ?'),
        '$/h',
        40,
        0.05,
        tx('Commit to the floor ($40/h); the variable part stays on-demand or Spot. Over-committing pays for unused hours.', 'Cam kết ở mức sàn ($40/giờ); phần biến động để on-demand hoặc Spot. Cam kết quá mức là trả tiền cho những giờ không dùng.'),
      ),
      quiz(
        'coverage-util',
        ['aws.cost.commitments'],
        tx('Coverage 60%, utilisation 100%. What does that tell you?', 'Coverage 60%, utilization 100%. Điều đó cho biết gì?'),
        [
          ['a', tx('All commitments are used, and 40% of eligible spend is still on-demand — you could commit more', 'Mọi cam kết đều được dùng hết, và 40% chi tiêu đủ điều kiện vẫn đang on-demand — có thể cam kết thêm'), true, tx('Utilisation measures waste in commitments; coverage measures how much is discounted.', 'Utilization đo lãng phí trong cam kết; coverage đo phần chi tiêu được giảm giá.')],
          ['b', tx('You committed too much', 'Bạn đã cam kết quá nhiều'), false, tx('Over-commitment shows as utilisation below 100%.', 'Cam kết quá mức sẽ thể hiện bằng utilization dưới 100%.')],
        ],
      ),
    ],
    rightsizing: [
      quiz(
        'order',
        ['aws.cost.rightsizing'],
        tx('In what order should you optimise?', 'Nên tối ưu theo thứ tự nào?'),
        [
          ['a', tx('Remove waste → rightsize → then buy commitments for what remains', 'Bỏ lãng phí → rightsize → rồi mới mua cam kết cho phần còn lại'), true, tx('Committing first locks in today\'s oversized fleet for 1–3 years.', 'Cam kết trước sẽ khoá fleet quá cỡ hôm nay trong 1–3 năm.')],
          ['b', tx('Buy a 3-year commitment first', 'Mua cam kết 3 năm trước'), false, tx('You may commit to capacity you are about to delete.', 'Bạn có thể cam kết cho capacity mà mình sắp xoá.')],
        ],
      ),
      quiz(
        'graviton',
        ['aws.cost.rightsizing', 'aws.compute.graviton'],
        tx('A stateless Java service runs on m6i instances. Cheapest low-risk change?', 'Một service Java không trạng thái chạy trên instance m6i. Thay đổi rủi ro thấp nhất mà rẻ nhất?'),
        [
          ['a', tx('Move to Graviton (m7g): ~20% cheaper and often faster per dollar', 'Chuyển sang Graviton (m7g): rẻ hơn ~20% và thường nhanh hơn trên mỗi đô'), true, tx('JVM, Node, Python and Go usually run on Arm with no code changes.', 'JVM, Node, Python và Go thường chạy được trên Arm mà không cần sửa code.')],
          ['b', tx('Move to the largest instance', 'Chuyển sang instance lớn nhất'), false, tx('That raises cost.', 'Điều đó làm tăng chi phí.')],
        ],
      ),
      estimate(
        'idle-dev',
        ['aws.cost.rightsizing'],
        tx('A dev environment costs $1,000/month running 24/7. If you stop it outside 50 working hours a week (out of 168), roughly how much do you save per month (USD)?', 'Một môi trường dev tốn $1.000/tháng khi chạy 24/7. Nếu tắt nó ngoài 50 giờ làm việc mỗi tuần (trên tổng 168 giờ), mỗi tháng tiết kiệm khoảng bao nhiêu (USD)?'),
        'USD',
        702,
        0.05,
        tx('Runs 50/168 ≈ 30% of the time → ~$298 → saves ~$702 (70%). Instance Scheduler or simple EventBridge schedules do this.', 'Chạy 50/168 ≈ 30% thời gian → ~$298 → tiết kiệm ~$702 (70%). Instance Scheduler hoặc lịch EventBridge đơn giản làm được việc này.'),
      ),
      cutHalf,
    ],
    'storage-transfer-costs': [
      estimate(
        'egress',
        ['aws.cost.transfer'],
        tx('Your API sends 50 TB a month to the internet at $0.09/GB from the origin, or $0.085/GB via CloudFront. Approximate monthly saving via CloudFront, in USD (1 TB = 1,000 GB)?', 'API của bạn gửi 50 TB mỗi tháng ra internet, giá $0.09/GB từ origin, hoặc $0.085/GB qua CloudFront. Tiết kiệm khoảng bao nhiêu mỗi tháng nếu qua CloudFront, tính bằng USD (1 TB = 1.000 GB)?'),
        'USD',
        250,
        0.05,
        tx('50,000 GB × $0.005 = $250 — before counting cache hits, which also cut origin load. Volume tiers lower both prices further.', '50.000 GB × $0.005 = $250 — chưa kể cache hit, vốn còn giảm tải cho origin. Các bậc giá theo khối lượng còn làm cả hai giá giảm thêm.'),
      ),
      quiz(
        'nat-s3',
        ['aws.cost.transfer', 'aws.networking.endpoints'],
        tx('Private instances pull 20 TB a month from S3 through a NAT gateway. Cheapest fix?', 'Các instance private kéo 20 TB mỗi tháng từ S3 qua NAT gateway. Cách sửa rẻ nhất?'),
        [
          ['a', tx('A gateway VPC endpoint for S3 (free)', 'Một gateway VPC endpoint cho S3 (miễn phí)'), true, tx('It removes $0.045/GB NAT processing — about $900/month here.', 'Nó loại bỏ phí xử lý NAT $0.045/GB — khoảng $900/tháng ở đây.')],
          ['b', tx('A bigger NAT gateway', 'NAT gateway lớn hơn'), false, tx('NAT bills per GB processed; size does not help.', 'NAT tính phí theo GB xử lý; kích thước không giúp gì.')],
        ],
      ),
      quiz(
        'lifecycle',
        ['aws.cost.storage'],
        tx('Logs are read often in the first week and almost never after 90 days, but kept 7 years. Best storage plan?', 'Log được đọc nhiều trong tuần đầu và gần như không đọc sau 90 ngày, nhưng phải giữ 7 năm. Kế hoạch lưu trữ tốt nhất?'),
        [
          ['a', tx('Lifecycle: Standard → Standard-IA at 30 days → Glacier Deep Archive at 90 days → expire at 7 years', 'Lifecycle: Standard → Standard-IA sau 30 ngày → Glacier Deep Archive sau 90 ngày → xoá sau 7 năm'), true, tx('Deep Archive is ~$1/TB-month — over 20× cheaper than Standard.', 'Deep Archive khoảng $1/TB-tháng — rẻ hơn Standard hơn 20 lần.')],
          ['b', tx('Keep everything in S3 Standard', 'Giữ tất cả ở S3 Standard'), false, tx('You pay hot-storage prices for 7 years of cold data.', 'Bạn trả giá lưu trữ nóng cho 7 năm dữ liệu lạnh.')],
        ],
      ),
    ],
  },
  governance: {
    'finops-practice': [
      quiz(
        'tags',
        ['aws.cost.governance'],
        tx('Finance cannot tell which team caused a cost spike. What is the foundation fix?', 'Bộ phận tài chính không biết team nào gây ra đợt tăng chi phí. Cách khắc phục nền tảng là gì?'),
        [
          ['a', tx('Enforced cost-allocation tags (team, env, service) plus separate accounts per team or environment', 'Bắt buộc gắn tag phân bổ chi phí (team, env, service) cộng account riêng theo team hoặc môi trường'), true, tx('Activate the tags in Billing and enforce them with tag policies or SCPs.', 'Kích hoạt tag trong Billing và bắt buộc chúng bằng tag policy hoặc SCP.')],
          ['b', tx('A monthly email asking teams to be careful', 'Một email hằng tháng nhắc các team cẩn thận'), false, tx('Without attribution, nobody owns the number.', 'Không phân bổ được thì không ai chịu trách nhiệm con số.')],
        ],
      ),
      quiz(
        'anomaly',
        ['aws.cost.governance'],
        tx('A forgotten GPU instance runs all weekend. What would have caught it within hours?', 'Một instance GPU bị quên chạy suốt cuối tuần. Cái gì có thể phát hiện nó trong vài giờ?'),
        [
          ['a', tx('Cost Anomaly Detection with alerts (plus AWS Budgets thresholds)', 'Cost Anomaly Detection kèm cảnh báo (cộng ngưỡng AWS Budgets)'), true, tx('ML-based detection of unusual spend per service or tag, with SNS/email alerts.', 'Phát hiện chi tiêu bất thường bằng ML theo dịch vụ hoặc tag, kèm cảnh báo SNS/email.')],
          ['b', tx('The monthly invoice', 'Hoá đơn hàng tháng'), false, tx('Weeks too late.', 'Muộn tới vài tuần.')],
        ],
      ),
      quiz(
        'unit-economics',
        ['aws.cost.governance'],
        tx('The cloud bill grew 40% this year. How do you tell if that is good or bad?', 'Hoá đơn cloud năm nay tăng 40%. Làm sao biết đó là tốt hay xấu?'),
        [
          ['a', tx('Track unit cost, e.g. cost per order or per active user — if it fell while volume grew 80%, things improved', 'Theo dõi chi phí đơn vị, vd chi phí mỗi đơn hàng hoặc mỗi người dùng hoạt động — nếu nó giảm trong khi khối lượng tăng 80% thì mọi thứ đã tốt lên'), true, tx('Unit economics connect spend to business value.', 'Unit economics nối chi tiêu với giá trị kinh doanh.')],
          ['b', tx('Any growth is bad', 'Tăng bao nhiêu cũng là xấu'), false, tx('Growth in usage should grow the bill; efficiency is what matters.', 'Mức sử dụng tăng thì hoá đơn cũng tăng; điều quan trọng là hiệu quả.')],
        ],
      ),
    ],
  },
};
