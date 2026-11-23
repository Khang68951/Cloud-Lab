import type { LessonMeta } from '@cloudlab/shared';

type LessonInput = Omit<LessonMeta, 'status' | 'skills'> & { skills?: LessonMeta['skills']; status?: LessonMeta['status'] };

const t = (en: string, vi: string) => ({ en, vi });

/**
 * Lesson outline per module. Each lesson = a short MDX file
 * (lessons/<module>/<lesson>.<locale>.mdx) + its exercises (exercises.ts).
 */
export const AWS_LESSONS: Record<string, LessonInput[]> = {
  foundations: [
    {
      slug: 'lab-tour',
      title: t('Start here: the Architecture Lab', 'Bắt đầu ở đây: Lab kiến trúc'),
      summary: t('How to drag, connect and read the price panel — then build your first design.', 'Cách kéo thả, nối dây và đọc bảng giá — rồi dựng thiết kế đầu tiên.'),
      estMinutes: 10,
    },
    {
      slug: 'regions-azs',
      title: t('Regions, AZs and who secures what', 'Region, AZ và ai bảo vệ cái gì'),
      summary: t('The physical building blocks of AWS and the shared responsibility model.', 'Các khối hạ tầng vật lý của AWS và mô hình trách nhiệm chia sẻ.'),
      estMinutes: 8,
    },
    {
      slug: 'pricing-models',
      title: t('How AWS charges you', 'AWS tính tiền bạn thế nào'),
      summary: t('On-Demand, Savings Plans, Spot — and the four things every bill is made of.', 'On-Demand, Savings Plans, Spot — và bốn thứ tạo nên mọi hoá đơn.'),
      estMinutes: 12,
    },
    {
      slug: 'well-architected',
      title: t('AWS Well-Architected: the 6 pillars', 'AWS Well-Architected: 6 trụ cột'),
      summary: t('The checklist AWS architects use to review any design.', 'Bộ tiêu chí kiến trúc sư AWS dùng để đánh giá mọi thiết kế.'),
      estMinutes: 10,
    },
  ],
  iam: [
    {
      slug: 'iam-basics',
      title: t('IAM: users, roles and policies', 'IAM: user, role và policy'),
      summary: t('Who can do what — and why roles beat access keys.', 'Ai được làm gì — và vì sao role tốt hơn access key.'),
      estMinutes: 10,
    },
  ],
  networking: [
    {
      slug: 'vpc-basics',
      title: t('VPC essentials', 'VPC căn bản'),
      summary: t('Public vs private subnets, route tables, IGW, NAT, Security Groups vs NACLs.', 'Subnet public và private, route table, IGW, NAT, Security Group và NACL.'),
      estMinutes: 12,
    },
    {
      slug: 'nat-cost-trap',
      title: t('The NAT Gateway cost trap', 'Bẫy chi phí NAT Gateway'),
      summary: t('Why a "networking detail" can be one of your biggest bills.', 'Vì sao một "chi tiết mạng" có thể là một trong những hoá đơn lớn nhất.'),
      estMinutes: 10,
    },
  ],
  compute: [
    {
      slug: 'choosing-compute',
      title: t('EC2 vs Fargate vs Lambda', 'EC2, Fargate hay Lambda'),
      summary: t('When each one wins on cost, latency and effort.', 'Khi nào mỗi lựa chọn thắng về chi phí, độ trễ và công sức.'),
      estMinutes: 12,
    },
    {
      slug: 'scaling-and-ha',
      title: t('Auto Scaling and multi-AZ', 'Auto Scaling và multi-AZ'),
      summary: t('Surviving peaks and AZ failures.', 'Sống sót qua cao điểm và sự cố AZ.'),
      estMinutes: 12,
    },
  ],
  storage: [
    {
      slug: 's3-storage-classes',
      title: t('S3 storage classes and lifecycle', 'Storage class và lifecycle của S3'),
      summary: t('Paying the right price for hot, warm and cold data.', 'Trả đúng giá cho dữ liệu nóng, ấm và lạnh.'),
      estMinutes: 10,
    },
  ],
  databases: [
    {
      slug: 'choosing-a-database',
      title: t('RDS vs Aurora vs DynamoDB', 'RDS, Aurora hay DynamoDB'),
      summary: t('Picking a database from your data and access patterns.', 'Chọn database dựa trên dữ liệu và mẫu truy cập.'),
      estMinutes: 12,
    },
    {
      slug: 'scaling-reads',
      title: t('Scaling reads: replicas and caches', 'Scale việc đọc: replica và cache'),
      summary: t('Taking load off the database without buying a bigger one.', 'Giảm tải cho database mà không cần mua cái lớn hơn.'),
      estMinutes: 10,
    },
  ],
  'caching-cdn': [
    {
      slug: 'cdn-and-caching',
      title: t('CloudFront and caching layers', 'CloudFront và các tầng cache'),
      summary: t('Where to cache, hit ratios, and what a CDN really costs.', 'Cache ở đâu, hit ratio, và CDN thực sự tốn bao nhiêu.'),
      estMinutes: 10,
    },
  ],
  'load-balancing-dns': [
    {
      slug: 'load-balancers',
      title: t('ALB, NLB or API Gateway', 'ALB, NLB hay API Gateway'),
      summary: t('Front doors for your services, and Route 53 routing.', 'Cửa trước cho các service, và routing của Route 53.'),
      estMinutes: 10,
    },
  ],
  messaging: [
    {
      slug: 'queues-and-topics',
      title: t('Queues, topics and streams', 'Queue, topic và stream'),
      summary: t('SQS, SNS, EventBridge, Kinesis — decoupling and load levelling.', 'SQS, SNS, EventBridge, Kinesis — tách rời và làm phẳng tải.'),
      estMinutes: 12,
    },
  ],
  observability: [
    {
      slug: 'slo-error-budget',
      title: t('SLIs, SLOs and error budgets', 'SLI, SLO và error budget'),
      summary: t('Turning "reliable enough" into numbers.', 'Biến "đủ tin cậy" thành con số.'),
      estMinutes: 8,
    },
  ],
  'reliability-dr': [
    {
      slug: 'availability-math',
      title: t('Availability math and DR', 'Phép tính availability và DR'),
      summary: t('Series vs parallel, the nines, RTO/RPO and the four DR strategies.', 'Nối tiếp và song song, các số 9, RTO/RPO và bốn chiến lược DR.'),
      estMinutes: 12,
    },
  ],
  'cost-optimization': [
    {
      slug: 'cost-levers',
      title: t('The cost levers', 'Các đòn bẩy chi phí'),
      summary: t('Waste, rightsizing, commitments, Spot and data transfer.', 'Lãng phí, rightsizing, cam kết, Spot và data transfer.'),
      estMinutes: 10,
    },
  ],
  iac: [
    {
      slug: 'iac-basics',
      title: t('Infrastructure as Code', 'Infrastructure as Code'),
      summary: t('CloudFormation, Terraform, CDK — and drift.', 'CloudFormation, Terraform, CDK — và drift.'),
      estMinutes: 8,
    },
  ],
  capstones: [
    {
      slug: 'design-process',
      title: t('How to design a system, step by step', 'Quy trình thiết kế hệ thống từng bước'),
      summary: t('Requirements → estimates → data → architecture → trade-offs.', 'Yêu cầu → ước lượng → dữ liệu → kiến trúc → đánh đổi.'),
      estMinutes: 12,
    },
    {
      slug: 'url-shortener',
      title: t('Capstone: URL shortener', 'Dự án tổng hợp: rút gọn URL'),
      summary: t('Put it all together under real constraints.', 'Ghép mọi thứ lại dưới các ràng buộc thực tế.'),
      estMinutes: 30,
    },
  ],
};
