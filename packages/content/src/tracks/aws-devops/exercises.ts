import { tx } from '@cloudlab/catalog';
import type { CourseExercises } from '../../define.ts';
import { exerciseBuilders } from '../../helpers.ts';

const { quiz, estimate } = exerciseBuilders('aws-devops');

export const exercises: CourseExercises = {
  iac: {
    'cloudformation-cdk': [
      quiz(
        'change-set',
        ['aws.devops.cloudformation'],
        tx('Before updating a production stack, you want to know whether the database will be replaced. Use:', 'Trước khi cập nhật stack production, bạn muốn biết database có bị thay thế hay không. Dùng:'),
        [
          ['a', tx('A change set (or `cdk diff`) and check the "Replacement" column', 'Một change set (hoặc `cdk diff`) và xem cột "Replacement"'), true, tx('Some property changes force replacement — a new, empty database. Protect stateful resources with DeletionPolicy/UpdateReplacePolicy: Retain.', 'Một số thay đổi thuộc tính buộc phải thay thế — tức là một database mới, rỗng. Bảo vệ tài nguyên có trạng thái bằng DeletionPolicy/UpdateReplacePolicy: Retain.')],
          ['b', tx('Just deploy and watch the console', 'Cứ deploy rồi theo dõi console'), false, tx('By then the replacement has already happened.', 'Lúc đó việc thay thế đã xảy ra rồi.')],
        ],
      ),
      quiz(
        'drift',
        ['aws.devops.cloudformation'],
        tx('Someone changed a security group by hand in the console. How do you find out?', 'Ai đó sửa tay một security group trên console. Làm sao phát hiện?'),
        [
          ['a', tx('Drift detection on the stack (and AWS Config rules)', 'Drift detection trên stack (và rule của AWS Config)'), true, tx('Drift compares the real resources with the template.', 'Drift so sánh tài nguyên thật với template.')],
          ['b', tx('It is impossible to know', 'Không thể biết được'), false, tx('CloudFormation can detect drift, and CloudTrail records who did it.', 'CloudFormation phát hiện được drift, còn CloudTrail ghi lại ai đã làm.')],
        ],
      ),
      quiz(
        'cdk-constructs',
        ['aws.devops.cdk'],
        tx('What is the main advantage of the CDK over raw CloudFormation YAML?', 'Ưu điểm chính của CDK so với CloudFormation YAML thuần là gì?'),
        [
          ['a', tx('Real programming languages and reusable constructs with safe defaults (e.g. grant methods for least-privilege IAM)', 'Dùng ngôn ngữ lập trình thật và construct tái sử dụng với mặc định an toàn (vd các hàm grant cho IAM quyền tối thiểu)'), true, tx('CDK synthesises to CloudFormation, so you keep its deployment engine.', 'CDK sinh ra CloudFormation, nên bạn vẫn giữ được engine deploy của nó.')],
          ['b', tx('It deploys without CloudFormation', 'Nó deploy mà không cần CloudFormation'), false, tx('CDK synthesises to CloudFormation templates.', 'CDK sinh ra template CloudFormation.')],
        ],
      ),
    ],
    terraform: [
      quiz(
        'state',
        ['aws.devops.terraform'],
        tx('Where should a team keep Terraform state?', 'Một team nên lưu Terraform state ở đâu?'),
        [
          ['a', tx('A remote backend: S3 with versioning and encryption, plus state locking', 'Remote backend: S3 có versioning và mã hoá, kèm khoá state'), true, tx('Shared, versioned, locked state prevents two applies from corrupting it. State can hold secrets — restrict access.', 'State dùng chung, có phiên bản, có khoá giúp hai lần apply không làm hỏng nó. State có thể chứa secret — hãy giới hạn quyền truy cập.')],
          ['b', tx('In the Git repository', 'Trong Git repository'), false, tx('No locking, merge conflicts, and possibly secrets committed.', 'Không có khoá, dễ xung đột khi merge, và có thể commit cả secret.')],
        ],
      ),
      quiz(
        'plan',
        ['aws.devops.terraform'],
        tx('In a CI pipeline, what should a reviewer look at before approving an infrastructure change?', 'Trong pipeline CI, người review nên xem gì trước khi duyệt một thay đổi hạ tầng?'),
        [
          ['a', tx('The saved `terraform plan` output, applied exactly as reviewed', 'Kết quả `terraform plan` đã lưu, rồi apply đúng như đã review'), true, tx('Applying a saved plan guarantees no surprise changes between review and apply.', 'Apply một plan đã lưu đảm bảo không có thay đổi bất ngờ giữa lúc review và lúc apply.')],
          ['b', tx('Only the code diff', 'Chỉ diff của code'), false, tx('A small code diff can mean a big infrastructure change (e.g. a replacement).', 'Một diff code nhỏ có thể là một thay đổi hạ tầng lớn (vd thay thế tài nguyên).')],
        ],
      ),
      quiz(
        'modules',
        ['aws.devops.terraform'],
        tx('Ten teams each build "a VPC the company way". How do you avoid ten different VPCs?', 'Mười team đều dựng "một VPC theo chuẩn công ty". Làm sao tránh có mười kiểu VPC khác nhau?'),
        [
          ['a', tx('A versioned shared module (Terraform module or CDK construct) with sensible defaults', 'Một module dùng chung có phiên bản (Terraform module hoặc CDK construct) với mặc định hợp lý'), true, tx('Teams consume a tested building block and upgrade deliberately.', 'Các team dùng một khối xây dựng đã kiểm thử và nâng cấp có chủ đích.')],
          ['b', tx('A wiki page with instructions', 'Một trang wiki hướng dẫn'), false, tx('Docs drift; code is reusable and testable.', 'Tài liệu dễ lỗi thời; code thì tái sử dụng và kiểm thử được.')],
        ],
      ),
    ],
  },
  delivery: {
    cicd: [
      quiz(
        'oidc',
        ['aws.devops.cicd', 'aws.security.iam'],
        tx('How should GitHub Actions authenticate to AWS?', 'GitHub Actions nên xác thực với AWS như thế nào?'),
        [
          ['a', tx('OIDC federation to an IAM role, scoped to the repository and branch', 'OIDC federation tới một IAM role, giới hạn theo repository và branch'), true, tx('Short-lived credentials, nothing to leak or rotate.', 'Credential ngắn hạn, không có gì để lộ hay phải xoay vòng.')],
          ['b', tx('An IAM user access key stored as a secret', 'Access key của IAM user lưu trong secret'), false, tx('Long-lived keys leak and are rarely rotated.', 'Key dài hạn dễ bị lộ và hiếm khi được xoay vòng.')],
        ],
      ),
      quiz(
        'build-once',
        ['aws.devops.cicd'],
        tx('What should move from staging to production?', 'Cái gì nên được chuyển từ staging lên production?'),
        [
          ['a', tx('The exact same artifact (image digest) that was tested — build once, deploy many', 'Chính artifact đã được kiểm thử (image digest) — build một lần, deploy nhiều nơi'), true, tx('Rebuilding for production means shipping something you never tested.', 'Build lại cho production nghĩa là ship thứ bạn chưa từng kiểm thử.')],
          ['b', tx('A fresh build from the main branch', 'Một bản build mới từ nhánh main'), false, tx('Dependencies may have changed since the tested build.', 'Dependency có thể đã thay đổi kể từ bản build đã kiểm thử.')],
        ],
      ),
      estimate(
        'dora',
        ['aws.devops.metrics'],
        tx('Last month: 40 deployments, 6 of them caused an incident or rollback. Change failure rate in %?', 'Tháng trước: 40 lần deploy, 6 lần gây sự cố hoặc phải rollback. Change failure rate bằng bao nhiêu %?'),
        '%',
        15,
        0.02,
        tx('6 ÷ 40 = 15%. Together with deployment frequency, lead time and time to restore, these are the DORA metrics.', '6 ÷ 40 = 15%. Cùng với tần suất deploy, lead time và thời gian khôi phục, đây là các chỉ số DORA.'),
      ),
    ],
    'deployment-strategies': [
      quiz(
        'canary',
        ['aws.devops.deployments'],
        tx('You want to send 5% of traffic to a new Lambda version and roll back automatically if errors rise. Use:', 'Bạn muốn đưa 5% traffic sang phiên bản Lambda mới và tự rollback nếu lỗi tăng. Dùng:'),
        [
          ['a', tx('A canary deployment (CodeDeploy, Lambda alias weights) with CloudWatch alarms', 'Canary deployment (CodeDeploy, trọng số trên Lambda alias) kèm alarm CloudWatch'), true, tx('Small blast radius, real traffic, automatic rollback.', 'Bán kính ảnh hưởng nhỏ, traffic thật, tự động rollback.')],
          ['b', tx('All-at-once deployment on Friday evening', 'Deploy toàn bộ một lần vào tối thứ Sáu'), false, tx('Maximum blast radius, minimum attention.', 'Bán kính ảnh hưởng tối đa, mức chú ý tối thiểu.')],
        ],
      ),
      quiz(
        'blue-green',
        ['aws.devops.deployments'],
        tx('What does blue/green give you that rolling does not?', 'Blue/green cho bạn điều gì mà rolling không có?'),
        [
          ['a', tx('Instant rollback by switching traffic back to the untouched old environment', 'Rollback tức thì bằng cách chuyển traffic về môi trường cũ còn nguyên vẹn'), true, tx('At the cost of running two environments during the switch.', 'Đổi lại phải chạy hai môi trường trong lúc chuyển.')],
          ['b', tx('Lower cost', 'Chi phí thấp hơn'), false, tx('It temporarily doubles capacity.', 'Nó tạm thời nhân đôi capacity.')],
        ],
      ),
      quiz(
        'feature-flags',
        ['aws.devops.deployments'],
        tx('How do you ship a half-finished feature to production safely?', 'Làm sao đưa một tính năng chưa hoàn thiện lên production một cách an toàn?'),
        [
          ['a', tx('Behind a feature flag (e.g. AppConfig), off by default, enabled gradually', 'Đặt sau một feature flag (vd AppConfig), mặc định tắt, bật dần dần'), true, tx('Deploy ≠ release: code ships dark, and the flag is the instant kill switch.', 'Deploy ≠ release: code được ship ở trạng thái ẩn, và flag là công tắc tắt tức thì.')],
          ['b', tx('Keep it in a long-lived branch for months', 'Giữ nó trên một nhánh sống lâu suốt nhiều tháng'), false, tx('Long-lived branches cause painful merges.', 'Nhánh sống lâu gây ra những lần merge rất khổ sở.')],
        ],
      ),
      estimate(
        'db-migration',
        ['aws.devops.deployments'],
        tx('Renaming a column with zero downtime (expand/contract) takes how many separate deployments: add new column + dual-write, backfill + switch reads, stop writing old, drop old?', 'Đổi tên một cột mà không downtime (expand/contract) cần bao nhiêu lần deploy riêng: thêm cột mới + ghi cả hai, backfill + chuyển việc đọc, ngừng ghi cột cũ, xoá cột cũ?'),
        'deployments',
        4,
        0.001,
        tx('Each step stays compatible with the previous app version, so you can roll back at any point.', 'Mỗi bước đều tương thích với phiên bản app trước đó, nên bạn có thể rollback ở bất kỳ thời điểm nào.'),
      ),
    ],
  },
  operations: {
    environments: [
      quiz(
        'accounts',
        ['aws.devops.environments', 'aws.security.organizations'],
        tx('What is the recommended way to separate dev, staging and production?', 'Cách được khuyến nghị để tách dev, staging và production là gì?'),
        [
          ['a', tx('Separate AWS accounts per environment, in an AWS Organization', 'Mỗi môi trường một AWS account riêng, trong một AWS Organization'), true, tx('Accounts are the strongest isolation boundary for security, quotas and billing.', 'Account là ranh giới cô lập mạnh nhất về bảo mật, quota và chi phí.')],
          ['b', tx('Tags on resources in one account', 'Gắn tag cho tài nguyên trong một account'), false, tx('A dev mistake can still hit production resources.', 'Một sai sót ở dev vẫn có thể chạm vào tài nguyên production.')],
        ],
      ),
      quiz(
        'control-tower',
        ['aws.devops.environments'],
        tx('You need new accounts that come pre-configured with logging, guardrails and SSO. Use:', 'Bạn cần các account mới được cấu hình sẵn logging, guardrail và SSO. Dùng:'),
        [
          ['a', tx('AWS Control Tower (landing zone + Account Factory)', 'AWS Control Tower (landing zone + Account Factory)'), true, tx('It sets up a multi-account baseline with SCP and Config guardrails.', 'Nó dựng sẵn nền tảng multi-account với guardrail bằng SCP và Config.')],
          ['b', tx('Create each account by hand', 'Tạo tay từng account'), false, tx('Manual setups drift and miss controls.', 'Cấu hình thủ công dễ lệch chuẩn và bỏ sót kiểm soát.')],
        ],
      ),
      quiz(
        'parity',
        ['aws.devops.environments'],
        tx('Staging uses a single small database; production uses Multi-AZ Aurora. A failover bug only appears in production. Lesson?', 'Staging dùng một database nhỏ; production dùng Aurora Multi-AZ. Một lỗi failover chỉ xuất hiện trên production. Bài học là gì?'),
        [
          ['a', tx('Keep environments structurally the same (same IaC, smaller sizes) so behaviour matches', 'Giữ các môi trường giống nhau về cấu trúc (cùng IaC, chỉ nhỏ hơn) để hành vi khớp nhau'), true, tx('Scale can differ; topology should not.', 'Quy mô có thể khác; topology thì không nên khác.')],
          ['b', tx('Testing in staging is pointless', 'Kiểm thử trên staging là vô ích'), false, tx('It is valuable when it resembles production.', 'Nó có giá trị khi giống production.')],
        ],
      ),
    ],
    'gitops-containers': [
      quiz(
        'gitops',
        ['aws.devops.gitops'],
        tx('In GitOps, how does a change reach the EKS cluster?', 'Trong GitOps, một thay đổi tới được cluster EKS bằng cách nào?'),
        [
          ['a', tx('A commit to the config repo; an in-cluster agent (Argo CD / Flux) pulls and reconciles it', 'Một commit vào repo cấu hình; agent trong cluster (Argo CD / Flux) kéo về và đồng bộ'), true, tx('Git is the source of truth, every change is reviewed and auditable, and drift is auto-corrected.', 'Git là nguồn sự thật, mọi thay đổi đều được review và truy vết được, drift được tự động sửa.')],
          ['b', tx('Engineers run kubectl apply from laptops', 'Kỹ sư chạy kubectl apply từ laptop'), false, tx('Unreviewed, unaudited, and impossible to reproduce.', 'Không được review, không truy vết được và không tái tạo được.')],
        ],
      ),
      quiz(
        'image-scan',
        ['aws.devops.containers', 'aws.security.vulnerabilities'],
        tx('How do you stop images with critical CVEs reaching production?', 'Làm sao ngăn image có CVE nghiêm trọng lên production?'),
        [
          ['a', tx('ECR scanning (Amazon Inspector) as a pipeline gate, plus minimal base images', 'Quét image trên ECR (Amazon Inspector) làm cổng chặn trong pipeline, cộng base image tối giản'), true, tx('Fail the build on critical findings, and rescan continuously as new CVEs appear.', 'Làm build thất bại khi có phát hiện nghiêm trọng, và quét lại liên tục khi CVE mới xuất hiện.')],
          ['b', tx('Scan once a year', 'Mỗi năm quét một lần'), false, tx('New CVEs are published daily.', 'CVE mới được công bố mỗi ngày.')],
        ],
      ),
      quiz(
        'immutable-tags',
        ['aws.devops.containers'],
        tx('Why deploy images by digest or immutable tag instead of `latest`?', 'Vì sao nên deploy image theo digest hoặc tag bất biến thay vì `latest`?'),
        [
          ['a', tx('So every environment runs exactly the same, known image, and rollbacks are precise', 'Để mọi môi trường chạy đúng cùng một image đã biết, và rollback được chính xác'), true, tx('`latest` changes under you; turn on tag immutability in ECR.', '`latest` thay đổi mà bạn không hay biết; hãy bật tag immutability trên ECR.')],
          ['b', tx('`latest` is slower to pull', '`latest` kéo về chậm hơn'), false, tx('Speed is not the issue; reproducibility is.', 'Tốc độ không phải vấn đề; khả năng tái tạo mới là vấn đề.')],
        ],
      ),
    ],
  },
};
