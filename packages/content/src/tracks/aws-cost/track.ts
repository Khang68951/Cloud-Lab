import { defineCourse } from '../../define.ts';
import { L, lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-cost',
  icon: 'piggy-bank',
  hue: 95,
  level: 'intermediate',
  stage: 3,
  prerequisites: ['aws'],
  estHours: 6,
  title: L(['Cost Optimization & FinOps', 'Tối ưu chi phí & FinOps']),
  tagline: L(['Read the bill, find the waste, commit wisely, and make cost everyone’s job.', 'Đọc hiểu hoá đơn, tìm lãng phí, cam kết khôn ngoan, và biến chi phí thành việc của mọi người.']),
  description: L([
    'AWS pricing in depth, Savings Plans and Reserved Instances maths, rightsizing with Spot and Graviton, storage and data-transfer costs, and running FinOps in a team.',
    'Giá AWS chuyên sâu, toán của Savings Plans và Reserved Instances, rightsizing với Spot và Graviton, chi phí lưu trữ và data transfer, và vận hành FinOps trong một team.',
  ]),
  outcomes: [
    L(['Break any bill into its pricing dimensions', 'Phân tách mọi hoá đơn thành các chiều tính giá']),
    L(['Size a Savings Plan commitment with coverage and utilisation', 'Chọn mức cam kết Savings Plan dựa trên coverage và utilization']),
    L(['Cut compute, storage and transfer costs without hurting SLOs', 'Cắt chi phí compute, lưu trữ và data transfer mà không ảnh hưởng SLO']),
    L(['Set up tagging, budgets and unit economics', 'Thiết lập tagging, budget và unit economics']),
  ],
  modules: [
    mod('bill', 'receipt', ['Understanding the bill', 'Hiểu hoá đơn'], ['Where money goes.', 'Tiền đi đâu.'], ['scenario-quiz', 'estimation'], [
      lesson('pricing-deep', ['AWS pricing in depth', 'Giá AWS chuyên sâu'], ['Pricing dimensions, free tier, calculator, Cost Explorer, CUR.', 'Các chiều tính giá, free tier, calculator, Cost Explorer, CUR.'], 12, 'available'),
    ]),
    mod('optimize', 'scissors', ['Optimisation', 'Tối ưu'], ['The levers, with numbers.', 'Các đòn bẩy, kèm con số.'], ['estimation', 'scenario-quiz', 'canvas-fix'], [
      lesson('commitments', ['Savings Plans and Reserved Instances', 'Savings Plans và Reserved Instances'], ['Coverage, utilisation and choosing a term.', 'Coverage, utilization và chọn thời hạn.'], 12, 'available'),
      lesson('rightsizing', ['Rightsizing, Spot and Graviton', 'Rightsizing, Spot và Graviton'], ['Measure first, then cut.', 'Đo trước, cắt sau.'], 12, 'available'),
      lesson('storage-transfer-costs', ['Storage and transfer costs', 'Chi phí lưu trữ và truyền dữ liệu'], ['S3 tiers, EBS gp3, egress, NAT and cross-AZ.', 'Các tầng S3, EBS gp3, egress, NAT và cross-AZ.'], 10, 'available'),
    ]),
    mod('governance', 'tags', ['FinOps practice', 'FinOps trong thực tế'], ['Making cost visible and owned.', 'Làm chi phí minh bạch và có người chịu trách nhiệm.'], ['scenario-quiz'], [
      lesson('finops-practice', ['FinOps in practice', 'FinOps trong thực tế'], ['Tags, budgets, anomaly detection, showback and unit economics.', 'Tag, budget, phát hiện bất thường, showback và unit economics.'], 10, 'available'),
    ]),
  ],
});
