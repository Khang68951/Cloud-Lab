import { tx } from '@learninglab/cloud-catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws',
  icon: 'cloud',
  hue: 32,
  level: 'foundation',
  stage: 1,
  estHours: 12,
  title: tx('AWS Core: designing systems on AWS', 'AWS Core: thiết kế hệ thống trên AWS'),
  tagline: tx('The 20% of AWS you will use 80% of the time — and how to connect it well.', '20% kiến thức AWS bạn dùng 80% thời gian — và cách nối chúng cho hợp lý.'),
  description: tx('Start here. Regions and pricing, IAM, VPC, EC2/Fargate/Lambda, S3, RDS/DynamoDB, caching and CDN, load balancers, queues, observability, reliability, cost and IaC — each with hands-on exercises and design challenges in the Architecture Lab.', 'Bắt đầu từ đây. Region và cách tính giá, IAM, VPC, EC2/Fargate/Lambda, S3, RDS/DynamoDB, cache và CDN, load balancer, queue, observability, độ tin cậy, chi phí và IaC — mỗi phần đều có bài tập và thử thách thiết kế trong Lab kiến trúc.'),
  outcomes: [
    tx('Pick the right AWS building block for common workloads and explain why', 'Chọn đúng "khối" AWS cho các workload phổ biến và giải thích được vì sao'),
    tx('Draw a production-ready 3-tier or serverless architecture', 'Vẽ được kiến trúc 3 tầng hoặc serverless đủ chuẩn production'),
    tx('Estimate a monthly AWS bill and find the biggest cost lines', 'Ước tính hoá đơn AWS hằng tháng và tìm ra các dòng chi phí lớn nhất'),
    tx('Design for peak traffic and for an Availability Zone failure', 'Thiết kế chịu được cao điểm và sự cố một Availability Zone'),
  ],
  modules: [
    mod('foundations', 'globe', tx('Cloud foundations', 'Nền tảng Cloud'), tx('Regions, AZs and edge, the shared responsibility model, and how AWS pricing works (on-demand, Savings Plans, Reserved, Spot).', 'Region, AZ và edge, mô hình trách nhiệm chia sẻ, và cách AWS tính tiền (on-demand, Savings Plans, Reserved, Spot).'), [
      lesson('lab-tour', tx('Start here: the Architecture Lab', 'Bắt đầu ở đây: Lab kiến trúc'), tx('How to drag, connect and read the price panel — then build your first design.', 'Cách kéo thả, nối dây và đọc bảng giá — rồi dựng thiết kế đầu tiên.'), 10),
      lesson('regions-azs', tx('Regions, AZs and who secures what', 'Region, AZ và ai bảo vệ cái gì'), tx('The physical building blocks of AWS and the shared responsibility model.', 'Các khối hạ tầng vật lý của AWS và mô hình trách nhiệm chia sẻ.'), 8),
      lesson('pricing-models', tx('How AWS charges you', 'AWS tính tiền bạn thế nào'), tx('On-Demand, Savings Plans, Spot — and the four things every bill is made of.', 'On-Demand, Savings Plans, Spot — và bốn thứ tạo nên mọi hoá đơn.'), 12),
      lesson('well-architected', tx('AWS Well-Architected: the 6 pillars', 'AWS Well-Architected: 6 trụ cột'), tx('The checklist AWS architects use to review any design.', 'Bộ tiêu chí kiến trúc sư AWS dùng để đánh giá mọi thiết kế.'), 10),
    ]),
    mod('iam', 'key-round', tx('IAM & security basics', 'IAM & bảo mật cơ bản'), tx('Users, roles and policies, least privilege, trust policies, assume-role and resource policies.', 'User, role và policy, least privilege, trust policy, assume-role và resource policy.'), [
      lesson('iam-basics', tx('IAM: users, roles and policies', 'IAM: user, role và policy'), tx('Who can do what — and why roles beat access keys.', 'Ai được làm gì — và vì sao role tốt hơn access key.'), 10),
    ]),
    mod('networking', 'network', tx('Networking (VPC)', 'Mạng (VPC)'), tx('VPCs, public/private subnets, route tables, IGW, NAT, Security Groups vs NACLs, VPC endpoints — and the NAT cost trap.', 'VPC, subnet public/private, route table, IGW, NAT, Security Group vs NACL, VPC endpoint — và bẫy chi phí NAT.'), [
      lesson('vpc-basics', tx('VPC essentials', 'VPC căn bản'), tx('Public vs private subnets, route tables, IGW, NAT, Security Groups vs NACLs.', 'Subnet public và private, route table, IGW, NAT, Security Group và NACL.'), 12),
      lesson('nat-cost-trap', tx('The NAT Gateway cost trap', 'Bẫy chi phí NAT Gateway'), tx('Why a "networking detail" can be one of your biggest bills.', 'Vì sao một "chi tiết mạng" có thể là một trong những hoá đơn lớn nhất.'), 10),
    ]),
    mod('compute', 'cpu', tx('Compute', 'Compute'), tx('EC2 and Auto Scaling, ECS Fargate, Lambda — when each wins on cost, latency and operations.', 'EC2 và Auto Scaling, ECS Fargate, Lambda — khi nào cái nào thắng về chi phí, độ trễ và vận hành.'), [
      lesson('choosing-compute', tx('EC2 vs Fargate vs Lambda', 'EC2, Fargate hay Lambda'), tx('When each one wins on cost, latency and effort.', 'Khi nào mỗi lựa chọn thắng về chi phí, độ trễ và công sức.'), 12),
      lesson('scaling-and-ha', tx('Auto Scaling and multi-AZ', 'Auto Scaling và multi-AZ'), tx('Surviving peaks and AZ failures.', 'Sống sót qua cao điểm và sự cố AZ.'), 12),
    ]),
    mod('storage', 'hard-drive', tx('Storage', 'Lưu trữ'), tx('S3 storage classes, lifecycle, versioning and bucket policies; EBS vs EFS.', 'Các storage class của S3, lifecycle, versioning và bucket policy; EBS vs EFS.'), [
      lesson('s3-storage-classes', tx('S3 storage classes and lifecycle', 'Storage class và lifecycle của S3'), tx('Paying the right price for hot, warm and cold data.', 'Trả đúng giá cho dữ liệu nóng, ấm và lạnh.'), 10),
    ]),
    mod('databases', 'database', tx('Databases', 'Cơ sở dữ liệu'), tx('RDS vs Aurora vs DynamoDB, read replicas, Multi-AZ, connection pooling and single-table design.', 'RDS vs Aurora vs DynamoDB, read replica, Multi-AZ, connection pooling và single-table design.'), [
      lesson('choosing-a-database', tx('RDS vs Aurora vs DynamoDB', 'RDS, Aurora hay DynamoDB'), tx('Picking a database from your data and access patterns.', 'Chọn database dựa trên dữ liệu và mẫu truy cập.'), 12),
      lesson('scaling-reads', tx('Scaling reads: replicas and caches', 'Scale việc đọc: replica và cache'), tx('Taking load off the database without buying a bigger one.', 'Giảm tải cho database mà không cần mua cái lớn hơn.'), 10),
    ]),
    mod('caching-cdn', 'zap', tx('Caching & CDN', 'Caching & CDN'), tx('ElastiCache and CloudFront, TTLs, invalidation and hit ratio — and what they do to latency and cost.', 'ElastiCache và CloudFront, TTL, invalidation và hit ratio — và ảnh hưởng của chúng lên độ trễ và chi phí.'), [
      lesson('cdn-and-caching', tx('CloudFront and caching layers', 'CloudFront và các tầng cache'), tx('Where to cache, hit ratios, and what a CDN really costs.', 'Cache ở đâu, hit ratio, và CDN thực sự tốn bao nhiêu.'), 10),
    ]),
    mod('load-balancing-dns', 'split', tx('Load balancing & DNS', 'Load balancing & DNS'), tx('ALB vs NLB vs API Gateway, Route 53 routing policies and health checks.', 'ALB vs NLB vs API Gateway, các routing policy của Route 53 và health check.'), [
      lesson('load-balancers', tx('ALB, NLB or API Gateway', 'ALB, NLB hay API Gateway'), tx('Front doors for your services, and Route 53 routing.', 'Cửa trước cho các service, và routing của Route 53.'), 10),
    ]),
    mod('messaging', 'mail', tx('Messaging & event-driven', 'Messaging & event-driven'), tx('SQS (DLQ, visibility timeout), SNS fan-out, EventBridge and Kinesis; idempotency and ordering.', 'SQS (DLQ, visibility timeout), SNS fan-out, EventBridge và Kinesis; idempotency và thứ tự message.'), [
      lesson('queues-and-topics', tx('Queues, topics and streams', 'Queue, topic và stream'), tx('SQS, SNS, EventBridge, Kinesis — decoupling and load levelling.', 'SQS, SNS, EventBridge, Kinesis — tách rời và làm phẳng tải.'), 12),
    ]),
    mod('observability', 'activity', tx('Observability', 'Observability'), tx('CloudWatch metrics, logs and alarms; SLIs, SLOs and error budgets.', 'CloudWatch metrics, logs và alarm; SLI, SLO và error budget.'), [
      lesson('slo-error-budget', tx('SLIs, SLOs and error budgets', 'SLI, SLO và error budget'), tx('Turning "reliable enough" into numbers.', 'Biến "đủ tin cậy" thành con số.'), 8),
    ]),
    mod('reliability-dr', 'shield-check', tx('Reliability & disaster recovery', 'Độ tin cậy & khôi phục thảm hoạ'), tx('Multi-AZ, multi-region, backups, RTO/RPO and the four DR strategies — tested with chaos.', 'Multi-AZ, multi-region, backup, RTO/RPO và 4 chiến lược DR — kiểm chứng bằng chaos.'), [
      lesson('availability-math', tx('Availability math and DR', 'Phép tính availability và DR'), tx('Series vs parallel, the nines, RTO/RPO and the four DR strategies.', 'Nối tiếp và song song, các số 9, RTO/RPO và bốn chiến lược DR.'), 12),
    ]),
    mod('cost-optimization', 'piggy-bank', tx('Cost optimization (FinOps)', 'Tối ưu chi phí (FinOps)'), tx('Rightsizing, Savings Plans, Spot, data transfer, tagging and budgets.', 'Rightsizing, Savings Plans, Spot, data transfer, tagging và budget.'), [
      lesson('cost-levers', tx('The cost levers', 'Các đòn bẩy chi phí'), tx('Waste, rightsizing, commitments, Spot and data transfer.', 'Lãng phí, rightsizing, cam kết, Spot và data transfer.'), 10),
    ]),
    mod('iac', 'file-code', tx('Infrastructure as Code', 'Infrastructure as Code'), tx('Templates, plan/apply, drift — using a CloudFormation-style subset against the mini AWS.', 'Template, plan/apply, drift — dùng một subset kiểu CloudFormation trên mini AWS.'), [
      lesson('iac-basics', tx('Infrastructure as Code', 'Infrastructure as Code'), tx('CloudFormation, Terraform, CDK — and drift.', 'CloudFormation, Terraform, CDK — và drift.'), 8),
    ]),
    mod('capstones', 'trophy', tx('Capstone systems', 'Dự án tổng hợp'), tx('URL shortener, e-commerce, realtime chat, video streaming, social feed, data pipeline — design, break, optimize.', 'URL shortener, e-commerce, chat realtime, video streaming, social feed, data pipeline — thiết kế, phá thử, tối ưu.'), [
      lesson('design-process', tx('How to design a system, step by step', 'Quy trình thiết kế hệ thống từng bước'), tx('Requirements → estimates → data → architecture → trade-offs.', 'Yêu cầu → ước lượng → dữ liệu → kiến trúc → đánh đổi.'), 12),
      lesson('url-shortener', tx('Capstone: URL shortener', 'Dự án tổng hợp: rút gọn URL'), tx('Put it all together under real constraints.', 'Ghép mọi thứ lại dưới các ràng buộc thực tế.'), 30),
    ]),
  ],
});
