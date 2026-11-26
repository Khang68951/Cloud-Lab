import { tx } from '@learninglab/catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-compute',
  icon: 'cpu',
  hue: 45,
  level: 'intermediate',
  stage: 2,
  prerequisites: ['aws'],
  estHours: 8,
  title: tx('Compute & Containers', 'Compute & Container'),
  tagline: tx('EC2, containers and Lambda — sized, scaled and priced like a pro.', 'EC2, container và Lambda — chọn cỡ, scale và tính giá như dân chuyên.'),
  description: tx('Instance families and Graviton, purchase strategies with Spot and Savings Plans, Auto Scaling in depth, ECS vs EKS, shipping containers to production, and Lambda internals.', 'Họ instance và Graviton, chiến lược mua với Spot và Savings Plans, Auto Scaling chuyên sâu, ECS so với EKS, đưa container lên production, và cơ chế bên trong của Lambda.'),
  outcomes: [
    tx('Pick an instance family and size from a workload profile', 'Chọn họ và cỡ instance dựa trên đặc điểm workload'),
    tx('Mix On-Demand, Savings Plans and Spot safely', 'Kết hợp On-Demand, Savings Plans và Spot một cách an toàn'),
    tx('Choose between ECS, EKS, Fargate and Lambda for a service', 'Chọn giữa ECS, EKS, Fargate và Lambda cho một service'),
    tx('Tune Lambda concurrency, memory and cold starts', 'Tinh chỉnh concurrency, bộ nhớ và cold start của Lambda'),
  ],
  modules: [
    mod('ec2-deep', 'server', tx('EC2 in depth', 'EC2 chuyên sâu'), tx('Choosing and buying instances.', 'Chọn và mua instance.'), [
      lesson('instance-families', tx('Instance families and sizes', 'Họ instance và kích cỡ'), tx('General, compute, memory, storage, GPU, Graviton, burstable.', 'Đa dụng, tối ưu tính toán, bộ nhớ, lưu trữ, GPU, Graviton, burstable.'), 12),
      lesson('purchasing-strategies', tx('Purchasing strategies and Spot', 'Chiến lược mua và Spot'), tx('Mixing commitments with Spot without risking production.', 'Kết hợp cam kết với Spot mà không đánh cược production.'), 12),
    ]),
    mod('scaling', 'gauge', tx('Scaling', 'Scaling'), tx('Following demand automatically.', 'Tự động bám theo nhu cầu.'), [
      lesson('autoscaling-deep', tx('Auto Scaling in depth', 'Auto Scaling chuyên sâu'), tx('Policies, warm pools, lifecycle hooks and health checks.', 'Các policy, warm pool, lifecycle hook và health check.'), 12),
    ]),
    mod('containers', 'container', tx('Containers', 'Container'), tx('Orchestrators and getting images to production.', 'Bộ điều phối và đưa image lên production.'), [
      lesson('ecs-eks', tx('ECS or EKS?', 'ECS hay EKS?'), tx('Orchestrators, launch types and App Runner.', 'Bộ điều phối, launch type và App Runner.'), 12),
      lesson('container-delivery', tx('Containers in production', 'Container trên production'), tx('ECR, image scanning, task roles, service discovery.', 'ECR, quét image, task role, service discovery.'), 10),
    ]),
    mod('lambda', 'function', tx('Lambda internals', 'Bên trong Lambda'), tx('Concurrency, cold starts and cost.', 'Concurrency, cold start và chi phí.'), [
      lesson('lambda-deep', tx('Lambda in depth', 'Lambda chuyên sâu'), tx('Concurrency, provisioned concurrency, SnapStart, memory tuning, limits.', 'Concurrency, provisioned concurrency, SnapStart, tinh chỉnh bộ nhớ, giới hạn.'), 12),
    ]),
  ],
});
