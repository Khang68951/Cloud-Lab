import { defineCourse } from '../../define.ts';
import { L, lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-compute',
  icon: 'cpu',
  hue: 45,
  level: 'intermediate',
  stage: 2,
  prerequisites: ['aws'],
  estHours: 8,
  title: L(['Compute & Containers', 'Compute & Container']),
  tagline: L(['EC2, containers and Lambda — sized, scaled and priced like a pro.', 'EC2, container và Lambda — chọn cỡ, scale và tính giá như dân chuyên.']),
  description: L([
    'Instance families and Graviton, purchase strategies with Spot and Savings Plans, Auto Scaling in depth, ECS vs EKS, shipping containers to production, and Lambda internals.',
    'Họ instance và Graviton, chiến lược mua với Spot và Savings Plans, Auto Scaling chuyên sâu, ECS so với EKS, đưa container lên production, và cơ chế bên trong của Lambda.',
  ]),
  outcomes: [
    L(['Pick an instance family and size from a workload profile', 'Chọn họ và cỡ instance dựa trên đặc điểm workload']),
    L(['Mix On-Demand, Savings Plans and Spot safely', 'Kết hợp On-Demand, Savings Plans và Spot một cách an toàn']),
    L(['Choose between ECS, EKS, Fargate and Lambda for a service', 'Chọn giữa ECS, EKS, Fargate và Lambda cho một service']),
    L(['Tune Lambda concurrency, memory and cold starts', 'Tinh chỉnh concurrency, bộ nhớ và cold start của Lambda']),
  ],
  modules: [
    mod('ec2-deep', 'server', ['EC2 in depth', 'EC2 chuyên sâu'], ['Choosing and buying instances.', 'Chọn và mua instance.'], ['scenario-quiz', 'estimation', 'canvas-fix'], [
      lesson('instance-families', ['Instance families and sizes', 'Họ instance và kích cỡ'], ['General, compute, memory, storage, GPU, Graviton, burstable.', 'Đa dụng, tối ưu tính toán, bộ nhớ, lưu trữ, GPU, Graviton, burstable.'], 12, 'available'),
      lesson('purchasing-strategies', ['Purchasing strategies and Spot', 'Chiến lược mua và Spot'], ['Mixing commitments with Spot without risking production.', 'Kết hợp cam kết với Spot mà không đánh cược production.'], 12, 'available'),
    ]),
    mod('scaling', 'gauge', ['Scaling', 'Scaling'], ['Following demand automatically.', 'Tự động bám theo nhu cầu.'], ['scenario-quiz'], [
      lesson('autoscaling-deep', ['Auto Scaling in depth', 'Auto Scaling chuyên sâu'], ['Policies, warm pools, lifecycle hooks and health checks.', 'Các policy, warm pool, lifecycle hook và health check.'], 12, 'available'),
    ]),
    mod('containers', 'container', ['Containers', 'Container'], ['Orchestrators and getting images to production.', 'Bộ điều phối và đưa image lên production.'], ['scenario-quiz'], [
      lesson('ecs-eks', ['ECS or EKS?', 'ECS hay EKS?'], ['Orchestrators, launch types and App Runner.', 'Bộ điều phối, launch type và App Runner.'], 12, 'available'),
      lesson('container-delivery', ['Containers in production', 'Container trên production'], ['ECR, image scanning, task roles, service discovery.', 'ECR, quét image, task role, service discovery.'], 10, 'available'),
    ]),
    mod('lambda', 'function', ['Lambda internals', 'Bên trong Lambda'], ['Concurrency, cold starts and cost.', 'Concurrency, cold start và chi phí.'], ['estimation', 'canvas-fix'], [
      lesson('lambda-deep', ['Lambda in depth', 'Lambda chuyên sâu'], ['Concurrency, provisioned concurrency, SnapStart, memory tuning, limits.', 'Concurrency, provisioned concurrency, SnapStart, tinh chỉnh bộ nhớ, giới hạn.'], 12, 'available'),
    ]),
  ],
});
