import type { TrackMetaInput } from '@cloudlab/shared';
import { defineCourse } from '../../define.ts';
import { AWS_LESSONS } from './lessons.ts';

type ModuleInput = NonNullable<TrackMetaInput['modules']>[number];

/** Attach lessons; a module with lessons is "available". */
const withLessons = (modules: ModuleInput[]): ModuleInput[] =>
  modules.map((m) => {
    const lessons = (AWS_LESSONS[m.slug] ?? []).map((l) => ({ ...l, status: l.status ?? ('available' as const) }));
    return { ...m, lessons };
  });

/**
 * AWS / Cloud System Design — the first CloudLab track.
 * Module outline follows PLAN.md §16. Lessons are filled in phase by phase.
 */
export const awsTrack = defineCourse({
  slug: 'aws',
  icon: 'cloud',
  hue: 32,
  level: 'foundation',
  stage: 1,
  estHours: 12,
  title: { en: 'AWS Core: designing systems on AWS', vi: 'AWS Core: thiết kế hệ thống trên AWS' },
  tagline: {
    en: 'The 20% of AWS you will use 80% of the time — and how to connect it well.',
    vi: '20% kiến thức AWS bạn dùng 80% thời gian — và cách nối chúng cho hợp lý.',
  },
  description: {
    en: 'Start here. Regions and pricing, IAM, VPC, EC2/Fargate/Lambda, S3, RDS/DynamoDB, caching and CDN, load balancers, queues, observability, reliability, cost and IaC — each with hands-on exercises and design challenges in the Architecture Lab.',
    vi: 'Bắt đầu từ đây. Region và cách tính giá, IAM, VPC, EC2/Fargate/Lambda, S3, RDS/DynamoDB, cache và CDN, load balancer, queue, observability, độ tin cậy, chi phí và IaC — mỗi phần đều có bài tập và thử thách thiết kế trong Lab kiến trúc.',
  },
  outcomes: [
    { en: 'Pick the right AWS building block for common workloads and explain why', vi: 'Chọn đúng "khối" AWS cho các workload phổ biến và giải thích được vì sao' },
    { en: 'Draw a production-ready 3-tier or serverless architecture', vi: 'Vẽ được kiến trúc 3 tầng hoặc serverless đủ chuẩn production' },
    { en: 'Estimate a monthly AWS bill and find the biggest cost lines', vi: 'Ước tính hoá đơn AWS hằng tháng và tìm ra các dòng chi phí lớn nhất' },
    { en: 'Design for peak traffic and for an Availability Zone failure', vi: 'Thiết kế chịu được cao điểm và sự cố một Availability Zone' },
  ],
  modules: withLessons([
    {
      slug: 'foundations',
      icon: 'globe',
      title: { en: 'Cloud foundations', vi: 'Nền tảng Cloud' },
      summary: {
        en: 'Regions, AZs and edge, the shared responsibility model, and how AWS pricing works (on-demand, Savings Plans, Reserved, Spot).',
        vi: 'Region, AZ và edge, mô hình trách nhiệm chia sẻ, và cách AWS tính tiền (on-demand, Savings Plans, Reserved, Spot).',
      },
      practice: ['scenario-quiz', 'estimation'],
    },
    {
      slug: 'iam',
      icon: 'key-round',
      title: { en: 'IAM & security basics', vi: 'IAM & bảo mật cơ bản' },
      summary: {
        en: 'Users, roles and policies, least privilege, trust policies, assume-role and resource policies.',
        vi: 'User, role và policy, least privilege, trust policy, assume-role và resource policy.',
      },
      practice: ['iam-policy', 'cli-lab', 'scenario-quiz'],
    },
    {
      slug: 'networking',
      icon: 'network',
      title: { en: 'Networking (VPC)', vi: 'Mạng (VPC)' },
      summary: {
        en: 'VPCs, public/private subnets, route tables, IGW, NAT, Security Groups vs NACLs, VPC endpoints — and the NAT cost trap.',
        vi: 'VPC, subnet public/private, route table, IGW, NAT, Security Group vs NACL, VPC endpoint — và bẫy chi phí NAT.',
      },
      practice: ['vpc-reachability', 'cost-detective', 'scenario-quiz'],
    },
    {
      slug: 'compute',
      icon: 'cpu',
      title: { en: 'Compute', vi: 'Compute' },
      summary: {
        en: 'EC2 and Auto Scaling, ECS Fargate, Lambda — when each wins on cost, latency and operations.',
        vi: 'EC2 và Auto Scaling, ECS Fargate, Lambda — khi nào cái nào thắng về chi phí, độ trễ và vận hành.',
      },
      practice: ['canvas-design', 'estimation', 'cli-lab'],
    },
    {
      slug: 'storage',
      icon: 'hard-drive',
      title: { en: 'Storage', vi: 'Lưu trữ' },
      summary: {
        en: 'S3 storage classes, lifecycle, versioning and bucket policies; EBS vs EFS.',
        vi: 'Các storage class của S3, lifecycle, versioning và bucket policy; EBS vs EFS.',
      },
      practice: ['cli-lab', 'console-lab', 'cost-detective'],
    },
    {
      slug: 'databases',
      icon: 'database',
      title: { en: 'Databases', vi: 'Cơ sở dữ liệu' },
      summary: {
        en: 'RDS vs Aurora vs DynamoDB, read replicas, Multi-AZ, connection pooling and single-table design.',
        vi: 'RDS vs Aurora vs DynamoDB, read replica, Multi-AZ, connection pooling và single-table design.',
      },
      practice: ['dynamo-model', 'canvas-design', 'scenario-quiz'],
    },
    {
      slug: 'caching-cdn',
      icon: 'zap',
      title: { en: 'Caching & CDN', vi: 'Caching & CDN' },
      summary: {
        en: 'ElastiCache and CloudFront, TTLs, invalidation and hit ratio — and what they do to latency and cost.',
        vi: 'ElastiCache và CloudFront, TTL, invalidation và hit ratio — và ảnh hưởng của chúng lên độ trễ và chi phí.',
      },
      practice: ['canvas-fix', 'estimation'],
    },
    {
      slug: 'load-balancing-dns',
      icon: 'split',
      title: { en: 'Load balancing & DNS', vi: 'Load balancing & DNS' },
      summary: {
        en: 'ALB vs NLB vs API Gateway, Route 53 routing policies and health checks.',
        vi: 'ALB vs NLB vs API Gateway, các routing policy của Route 53 và health check.',
      },
      practice: ['canvas-fix', 'scenario-quiz'],
    },
    {
      slug: 'messaging',
      icon: 'mail',
      title: { en: 'Messaging & event-driven', vi: 'Messaging & event-driven' },
      summary: {
        en: 'SQS (DLQ, visibility timeout), SNS fan-out, EventBridge and Kinesis; idempotency and ordering.',
        vi: 'SQS (DLQ, visibility timeout), SNS fan-out, EventBridge và Kinesis; idempotency và thứ tự message.',
      },
      practice: ['cli-lab', 'canvas-design'],
    },
    {
      slug: 'observability',
      icon: 'activity',
      title: { en: 'Observability', vi: 'Observability' },
      summary: {
        en: 'CloudWatch metrics, logs and alarms; SLIs, SLOs and error budgets.',
        vi: 'CloudWatch metrics, logs và alarm; SLI, SLO và error budget.',
      },
      practice: ['incident', 'estimation'],
    },
    {
      slug: 'reliability-dr',
      icon: 'shield-check',
      title: { en: 'Reliability & disaster recovery', vi: 'Độ tin cậy & khôi phục thảm hoạ' },
      summary: {
        en: 'Multi-AZ, multi-region, backups, RTO/RPO and the four DR strategies — tested with chaos.',
        vi: 'Multi-AZ, multi-region, backup, RTO/RPO và 4 chiến lược DR — kiểm chứng bằng chaos.',
      },
      practice: ['canvas-design', 'incident'],
    },
    {
      slug: 'cost-optimization',
      icon: 'piggy-bank',
      title: { en: 'Cost optimization (FinOps)', vi: 'Tối ưu chi phí (FinOps)' },
      summary: {
        en: 'Rightsizing, Savings Plans, Spot, data transfer, tagging and budgets.',
        vi: 'Rightsizing, Savings Plans, Spot, data transfer, tagging và budget.',
      },
      practice: ['cost-detective', 'canvas-fix'],
    },
    {
      slug: 'iac',
      icon: 'file-code',
      title: { en: 'Infrastructure as Code', vi: 'Infrastructure as Code' },
      summary: {
        en: 'Templates, plan/apply, drift — using a CloudFormation-style subset against the mini AWS.',
        vi: 'Template, plan/apply, drift — dùng một subset kiểu CloudFormation trên mini AWS.',
      },
      practice: ['iac'],
    },
    {
      slug: 'capstones',
      icon: 'trophy',
      title: { en: 'Capstone systems', vi: 'Dự án tổng hợp' },
      summary: {
        en: 'URL shortener, e-commerce, realtime chat, video streaming, social feed, data pipeline — design, break, optimize.',
        vi: 'URL shortener, e-commerce, chat realtime, video streaming, social feed, data pipeline — thiết kế, phá thử, tối ưu.',
      },
      practice: ['canvas-design', 'cost-detective', 'incident'],
    },
  ]),
});
