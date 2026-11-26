import { buildDesign, tx } from '@learninglab/catalog';
import type { CourseExercises } from '../../define.ts';
import { exerciseBuilders, R, scenario } from '../../helpers.ts';

const { quiz, estimate, challenge } = exerciseBuilders('aws-compute');

const batchScenario = scenario({ rps: 50, peakMultiplier: 3, readRatio: 0, payloadKB: 2 });

export const spotWorkers = challenge({
  id: 'spot-workers',
  kind: 'canvas-fix',
  skills: ['aws.compute.spot', 'aws.compute.rightsizing'],
  title: tx('Batch workers on Spot', 'Worker batch trên Spot'),
  brief: tx(
    'An image-processing pipeline: an API enqueues ~50 jobs/second into SQS, and a fixed fleet of six On-Demand instances processes them. The jobs are retryable and nobody waits for them synchronously.\n\nCut the cost of the worker fleet without losing jobs.',
    'Một pipeline xử lý ảnh: API đẩy ~50 job/giây vào SQS, và một fleet cố định gồm sáu instance On-Demand xử lý chúng. Job có thể chạy lại và không ai chờ đồng bộ kết quả.\n\nHãy cắt chi phí fleet worker mà không làm mất job nào.',
  ),
  scenario: batchScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1],
      ['fn', 'lambda', 2, 1, { durationMs: 40 }, 'Enqueue'],
      ['q', 'sqs', 3, 1],
      ['worker', 'ec2', 4, 1, { instanceType: 'm6i.large', count: 6, autoscaling: false, multiAz: true }, 'Workers'],
      ['vpce-if', 'vpce', 4, 2, { type: 'interface' }, 'Interface endpoint'],
      ['vpce', 'vpce', 5, 2, { type: 'gateway' }, 'S3/DynamoDB endpoint'],
      ['bucket', 's3', 5, 1, { storageGB: 2000 }],
    ],
    ['users>api', 'api>fn', 'fn>q', 'q>worker', 'worker>bucket'],
    batchScenario,
  ),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', 'queue', 'compute', 'data'] },
    R.errors(),
    { type: 'uses', services: ['sqs'], label: tx('Jobs stay buffered in SQS', 'Job vẫn được đệm trong SQS') },
    R.cost(1200),
  ],
  hints: [
    tx('Look at the worker utilisation: how much of the fleet is actually needed? Remember the queue levels the load.', 'Xem mức tải của worker: thật sự cần bao nhiêu phần của fleet? Nhớ rằng queue đã làm phẳng tải.'),
    tx('Interruptible, retryable work behind a queue is the textbook case for a cheaper purchase option.', 'Việc có thể bị ngắt, chạy lại được, đứng sau queue là ví dụ kinh điển cho một lựa chọn mua rẻ hơn.'),
    tx('Workers: Auto Scaling min 1–2, purchase = Spot.', 'Worker: Auto Scaling tối thiểu 1–2, mô hình giá = Spot.'),
  ],
  debrief: tx(
    'Two levers stacked: rightsizing (the queue means workers only need the average rate) and Spot (up to ~90% off for interruptible work). If a Spot instance is reclaimed, its in-flight message simply becomes visible again in SQS and another worker retries it — make workers idempotent and diversify instance types.',
    'Hai đòn bẩy cộng dồn: rightsizing (nhờ queue, worker chỉ cần chịu lưu lượng trung bình) và Spot (rẻ hơn tới ~90% cho việc có thể bị ngắt). Nếu một instance Spot bị thu hồi, message đang xử lý dở sẽ hiện lại trong SQS và worker khác chạy lại — hãy làm worker idempotent và đa dạng hoá loại instance.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1],
      ['fn', 'lambda', 2, 1, { durationMs: 40 }, 'Enqueue'],
      ['q', 'sqs', 3, 1],
      ['worker', 'ec2', 4, 1, { instanceType: 'm6i.large', count: 2, autoscaling: true, maxCount: 6, multiAz: true, purchase: 'spot' }, 'Workers'],
      ['vpce-if', 'vpce', 4, 2, { type: 'interface' }, 'Interface endpoint'],
      ['vpce', 'vpce', 5, 2, { type: 'gateway' }, 'S3/DynamoDB endpoint'],
      ['bucket', 's3', 5, 1, { storageGB: 2000 }],
    ],
    ['users>api', 'api>fn', 'fn>q', 'q>worker', 'worker>bucket'],
    batchScenario,
  ),
});

const steadyScenario = scenario({ rps: 2000, peakMultiplier: 2, readRatio: 0.8, payloadKB: 2 });

export const cheapest2000 = challenge({
  id: 'cheapest-2000',
  kind: 'canvas-fix',
  skills: ['aws.compute.choosing', 'aws.cost.compute'],
  title: tx('2,000 req/s at the lowest cost', '2.000 req/s với chi phí thấp nhất'),
  brief: tx(
    'A serverless API grew up: it now serves a steady 2,000 req/s, 24/7. The bill for API Gateway + Lambda keeps climbing.\n\nRedesign the compute and front door to cut the bill — still no errors at peak, still surviving an AZ outage.',
    'Một API serverless đã lớn lên: giờ phục vụ đều đặn 2.000 req/s, 24/7. Hoá đơn API Gateway + Lambda cứ tăng mãi.\n\nHãy thiết kế lại phần compute và cửa trước để giảm hoá đơn — vẫn không lỗi lúc cao điểm, vẫn chịu được sự cố một AZ.',
  ),
  scenario: steadyScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['api', 'apigw', 1, 1],
      ['fn', 'lambda', 2, 1, { memoryMB: '512', durationMs: 50 }],
      ['table', 'dynamodb', 3, 1],
    ],
    ['users>api', 'api>fn', 'fn>table'],
    steadyScenario,
  ),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    R.errors(),
    R.survivesAz(tx('Survives an Availability Zone outage', 'Chịu được sự cố một Availability Zone')),
    R.p95(150),
    R.cost(4000),
  ],
  hints: [
    tx('Open the cost tab: which two lines dominate, and are they priced per request or per hour?', 'Mở tab Chi phí: hai dòng nào lớn nhất, và chúng tính theo request hay theo giờ?'),
    tx('At steady high traffic, an hourly-priced front door and fleet usually win.', 'Với traffic cao và đều, cửa trước và fleet tính theo giờ thường thắng.'),
    tx('Users → ALB → EC2 (Auto Scaling, 2 AZs, Savings Plan) → DynamoDB.', 'Users → ALB → EC2 (Auto Scaling, 2 AZ, Savings Plan) → DynamoDB.'),
  ],
  debrief: tx(
    'Per-request pricing is perfect for spiky or low traffic and painful at billions of steady requests: ~5.3 billion requests a month is ~$5,300 of API Gateway alone. An ALB plus a right-sized, committed fleet costs a fraction. The trade-off: you now operate servers (patching, AMIs, scaling policies) — or pick Fargate as a middle ground.',
    'Giá theo request rất hợp với traffic thấp hoặc theo đợt, nhưng rất đau ở hàng tỉ request đều đặn: ~5,3 tỉ request mỗi tháng là ~$5.300 chỉ riêng API Gateway. ALB cộng một fleet đúng cỡ có cam kết chỉ tốn một phần nhỏ. Đánh đổi: giờ bạn phải vận hành server (vá lỗi, AMI, scaling policy) — hoặc chọn Fargate làm phương án ở giữa.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 'c6i.xlarge', count: 2, autoscaling: true, maxCount: 8, multiAz: true, purchase: 'savings-plan-1y' }],
      ['vpce', 'vpce', 2, 2, { type: 'gateway' }, 'S3/DynamoDB endpoint'],
      ['table', 'dynamodb', 3, 1],
    ],
    ['users>lb', 'lb>app', 'app>table'],
    steadyScenario,
  ),
});

export const exercises: CourseExercises = {
  'ec2-deep': {
    'instance-families': [
      quiz(
        'memory-family',
        ['aws.compute.instance-families'],
        tx('A self-managed Redis holding 200 GB in memory needs a new instance. Which family?', 'Một Redis tự quản lý giữ 200 GB trong bộ nhớ cần instance mới. Chọn họ nào?'),
        [
          ['a', tx('Memory optimised (r / x family)', 'Tối ưu bộ nhớ (họ r / x)'), true, tx('Most GB of RAM per vCPU and per dollar.', 'Nhiều GB RAM nhất trên mỗi vCPU và mỗi đô la.')],
          ['b', tx('Compute optimised (c family)', 'Tối ưu tính toán (họ c)'), false, tx('Lots of CPU, relatively little memory.', 'Nhiều CPU, tương đối ít bộ nhớ.')],
          ['c', tx('Burstable (t family)', 'Burstable (họ t)'), false, tx('Small sizes and CPU credits — not for a 200 GB in-memory store.', 'Cỡ nhỏ và dùng CPU credit — không hợp cho kho in-memory 200 GB.')],
        ],
      ),
      quiz(
        'burstable',
        ['aws.compute.instance-families'],
        tx('A t3.medium runs at 90% CPU all day. What happens?', 'Một t3.medium chạy 90% CPU cả ngày. Chuyện gì xảy ra?'),
        [
          ['a', tx('It burns its CPU credits; then it is throttled (standard) or billed for surplus credits (unlimited)', 'Nó tiêu hết CPU credit; sau đó bị bóp hiệu năng (standard) hoặc bị tính phí credit vượt (unlimited)'), true, tx('Burstable instances suit spiky, mostly idle workloads. Steady high CPU → m/c family.', 'Instance burstable hợp với workload theo đợt, phần lớn thời gian rảnh. CPU cao đều đặn → họ m/c.')],
          ['b', tx('Nothing special', 'Không có gì đặc biệt'), false, tx('The baseline for t3.medium is 20% per vCPU.', 'Mức nền của t3.medium là 20% mỗi vCPU.')],
        ],
      ),
      estimate(
        'graviton',
        ['aws.compute.graviton', 'aws.cost.estimation'],
        tx('Moving 10 instances from m6i.large ($0.096/h) to Graviton m6g.large ($0.077/h) saves how much per 730-hour month (USD)?', 'Chuyển 10 instance từ m6i.large ($0.096/giờ) sang Graviton m6g.large ($0.077/giờ) tiết kiệm bao nhiêu mỗi tháng 730 giờ (USD)?'),
        'USD',
        138.7,
        0.05,
        tx('10 × ($0.096 − $0.077) × 730 ≈ $138.70 — about 20%, often with equal or better performance, if your software runs on ARM.', '10 × ($0.096 − $0.077) × 730 ≈ $138,70 — khoảng 20%, thường kèm hiệu năng ngang hoặc tốt hơn, nếu phần mềm chạy được trên ARM.'),
      ),
    ],
    'purchasing-strategies': [
      estimate(
        'savings-plan',
        ['aws.cost.purchase-options'],
        tx('10 × t3.medium run 24/7 ($0.0416/h, 730 h). A Savings Plan gives 28% off. Monthly saving (USD)?', '10 × t3.medium chạy 24/7 ($0.0416/giờ, 730 giờ). Savings Plan giảm 28%. Tiết kiệm mỗi tháng (USD)?'),
        'USD',
        85,
        0.05,
        tx('10 × $0.0416 × 730 = $303.68 × 28% ≈ $85.03 per month, in exchange for a 1-year commitment.', '10 × $0.0416 × 730 = $303,68 × 28% ≈ $85,03 mỗi tháng, đổi lại cam kết 1 năm.'),
      ),
      quiz(
        'spot-practices',
        ['aws.compute.spot'],
        tx('Best practices for running on Spot? (choose all that apply)', 'Thực hành tốt khi chạy trên Spot? (chọn tất cả đáp án đúng)'),
        [
          ['a', tx('Diversify across many instance types and AZs', 'Đa dạng hoá nhiều loại instance và nhiều AZ'), true, tx('More capacity pools → fewer interruptions.', 'Nhiều "pool" capacity hơn → ít bị ngắt hơn.')],
          ['b', tx('Handle the 2-minute interruption notice (checkpoint, drain)', 'Xử lý thông báo ngắt trước 2 phút (lưu trạng thái, rút tải)'), true, tx('Lets work stop cleanly.', 'Giúp công việc dừng gọn gàng.')],
          ['c', tx('Run your only database primary on Spot', 'Chạy database primary duy nhất trên Spot'), false, tx('Stateful, non-redundant components do not belong on Spot.', 'Thành phần có trạng thái, không có dự phòng thì không nên chạy trên Spot.')],
        ],
      ),
      quiz(
        'mix',
        ['aws.cost.purchase-options'],
        tx('A web fleet runs 10 instances at night and 30 at the daily peak. Sensible purchase mix?', 'Một fleet web chạy 10 instance ban đêm và 30 instance lúc cao điểm trong ngày. Kết hợp mô hình mua hợp lý?'),
        [
          ['a', tx('Savings Plan covering ~10, the rest On-Demand (and/or Spot for stateless parts)', 'Savings Plan cho ~10 instance, phần còn lại On-Demand (và/hoặc Spot cho phần không trạng thái)'), true, tx('Commit to the baseline you always use; pay flexibly for the peak.', 'Cam kết cho mức nền luôn dùng; trả linh hoạt cho phần cao điểm.')],
          ['b', tx('Savings Plan covering 30', 'Savings Plan cho cả 30'), false, tx('You would pay for 20 unused instances most of the day.', 'Bạn sẽ trả tiền cho 20 instance không dùng trong phần lớn thời gian.')],
        ],
      ),
      spotWorkers,
    ],
  },
  scaling: {
    'autoscaling-deep': [
      quiz(
        'target-tracking',
        ['aws.compute.autoscaling'],
        tx('Simplest scaling policy for "keep average CPU around 60%"?', 'Scaling policy đơn giản nhất cho yêu cầu "giữ CPU trung bình quanh 60%"?'),
        [
          ['a', tx('Target tracking', 'Target tracking'), true, tx('Works like a thermostat: AWS adds/removes capacity to hold the target.', 'Hoạt động như bộ điều nhiệt: AWS tự thêm/bớt capacity để giữ mục tiêu.')],
          ['b', tx('Scheduled scaling', 'Scheduled scaling'), false, tx('Good for known patterns (e.g. 9 a.m. ramp-up), not for following a metric.', 'Hợp với quy luật biết trước (vd tăng tải lúc 9 giờ sáng), không dùng để bám theo một metric.')],
        ],
      ),
      quiz(
        'warm-pool',
        ['aws.compute.autoscaling'],
        tx('Instances take 8 minutes to boot and load data, so scale-out is too slow for spikes. What helps?', 'Instance mất 8 phút để khởi động và nạp dữ liệu, nên scale out quá chậm cho các đợt tăng. Cái gì giúp được?'),
        [
          ['a', tx('A warm pool of pre-initialised (stopped) instances', 'Warm pool gồm các instance đã khởi tạo sẵn (đang dừng)'), true, tx('They start in seconds; you pay only for their EBS while stopped.', 'Chúng khởi động trong vài giây; khi dừng chỉ tốn tiền EBS.')],
          ['b', tx('Lower the target to 10% CPU', 'Hạ mục tiêu xuống 10% CPU'), false, tx('Works by over-provisioning everything — expensive.', 'Chạy được nhờ cấp thừa mọi thứ — rất đắt.')],
          ['c', tx('Predictive scaling (for regular daily patterns)', 'Predictive scaling (cho quy luật lặp lại hằng ngày)'), true, tx('It launches capacity ahead of forecast demand.', 'Nó bật capacity trước theo nhu cầu được dự báo.')],
        ],
      ),
      quiz(
        'elb-health',
        ['aws.compute.autoscaling'],
        tx('An instance is "running" but the app on it returns 500s. How do you make Auto Scaling replace it?', 'Một instance đang "running" nhưng app trên đó trả về lỗi 500. Làm sao để Auto Scaling thay nó?'),
        [
          ['a', tx('Use the ELB health check type for the Auto Scaling group', 'Dùng loại health check ELB cho Auto Scaling group'), true, tx('Then failing load-balancer health checks mark the instance unhealthy.', 'Khi đó health check của load balancer thất bại sẽ đánh dấu instance là không khoẻ.')],
          ['b', tx('Nothing — EC2 status checks catch it', 'Không cần — EC2 status check sẽ bắt được'), false, tx('EC2 checks only see the VM and hardware, not your app.', 'Check của EC2 chỉ thấy máy ảo và phần cứng, không thấy app của bạn.')],
        ],
      ),
    ],
  },
  containers: {
    'ecs-eks': [
      quiz(
        'small-team',
        ['aws.compute.containers'],
        tx('A 4-person team runs 6 containerised services and has no Kubernetes experience. Best fit?', 'Một team 4 người chạy 6 service đóng gói container và chưa có kinh nghiệm Kubernetes. Phù hợp nhất?'),
        [
          ['a', tx('ECS on Fargate', 'ECS trên Fargate'), true, tx('AWS-native, little to operate, no cluster upgrades or node management.', 'Gốc AWS, ít việc vận hành, không phải nâng cấp cluster hay quản lý node.')],
          ['b', tx('Self-managed Kubernetes on EC2', 'Kubernetes tự quản lý trên EC2'), false, tx('Huge operational burden for a small team.', 'Gánh nặng vận hành rất lớn cho team nhỏ.')],
        ],
      ),
      quiz(
        'eks-when',
        ['aws.compute.containers'],
        tx('When does EKS make the most sense?', 'Khi nào EKS hợp lý nhất?'),
        [
          ['a', tx('The org already runs Kubernetes, needs its ecosystem (Helm, operators) or portability', 'Tổ chức đã chạy Kubernetes, cần hệ sinh thái của nó (Helm, operator) hoặc khả năng chuyển nền tảng'), true, tx('That is where its complexity pays off.', 'Đó là lúc độ phức tạp của nó trở nên đáng giá.')],
          ['b', tx('For a single small web app', 'Cho một web app nhỏ duy nhất'), false, tx('$73/month control plane plus operations for little benefit.', '$73/tháng cho control plane cộng công vận hành, đổi lại rất ít lợi ích.')],
        ],
      ),
      quiz(
        'app-runner',
        ['aws.compute.containers'],
        tx('You want "give AWS a container image, get an HTTPS URL that autoscales" with the least setup. Use:', 'Bạn muốn "đưa AWS một image container, nhận lại URL HTTPS tự scale" với ít thiết lập nhất. Dùng:'),
        [
          ['a', tx('AWS App Runner (or ECS Express-style templates)', 'AWS App Runner (hoặc template kiểu ECS Express)'), true, tx('Load balancing, TLS and scaling are included.', 'Có sẵn cân bằng tải, TLS và scaling.')],
          ['b', tx('EKS with an ingress controller', 'EKS kèm ingress controller'), false, tx('Powerful but the opposite of "least setup".', 'Mạnh nhưng là thứ ngược lại với "ít thiết lập nhất".')],
        ],
      ),
    ],
    'container-delivery': [
      quiz(
        'task-role',
        ['aws.compute.containers', 'aws.iam.roles'],
        tx('Your ECS task’s code must read from S3. Which role gets the S3 permission?', 'Code trong ECS task cần đọc từ S3. Role nào được cấp quyền S3?'),
        [
          ['a', tx('The task role', 'Task role'), true, tx('The task role is what your application code uses.', 'Task role là role mà code ứng dụng sử dụng.')],
          ['b', tx('The task execution role', 'Task execution role'), false, tx('That one is for ECS itself: pulling images from ECR, writing logs, fetching secrets at start.', 'Role đó dành cho chính ECS: kéo image từ ECR, ghi log, lấy secret lúc khởi động.')],
        ],
      ),
      quiz(
        'immutable-tags',
        ['aws.devops.containers'],
        tx('Why deploy images by immutable tag or digest instead of "latest"?', 'Vì sao deploy image theo tag bất biến hoặc digest thay vì "latest"?'),
        [
          ['a', tx('You know exactly what runs, and rollbacks are reliable', 'Bạn biết chính xác cái gì đang chạy, và rollback đáng tin cậy'), true, tx('"latest" can point at different images on different hosts.', '"latest" có thể trỏ tới các image khác nhau trên các host khác nhau.')],
          ['b', tx('It makes images smaller', 'Nó làm image nhỏ hơn'), false, tx('Tags do not change image size.', 'Tag không làm thay đổi kích thước image.')],
        ],
      ),
      quiz(
        'scanning',
        ['aws.security.detection'],
        tx('Where should you catch known vulnerabilities (CVEs) in container images?', 'Nên phát hiện các lỗ hổng đã biết (CVE) trong image container ở đâu?'),
        [
          ['a', tx('ECR image scanning (Inspector) in the pipeline, blocking critical findings', 'Quét image trên ECR (Inspector) trong pipeline, chặn các phát hiện nghiêm trọng'), true, tx('Shift left: stop vulnerable images before they reach production.', 'Dịch chuyển sang trái: chặn image có lỗ hổng trước khi lên production.')],
          ['b', tx('Only after an incident', 'Chỉ sau khi có sự cố'), false, tx('Too late.', 'Quá muộn.')],
        ],
      ),
    ],
  },
  lambda: {
    'lambda-deep': [
      estimate(
        'concurrency',
        ['aws.compute.lambda'],
        tx('A function receives 500 req/s and each invocation takes 200 ms. Roughly how many concurrent executions does it need?', 'Một function nhận 500 req/s và mỗi lượt chạy mất 200 ms. Nó cần khoảng bao nhiêu lượt chạy đồng thời?'),
        'executions',
        100,
        0.05,
        tx('Concurrency ≈ requests/second × duration in seconds = 500 × 0.2 = 100. Compare with your account limit (default 1,000).', 'Concurrency ≈ request/giây × thời gian chạy (giây) = 500 × 0,2 = 100. So với giới hạn của account (mặc định 1.000).'),
        [tx('Little’s law: work in flight = arrival rate × time in system.', 'Định luật Little: số việc đang xử lý = tốc độ đến × thời gian nằm trong hệ thống.')],
      ),
      quiz(
        'cold-start',
        ['aws.compute.lambda'],
        tx('A latency-critical API suffers from cold starts after quiet periods. Options? (choose all that apply)', 'Một API nhạy độ trễ bị cold start sau những lúc vắng. Có những lựa chọn nào? (chọn tất cả đáp án đúng)'),
        [
          ['a', tx('Provisioned concurrency', 'Provisioned concurrency'), true, tx('Keeps N environments initialised — at an hourly cost.', 'Giữ sẵn N môi trường đã khởi tạo — với chi phí theo giờ.')],
          ['b', tx('SnapStart (Java, Python, .NET)', 'SnapStart (Java, Python, .NET)'), true, tx('Restores from a snapshot of an initialised environment.', 'Khôi phục từ snapshot của môi trường đã khởi tạo.')],
          ['c', tx('Smaller packages and lazy initialisation', 'Gói nhỏ hơn và khởi tạo lười (lazy)'), true, tx('Less code to load means faster starts.', 'Ít code phải nạp thì khởi động nhanh hơn.')],
          ['d', tx('Increase the timeout to 15 minutes', 'Tăng timeout lên 15 phút'), false, tx('Timeout does not affect start-up latency.', 'Timeout không ảnh hưởng tới độ trễ khởi động.')],
        ],
      ),
      quiz(
        'memory-tuning',
        ['aws.compute.lambda', 'aws.cost.compute'],
        tx('Doubling a CPU-bound function’s memory from 512 MB to 1,024 MB halves its duration. What happens to the compute cost?', 'Tăng gấp đôi bộ nhớ của một function nặng CPU từ 512 MB lên 1.024 MB làm thời gian chạy giảm một nửa. Chi phí compute thay đổi thế nào?'),
        [
          ['a', tx('About the same (GB × seconds is unchanged) — and it is twice as fast', 'Gần như không đổi (GB × giây không đổi) — mà còn nhanh gấp đôi'), true, tx('CPU scales with memory; tools like Lambda Power Tuning find the sweet spot.', 'CPU tăng theo bộ nhớ; công cụ như Lambda Power Tuning giúp tìm điểm tối ưu.')],
          ['b', tx('It doubles', 'Tăng gấp đôi'), false, tx('Price per GB-second doubles in GB but the seconds halve.', 'Số GB gấp đôi nhưng số giây giảm một nửa.')],
        ],
      ),
      cheapest2000,
    ],
  },
};
