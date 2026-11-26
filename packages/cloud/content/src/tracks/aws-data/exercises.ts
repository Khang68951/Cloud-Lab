import { buildDesign, tx } from '@learninglab/cloud-catalog';
import type { CourseExercises } from '../../define.ts';
import { exerciseBuilders, R, scenario } from '../../helpers.ts';

const { quiz, estimate, challenge } = exerciseBuilders('aws-data');

const readsScenario = scenario({ rps: 3000, peakMultiplier: 2, readRatio: 0.95, payloadKB: 2 });

export const auroraReads = challenge({
  id: 'aurora-reads',
  kind: 'canvas-fix',
  skills: ['aws.databases.aurora', 'aws.databases.read-scaling'],
  title: tx('A database for heavy reads and four nines', 'Database cho tải đọc lớn và bốn số 9'),
  brief: tx(
    'A product API does 3,000 req/s (6,000 at peak), 95% reads that must be fresh (no caching allowed by the business). The RDS primary is overloaded, and the business now asks for ≥ 99.95% availability.\n\nPick and size the database layer.',
    'Một API sản phẩm phục vụ 3.000 req/s (6.000 lúc cao điểm), 95% là đọc và dữ liệu phải luôn mới (business không cho phép cache). Primary RDS đang quá tải, và business giờ yêu cầu availability ≥ 99,95%.\n\nHãy chọn và định cỡ tầng database.',
  ),
  scenario: readsScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '1-2', count: 2, autoscaling: true, maxCount: 40, multiAz: true }],
      ['db', 'rds', 3, 1, { instanceClass: 'db.r6g.large', multiAz: true }],
    ],
    ['users>lb', 'lb>app', 'app>db'],
    readsScenario,
  ),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    R.errors(),
    R.availability(0.9995),
    R.p95(120),
    { type: 'not-uses', services: ['elasticache', 'cloudfront'], label: tx('No caching layer (data must be fresh)', 'Không dùng tầng cache (dữ liệu phải luôn mới)') },
    R.cost(3500),
  ],
  hints: [
    tx('Two problems: read capacity, and the availability ceiling of an RDS Multi-AZ instance (99.95%) combined with the ALB in series.', 'Hai vấn đề: sức chứa cho việc đọc, và trần availability của RDS Multi-AZ (99,95%) khi nối tiếp với ALB.'),
    tx('Which relational engine gives low-lag replicas that are also failover targets, with a higher availability?', 'Engine quan hệ nào cho replica độ trễ thấp, đồng thời là đích failover, và có availability cao hơn?'),
    tx('Replace RDS with Aurora (db.r6g.large) and add 2 replicas.', 'Thay RDS bằng Aurora (db.r6g.large) và thêm 2 replica.'),
  ],
  debrief: tx(
    'Aurora replicas share the same storage volume, so they lag milliseconds behind the writer and double as failover targets (~30 s). Reads scale out, and availability goes up because the storage is always replicated across 3 AZs. With RDS you would need read replicas plus Multi-AZ — and still hit a lower availability ceiling.',
    'Các replica của Aurora dùng chung một volume storage, nên chỉ trễ vài mili giây so với writer và kiêm luôn đích failover (~30 giây). Việc đọc scale ngang được, và availability tăng lên vì storage luôn được nhân bản trên 3 AZ. Với RDS bạn cần cả read replica lẫn Multi-AZ — mà trần availability vẫn thấp hơn.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'fargate', 2, 1, { taskSize: '1-2', count: 2, autoscaling: true, maxCount: 40, multiAz: true }],
      ['db', 'aurora', 3, 1, { instanceClass: 'db.r6g.large', replicas: 2 }],
    ],
    ['users>lb', 'lb>app', 'app>db'],
    readsScenario,
  ),
});

const steadyScenario = scenario({ rps: 500, peakMultiplier: 1.2, readRatio: 0.7, payloadKB: 1 });

export const provisionedDynamo = challenge({
  id: 'provisioned-dynamo',
  kind: 'canvas-fix',
  skills: ['aws.databases.dynamodb', 'aws.cost.capacity'],
  title: tx('Steady traffic, on-demand prices', 'Traffic đều nhưng trả giá on-demand'),
  brief: tx(
    'An IoT backend writes and reads device state at a very steady 500 req/s (peaks only +20%). The DynamoDB table uses on-demand capacity.\n\nCut the bill without throttling at peak.',
    'Một backend IoT ghi và đọc trạng thái thiết bị đều đặn 500 req/s (đỉnh chỉ cao hơn 20%). Bảng DynamoDB đang dùng capacity on-demand.\n\nHãy cắt giảm hoá đơn mà không bị throttle lúc cao điểm.',
  ),
  scenario: steadyScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 't3.medium', count: 2, autoscaling: true, maxCount: 6, multiAz: true }],
      ['vpce', 'vpce', 2, 2, { type: 'gateway' }, 'S3/DynamoDB endpoint'],
      ['table', 'dynamodb', 3, 1, { mode: 'on-demand' }],
    ],
    ['users>lb', 'lb>app', 'app>table'],
    steadyScenario,
  ),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    R.errors(),
    { type: 'uses', services: ['dynamodb'], label: tx('Keeps DynamoDB', 'Vẫn dùng DynamoDB') },
    R.cost(450),
  ],
  hints: [
    tx('On-demand is priced per request; is this traffic unpredictable?', 'On-demand tính theo request; traffic này có khó đoán không?'),
    tx('Provisioned capacity is billed per hour. Compute the RCU/WCU needed at peak: reads × 0.5 RCU (eventually consistent, ≤ 4 KB), writes × 1 WCU (≤ 1 KB).', 'Capacity provisioned tính theo giờ. Tính RCU/WCU cần lúc cao điểm: lượt đọc × 0,5 RCU (eventually consistent, ≤ 4 KB), lượt ghi × 1 WCU (≤ 1 KB).'),
    tx('Peak: 420 reads/s → ~210 RCU, 180 writes/s → 180 WCU. Provision with ~25% headroom.', 'Đỉnh: 420 lượt đọc/giây → ~210 RCU, 180 lượt ghi/giây → 180 WCU. Đặt dư khoảng 25%.'),
  ],
  debrief: tx(
    'For steady, predictable traffic, provisioned capacity (ideally with auto scaling, plus reserved capacity for the long term) is often 50%+ cheaper than on-demand. On-demand shines for new, spiky or unknown workloads — you can switch modes as the workload matures.',
    'Với traffic đều và dự đoán được, capacity provisioned (tốt nhất là có auto scaling, và reserved capacity cho dài hạn) thường rẻ hơn on-demand từ 50% trở lên. On-demand toả sáng với workload mới, theo đợt hoặc chưa rõ — bạn có thể đổi chế độ khi workload đã ổn định.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 't3.medium', count: 2, autoscaling: true, maxCount: 6, multiAz: true }],
      ['vpce', 'vpce', 2, 2, { type: 'gateway' }, 'S3/DynamoDB endpoint'],
      ['table', 'dynamodb', 3, 1, { mode: 'provisioned', rcu: 300, wcu: 250 }],
    ],
    ['users>lb', 'lb>app', 'app>table'],
    steadyScenario,
  ),
});

export const exercises: CourseExercises = {
  storage: {
    's3-deep': [
      quiz(
        'consistency',
        ['aws.storage.s3'],
        tx('You PUT a new version of an object and immediately GET it. What do you read?', 'Bạn PUT phiên bản mới của một object rồi GET ngay lập tức. Bạn đọc được gì?'),
        [
          ['a', tx('The new version — S3 has strong read-after-write consistency', 'Phiên bản mới — S3 có tính nhất quán mạnh đọc-sau-ghi'), true, tx('Since 2020, S3 is strongly consistent for PUTs, DELETEs and LISTs.', 'Từ năm 2020, S3 nhất quán mạnh cho PUT, DELETE và LIST.')],
          ['b', tx('Possibly the old version for a few seconds', 'Có thể vẫn là phiên bản cũ trong vài giây'), false, tx('That was the old eventual-consistency behaviour.', 'Đó là hành vi eventual consistency trước đây.')],
        ],
      ),
      quiz(
        'presigned',
        ['aws.storage.s3', 'aws.security.edge'],
        tx('Users must upload 2 GB videos from the browser without the files passing through your servers. How?', 'Người dùng cần upload video 2 GB từ trình duyệt mà file không đi qua server của bạn. Làm thế nào?'),
        [
          ['a', tx('Your API returns a short-lived presigned URL (multipart for big files); the browser uploads directly to S3', 'API trả về một presigned URL ngắn hạn (multipart cho file lớn); trình duyệt upload thẳng lên S3'), true, tx('Servers only sign; S3 handles the bytes.', 'Server chỉ ký; S3 lo phần dữ liệu.')],
          ['b', tx('Make the bucket publicly writable', 'Cho bucket ghi công khai'), false, tx('Anyone could fill your bucket — never do this.', 'Ai cũng có thể làm đầy bucket của bạn — đừng bao giờ làm vậy.')],
        ],
      ),
      quiz(
        'object-lock',
        ['aws.storage.s3'],
        tx('Regulations require audit logs that nobody — not even an admin — can delete for 7 years. Use:', 'Quy định yêu cầu log kiểm toán mà không ai — kể cả admin — xoá được trong 7 năm. Dùng:'),
        [
          ['a', tx('S3 Object Lock in compliance mode with a 7-year retention', 'S3 Object Lock ở chế độ compliance với thời gian lưu 7 năm'), true, tx('WORM storage: write once, read many.', 'Lưu trữ WORM: ghi một lần, đọc nhiều lần.')],
          ['b', tx('Versioning only', 'Chỉ bật versioning'), false, tx('Versions can still be deleted by someone with permission.', 'Người có quyền vẫn xoá được các phiên bản.')],
        ],
      ),
      estimate(
        'prefixes',
        ['aws.storage.s3'],
        tx('S3 supports at least 5,500 GET/s per prefix. How many prefixes do you need to spread 22,000 GET/s?', 'S3 hỗ trợ ít nhất 5.500 GET/giây cho mỗi prefix. Cần bao nhiêu prefix để chia 22.000 GET/giây?'),
        'prefixes',
        4,
        0.001,
        tx('22,000 ÷ 5,500 = 4. Put a hash or ID in the key path; for hot public content, CloudFront in front is even better.', '22.000 ÷ 5.500 = 4. Đặt hash hoặc ID vào đường dẫn key; với nội dung public nóng, đặt CloudFront phía trước còn tốt hơn.'),
      ),
    ],
    'block-file': [
      quiz(
        'gp3-io2',
        ['aws.storage.ebs'],
        tx('A database needs a guaranteed 40,000 IOPS with sub-millisecond latency and 99.999% durability. Which EBS type?', 'Một database cần đảm bảo 40.000 IOPS, độ trễ dưới 1 ms và độ bền 99,999%. Chọn loại EBS nào?'),
        [
          ['a', tx('io2 Block Express', 'io2 Block Express'), true, tx('Provisioned IOPS up to 256,000 with the highest durability.', 'IOPS đặt trước tới 256.000, độ bền cao nhất.')],
          ['b', tx('gp3', 'gp3'), false, tx('gp3 tops out at 16,000 IOPS — perfect for most volumes, not this one.', 'gp3 tối đa 16.000 IOPS — hợp với phần lớn ổ đĩa, nhưng không đủ cho trường hợp này.')],
          ['c', tx('st1', 'st1'), false, tx('Throughput-optimised HDD for big sequential reads, not random IOPS.', 'HDD tối ưu throughput cho đọc tuần tự khối lớn, không phải IOPS ngẫu nhiên.')],
        ],
      ),
      quiz(
        'efs',
        ['aws.storage.efs'],
        tx('Twenty instances in three AZs must read and write the same folder of files. Use:', 'Hai mươi instance ở ba AZ cần cùng đọc và ghi một thư mục file. Dùng:'),
        [
          ['a', tx('Amazon EFS (NFS)', 'Amazon EFS (NFS)'), true, tx('A shared, elastic, multi-AZ file system.', 'Hệ thống file dùng chung, co giãn, trải nhiều AZ.')],
          ['b', tx('One EBS volume attached to all of them', 'Một ổ EBS gắn vào tất cả'), false, tx('EBS attaches to one instance (Multi-Attach is limited to io2 in one AZ).', 'EBS chỉ gắn được vào một instance (Multi-Attach giới hạn ở io2 trong một AZ).')],
        ],
      ),
      estimate(
        'gp2-gp3',
        ['aws.storage.ebs', 'aws.cost.storage'],
        tx('Migrating 1,000 GB from gp2 ($0.10/GB-month) to gp3 ($0.08/GB-month) saves how much per month (USD)?', 'Chuyển 1.000 GB từ gp2 ($0.10/GB-tháng) sang gp3 ($0.08/GB-tháng) tiết kiệm bao nhiêu mỗi tháng (USD)?'),
        'USD',
        20,
        0.05,
        tx('1,000 × $0.02 = $20/month (20%), and gp3 gives 3,000 IOPS baseline regardless of size. A free, online migration.', '1.000 × $0.02 = $20/tháng (20%), và gp3 cho sẵn 3.000 IOPS nền bất kể dung lượng. Chuyển đổi trực tuyến, không mất phí.'),
      ),
    ],
  },
  relational: {
    'rds-aurora-deep': [
      quiz(
        'rds-proxy',
        ['aws.databases.rds'],
        tx('1,000 Lambda executions each open a PostgreSQL connection and the database runs out of connections. Fix?', '1.000 lượt chạy Lambda, mỗi lượt mở một kết nối PostgreSQL, và database hết kết nối. Sửa thế nào?'),
        [
          ['a', tx('RDS Proxy to pool and share connections', 'RDS Proxy để gom và dùng chung kết nối'), true, tx('It multiplexes many client connections onto few DB connections and speeds up failover.', 'Nó dồn nhiều kết nối từ client vào ít kết nối DB và giúp failover nhanh hơn.')],
          ['b', tx('A bigger instance only', 'Chỉ cần instance lớn hơn'), false, tx('More connections cost memory; the root cause is unpooled connections.', 'Thêm kết nối thì tốn bộ nhớ; gốc rễ là kết nối không được gom.')],
        ],
      ),
      quiz(
        'global-db',
        ['aws.reliability.dr', 'aws.databases.aurora'],
        tx('You need a relational database copy in another Region with ~1 s replication lag and failover in minutes. Use:', 'Bạn cần một bản sao database quan hệ ở region khác, độ trễ nhân bản ~1 giây và failover trong vài phút. Dùng:'),
        [
          ['a', tx('Aurora Global Database', 'Aurora Global Database'), true, tx('Storage-level replication, typically under a second, to up to several secondary Regions.', 'Nhân bản ở tầng storage, thường dưới một giây, tới nhiều region phụ.')],
          ['b', tx('Nightly snapshots copied to the other Region', 'Snapshot mỗi đêm sao chép sang region kia'), false, tx('RPO of up to a day — not ~1 s.', 'RPO có thể tới một ngày — không phải ~1 giây.')],
        ],
      ),
      quiz(
        'pitr',
        ['aws.databases.rds'],
        tx('Someone ran DELETE without WHERE at 14:03. How do you recover the data as of 14:02?', 'Ai đó chạy DELETE không có WHERE lúc 14:03. Làm sao khôi phục dữ liệu ở thời điểm 14:02?'),
        [
          ['a', tx('Point-in-time restore to 14:02 into a new instance, then copy the rows back', 'Point-in-time restore về 14:02 sang một instance mới, rồi chép dữ liệu về'), true, tx('Automated backups + transaction logs allow restores to any second in the retention window.', 'Backup tự động cộng transaction log cho phép khôi phục tới bất kỳ giây nào trong khoảng lưu giữ.')],
          ['b', tx('Fail over to the Multi-AZ standby', 'Failover sang standby Multi-AZ'), false, tx('The standby replicated the DELETE too — Multi-AZ is not a backup.', 'Standby cũng đã nhân bản lệnh DELETE — Multi-AZ không phải là backup.')],
        ],
      ),
      auroraReads,
    ],
  },
  nosql: {
    'dynamodb-modeling': [
      estimate(
        'rcu',
        ['aws.databases.dynamodb'],
        tx('400 strongly consistent reads/s of 6 KB items. One RCU = one strongly consistent read of up to 4 KB per second. How many RCU?', '400 lượt đọc strongly consistent mỗi giây, item 6 KB. Một RCU = một lượt đọc strongly consistent tối đa 4 KB mỗi giây. Cần bao nhiêu RCU?'),
        'RCU',
        800,
        0.001,
        tx('6 KB rounds up to 2 × 4 KB → 2 RCU per read × 400 = 800 RCU. Eventually consistent reads would need half: 400.', '6 KB làm tròn lên 2 × 4 KB → 2 RCU mỗi lượt đọc × 400 = 800 RCU. Đọc eventually consistent chỉ cần một nửa: 400.'),
      ),
      estimate(
        'wcu',
        ['aws.databases.dynamodb'],
        tx('100 writes/s of 2.5 KB items. One WCU = one write of up to 1 KB per second. How many WCU?', '100 lượt ghi mỗi giây, item 2,5 KB. Một WCU = một lượt ghi tối đa 1 KB mỗi giây. Cần bao nhiêu WCU?'),
        'WCU',
        300,
        0.001,
        tx('2.5 KB rounds up to 3 KB → 3 WCU per write × 100 = 300 WCU. Keep items small!', '2,5 KB làm tròn lên 3 KB → 3 WCU mỗi lượt ghi × 100 = 300 WCU. Hãy giữ item nhỏ!'),
      ),
      quiz(
        'hot-key',
        ['aws.databases.dynamodb'],
        tx('A leaderboard table uses partition key = "game_id" and one game gets 90% of traffic. What happens and what helps?', 'Một bảng bảng xếp hạng dùng partition key = "game_id" và một game chiếm 90% traffic. Chuyện gì xảy ra và cách nào giúp được?'),
        [
          ['a', tx('A hot partition gets throttled; shard the key (game_id#0..N) or cache the hot reads', 'Partition nóng bị throttle; chia key (game_id#0..N) hoặc cache các lượt đọc nóng'), true, tx('Each partition has throughput limits — spread writes across key suffixes.', 'Mỗi partition có giới hạn throughput — rải lượt ghi ra nhiều hậu tố key.')],
          ['b', tx('Nothing — DynamoDB scales automatically', 'Không sao — DynamoDB tự scale'), false, tx('Total capacity scales; a single key does not.', 'Tổng capacity scale được; một key đơn lẻ thì không.')],
        ],
      ),
      provisionedDynamo,
    ],
    'purpose-built': [
      quiz(
        'graph',
        ['aws.databases.choosing'],
        tx('"Friends of friends who bought X" queries, 6 hops deep. Best fit?', 'Truy vấn "bạn của bạn đã mua X", sâu 6 bước. Phù hợp nhất?'),
        [
          ['a', tx('Amazon Neptune (graph)', 'Amazon Neptune (graph)'), true, tx('Graph databases traverse relationships efficiently.', 'Database graph duyệt quan hệ một cách hiệu quả.')],
          ['b', tx('DynamoDB', 'DynamoDB'), false, tx('Multi-hop relationship traversal is painful in key-value stores.', 'Duyệt quan hệ nhiều bước rất khổ trong kho key-value.')],
        ],
      ),
      quiz(
        'timeseries',
        ['aws.databases.choosing'],
        tx('Millions of sensor readings per minute, queried by time window, old data downsampled. Best fit?', 'Hàng triệu số đo cảm biến mỗi phút, truy vấn theo khoảng thời gian, dữ liệu cũ được gộp bớt. Phù hợp nhất?'),
        [
          ['a', tx('Amazon Timestream (time-series)', 'Amazon Timestream (time-series)'), true, tx('Built-in time functions and tiered storage for recent vs historical data.', 'Có sẵn hàm xử lý thời gian và lưu trữ phân tầng cho dữ liệu mới và cũ.')],
          ['b', tx('Aurora with one row per reading', 'Aurora, mỗi số đo một dòng'), false, tx('Possible, but you would rebuild what a time-series engine gives you.', 'Làm được, nhưng bạn sẽ phải tự xây lại những gì engine time-series có sẵn.')],
        ],
      ),
      quiz(
        'search',
        ['aws.databases.choosing'],
        tx('Product search with typo tolerance, relevance ranking and facets. Best fit?', 'Tìm sản phẩm có chấp nhận gõ sai, xếp hạng mức liên quan và bộ lọc nhiều tiêu chí. Phù hợp nhất?'),
        [
          ['a', tx('Amazon OpenSearch, fed from your primary database', 'Amazon OpenSearch, được nạp dữ liệu từ database chính'), true, tx('A search engine as a secondary index; the database stays the source of truth.', 'Search engine đóng vai trò index phụ; database vẫn là nguồn dữ liệu gốc.')],
          ['b', tx('SQL LIKE "%term%"', 'SQL LIKE "%term%"'), false, tx('No relevance, no typo tolerance, and full scans.', 'Không xếp hạng, không chấp nhận gõ sai, và phải quét toàn bảng.')],
        ],
      ),
    ],
  },
  caching: {
    'caching-patterns': [
      quiz(
        'write-through',
        ['aws.caching.patterns'],
        tx('Write-through caching means:', 'Write-through caching nghĩa là:'),
        [
          ['a', tx('Every write updates the database and the cache together', 'Mỗi lượt ghi cập nhật cùng lúc database và cache'), true, tx('The cache is always fresh, at the cost of extra writes (and caching data nobody reads).', 'Cache luôn mới, đổi lại tốn thêm lượt ghi (và cache cả dữ liệu không ai đọc).')],
          ['b', tx('The cache is only filled on a miss', 'Cache chỉ được nạp khi miss'), false, tx('That is cache-aside (lazy loading).', 'Đó là cache-aside (lazy loading).')],
        ],
      ),
      quiz(
        'eviction',
        ['aws.caching.patterns'],
        tx('The cache is full. With an LRU eviction policy, which keys are removed first?', 'Cache đã đầy. Với chính sách eviction LRU, key nào bị xoá trước?'),
        [
          ['a', tx('The least recently used ones', 'Key lâu nhất không được dùng tới'), true, tx('Recently popular keys stay; set TTLs too so stale data expires.', 'Key vừa được dùng nhiều sẽ ở lại; hãy đặt cả TTL để dữ liệu cũ tự hết hạn.')],
          ['b', tx('The largest ones', 'Key có kích thước lớn nhất'), false, tx('Size is not the LRU criterion.', 'Kích thước không phải tiêu chí của LRU.')],
        ],
      ),
      estimate(
        'session-memory',
        ['aws.caching.elasticache'],
        tx('You store 2 million user sessions of 2 KB each in Redis. How much memory do the values need, in GB (1 GB = 1,000,000 KB)?', 'Bạn lưu 2 triệu session người dùng, mỗi session 2 KB, trong Redis. Phần giá trị cần bao nhiêu bộ nhớ, tính bằng GB (1 GB = 1.000.000 KB)?'),
        'GB',
        4,
        0.05,
        tx('2,000,000 × 2 KB = 4 GB, plus key and per-entry overhead (often +30–50%) — pick a node with headroom.', '2.000.000 × 2 KB = 4 GB, cộng thêm phần key và overhead cho mỗi mục (thường +30–50%) — hãy chọn node còn dư địa.'),
      ),
    ],
  },
};
