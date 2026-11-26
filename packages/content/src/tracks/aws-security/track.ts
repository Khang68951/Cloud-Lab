import { tx } from '@learninglab/catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-security',
  icon: 'shield-check',
  hue: 350,
  level: 'intermediate',
  stage: 2,
  prerequisites: ['aws'],
  estHours: 8,
  title: tx('Security & Identity', 'Bảo mật & Danh tính'),
  tagline: tx('Who can do what, how data stays secret, and how you notice attacks.', 'Ai được làm gì, giữ bí mật dữ liệu thế nào, và phát hiện tấn công ra sao.'),
  description: tx('IAM policy evaluation in depth, multi-account setups, user authentication with Cognito, encryption with KMS, secrets, edge protection with WAF and Shield, and detection and response.', 'Đánh giá policy IAM chuyên sâu, mô hình nhiều account, xác thực người dùng với Cognito, mã hoá với KMS, quản lý secret, bảo vệ ở biên với WAF và Shield, cùng phát hiện và xử lý sự cố.'),
  outcomes: [
    tx('Predict whether any IAM request is allowed or denied, and why', 'Đoán đúng một request IAM được cho phép hay bị từ chối, và giải thích vì sao'),
    tx('Design a multi-account structure with guardrails', 'Thiết kế cấu trúc nhiều account có "lan can" bảo vệ'),
    tx('Choose encryption and secret storage for each kind of data', 'Chọn cách mã hoá và lưu secret phù hợp cho từng loại dữ liệu'),
    tx('Harden a public application and set up threat detection', 'Gia cố một ứng dụng public và thiết lập phát hiện mối đe doạ'),
  ],
  modules: [
    mod('identity', 'key-round', tx('Identity & access', 'Danh tính & truy cập'), tx('Policy types, evaluation logic and multi-account guardrails.', 'Các loại policy, logic đánh giá và lan can cho nhiều account.'), [
      lesson('iam-policy-evaluation', tx('How IAM evaluates a request', 'IAM đánh giá một request thế nào'), tx('Identity vs resource policies, boundaries, SCPs, conditions.', 'Policy theo danh tính và theo tài nguyên, boundary, SCP, điều kiện.'), 15),
      lesson('multi-account', tx('Multi-account with Organizations', 'Nhiều account với Organizations'), tx('OUs, SCPs, IAM Identity Center and cross-account roles.', 'OU, SCP, IAM Identity Center và role chéo account.'), 12),
    ]),
    mod('app-identity', 'fingerprint', tx('Identity for applications', 'Danh tính cho ứng dụng'), tx('Signing users in and authorising API calls.', 'Đăng nhập người dùng và phân quyền lời gọi API.'), [
      lesson('cognito-auth', tx('Cognito and API authentication', 'Cognito và xác thực API'), tx('User pools, identity pools, JWTs and authorizers.', 'User pool, identity pool, JWT và authorizer.'), 12),
    ]),
    mod('data-protection', 'lock', tx('Data protection', 'Bảo vệ dữ liệu'), tx('Encryption, keys and secrets.', 'Mã hoá, khoá và secret.'), [
      lesson('encryption-kms', tx('Encryption and KMS', 'Mã hoá và KMS'), tx('At rest, in transit, envelope encryption and key policies.', 'Khi lưu trữ, khi truyền, envelope encryption và key policy.'), 12),
      lesson('secrets', tx('Managing secrets', 'Quản lý secret'), tx('Secrets Manager vs Parameter Store, rotation, no secrets in code.', 'Secrets Manager và Parameter Store, xoay vòng, không để secret trong code.'), 10),
    ]),
    mod('edge-protection', 'shield', tx('Edge protection', 'Bảo vệ ở biên'), tx('Stopping attacks before they reach your app.', 'Chặn tấn công trước khi chúng tới ứng dụng.'), [
      lesson('waf-shield', tx('WAF, Shield and locking down origins', 'WAF, Shield và khoá origin'), tx('Managed rules, rate limits, DDoS protection, origin access control.', 'Managed rule, rate limit, chống DDoS, kiểm soát truy cập origin.'), 12),
    ]),
    mod('detection', 'radar', tx('Detection & response', 'Phát hiện & phản ứng'), tx('Knowing when something is wrong — and what to do.', 'Biết khi có chuyện bất thường — và phải làm gì.'), [
      lesson('detect-respond', tx('Detecting and responding to incidents', 'Phát hiện và xử lý sự cố bảo mật'), tx('CloudTrail, Config, GuardDuty, Security Hub and an IR playbook.', 'CloudTrail, Config, GuardDuty, Security Hub và quy trình ứng phó.'), 12),
    ]),
  ],
});
