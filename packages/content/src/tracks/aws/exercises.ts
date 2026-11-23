import { tx } from '@cloudlab/catalog';
import type { Estimation, Exercise, ScenarioQuiz } from '@cloudlab/exercise-kit';
import type { LocalizedText, SkillTag } from '@cloudlab/shared';
import * as C from './challenges.ts';

type T = [en: string, vi: string];
const L = ([en, vi]: T): LocalizedText => tx(en, vi);

/** Scenario quiz. Choices: [id, text, correct, why]. */
function quiz(id: string, skills: SkillTag[], prompt: T, choices: [string, T, boolean, T][], hints: T[] = []): ScenarioQuiz {
  return {
    id: `aws.${id}`,
    kind: 'scenario-quiz',
    skills,
    prompt: L(prompt),
    choices: choices.map(([cid, text, correct, explain]) => ({ id: cid, text: L(text), correct, explain: L(explain) })),
    hints: hints.map(L),
  };
}

function estimate(id: string, skills: SkillTag[], prompt: T, unit: string, answer: number, tolerance: number, explain: T, hints: T[] = []): Estimation {
  return { id: `aws.${id}`, kind: 'estimation', skills, prompt: L(prompt), unit, answer, tolerance, explain: L(explain), hints: hints.map(L) };
}

/** Exercises per module → lesson. Order = order shown in the lesson. */
export const AWS_EXERCISES: Record<string, Record<string, Exercise[]>> = {
  foundations: {
    'lab-tour': [
      quiz(
        'foundations.lab-dashed-edge',
        ['aws.foundations.lab'],
        ['In the Lab, what does a dashed, animated connection mean?', 'Trong Lab, một đường nối nét đứt, có chuyển động nghĩa là gì?'],
        [
          ['a', ['Work delivered asynchronously (through a queue/topic) — not on the user’s request path', 'Công việc được chuyển bất đồng bộ (qua queue/topic) — không nằm trên đường request của người dùng'], true, ['Its latency is not added to what users wait for, and the service behind a queue only needs the average rate.', 'Độ trễ của nó không cộng vào thời gian người dùng chờ, và service sau queue chỉ cần chịu lưu lượng trung bình.']],
          ['b', ['A broken connection', 'Một kết nối bị hỏng'], false, ['Invalid connections are red with an ✕.', 'Kết nối không hợp lệ có màu đỏ và dấu ✕.']],
          ['c', ['A connection over the internet', 'Một kết nối đi qua internet'], false, ['The Lab does not draw the internet differently; dashed means asynchronous.', 'Lab không vẽ internet khác đi; nét đứt nghĩa là bất đồng bộ.']],
        ],
      ),
      quiz(
        'foundations.lab-red-node',
        ['aws.foundations.lab'],
        ['A node shows a red 140% badge. What is happening and what are typical fixes? (choose all that apply)', 'Một node hiện nhãn đỏ 140%. Chuyện gì đang xảy ra và cách sửa thường gặp là gì? (chọn tất cả đáp án đúng)'],
        [
          ['a', ['It receives 40% more requests at peak than it can handle, so some fail', 'Lúc cao điểm nó nhận nhiều hơn 40% so với sức chứa, nên một phần request bị lỗi'], true, ['Utilisation = peak load ÷ capacity. Above 100% the excess is rejected.', 'Mức tải = tải đỉnh ÷ sức chứa. Vượt 100% thì phần dư bị từ chối.']],
          ['b', ['Add capacity: more/bigger instances or Auto Scaling', 'Thêm sức chứa: nhiều instance hơn/lớn hơn hoặc Auto Scaling'], true, ['Scaling out or up raises capacity.', 'Scale out hoặc scale up đều tăng sức chứa.']],
          ['c', ['Reduce its load: a cache, CDN or queue in front', 'Giảm tải cho nó: đặt cache, CDN hoặc queue phía trước'], true, ['Often cheaper than adding capacity.', 'Thường rẻ hơn việc thêm sức chứa.']],
          ['d', ['Its monthly cost is 140% of the budget', 'Chi phí tháng của nó bằng 140% ngân sách'], false, ['The badge is utilisation, not cost.', 'Nhãn đó là mức tải, không phải chi phí.']],
        ],
      ),
      C.staticSite,
    ],
    'regions-azs': [
      quiz(
        'foundations.az-meaning',
        ['aws.foundations.regions'],
        ['What is an Availability Zone (AZ)?', 'Availability Zone (AZ) là gì?'],
        [
          ['a', ['One or more data centres with independent power, cooling and networking, inside a Region', 'Một hoặc nhiều data center có nguồn điện, làm mát và mạng độc lập, nằm trong một Region'], true, ['Correct. AZs in a Region are physically separate but connected with low-latency links, so you can replicate synchronously between them.', 'Đúng. Các AZ trong một Region tách biệt về vật lý nhưng nối với nhau bằng đường truyền độ trễ thấp, nên có thể nhân bản đồng bộ giữa chúng.']],
          ['b', ['A country where AWS operates', 'Một quốc gia mà AWS hoạt động'], false, ['That is closer to a Region (a geographic area). A Region contains several AZs.', 'Đó gần với Region hơn (một khu vực địa lý). Một Region chứa nhiều AZ.']],
          ['c', ['A CloudFront edge location', 'Một điểm edge của CloudFront'], false, ['Edge locations are separate, much smaller sites used by CloudFront and Route 53.', 'Điểm edge là các site riêng, nhỏ hơn nhiều, dùng cho CloudFront và Route 53.']],
          ['d', ['A backup copy of your account', 'Một bản sao lưu tài khoản của bạn'], false, ['AZs are infrastructure locations, not backups.', 'AZ là vị trí hạ tầng, không phải bản sao lưu.']],
        ],
      ),
      quiz(
        'foundations.choose-region',
        ['aws.foundations.regions'],
        [
          'Your users are mostly in Vietnam and your company must keep customer data in Asia. Which factors matter MOST when choosing a Region? (choose all that apply)',
          'Người dùng của bạn chủ yếu ở Việt Nam và công ty phải giữ dữ liệu khách hàng ở châu Á. Những yếu tố nào quan trọng NHẤT khi chọn Region? (chọn tất cả đáp án đúng)',
        ],
        [
          ['a', ['Latency to users', 'Độ trễ tới người dùng'], true, ['Yes — a nearby Region (e.g. Singapore) cuts round-trip time.', 'Đúng — Region gần (vd Singapore) giảm thời gian khứ hồi.']],
          ['b', ['Data residency / compliance rules', 'Quy định về nơi lưu dữ liệu / tuân thủ'], true, ['Yes — legal requirements can rule Regions in or out before anything else.', 'Đúng — yêu cầu pháp lý có thể loại hoặc chọn Region trước mọi yếu tố khác.']],
          ['c', ['Service availability and price in that Region', 'Dịch vụ có sẵn và giá ở Region đó'], true, ['Yes — not every service exists everywhere, and prices differ by Region.', 'Đúng — không phải dịch vụ nào cũng có ở mọi nơi, và giá khác nhau theo Region.']],
          ['d', ['The Region with the most AZs is always best', 'Region có nhiều AZ nhất luôn là tốt nhất'], false, ['Every Region has at least 3 AZs; more AZs rarely decides it.', 'Region nào cũng có ít nhất 3 AZ; số AZ hiếm khi là yếu tố quyết định.']],
        ],
      ),
      quiz(
        'foundations.shared-responsibility',
        ['aws.foundations.shared-responsibility'],
        [
          'You run PostgreSQL on an EC2 instance you manage yourself. Who is responsible for patching PostgreSQL and the operating system?',
          'Bạn tự chạy PostgreSQL trên một instance EC2 do bạn quản lý. Ai chịu trách nhiệm vá lỗi PostgreSQL và hệ điều hành?',
        ],
        [
          ['a', ['You', 'Bạn'], true, ['Correct. On EC2 (IaaS) you own the OS and everything above it. With RDS, AWS would patch them for you.', 'Đúng. Trên EC2 (IaaS) bạn sở hữu hệ điều hành và mọi thứ phía trên. Nếu dùng RDS thì AWS sẽ vá giúp bạn.']],
          ['b', ['AWS', 'AWS'], false, ['AWS secures the hardware, hypervisor and data centres ("security OF the cloud") — not your guest OS.', 'AWS bảo vệ phần cứng, hypervisor và data center ("bảo mật CỦA cloud") — không phải hệ điều hành bên trong instance của bạn.']],
          ['c', ['Nobody — EC2 patches itself', 'Không ai cả — EC2 tự vá'], false, ['EC2 does not patch your OS automatically.', 'EC2 không tự động vá hệ điều hành của bạn.']],
        ],
      ),
    ],
    'well-architected': [
      quiz(
        'foundations.wa-pillar-az',
        ['aws.foundations.well-architected'],
        ['Running the database in a single AZ is mainly a risk for which pillar?', 'Chạy database trong một AZ duy nhất là rủi ro chủ yếu cho trụ cột nào?'],
        [
          ['a', ['Reliability', 'Độ tin cậy (Reliability)'], true, ['An AZ failure takes it down — reliability is about recovering from failure.', 'Sự cố một AZ là nó sập — độ tin cậy nói về việc phục hồi sau sự cố.']],
          ['b', ['Performance efficiency', 'Hiệu năng (Performance efficiency)'], false, ['Placement in one AZ does not make it slower.', 'Đặt trong một AZ không làm nó chậm đi.']],
          ['c', ['Sustainability', 'Bền vững (Sustainability)'], false, ['Sustainability is about resource and energy efficiency.', 'Bền vững nói về hiệu quả tài nguyên và năng lượng.']],
        ],
      ),
      quiz(
        'foundations.wa-tradeoff',
        ['aws.foundations.well-architected'],
        ['Adding a Multi-AZ standby to RDS improves reliability. Which pillar does it usually pay for?', 'Thêm standby Multi-AZ cho RDS cải thiện độ tin cậy. Nó thường phải trả giá ở trụ cột nào?'],
        [
          ['a', ['Cost optimisation — the instance cost roughly doubles', 'Tối ưu chi phí — chi phí instance tăng gần gấp đôi'], true, ['Pillars trade off; you decide which side wins based on business impact.', 'Các trụ cột đánh đổi lẫn nhau; bạn quyết định bên nào thắng dựa trên tác động tới business.']],
          ['b', ['Security', 'Bảo mật'], false, ['A standby does not weaken security.', 'Standby không làm giảm bảo mật.']],
          ['c', ['None — it is free', 'Không — nó miễn phí'], false, ['Multi-AZ bills a second instance and storage.', 'Multi-AZ tính tiền thêm một instance và storage.']],
        ],
      ),
      quiz(
        'foundations.wa-opex',
        ['aws.foundations.well-architected'],
        ['Which practices belong to Operational Excellence? (choose all that apply)', 'Những thực hành nào thuộc trụ cột Vận hành xuất sắc (Operational Excellence)? (chọn tất cả đáp án đúng)'],
        [
          ['a', ['Infrastructure as Code and small, reversible changes', 'Infrastructure as Code và thay đổi nhỏ, hoàn tác được'], true, ['Operations as code is a core design principle.', '"Vận hành dưới dạng code" là nguyên tắc thiết kế cốt lõi.']],
          ['b', ['Runbooks and post-incident reviews', 'Runbook và đánh giá sau sự cố'], true, ['Learn from every operational event.', 'Rút kinh nghiệm từ mọi sự kiện vận hành.']],
          ['c', ['Buying the largest instances to be safe', 'Mua instance lớn nhất cho chắc'], false, ['That is over-provisioning — a cost problem, not an operational practice.', 'Đó là cấp phát thừa — một vấn đề chi phí, không phải thực hành vận hành.']],
        ],
      ),
    ],
    'pricing-models': [
      quiz(
        'foundations.pricing-model-batch',
        ['aws.cost.purchase-options'],
        [
          'A nightly video-transcoding job can be interrupted and retried, and must be as cheap as possible. Which EC2 purchase option fits?',
          'Một job chuyển mã video chạy mỗi đêm, có thể bị ngắt và chạy lại, và cần rẻ nhất có thể. Lựa chọn mua EC2 nào phù hợp?',
        ],
        [
          ['a', ['Spot Instances', 'Spot Instances'], true, ['Yes — up to ~90% cheaper; interruptions are fine because the job retries.', 'Đúng — rẻ hơn tới ~90%; bị ngắt cũng không sao vì job sẽ chạy lại.']],
          ['b', ['On-Demand', 'On-Demand'], false, ['Works, but you pay full price for something that tolerates interruption.', 'Chạy được, nhưng bạn trả giá đầy đủ cho một việc vốn chịu được gián đoạn.']],
          ['c', ['3-year Savings Plan', 'Savings Plan 3 năm'], false, ['Commitments suit steady 24/7 usage, not a nightly batch.', 'Cam kết dài hạn hợp với tải đều 24/7, không hợp với batch chạy mỗi đêm.']],
        ],
      ),
      quiz(
        'foundations.pricing-model-steady',
        ['aws.cost.purchase-options'],
        [
          'Your production API has run on 10 instances 24/7 for a year and will keep doing so. Biggest easy saving?',
          'API production của bạn đã chạy trên 10 instance 24/7 suốt một năm và sẽ còn tiếp tục như vậy. Cách tiết kiệm lớn và dễ nhất?',
        ],
        [
          ['a', ['Commit with a Compute Savings Plan (1 or 3 years)', 'Cam kết bằng Compute Savings Plan (1 hoặc 3 năm)'], true, ['Yes — steady, predictable usage is exactly what commitments discount (~28–66%).', 'Đúng — tải đều và dự đoán được chính là thứ được giảm giá khi cam kết (~28–66%).']],
          ['b', ['Move everything to Spot', 'Chuyển hết sang Spot'], false, ['Production APIs usually cannot accept random interruptions.', 'API production thường không chấp nhận bị ngắt ngẫu nhiên.']],
          ['c', ['Stay on On-Demand for flexibility', 'Giữ On-Demand cho linh hoạt'], false, ['You are paying a premium for flexibility you are not using.', 'Bạn đang trả thêm tiền cho sự linh hoạt mà mình không dùng tới.']],
        ],
      ),
      estimate(
        'foundations.ec2-monthly',
        ['aws.cost.estimation'],
        [
          'A t3.medium costs $0.0416/hour On-Demand. How much do 2 of them cost for a 730-hour month (USD)?',
          'Một t3.medium giá $0.0416/giờ On-Demand. 2 instance chạy cả tháng 730 giờ tốn bao nhiêu (USD)?',
        ],
        'USD',
        60.74,
        0.05,
        ['2 × $0.0416 × 730 h ≈ $60.74. AWS uses 730 hours as a "month" in its calculator.', '2 × $0.0416 × 730 giờ ≈ $60.74. AWS dùng 730 giờ làm một "tháng" trong máy tính giá.'],
        [['Price per hour × number of instances × hours in a month.', 'Giá mỗi giờ × số instance × số giờ trong tháng.']],
      ),
      estimate(
        'foundations.egress',
        ['aws.cost.data-transfer'],
        [
          'Your API sends 500 GB/month to users on the internet from an ALB in us-east-1 ($0.09/GB). What does that data transfer cost per month (USD)?',
          'API của bạn gửi 500 GB/tháng tới người dùng trên internet từ một ALB ở us-east-1 ($0.09/GB). Chi phí data transfer đó mỗi tháng là bao nhiêu (USD)?',
        ],
        'USD',
        45,
        0.05,
        ['500 × $0.09 = $45. Data IN is free; data OUT to the internet is not — it is often the line people forget.', '500 × $0.09 = $45. Data VÀO miễn phí; data RA internet thì không — đây thường là dòng mọi người hay quên.'],
      ),
    ],
  },

  iam: {
    'iam-basics': [
      quiz(
        'iam.role-for-ec2',
        ['aws.iam.roles'],
        ['An app on EC2 needs to read from an S3 bucket. Best way to give it credentials?', 'Một app trên EC2 cần đọc từ một S3 bucket. Cách tốt nhất để cấp quyền cho nó?'],
        [
          ['a', ['Attach an IAM role to the instance (instance profile)', 'Gắn một IAM role vào instance (instance profile)'], true, ['Yes — temporary credentials are delivered and rotated automatically; nothing secret is stored on disk.', 'Đúng — credential tạm thời được cấp và xoay vòng tự động; không có bí mật nào nằm trên ổ đĩa.']],
          ['b', ['Create an IAM user and put its access keys in a config file', 'Tạo một IAM user và để access key của nó trong file cấu hình'], false, ['Long-lived keys on servers leak (git, backups, logs). Avoid them.', 'Key dài hạn trên server rất dễ lộ (git, backup, log). Hãy tránh.']],
          ['c', ['Use the root account keys', 'Dùng key của tài khoản root'], false, ['Never use root credentials for applications.', 'Không bao giờ dùng credential của root cho ứng dụng.']],
        ],
      ),
      quiz(
        'iam.least-privilege',
        ['aws.iam.least-privilege'],
        [
          'A Lambda only needs to put items into one DynamoDB table. Which policy follows least privilege?',
          'Một Lambda chỉ cần ghi item vào một bảng DynamoDB. Policy nào tuân theo least privilege?',
        ],
        [
          ['a', ['Allow dynamodb:PutItem on arn:aws:dynamodb:…:table/Orders', 'Allow dynamodb:PutItem trên arn:aws:dynamodb:…:table/Orders'], true, ['Exactly the action and the resource needed — nothing more.', 'Đúng hành động và tài nguyên cần thiết — không hơn.']],
          ['b', ['Allow dynamodb:* on *', 'Allow dynamodb:* trên *'], false, ['It could delete every table in the account if compromised.', 'Nếu bị chiếm quyền, nó có thể xoá mọi bảng trong account.']],
          ['c', ['AdministratorAccess', 'AdministratorAccess'], false, ['Far too broad for a function.', 'Quá rộng cho một function.']],
        ],
      ),
      quiz(
        'iam.explicit-deny',
        ['aws.iam.policy-evaluation'],
        [
          'A user has a policy allowing s3:* on a bucket, and their group has a policy that explicitly DENIES s3:DeleteObject on it. Can they delete objects?',
          'Một user có policy cho phép s3:* trên một bucket, và group của họ có policy TỪ CHỐI rõ ràng (explicit Deny) s3:DeleteObject trên bucket đó. Họ có xoá được object không?',
        ],
        [
          ['a', ['No — an explicit Deny always wins', 'Không — explicit Deny luôn thắng'], true, ['Correct: explicit Deny > Allow > implicit (default) deny.', 'Đúng: explicit Deny > Allow > implicit deny (mặc định).']],
          ['b', ['Yes — user policies override group policies', 'Có — policy của user ghi đè policy của group'], false, ['There is no override order between user and group policies; all are evaluated together.', 'Không có thứ tự ghi đè giữa policy của user và group; tất cả được đánh giá cùng nhau.']],
          ['c', ['Yes — s3:* is more specific', 'Có — s3:* cụ thể hơn'], false, ['Specificity does not matter; any matching explicit Deny wins.', 'Độ cụ thể không quan trọng; chỉ cần có explicit Deny khớp là nó thắng.']],
        ],
      ),
      quiz(
        'iam.root-account',
        ['aws.iam.root'],
        ['What should you do with the AWS account root user? (choose all that apply)', 'Bạn nên làm gì với user root của tài khoản AWS? (chọn tất cả đáp án đúng)'],
        [
          ['a', ['Enable MFA on it', 'Bật MFA cho nó'], true, ['Yes — the root user can do anything, including closing the account.', 'Đúng — user root làm được mọi thứ, kể cả đóng tài khoản.']],
          ['b', ['Delete or never create root access keys', 'Xoá hoặc không bao giờ tạo access key cho root'], true, ['Yes — programmatic root access is a huge risk.', 'Đúng — truy cập root qua lập trình là rủi ro cực lớn.']],
          ['c', ['Use it for daily work', 'Dùng nó cho công việc hằng ngày'], false, ['Use IAM Identity Center or IAM roles for daily work.', 'Hãy dùng IAM Identity Center hoặc IAM role cho công việc hằng ngày.']],
        ],
      ),
    ],
  },

  networking: {
    'vpc-basics': [
      quiz(
        'networking.private-db',
        ['aws.networking.subnets'],
        ['Where should an RDS database for a public web app live?', 'Database RDS của một web app public nên đặt ở đâu?'],
        [
          ['a', ['A private subnet, reachable only from the app tier security group', 'Một private subnet, chỉ truy cập được từ security group của tầng app'], true, ['Yes — no route from the internet, and the SG only allows the app servers.', 'Đúng — không có đường từ internet vào, và SG chỉ cho phép các app server.']],
          ['b', ['A public subnet with a strong password', 'Một public subnet với mật khẩu mạnh'], false, ['Exposing the DB endpoint to the internet invites brute force and exploits.', 'Phơi endpoint DB ra internet là mời gọi brute force và khai thác lỗ hổng.']],
          ['c', ['Anywhere — RDS is encrypted', 'Đâu cũng được — RDS đã được mã hoá'], false, ['Encryption at rest does not stop network access.', 'Mã hoá khi lưu trữ không ngăn được truy cập qua mạng.']],
        ],
      ),
      quiz(
        'networking.sg-vs-nacl',
        ['aws.networking.security-groups'],
        ['Which statement about Security Groups vs Network ACLs is true?', 'Phát biểu nào về Security Group và Network ACL là đúng?'],
        [
          ['a', ['Security Groups are stateful; NACLs are stateless', 'Security Group là stateful; NACL là stateless'], true, ['Return traffic is automatically allowed by an SG; with a NACL you must allow both directions (incl. ephemeral ports).', 'SG tự cho phép traffic phản hồi; với NACL bạn phải mở cả hai chiều (kể cả ephemeral port).']],
          ['b', ['NACLs attach to instances, SGs to subnets', 'NACL gắn vào instance, SG gắn vào subnet'], false, ['It is the opposite: SGs attach to ENIs/instances, NACLs to subnets.', 'Ngược lại: SG gắn vào ENI/instance, NACL gắn vào subnet.']],
          ['c', ['Security Groups support explicit DENY rules', 'Security Group hỗ trợ rule DENY rõ ràng'], false, ['SGs only have allow rules. NACLs have numbered allow and deny rules.', 'SG chỉ có rule allow. NACL có rule allow và deny được đánh số.']],
        ],
      ),
      quiz(
        'networking.private-egress',
        ['aws.networking.nat'],
        [
          'Instances in a private subnet must download OS updates from the internet, but must not be reachable from it. What do you add?',
          'Instance trong private subnet cần tải bản cập nhật hệ điều hành từ internet, nhưng không được để internet truy cập ngược vào. Bạn thêm gì?',
        ],
        [
          ['a', ['A NAT Gateway in a public subnet + a route 0.0.0.0/0 → NAT in the private route table', 'Một NAT Gateway ở public subnet + route 0.0.0.0/0 → NAT trong route table của private subnet'], true, ['Outbound-only internet access.', 'Truy cập internet chỉ theo chiều ra.']],
          ['b', ['Attach public IPs to the instances', 'Gắn IP public cho các instance'], false, ['That makes them reachable (and needs an IGW route) — no longer private.', 'Như vậy chúng sẽ bị truy cập được (và cần route qua IGW) — không còn private nữa.']],
          ['c', ['A Gateway VPC Endpoint', 'Một Gateway VPC Endpoint'], false, ['Gateway endpoints only reach S3 and DynamoDB, not the internet.', 'Gateway endpoint chỉ tới được S3 và DynamoDB, không ra internet.']],
        ],
      ),
    ],
    'nat-cost-trap': [
      estimate(
        'networking.nat-gb',
        ['aws.networking.nat', 'aws.cost.data-transfer'],
        [
          'Private instances pull 2 TB (2,000 GB) per month from S3 through a NAT Gateway that charges $0.045 per GB processed. What is the data-processing cost per month (USD)?',
          'Các instance private kéo 2 TB (2.000 GB) mỗi tháng từ S3 qua một NAT Gateway tính $0.045 mỗi GB xử lý. Chi phí xử lý dữ liệu mỗi tháng là bao nhiêu (USD)?',
        ],
        'USD',
        90,
        0.05,
        ['2,000 × $0.045 = $90/month — for traffic that could be free through a Gateway VPC Endpoint.', '2.000 × $0.045 = $90/tháng — cho một lượng traffic lẽ ra có thể miễn phí qua Gateway VPC Endpoint.'],
      ),
      quiz(
        'networking.endpoint-scope',
        ['aws.networking.vpc-endpoints'],
        ['Which services can you reach through a free Gateway VPC Endpoint?', 'Bạn tới được những dịch vụ nào qua Gateway VPC Endpoint miễn phí?'],
        [
          ['a', ['Amazon S3 and Amazon DynamoDB', 'Amazon S3 và Amazon DynamoDB'], true, ['Only these two use gateway endpoints; other services use (paid) interface endpoints.', 'Chỉ hai dịch vụ này dùng gateway endpoint; các dịch vụ khác dùng interface endpoint (có phí).']],
          ['b', ['Any AWS service', 'Mọi dịch vụ AWS'], false, ['Most services need an interface endpoint (PrivateLink), billed per hour and per GB.', 'Phần lớn dịch vụ cần interface endpoint (PrivateLink), tính phí theo giờ và theo GB.']],
          ['c', ['Any website on the internet', 'Mọi website trên internet'], false, ['Endpoints only reach AWS (or PrivateLink) services, never the public internet.', 'Endpoint chỉ tới được dịch vụ AWS (hoặc PrivateLink), không bao giờ ra internet công cộng.']],
        ],
      ),
      C.natTrap,
    ],
  },

  compute: {
    'choosing-compute': [
      quiz(
        'compute.choose-batch-long',
        ['aws.compute.choosing'],
        [
          'A data job runs for ~45 minutes, a few times a day, in a container. Which compute fits best?',
          'Một job dữ liệu chạy ~45 phút, vài lần mỗi ngày, trong một container. Compute nào phù hợp nhất?',
        ],
        [
          ['a', ['ECS on Fargate (or AWS Batch)', 'ECS trên Fargate (hoặc AWS Batch)'], true, ['Containers without servers, billed per second, no 15-minute limit.', 'Container mà không cần server, tính tiền theo giây, không có giới hạn 15 phút.']],
          ['b', ['Lambda', 'Lambda'], false, ['Lambda has a hard 15-minute timeout.', 'Lambda có giới hạn cứng 15 phút.']],
          ['c', ['An EC2 instance running 24/7', 'Một instance EC2 chạy 24/7'], false, ['You would pay for ~22 idle hours a day.', 'Bạn sẽ trả tiền cho ~22 giờ ngồi không mỗi ngày.']],
        ],
      ),
      quiz(
        'compute.choose-spiky-api',
        ['aws.compute.choosing'],
        [
          'A new API gets almost no traffic at night and unpredictable bursts during the day. The team is two developers. Best starting point?',
          'Một API mới gần như không có traffic ban đêm và có những đợt tăng khó đoán ban ngày. Team chỉ có hai developer. Điểm khởi đầu tốt nhất?',
        ],
        [
          ['a', ['API Gateway + Lambda', 'API Gateway + Lambda'], true, ['Scales to zero, absorbs bursts, almost nothing to operate.', 'Scale về 0, hấp thụ được các đợt tăng, gần như không có gì phải vận hành.']],
          ['b', ['An EKS cluster', 'Một cluster EKS'], false, ['$73/month before any workload, and Kubernetes is heavy for two people.', '$73/tháng khi chưa chạy workload nào, và Kubernetes là quá nặng cho hai người.']],
          ['c', ['Large EC2 instances sized for the biggest burst', 'Instance EC2 lớn, đủ cho đợt tăng lớn nhất'], false, ['Mostly idle and expensive.', 'Phần lớn thời gian ngồi không và đắt.']],
        ],
      ),
      quiz(
        'compute.lambda-steady-high',
        ['aws.compute.lambda', 'aws.cost.estimation'],
        [
          'An API serves a steady 3,000 req/s, 24/7, each request ~100 ms. A teammate says "Lambda is always cheapest because it is pay-per-use". True?',
          'Một API phục vụ đều 3.000 req/s, 24/7, mỗi request ~100 ms. Một đồng nghiệp nói "Lambda luôn rẻ nhất vì trả theo mức dùng". Đúng không?',
        ],
        [
          ['a', ['No — at steady high load, containers/EC2 are usually cheaper', 'Không — với tải cao và đều, container/EC2 thường rẻ hơn'], true, ['~7.9 billion invocations/month: request fees plus GB-seconds add up to far more than a right-sized fleet. Try it in the Lab.', '~7,9 tỉ lượt gọi/tháng: phí request cộng GB-giây vượt xa một fleet có kích thước hợp lý. Hãy thử trong Lab.']],
          ['b', ['Yes — you never pay for idle', 'Đúng — bạn không bao giờ trả tiền cho lúc rảnh'], false, ['At steady load there is no idle time to save; you pay a premium per unit of compute.', 'Với tải đều thì không có thời gian rảnh nào để tiết kiệm; bạn trả giá cao hơn cho mỗi đơn vị compute.']],
        ],
      ),
      estimate(
        'compute.lambda-cost',
        ['aws.compute.lambda', 'aws.cost.estimation'],
        [
          'A Lambda gets 3 million requests/month, runs 200 ms each with 1,024 MB. Price: $0.20 per million requests + $0.0000166667 per GB-second. Monthly cost (USD)?',
          'Một Lambda nhận 3 triệu request/tháng, mỗi lần chạy 200 ms với 1.024 MB. Giá: $0.20 mỗi triệu request + $0.0000166667 mỗi GB-giây. Chi phí mỗi tháng (USD)?',
        ],
        'USD',
        10.6,
        0.1,
        ['Requests: 3 × $0.20 = $0.60. Compute: 3,000,000 × 0.2 s × 1 GB = 600,000 GB-s × $0.0000166667 ≈ $10.00. Total ≈ $10.60.', 'Request: 3 × $0.20 = $0.60. Compute: 3.000.000 × 0,2 s × 1 GB = 600.000 GB-giây × $0.0000166667 ≈ $10.00. Tổng ≈ $10.60.'],
        [['GB-seconds = invocations × duration (s) × memory (GB).', 'GB-giây = số lượt gọi × thời gian chạy (giây) × bộ nhớ (GB).']],
      ),
      C.sideProject,
    ],
    'scaling-and-ha': [
      quiz(
        'compute.asg-multi-az',
        ['aws.compute.autoscaling', 'aws.reliability.multi-az'],
        [
          'Your Auto Scaling group has min = 2 instances, both in AZ-a. What happens if AZ-a fails?',
          'Auto Scaling group của bạn có min = 2 instance, cả hai đều ở AZ-a. Điều gì xảy ra nếu AZ-a gặp sự cố?',
        ],
        [
          ['a', ['Full outage until new instances launch elsewhere', 'Sập hoàn toàn cho tới khi instance mới được bật ở nơi khác'], true, ['Two instances in one AZ protect against an instance failure, not an AZ failure. Spread the group across ≥ 2 AZs.', 'Hai instance trong một AZ chỉ bảo vệ khỏi lỗi instance, không phải lỗi AZ. Hãy trải group trên ≥ 2 AZ.']],
          ['b', ['Nothing — two instances are redundant', 'Không sao — hai instance là đã dự phòng'], false, ['Redundant within the same failure domain only.', 'Chỉ dự phòng trong cùng một vùng lỗi.']],
        ],
      ),
      estimate(
        'compute.asg-size',
        ['aws.compute.autoscaling'],
        [
          'Peak traffic is 3,000 req/s. One instance handles 300 req/s and Auto Scaling targets 70% utilisation. How many instances will run at peak?',
          'Đỉnh traffic là 3.000 req/s. Mỗi instance chịu được 300 req/s và Auto Scaling nhắm mức tải 70%. Lúc cao điểm sẽ có bao nhiêu instance?',
        ],
        'instances',
        15,
        0.001,
        ['3,000 ÷ (300 × 0.7) = 14.3 → round up to 15. The 30% headroom absorbs bursts while new instances start.', '3.000 ÷ (300 × 0,7) = 14,3 → làm tròn lên 15. Phần dư 30% hấp thụ các đợt tăng trong lúc instance mới khởi động.'],
        [['Divide peak load by the load you allow per instance (capacity × target).', 'Chia tải đỉnh cho tải cho phép mỗi instance (sức chứa × mục tiêu).']],
      ),
      C.singleServer,
    ],
  },

  storage: {
    's3-storage-classes': [
      quiz(
        'storage.class-logs',
        ['aws.storage.s3-classes'],
        [
          'Application logs are read often in the first week, rarely after 30 days, and must be kept 1 year. Cheapest sensible setup?',
          'Log ứng dụng được đọc thường xuyên trong tuần đầu, hiếm khi đọc sau 30 ngày, và phải giữ 1 năm. Cách thiết lập hợp lý rẻ nhất?',
        ],
        [
          ['a', ['S3 Standard + a lifecycle rule moving objects to colder classes after 30 days and expiring them after 365', 'S3 Standard + lifecycle rule chuyển object sang class lạnh hơn sau 30 ngày và xoá sau 365 ngày'], true, ['Lifecycle rules automate tiering and deletion.', 'Lifecycle rule tự động chuyển tầng lưu trữ và xoá.']],
          ['b', ['Glacier Deep Archive from day one', 'Glacier Deep Archive ngay từ ngày đầu'], false, ['Retrieval takes hours and costs money — bad for logs read in the first week.', 'Truy xuất mất hàng giờ và tốn tiền — không hợp với log cần đọc trong tuần đầu.']],
          ['c', ['EBS volumes', 'Ổ EBS'], false, ['Far more expensive per GB and tied to an instance.', 'Đắt hơn nhiều trên mỗi GB và gắn với một instance.']],
        ],
      ),
      quiz(
        'storage.ia-hot-data',
        ['aws.storage.s3-classes'],
        [
          'Someone moved frequently-downloaded product images to S3 Standard-IA "to save money". What likely happens?',
          'Ai đó chuyển ảnh sản phẩm được tải về thường xuyên sang S3 Standard-IA "để tiết kiệm". Điều gì có khả năng xảy ra?',
        ],
        [
          ['a', ['The bill may go UP because IA charges per GB retrieved', 'Hoá đơn có thể TĂNG vì IA tính phí theo GB truy xuất'], true, ['IA is cheaper to store but charges retrieval fees — wrong for hot data.', 'IA lưu rẻ hơn nhưng tính phí truy xuất — sai lựa chọn cho dữ liệu nóng.']],
          ['b', ['Images load much slower', 'Ảnh tải chậm hơn nhiều'], false, ['Standard-IA has the same millisecond latency as Standard.', 'Standard-IA có cùng độ trễ mili giây như Standard.']],
        ],
      ),
      estimate(
        'storage.glacier-saving',
        ['aws.storage.s3-classes', 'aws.cost.estimation'],
        [
          'You move 1,000 GB of old backups from S3 Standard ($0.023/GB-month) to Glacier Instant Retrieval ($0.004/GB-month). Monthly storage saving (USD)?',
          'Bạn chuyển 1.000 GB backup cũ từ S3 Standard ($0.023/GB-tháng) sang Glacier Instant Retrieval ($0.004/GB-tháng). Tiết kiệm được bao nhiêu tiền lưu trữ mỗi tháng (USD)?',
        ],
        'USD',
        19,
        0.05,
        ['1,000 × ($0.023 − $0.004) = $19/month. Worth it for rarely-read data — but each GB retrieved costs $0.03.', '1.000 × ($0.023 − $0.004) = $19/tháng. Đáng làm với dữ liệu hiếm khi đọc — nhưng mỗi GB truy xuất tốn $0.03.'],
      ),
    ],
  },

  databases: {
    'choosing-a-database': [
      quiz(
        'databases.choose-orders-reporting',
        ['aws.databases.choosing'],
        [
          'An e-commerce back office needs orders, customers and products with joins, transactions and ad-hoc reports. Best fit?',
          'Một hệ thống back office thương mại điện tử cần đơn hàng, khách hàng và sản phẩm với join, transaction và báo cáo tuỳ ý. Lựa chọn phù hợp nhất?',
        ],
        [
          ['a', ['RDS / Aurora (PostgreSQL or MySQL)', 'RDS / Aurora (PostgreSQL hoặc MySQL)'], true, ['Relational data, joins and ad-hoc queries are what SQL databases are for.', 'Dữ liệu quan hệ, join và truy vấn tuỳ ý chính là việc của database SQL.']],
          ['b', ['DynamoDB', 'DynamoDB'], false, ['Possible, but every new report/query pattern needs new indexes or an export pipeline.', 'Làm được, nhưng mỗi báo cáo/mẫu truy vấn mới lại cần thêm index hoặc một pipeline export.']],
          ['c', ['ElastiCache', 'ElastiCache'], false, ['A cache, not a system of record.', 'Đây là cache, không phải nơi lưu dữ liệu gốc.']],
        ],
      ),
      quiz(
        'databases.choose-sessions',
        ['aws.databases.choosing', 'aws.databases.dynamodb'],
        [
          'A mobile game stores player sessions by player id: millions of users, unpredictable spikes, always looked up by key. Best fit?',
          'Một game mobile lưu session người chơi theo player id: hàng triệu user, tăng đột biến khó đoán, luôn tra cứu theo key. Lựa chọn phù hợp nhất?',
        ],
        [
          ['a', ['DynamoDB (on-demand)', 'DynamoDB (on-demand)'], true, ['Key-value access, no servers, scales with spikes, single-digit ms.', 'Truy cập key-value, không có server, scale theo các đợt tăng, độ trễ vài ms.']],
          ['b', ['A single large RDS instance', 'Một instance RDS lớn duy nhất'], false, ['Write throughput is capped by one primary; you must size for the spike.', 'Throughput ghi bị giới hạn bởi một primary duy nhất; bạn phải chọn cỡ theo đợt tăng vọt.']],
          ['c', ['S3', 'S3'], false, ['Object storage — not built for small, frequent key updates at low latency.', 'Lưu trữ object — không sinh ra cho việc cập nhật key nhỏ, thường xuyên với độ trễ thấp.']],
        ],
      ),
      quiz(
        'databases.multi-az-vs-replica',
        ['aws.databases.rds'],
        ['What is the main purpose of RDS Multi-AZ (standby)?', 'Mục đích chính của RDS Multi-AZ (standby) là gì?'],
        [
          ['a', ['High availability: automatic failover if the primary or its AZ fails', 'Độ sẵn sàng cao: tự failover khi primary hoặc AZ của nó gặp sự cố'], true, ['The standby is synchronous and (in classic Multi-AZ) does not serve reads.', 'Standby được nhân bản đồng bộ và (ở Multi-AZ kiểu cũ) không phục vụ việc đọc.']],
          ['b', ['Scaling reads', 'Scale việc đọc'], false, ['That is what read replicas are for (asynchronous).', 'Đó là việc của read replica (bất đồng bộ).']],
          ['c', ['Backups to another Region', 'Backup sang Region khác'], false, ['Use cross-Region snapshots or replicas for that.', 'Việc đó dùng snapshot hoặc replica sang Region khác.']],
        ],
      ),
      estimate(
        'databases.dynamo-writes',
        ['aws.databases.dynamodb', 'aws.cost.estimation'],
        [
          'DynamoDB on-demand charges $0.625 per million write request units. Your app writes 50 million small items (≤ 1 KB) per month. Write cost (USD)?',
          'DynamoDB on-demand tính $0.625 mỗi triệu write request unit. App của bạn ghi 50 triệu item nhỏ (≤ 1 KB) mỗi tháng. Chi phí ghi là bao nhiêu (USD)?',
        ],
        'USD',
        31.25,
        0.05,
        ['50 × $0.625 = $31.25. Items over 1 KB use one WRU per started KB, so item size matters.', '50 × $0.625 = $31.25. Item lớn hơn 1 KB tốn một WRU cho mỗi KB bắt đầu, nên kích thước item rất quan trọng.'],
      ),
    ],
    'scaling-reads': [
      estimate(
        'databases.cache-hit',
        ['aws.caching.elasticache'],
        [
          'Your app serves 1,000 reads/s. You add a cache with a 90% hit ratio. How many reads/s still reach the database?',
          'App của bạn phục vụ 1.000 lượt đọc/giây. Bạn thêm một cache có hit ratio 90%. Còn bao nhiêu lượt đọc/giây tới database?',
        ],
        'req/s',
        100,
        0.05,
        ['Only misses reach the DB: 1,000 × (1 − 0.9) = 100 reads/s — a 10× reduction.', 'Chỉ miss mới tới DB: 1.000 × (1 − 0,9) = 100 lượt đọc/giây — giảm 10 lần.'],
      ),
      quiz(
        'databases.replica-or-cache',
        ['aws.databases.read-scaling'],
        [
          'Reads must always show the latest bank balance, and queries are complex joins. How do you scale reads?',
          'Lượt đọc luôn phải hiển thị số dư tài khoản mới nhất, và truy vấn là các join phức tạp. Bạn scale việc đọc thế nào?',
        ],
        [
          ['a', ['Bigger primary / Aurora with careful use of replicas for non-critical reads', 'Primary lớn hơn / Aurora, chỉ dùng replica cho các lượt đọc không quan trọng'], true, ['Strong consistency rules out caches and async replicas for those reads.', 'Yêu cầu nhất quán mạnh loại trừ cache và replica bất đồng bộ cho những lượt đọc đó.']],
          ['b', ['Cache balances in ElastiCache for 5 minutes', 'Cache số dư trong ElastiCache 5 phút'], false, ['Users would see stale balances.', 'Người dùng sẽ thấy số dư cũ.']],
        ],
      ),
      C.readHeavy,
    ],
  },

  'caching-cdn': {
    'cdn-and-caching': [
      quiz(
        'caching.cdn-what',
        ['aws.edge.cloudfront'],
        ['Which content benefits LEAST from CloudFront caching?', 'Loại nội dung nào được lợi ÍT NHẤT từ cache của CloudFront?'],
        [
          ['a', ['A personalised account page different for every user', 'Một trang tài khoản cá nhân hoá, khác nhau với từng user'], true, ['Uncacheable — every request goes to the origin anyway (CloudFront still helps with TLS/connection reuse).', 'Không cache được — request nào cũng phải về origin (CloudFront vẫn giúp phần TLS/tái sử dụng kết nối).']],
          ['b', ['Product images', 'Ảnh sản phẩm'], false, ['Highly cacheable.', 'Rất dễ cache.']],
          ['c', ['JavaScript/CSS bundles', 'Bundle JavaScript/CSS'], false, ['Perfect for long cache TTLs with versioned file names.', 'Hoàn hảo cho TTL cache dài khi tên file có version.']],
        ],
      ),
      quiz(
        'caching.stampede',
        ['aws.caching.patterns'],
        [
          'Your homepage cache entry expires and 5,000 requests miss at the same moment, overloading the DB. What is this called and a common fix?',
          'Mục cache của trang chủ hết hạn và 5.000 request cùng miss một lúc, làm quá tải DB. Hiện tượng này gọi là gì và cách sửa phổ biến?',
        ],
        [
          ['a', ['Cache stampede — use request coalescing / locking or stale-while-revalidate', 'Cache stampede — gộp request / khoá, hoặc stale-while-revalidate'], true, ['Let one request refresh the value while others wait or get the stale copy.', 'Để một request làm mới giá trị trong khi các request khác chờ hoặc nhận bản cũ.']],
          ['b', ['Cold start — use provisioned concurrency', 'Cold start — dùng provisioned concurrency'], false, ['That is a Lambda concept.', 'Đó là khái niệm của Lambda.']],
        ],
      ),
      C.cdnOffload,
    ],
  },

  'load-balancing-dns': {
    'load-balancers': [
      quiz(
        'lb.path-routing',
        ['aws.networking.load-balancers'],
        [
          'You need /api/* to go to one service and /images/* to another, with HTTPS termination. Which load balancer?',
          'Bạn cần /api/* đi tới một service và /images/* tới service khác, có kết thúc HTTPS. Dùng load balancer nào?',
        ],
        [
          ['a', ['Application Load Balancer', 'Application Load Balancer'], true, ['Layer 7: path/host-based routing and TLS termination.', 'Tầng 7: routing theo path/host và kết thúc TLS.']],
          ['b', ['Network Load Balancer', 'Network Load Balancer'], false, ['Layer 4 — it does not look at URL paths.', 'Tầng 4 — không nhìn vào đường dẫn URL.']],
        ],
      ),
      quiz(
        'lb.static-ip',
        ['aws.networking.load-balancers'],
        [
          'A banking partner must allow-list your IP addresses, and the protocol is raw TCP. Which load balancer?',
          'Một đối tác ngân hàng cần allow-list địa chỉ IP của bạn, và giao thức là TCP thuần. Dùng load balancer nào?',
        ],
        [
          ['a', ['Network Load Balancer (static/Elastic IPs per AZ)', 'Network Load Balancer (IP tĩnh/Elastic IP cho mỗi AZ)'], true, ['NLB supports fixed IPs and any TCP/UDP protocol.', 'NLB hỗ trợ IP cố định và mọi giao thức TCP/UDP.']],
          ['b', ['Application Load Balancer', 'Application Load Balancer'], false, ['ALB IPs change and it is HTTP-only.', 'IP của ALB thay đổi và nó chỉ dùng cho HTTP.']],
        ],
      ),
      quiz(
        'lb.apigw-vs-alb',
        ['aws.networking.load-balancers', 'aws.cost.estimation'],
        [
          'A Lambda API gets ~2 requests/second. Fronting it with API Gateway (HTTP API) vs an ALB — which is cheaper?',
          'Một API Lambda nhận ~2 request/giây. Đặt API Gateway (HTTP API) hay ALB phía trước — cái nào rẻ hơn?',
        ],
        [
          ['a', ['API Gateway — ~5 M requests ≈ $5/month, no hourly fee', 'API Gateway — ~5 triệu request ≈ $5/tháng, không có phí theo giờ'], true, ['An ALB costs ~$16/month just to exist. At high steady traffic the answer flips.', 'Chỉ riêng việc tồn tại, một ALB đã tốn ~$16/tháng. Với traffic cao và đều thì đáp án sẽ đảo ngược.']],
          ['b', ['ALB — load balancers are always cheaper', 'ALB — load balancer luôn rẻ hơn'], false, ['Not at low traffic: the hourly fee dominates.', 'Không đúng khi traffic thấp: phí theo giờ chiếm phần lớn.']],
        ],
      ),
    ],
  },

  messaging: {
    'queues-and-topics': [
      quiz(
        'messaging.fanout',
        ['aws.messaging.sns'],
        [
          'When an order is placed, the billing, shipping and email services must ALL receive it, each processing at its own pace. Which pattern?',
          'Khi có đơn hàng mới, các service thanh toán, giao hàng và email đều phải nhận được nó, mỗi service xử lý theo nhịp riêng. Dùng mẫu nào?',
        ],
        [
          ['a', ['SNS topic → one SQS queue per service (fan-out)', 'SNS topic → mỗi service một SQS queue (fan-out)'], true, ['Every queue gets a copy; each consumer is decoupled and can retry independently.', 'Queue nào cũng nhận một bản sao; mỗi consumer được tách rời và có thể retry độc lập.']],
          ['b', ['One SQS queue shared by the three services', 'Một SQS queue dùng chung cho ba service'], false, ['Consumers of one queue compete — each message goes to only one of them.', 'Các consumer của một queue cạnh tranh nhau — mỗi message chỉ tới một trong số họ.']],
        ],
      ),
      quiz(
        'messaging.idempotent',
        ['aws.messaging.sqs'],
        [
          'SQS standard queues deliver "at least once". What must your consumer do?',
          'SQS standard queue gửi message "ít nhất một lần". Consumer của bạn phải làm gì?',
        ],
        [
          ['a', ['Be idempotent — processing the same message twice must be safe', 'Idempotent — xử lý cùng một message hai lần vẫn phải an toàn'], true, ['E.g. use the order id as a key so a duplicate does not charge twice.', 'Vd dùng order id làm key để message trùng không bị trừ tiền hai lần.']],
          ['b', ['Nothing — duplicates never happen', 'Không cần làm gì — không bao giờ có message trùng'], false, ['They are rare but possible (and also happen on visibility-timeout expiry).', 'Hiếm nhưng vẫn có thể xảy ra (và cũng xảy ra khi visibility timeout hết hạn).']],
        ],
      ),
      quiz(
        'messaging.kinesis-when',
        ['aws.messaging.streams'],
        [
          'Clickstream events (50k/s) must be processed in order per user and replayed by several analytics consumers. Best fit?',
          'Sự kiện clickstream (50 nghìn/giây) phải được xử lý đúng thứ tự theo từng user và được nhiều consumer phân tích phát lại. Lựa chọn phù hợp nhất?',
        ],
        [
          ['a', ['Kinesis Data Streams (or MSK/Kafka)', 'Kinesis Data Streams (hoặc MSK/Kafka)'], true, ['Ordered shards by partition key, retention and replay, multiple consumers.', 'Shard có thứ tự theo partition key, có lưu giữ và phát lại, nhiều consumer.']],
          ['b', ['SQS standard', 'SQS standard'], false, ['No ordering guarantee and no replay; one consumer group.', 'Không đảm bảo thứ tự và không phát lại được; chỉ một nhóm consumer.']],
        ],
      ),
      C.flashSale,
    ],
  },

  observability: {
    'slo-error-budget': [
      estimate(
        'observability.budget-999',
        ['aws.observability.slo'],
        ['An SLO of 99.9% over a 30-day month allows how many minutes of downtime?', 'SLO 99,9% trong một tháng 30 ngày cho phép bao nhiêu phút downtime?'],
        'min',
        43.2,
        0.05,
        ['30 × 24 × 60 = 43,200 minutes × 0.1% = 43.2 minutes. That is your error budget.', '30 × 24 × 60 = 43.200 phút × 0,1% = 43,2 phút. Đó là error budget của bạn.'],
      ),
      estimate(
        'observability.budget-9999',
        ['aws.observability.slo'],
        ['And for 99.99% (four nines) over 30 days?', 'Còn 99,99% (bốn số 9) trong 30 ngày thì sao?'],
        'min',
        4.32,
        0.05,
        ['43,200 × 0.01% = 4.32 minutes — each extra nine is 10× harder (and usually far more expensive).', '43.200 × 0,01% = 4,32 phút — mỗi số 9 thêm vào khó hơn 10 lần (và thường đắt hơn rất nhiều).'],
      ),
      quiz(
        'observability.sli',
        ['aws.observability.slo'],
        ['Which is a good SLI (service level indicator) for a web API?', 'Đâu là một SLI (chỉ số mức dịch vụ) tốt cho một web API?'],
        [
          ['a', ['% of requests that succeed in under 300 ms', '% request thành công trong vòng 300 ms'], true, ['Measured from the user’s point of view, as a ratio.', 'Đo từ góc nhìn người dùng, dưới dạng tỉ lệ.']],
          ['b', ['CPU utilisation of the servers', 'Mức dùng CPU của server'], false, ['Useful for capacity, but users do not feel CPU — they feel errors and latency.', 'Hữu ích cho việc tính dung lượng, nhưng người dùng không cảm nhận CPU — họ cảm nhận lỗi và độ trễ.']],
        ],
      ),
    ],
  },

  'reliability-dr': {
    'availability-math': [
      estimate(
        'reliability.serial',
        ['aws.reliability.availability-math'],
        [
          'A request passes through three components in series with availability 99.99%, 99.95% and 99.9%. Overall availability (%)?',
          'Một request đi qua ba thành phần nối tiếp có availability 99,99%, 99,95% và 99,9%. Availability tổng (%) là bao nhiêu?',
        ],
        '%',
        99.84,
        0.0005,
        ['0.9999 × 0.9995 × 0.999 ≈ 0.9984 → 99.84%. In series, the result is always worse than the weakest link.', '0,9999 × 0,9995 × 0,999 ≈ 0,9984 → 99,84%. Khi nối tiếp, kết quả luôn tệ hơn mắt xích yếu nhất.'],
        [['Multiply the availabilities (as decimals).', 'Nhân các availability với nhau (dạng số thập phân).']],
      ),
      estimate(
        'reliability.parallel',
        ['aws.reliability.availability-math'],
        [
          'Two independent instances behind a load balancer, each 99.5% available. If either one is enough, what is the availability of the pair (%)?',
          'Hai instance độc lập đứng sau một load balancer, mỗi cái có availability 99,5%. Nếu chỉ cần một cái là đủ, availability của cặp này (%) là bao nhiêu?',
        ],
        '%',
        99.9975,
        0.00003,
        ['Both fail together with probability 0.005 × 0.005 = 0.000025 → 1 − 0.000025 = 99.9975%. Redundancy multiplies the failure probabilities.', 'Cả hai cùng hỏng với xác suất 0,005 × 0,005 = 0,000025 → 1 − 0,000025 = 99,9975%. Dự phòng nhân các xác suất hỏng với nhau.'],
        [['Compute the chance that BOTH fail, then subtract from 1.', 'Tính xác suất CẢ HAI cùng hỏng, rồi lấy 1 trừ đi.']],
      ),
      C.fourNines,
    ],
  },

  'cost-optimization': {
    'cost-levers': [
      quiz(
        'cost.order',
        ['aws.cost.rightsizing'],
        ['In which order should you usually apply these cost levers?', 'Bạn thường nên áp dụng các đòn bẩy chi phí này theo thứ tự nào?'],
        [
          ['a', ['Remove waste → rightsize → then commit (Savings Plans)', 'Bỏ lãng phí → rightsize → sau đó mới cam kết (Savings Plans)'], true, ['Committing first locks in today’s oversized usage.', 'Cam kết trước sẽ khoá chặt mức dùng quá cỡ hiện tại.']],
          ['b', ['Commit first, rightsize later', 'Cam kết trước, rightsize sau'], false, ['You would be paying a discount on capacity you do not need.', 'Bạn sẽ trả giá chiết khấu cho phần capacity không hề cần.']],
        ],
      ),
      quiz(
        'cost.hidden',
        ['aws.cost.data-transfer'],
        ['Which of these often surprise teams on their AWS bill? (choose all that apply)', 'Những khoản nào thường làm các team bất ngờ trên hoá đơn AWS? (chọn tất cả đáp án đúng)'],
        [
          ['a', ['NAT Gateway data processing', 'Phí xử lý dữ liệu của NAT Gateway'], true, ['$0.045/GB adds up quickly.', '$0.045/GB cộng dồn rất nhanh.']],
          ['b', ['Cross-AZ data transfer', 'Data transfer giữa các AZ'], true, ['$0.01/GB each way between AZs — chatty microservices notice.', '$0.01/GB mỗi chiều giữa các AZ — microservice "nói nhiều" sẽ thấy rõ.']],
          ['c', ['Idle load balancers and unattached EBS volumes', 'Load balancer không dùng và ổ EBS không gắn vào đâu'], true, ['They bill whether used or not.', 'Chúng tính tiền dù có dùng hay không.']],
          ['d', ['Inbound data from the internet', 'Data từ internet đi vào'], false, ['Data in is free.', 'Data đi vào miễn phí.']],
        ],
      ),
      C.cutTheBill,
    ],
  },

  iac: {
    'iac-basics': [
      quiz(
        'iac.why',
        ['aws.iac.basics'],
        ['Main benefit of Infrastructure as Code over clicking in the console?', 'Lợi ích chính của Infrastructure as Code so với bấm tay trên console?'],
        [
          ['a', ['Repeatable, reviewable, version-controlled environments', 'Môi trường lặp lại được, review được, quản lý phiên bản được'], true, ['Same template → same infrastructure in dev, staging and prod; changes go through code review.', 'Cùng một template → cùng hạ tầng ở dev, staging và prod; mọi thay đổi đều qua code review.']],
          ['b', ['It is cheaper per resource', 'Mỗi tài nguyên rẻ hơn'], false, ['Resources cost the same however you create them.', 'Tài nguyên có giá như nhau dù bạn tạo bằng cách nào.']],
        ],
      ),
      quiz(
        'iac.drift',
        ['aws.iac.drift'],
        [
          'Someone changed a security group by hand in the console. The template no longer matches reality. This is called…',
          'Ai đó sửa tay một security group trên console. Template không còn khớp với thực tế. Hiện tượng này gọi là…',
        ],
        [
          ['a', ['Drift', 'Drift'], true, ['Detect it (CloudFormation drift detection, terraform plan) and fix it in code.', 'Phát hiện nó (CloudFormation drift detection, terraform plan) và sửa trong code.']],
          ['b', ['Rollback', 'Rollback'], false, ['Rollback is undoing a failed deployment.', 'Rollback là hoàn tác một lần triển khai bị lỗi.']],
        ],
      ),
      quiz(
        'iac.tools',
        ['aws.iac.basics'],
        ['Which are Infrastructure as Code tools for AWS? (choose all that apply)', 'Đâu là các công cụ Infrastructure as Code cho AWS? (chọn tất cả đáp án đúng)'],
        [
          ['a', ['AWS CloudFormation', 'AWS CloudFormation'], true, ['AWS-native, declarative YAML/JSON.', 'Công cụ gốc của AWS, khai báo bằng YAML/JSON.']],
          ['b', ['Terraform / OpenTofu', 'Terraform / OpenTofu'], true, ['Multi-cloud, HCL language, state file.', 'Đa cloud, ngôn ngữ HCL, có file state.']],
          ['c', ['AWS CDK', 'AWS CDK'], true, ['Write infrastructure in TypeScript/Python; it generates CloudFormation.', 'Viết hạ tầng bằng TypeScript/Python; nó sinh ra CloudFormation.']],
          ['d', ['Amazon CloudWatch', 'Amazon CloudWatch'], false, ['Monitoring, not provisioning.', 'Giám sát, không phải tạo tài nguyên.']],
        ],
      ),
    ],
  },

  capstones: {
    'design-process': [
      estimate(
        'capstone.dau-to-rps',
        ['aws.capstone.estimation'],
        [
          'An app has 10 million daily active users, each making 20 requests per day. What is the AVERAGE request rate (req/s)?',
          'Một app có 10 triệu người dùng hoạt động mỗi ngày, mỗi người gửi 20 request/ngày. Lưu lượng TRUNG BÌNH là bao nhiêu request/giây?',
        ],
        'req/s',
        2315,
        0.1,
        ['10M × 20 = 200M requests/day ÷ 86,400 s ≈ 2,315 req/s. Peaks are often 2–5× the average, so design for ~5–10k req/s.', '10 triệu × 20 = 200 triệu request/ngày ÷ 86.400 giây ≈ 2.315 req/s. Đỉnh thường gấp 2–5 lần trung bình, nên thiết kế cho ~5–10 nghìn req/s.'],
        [['A day has 86,400 seconds (≈ 100,000 for quick maths).', 'Một ngày có 86.400 giây (≈ 100.000 để tính nhẩm).']],
      ),
      estimate(
        'capstone.storage-year',
        ['aws.capstone.estimation'],
        [
          'Users create 1 million new records per day, 2 KB each. How much new data per year, in GB (1 GB = 1,000,000 KB)?',
          'Người dùng tạo 1 triệu bản ghi mới mỗi ngày, mỗi bản ghi 2 KB. Mỗi năm có thêm bao nhiêu dữ liệu, tính bằng GB (1 GB = 1.000.000 KB)?',
        ],
        'GB',
        730,
        0.05,
        ['1M × 2 KB = 2 GB/day × 365 ≈ 730 GB/year — small enough for one database; indexes and replicas will multiply it.', '1 triệu × 2 KB = 2 GB/ngày × 365 ≈ 730 GB/năm — vừa sức một database; index và replica sẽ nhân con số này lên.'],
      ),
      quiz(
        'capstone.first-step',
        ['aws.capstone.design'],
        ['In a system-design discussion, what should you do FIRST?', 'Trong một buổi thảo luận thiết kế hệ thống, bạn nên làm gì ĐẦU TIÊN?'],
        [
          ['a', ['Clarify requirements: features, scale, latency/availability targets, constraints', 'Làm rõ yêu cầu: tính năng, quy mô, mục tiêu độ trễ/availability, ràng buộc'], true, ['Everything else — estimates, data model, architecture — depends on them.', 'Mọi thứ khác — ước lượng, mô hình dữ liệu, kiến trúc — đều phụ thuộc vào chúng.']],
          ['b', ['Pick the database', 'Chọn database'], false, ['Choosing technology before knowing access patterns and scale is guessing.', 'Chọn công nghệ trước khi biết mẫu truy cập và quy mô là đoán mò.']],
          ['c', ['Draw the full architecture diagram', 'Vẽ toàn bộ sơ đồ kiến trúc'], false, ['Diagrams come after requirements and rough numbers.', 'Sơ đồ đến sau yêu cầu và các con số ước lượng.']],
        ],
      ),
    ],
    'url-shortener': [
      estimate(
        'capstone.shortener-monthly',
        ['aws.capstone.estimation'],
        ['The shortener serves 1,000 req/s on average. About how many million requests is that per month (730 hours)?', 'Dịch vụ rút gọn phục vụ trung bình 1.000 req/s. Mỗi tháng (730 giờ) là khoảng bao nhiêu triệu request?'],
        'million',
        2628,
        0.05,
        ['1,000 × 3,600 × 730 ≈ 2.63 billion = 2,628 million. Per-request pricing (API Gateway, Lambda) gets expensive at this volume.', '1.000 × 3.600 × 730 ≈ 2,63 tỉ = 2.628 triệu. Giá tính theo request (API Gateway, Lambda) trở nên đắt ở lưu lượng này.'],
      ),
      quiz(
        'capstone.shortener-db',
        ['aws.databases.choosing'],
        ['The core lookup is "short code → long URL", billions of times a month. Best primary store?', 'Truy vấn chính là "mã ngắn → URL dài", hàng tỉ lần mỗi tháng. Kho dữ liệu chính tốt nhất?'],
        [
          ['a', ['DynamoDB, keyed by the short code', 'DynamoDB, dùng mã ngắn làm key'], true, ['Single-key lookups at any scale with predictable latency.', 'Tra cứu theo một key ở mọi quy mô với độ trễ ổn định.']],
          ['b', ['RDS with a full-text index', 'RDS với full-text index'], false, ['Works but you scale a single primary for a pure key-value workload.', 'Chạy được nhưng bạn phải scale một primary duy nhất cho workload chỉ toàn key-value.']],
          ['c', ['S3, one object per code', 'S3, mỗi mã một object'], false, ['Possible, but ~25 ms reads and per-request fees; a database is a better fit.', 'Làm được, nhưng đọc ~25 ms và tốn phí mỗi request; database phù hợp hơn.']],
        ],
      ),
      C.urlShortener,
    ],
  },
};
