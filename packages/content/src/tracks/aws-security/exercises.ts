import { buildDesign, tx, type Scenario } from '@cloudlab/catalog';
import type { CanvasChallenge, Exercise } from '@cloudlab/exercise-kit';
import { exerciseBuilders } from '../../helpers.ts';

const { quiz, estimate } = exerciseBuilders('aws-security');

const lockdownScenario: Scenario = { rps: 200, peakMultiplier: 3, readRatio: 0.8, payloadKB: 5, region: 'us-east-1' };

export const lockdown: CanvasChallenge = {
  id: 'aws-security.lockdown-api',
  kind: 'canvas-fix',
  skills: ['aws.security.edge', 'aws.networking.subnets'],
  title: tx('Lock down the public API', 'Khoá chặt API public'),
  brief: tx(
    'A pentest report on this API says: "the database endpoint is reachable from the internet" and "no web application firewall". Fix every security finding without breaking the service or the budget.',
    'Báo cáo pentest của API này ghi: "endpoint database truy cập được từ internet" và "không có tường lửa ứng dụng web". Hãy xử lý mọi phát hiện bảo mật mà không làm hỏng dịch vụ hay vượt ngân sách.',
  ),
  scenario: lockdownScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { count: 2, autoscaling: true, maxCount: 6, multiAz: true }],
      ['db', 'rds', 3, 1, { multiAz: true }],
    ],
    ['users>lb', 'lb>app', 'app>db', 'users>db'],
    lockdownScenario,
  ),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    { type: 'no-findings', severity: 'info', pillar: 'security' },
    { type: 'metric', metric: 'errorRate', op: '<=', value: 0.01 },
    { type: 'metric', metric: 'monthlyUsd', op: '<=', value: 900 },
  ],
  hints: [
    tx('Open the Review tab and filter mentally to the "Security" items.', 'Mở tab Đánh giá và chú ý các mục có nhãn "Bảo mật".'),
    tx('Nothing from the internet should connect to the database directly.', 'Không có gì từ internet được nối thẳng vào database.'),
    tx('Delete the Users → RDS connection and put WAF in front: Users → WAF → ALB.', 'Xoá kết nối Users → RDS và đặt WAF phía trước: Users → WAF → ALB.'),
  ],
  debrief: tx(
    'Databases live in private subnets and only accept connections from the app tier’s security group; the public entry point is protected by WAF (managed rules + rate limits). In real VPCs you would also ensure the ALB only accepts traffic from CloudFront/WAF if they sit in front of it. Notice the price of safety in the Cost tab: WAF inspects every request (~$0.60 per million).',
    'Database nằm trong private subnet và chỉ nhận kết nối từ security group của tầng app; điểm vào public được WAF bảo vệ (managed rule + rate limit). Trong VPC thật, bạn còn phải bảo đảm ALB chỉ nhận traffic từ CloudFront/WAF nếu chúng đứng trước nó. Hãy để ý cái giá của sự an toàn trong tab Chi phí: WAF kiểm tra mọi request (~$0.60 mỗi triệu).',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['waf', 'waf', 1, 1],
      ['lb', 'alb', 2, 1],
      ['app', 'ec2', 3, 1, { count: 2, autoscaling: true, maxCount: 6, multiAz: true }],
      ['db', 'rds', 4, 1, { multiAz: true }],
    ],
    ['users>waf', 'waf>lb', 'lb>app', 'app>db'],
    lockdownScenario,
  ),
};

export const exercises: Record<string, Record<string, Exercise[]>> = {
  identity: {
    'iam-policy-evaluation': [
      quiz(
        'boundary',
        ['aws.iam.policy-evaluation'],
        [
          'A developer role has an identity policy allowing s3:* on all buckets, and a permissions boundary that allows only s3:GetObject. Can the role call s3:PutObject?',
          'Một role developer có identity policy cho phép s3:* trên mọi bucket, và permissions boundary chỉ cho phép s3:GetObject. Role này gọi được s3:PutObject không?',
        ],
        [
          ['a', ['No — effective permissions are the intersection of identity policy and boundary', 'Không — quyền thực tế là phần giao của identity policy và boundary'], true, ['A boundary never grants anything; it caps what identity policies can grant.', 'Boundary không bao giờ cấp quyền; nó chỉ đặt trần cho những gì identity policy được cấp.']],
          ['b', ['Yes — the identity policy allows s3:*', 'Có — identity policy cho phép s3:*'], false, ['The action must be allowed by both the identity policy AND the boundary.', 'Hành động phải được cả identity policy LẪN boundary cho phép.']],
          ['c', ['Only if the bucket policy also allows it', 'Chỉ khi bucket policy cũng cho phép'], false, ['A bucket policy cannot lift a boundary for a role in the same account.', 'Bucket policy không thể "nới" boundary cho role trong cùng account.']],
        ],
      ),
      quiz(
        'cross-account',
        ['aws.iam.policy-evaluation'],
        [
          'A role in account A must read a bucket in account B. What is needed? (choose all that apply)',
          'Một role ở account A cần đọc một bucket ở account B. Cần những gì? (chọn tất cả đáp án đúng)',
        ],
        [
          ['a', ['An identity policy in A allowing s3:GetObject on the bucket', 'Identity policy ở A cho phép s3:GetObject trên bucket đó'], true, ['Cross-account access needs an allow on both sides.', 'Truy cập chéo account cần được cho phép ở cả hai phía.']],
          ['b', ['A bucket policy in B allowing the role from A', 'Bucket policy ở B cho phép role từ A'], true, ['The resource owner must trust the other account.', 'Chủ sở hữu tài nguyên phải tin tưởng account kia.']],
          ['c', ['Making the bucket public', 'Đặt bucket ở chế độ public'], false, ['Never needed — and dangerous.', 'Không bao giờ cần — và nguy hiểm.']],
        ],
      ),
      quiz(
        'scp',
        ['aws.iam.organizations'],
        [
          'An SCP on the account denies all actions outside eu-west-1. An admin with AdministratorAccess tries to launch EC2 in us-east-1. Result?',
          'Một SCP trên account từ chối mọi hành động ngoài eu-west-1. Một admin có AdministratorAccess thử bật EC2 ở us-east-1. Kết quả?',
        ],
        [
          ['a', ['Denied — SCPs limit everyone in the account, admins included', 'Bị từ chối — SCP giới hạn mọi người trong account, kể cả admin'], true, ['SCPs set the maximum permissions for the account (except the management account).', 'SCP đặt mức quyền tối đa cho account (trừ management account).']],
          ['b', ['Allowed — admins bypass SCPs', 'Được phép — admin không bị SCP chặn'], false, ['Only the organisation’s management account is exempt.', 'Chỉ management account của organization được miễn.']],
        ],
      ),
    ],
    'multi-account': [
      quiz(
        'why-accounts',
        ['aws.iam.organizations'],
        ['Main reasons to split workloads into several AWS accounts? (choose all that apply)', 'Lý do chính để tách workload ra nhiều account AWS? (chọn tất cả đáp án đúng)'],
        [
          ['a', ['Limit blast radius — a mistake or breach stays in one account', 'Giới hạn bán kính ảnh hưởng — sai sót hay bị xâm nhập chỉ nằm trong một account'], true, ['Accounts are the strongest isolation boundary in AWS.', 'Account là ranh giới cô lập mạnh nhất trong AWS.']],
          ['b', ['Separate billing and quotas per team/environment', 'Tách hoá đơn và quota theo team/môi trường'], true, ['Costs and service limits are per account.', 'Chi phí và giới hạn dịch vụ được tính theo account.']],
          ['c', ['Accounts are cheaper than VPCs', 'Account rẻ hơn VPC'], false, ['Accounts themselves are free; the reason is isolation, not price.', 'Bản thân account miễn phí; lý do là sự cô lập chứ không phải giá.']],
        ],
      ),
      quiz(
        'people-login',
        ['aws.iam.identity-center'],
        ['How should 50 engineers sign in to 20 accounts?', '50 kỹ sư nên đăng nhập vào 20 account thế nào?'],
        [
          ['a', ['IAM Identity Center (SSO) with permission sets assigned per account', 'IAM Identity Center (SSO) với permission set gán theo từng account'], true, ['One identity, short-lived credentials, central access reviews.', 'Một danh tính, credential ngắn hạn, rà soát quyền tập trung.']],
          ['b', ['An IAM user per engineer in every account', 'Mỗi kỹ sư một IAM user trong từng account'], false, ['1,000 long-lived users and keys to manage — a security nightmare.', '1.000 user và key dài hạn phải quản lý — cơn ác mộng bảo mật.']],
          ['c', ['Share the root credentials of each account', 'Dùng chung credential root của từng account'], false, ['Never share or use root for daily work.', 'Không bao giờ dùng chung hay dùng root cho công việc hằng ngày.']],
        ],
      ),
      quiz(
        'log-archive',
        ['aws.security.detection'],
        ['Why send all CloudTrail logs to a separate "Log Archive" account?', 'Vì sao gửi toàn bộ log CloudTrail sang một account "Log Archive" riêng?'],
        [
          ['a', ['An attacker who compromises a workload account cannot delete the evidence', 'Kẻ tấn công chiếm được account workload cũng không xoá được bằng chứng'], true, ['Separation of duties: workload admins have no access to the archive.', 'Tách biệt trách nhiệm: admin của workload không có quyền vào kho log.']],
          ['b', ['It makes logs cheaper', 'Nó làm log rẻ hơn'], false, ['Cost is similar; the point is integrity.', 'Chi phí tương đương; mục đích là tính toàn vẹn.']],
        ],
      ),
    ],
  },
  'app-identity': {
    'cognito-auth': [
      quiz(
        'pools',
        ['aws.security.cognito'],
        ['Your mobile app must sign users in and then upload photos straight to S3. Which Cognito parts do you need?', 'App mobile của bạn cần đăng nhập người dùng rồi upload ảnh thẳng lên S3. Bạn cần những phần nào của Cognito?'],
        [
          ['a', ['A user pool for sign-in, plus an identity pool to exchange the token for temporary AWS credentials', 'User pool để đăng nhập, cộng identity pool để đổi token lấy credential AWS tạm thời'], true, ['User pools authenticate; identity pools authorise access to AWS resources.', 'User pool xác thực; identity pool cấp quyền truy cập tài nguyên AWS.']],
          ['b', ['Only a user pool', 'Chỉ user pool'], false, ['User-pool tokens are for your APIs, not for calling S3 directly.', 'Token của user pool dùng cho API của bạn, không gọi thẳng S3 được.']],
          ['c', ['An IAM user embedded in the app', 'Một IAM user nhúng trong app'], false, ['Anyone can extract keys from an app binary.', 'Ai cũng có thể lấy key ra từ file app.']],
        ],
      ),
      quiz(
        'authorizer',
        ['aws.security.cognito'],
        ['An HTTP API must accept only requests with a valid Cognito JWT. Simplest option?', 'Một HTTP API chỉ được nhận request có JWT Cognito hợp lệ. Cách đơn giản nhất?'],
        [
          ['a', ['A built-in JWT authorizer pointing at the user pool', 'JWT authorizer có sẵn, trỏ tới user pool'], true, ['No code: API Gateway validates signature, issuer, audience and expiry.', 'Không cần code: API Gateway kiểm tra chữ ký, issuer, audience và hạn dùng.']],
          ['b', ['Validate the token inside every Lambda', 'Tự kiểm tra token trong từng Lambda'], false, ['Works, but you pay for and maintain code the gateway does for free.', 'Chạy được, nhưng bạn tốn tiền và công cho việc gateway làm miễn phí.']],
        ],
      ),
      estimate(
        'mau-cost',
        ['aws.security.cognito', 'aws.cost.estimation'],
        ['Cognito Essentials costs $0.015 per MAU after the first 10,000. With 60,000 MAU, what is the monthly cost (USD)?', 'Cognito Essentials tính $0.015 mỗi MAU sau 10.000 MAU đầu. Với 60.000 MAU, chi phí mỗi tháng là bao nhiêu (USD)?'],
        'USD',
        750,
        0.05,
        ['(60,000 − 10,000) × $0.015 = $750.', '(60.000 − 10.000) × $0.015 = $750.'],
      ),
    ],
  },
  'data-protection': {
    'encryption-kms': [
      quiz(
        'envelope',
        ['aws.security.kms'],
        ['What is envelope encryption?', 'Envelope encryption là gì?'],
        [
          ['a', ['Data is encrypted with a data key; the data key is encrypted with a KMS key', 'Dữ liệu được mã hoá bằng data key; data key được mã hoá bằng KMS key'], true, ['Large data never travels to KMS; only the small data key does.', 'Dữ liệu lớn không bao giờ phải gửi tới KMS; chỉ có data key nhỏ.']],
          ['b', ['Encrypting data twice with the same key', 'Mã hoá dữ liệu hai lần bằng cùng một key'], false, ['That adds nothing.', 'Như vậy không thêm được gì.']],
          ['c', ['Sending data inside a TLS envelope', 'Gửi dữ liệu trong "phong bì" TLS'], false, ['TLS is encryption in transit, a different concept.', 'TLS là mã hoá khi truyền, một khái niệm khác.']],
        ],
      ),
      quiz(
        'key-policy',
        ['aws.security.kms'],
        ['An IAM policy allows kms:Decrypt, but decryption fails with AccessDenied. Most likely cause?', 'IAM policy cho phép kms:Decrypt, nhưng giải mã vẫn bị AccessDenied. Nguyên nhân khả dĩ nhất?'],
        [
          ['a', ['The key policy does not allow (or delegate to IAM for) that principal', 'Key policy không cho phép (hoặc không uỷ quyền cho IAM) principal đó'], true, ['For KMS, the key policy is the root of trust — IAM alone is not enough unless the key policy delegates.', 'Với KMS, key policy là gốc của niềm tin — chỉ IAM thôi không đủ trừ khi key policy uỷ quyền.']],
          ['b', ['KMS keys cannot be used by roles', 'Role không dùng được KMS key'], false, ['Roles use KMS all the time.', 'Role dùng KMS thường xuyên.']],
        ],
      ),
      estimate(
        'kms-cost',
        ['aws.security.kms', 'aws.cost.estimation'],
        ['One customer-managed KMS key ($1/month) receives 50 million requests a month ($0.03 per 10,000). Monthly cost (USD)?', 'Một KMS key do khách hàng quản lý ($1/tháng) nhận 50 triệu request mỗi tháng ($0.03 mỗi 10.000). Chi phí mỗi tháng (USD)?'],
        'USD',
        151,
        0.05,
        ['50,000,000 ÷ 10,000 × $0.03 = $150, plus $1 for the key = $151. S3 Bucket Keys can cut these requests by ~99%.', '50.000.000 ÷ 10.000 × $0.03 = $150, cộng $1 cho key = $151. S3 Bucket Key có thể giảm ~99% số request này.'],
      ),
    ],
    secrets: [
      quiz(
        'where-secrets',
        ['aws.security.secrets'],
        ['Where should a Lambda get its database password?', 'Lambda nên lấy mật khẩu database từ đâu?'],
        [
          ['a', ['Secrets Manager (or Parameter Store SecureString), read at runtime via its IAM role', 'Secrets Manager (hoặc Parameter Store SecureString), đọc lúc chạy qua IAM role của nó'], true, ['Encrypted, audited, rotatable, never in code.', 'Được mã hoá, có audit, xoay vòng được, không bao giờ nằm trong code.']],
          ['b', ['Hard-coded in the source', 'Viết cứng trong source code'], false, ['It ends up in git history forever.', 'Nó sẽ nằm mãi trong lịch sử git.']],
          ['c', ['A plaintext environment variable', 'Biến môi trường dạng văn bản thường'], false, ['Visible to anyone who can read the function configuration.', 'Ai đọc được cấu hình function cũng thấy.']],
        ],
      ),
      quiz(
        'rotation',
        ['aws.security.secrets'],
        ['Which is a strong reason to choose Secrets Manager over Parameter Store?', 'Đâu là lý do mạnh để chọn Secrets Manager thay vì Parameter Store?'],
        [
          ['a', ['Built-in automatic rotation (e.g. RDS passwords) and cross-Region replication', 'Có sẵn xoay vòng tự động (vd mật khẩu RDS) và nhân bản sang region khác'], true, ['Parameter Store has no built-in rotation.', 'Parameter Store không có xoay vòng có sẵn.']],
          ['b', ['It is free', 'Nó miễn phí'], false, ['Secrets Manager costs $0.40 per secret per month; standard parameters are free.', 'Secrets Manager tốn $0.40 mỗi secret mỗi tháng; tham số standard thì miễn phí.']],
        ],
      ),
      estimate(
        'secrets-cost',
        ['aws.security.secrets', 'aws.cost.estimation'],
        ['20 secrets ($0.40 each per month) and 2 million API calls ($0.05 per 10,000). Monthly cost (USD)?', '20 secret ($0.40 mỗi secret mỗi tháng) và 2 triệu lời gọi API ($0.05 mỗi 10.000). Chi phí mỗi tháng (USD)?'],
        'USD',
        18,
        0.05,
        ['20 × $0.40 = $8; 2,000,000 ÷ 10,000 × $0.05 = $10; total $18. Cache secrets in memory to cut API calls.', '20 × $0.40 = $8; 2.000.000 ÷ 10.000 × $0.05 = $10; tổng $18. Cache secret trong bộ nhớ để giảm số lời gọi.'],
      ),
    ],
  },
  'edge-protection': {
    'waf-shield': [
      quiz(
        'rate-limit',
        ['aws.security.edge'],
        ['A bot hammers your login endpoint from a few IPs. Best first defence?', 'Một bot dội liên tục vào endpoint đăng nhập từ vài IP. Lớp phòng thủ đầu tiên tốt nhất?'],
        [
          ['a', ['A WAF rate-based rule on /login', 'Một rule rate-based của WAF cho /login'], true, ['Blocks IPs exceeding a request rate, at the edge, before your app.', 'Chặn IP vượt ngưỡng request ngay ở biên, trước khi tới app.']],
          ['b', ['Scale the app servers up', 'Scale server app lên'], false, ['You would pay to serve the attacker.', 'Bạn sẽ trả tiền để phục vụ kẻ tấn công.']],
          ['c', ['Shield Advanced only', 'Chỉ dùng Shield Advanced'], false, ['Shield targets DDoS; application-layer abuse needs WAF rules.', 'Shield nhắm tới DDoS; lạm dụng ở tầng ứng dụng cần rule WAF.']],
        ],
      ),
      quiz(
        'oac',
        ['aws.security.edge'],
        ['Your S3 website is behind CloudFront, but people can still fetch files directly from the bucket URL. Fix?', 'Website S3 của bạn đứng sau CloudFront, nhưng người ta vẫn tải file trực tiếp từ URL bucket. Sửa thế nào?'],
        [
          ['a', ['Use Origin Access Control and a bucket policy that only allows CloudFront; block public access', 'Dùng Origin Access Control và bucket policy chỉ cho phép CloudFront; bật Block Public Access'], true, ['Then the only way in is through CloudFront (and its WAF).', 'Khi đó chỉ còn một đường vào là qua CloudFront (và WAF của nó).']],
          ['b', ['Rename the bucket', 'Đổi tên bucket'], false, ['Security through obscurity does not work.', 'Bảo mật bằng cách giấu tên không có tác dụng.']],
        ],
      ),
      lockdown,
    ],
  },
  detection: {
    'detect-respond': [
      quiz(
        'which-service',
        ['aws.security.detection'],
        ['Match the need: "Who deleted this security group yesterday?"', 'Chọn dịch vụ cho nhu cầu: "Ai đã xoá security group này hôm qua?"'],
        [
          ['a', ['CloudTrail', 'CloudTrail'], true, ['CloudTrail records every API call: who, what, when, from where.', 'CloudTrail ghi lại mọi lời gọi API: ai, làm gì, lúc nào, từ đâu.']],
          ['b', ['GuardDuty', 'GuardDuty'], false, ['GuardDuty detects threats; the raw audit trail is CloudTrail.', 'GuardDuty phát hiện mối đe doạ; nhật ký audit gốc là CloudTrail.']],
          ['c', ['CloudWatch metrics', 'CloudWatch metrics'], false, ['Metrics are numbers over time, not an audit of actions.', 'Metrics là các con số theo thời gian, không phải nhật ký hành động.']],
        ],
      ),
      quiz(
        'guardduty',
        ['aws.security.detection'],
        ['An EC2 instance starts talking to a known crypto-mining domain. Which service is designed to notice?', 'Một instance EC2 bắt đầu liên lạc với domain đào coin đã biết. Dịch vụ nào được thiết kế để phát hiện việc này?'],
        [
          ['a', ['GuardDuty', 'GuardDuty'], true, ['It analyses DNS, VPC flow and CloudTrail logs with threat intelligence.', 'Nó phân tích DNS, VPC flow log và CloudTrail kết hợp dữ liệu tình báo mối đe doạ.']],
          ['b', ['AWS Config', 'AWS Config'], false, ['Config checks resource configuration compliance.', 'Config kiểm tra cấu hình tài nguyên có tuân thủ không.']],
        ],
      ),
      quiz(
        'contain',
        ['aws.security.incident-response'],
        ['GuardDuty reports a compromised instance. Good first containment steps? (choose all that apply)', 'GuardDuty báo một instance bị xâm nhập. Bước khoanh vùng đầu tiên hợp lý? (chọn tất cả đáp án đúng)'],
        [
          ['a', ['Move it to an isolation security group with no inbound/outbound rules', 'Chuyển nó sang security group cô lập, không có rule vào/ra'], true, ['Stops the attacker’s access while keeping the instance for forensics.', 'Chặn đường của kẻ tấn công nhưng vẫn giữ instance để điều tra.']],
          ['b', ['Snapshot its volumes for investigation', 'Snapshot các ổ đĩa để điều tra'], true, ['Preserve evidence before changing anything else.', 'Giữ lại bằng chứng trước khi thay đổi gì khác.']],
          ['c', ['Terminate it immediately and move on', 'Xoá nó ngay lập tức rồi bỏ qua'], false, ['You lose the evidence of how the attacker got in.', 'Bạn mất bằng chứng về việc kẻ tấn công vào bằng cách nào.']],
        ],
      ),
    ],
  },
};
