import { buildDesign, tx } from '@learninglab/catalog';
import type { CourseExercises } from '../../define.ts';
import { exerciseBuilders, R, scenario, withSecurityGroups } from '../../helpers.ts';

const { quiz, estimate, challenge } = exerciseBuilders('aws-networking');

const egressScenario = scenario({ rps: 200, peakMultiplier: 2, readRatio: 0.5, payloadKB: 20 });

export const privateEgress = challenge({
  id: 'private-egress',
  kind: 'canvas-fix',
  skills: ['aws.networking.nat', 'aws.networking.vpc-endpoints'],
  title: tx('Private egress done right', 'Egress private đúng cách'),
  brief: tx(
    'Private app servers read/write S3 on every request, and about 10% of requests also call a third-party payment API on the internet. Today everything goes through one NAT Gateway.\n\nKeep internet access for the third-party API, stop paying NAT fees for S3, and make egress survive an AZ failure.',
    'App server trong private subnet đọc/ghi S3 ở mọi request, và khoảng 10% request còn gọi API thanh toán của bên thứ ba trên internet. Hiện mọi thứ đi qua một NAT Gateway duy nhất.\n\nHãy giữ đường ra internet cho API bên thứ ba, thôi trả phí NAT cho S3, và làm egress chịu được sự cố một AZ.',
  ),
  scenario: egressScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 'm6i.large', count: 2, autoscaling: true, maxCount: 6, multiAz: true }],
      ['nat', 'nat', 3, 1, { gateways: '1' }],
      ['bucket', 's3', 4, 1, { storageGB: 1000 }],
    ],
    ['users>lb', 'lb>app', 'app>nat', 'nat>bucket'],
    egressScenario,
  ),
  requirements: [
    R.connected(),
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    { type: 'uses', services: ['nat'], label: tx('Servers can still reach the internet (NAT Gateway)', 'Server vẫn ra được internet (NAT Gateway)') },
    { type: 'no-finding', prefix: 'nat-to-aws', label: tx('S3 traffic does not go through NAT', 'Traffic tới S3 không đi qua NAT') },
    { type: 'no-finding', prefix: 'single-nat', label: tx('Egress survives the loss of one AZ', 'Egress chịu được việc mất một AZ') },
    R.errors(),
    R.cost(3000),
  ],
  hints: [
    tx('Two separate problems: S3 traffic, and the NAT being a single point of failure.', 'Có hai vấn đề riêng: traffic tới S3, và NAT là điểm lỗi duy nhất.'),
    tx('S3 has a free private path from your VPC. NAT Gateways live in one AZ each.', 'S3 có một đường private miễn phí từ VPC. Mỗi NAT Gateway chỉ nằm trong một AZ.'),
    tx('App → VPC Endpoint (gateway) → S3, and App → NAT with 2 gateways and an internet share of 0.1 (no NAT → S3 edge).', 'App → VPC Endpoint (gateway) → S3, và App → NAT với 2 gateway, tỉ lệ ra internet 0,1 (bỏ cạnh NAT → S3).'),
  ],
  debrief: tx(
    'Use the right path for each destination: a free gateway endpoint for S3/DynamoDB, NAT only for real internet destinations, and one NAT per AZ so each AZ’s private subnets egress locally (no cross-AZ hop, no single point of failure).',
    'Chọn đúng đường cho từng đích: gateway endpoint miễn phí cho S3/DynamoDB, NAT chỉ dùng cho đích thật sự ở internet, và mỗi AZ một NAT để private subnet của AZ nào ra ngoài tại chỗ AZ đó (không vòng qua AZ khác, không có điểm lỗi duy nhất).',
  ),
  reference: withSecurityGroups(buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1],
      ['app', 'ec2', 2, 1, { instanceType: 'm6i.large', count: 2, autoscaling: true, maxCount: 6, multiAz: true }],
      ['nat', 'nat', 3, 0, { gateways: '2', internetShare: 0.1 }],
      ['vpce', 'vpce', 3, 2, { type: 'gateway' }],
      ['bucket', 's3', 4, 2, { storageGB: 1000 }],
    ],
    ['users>lb', 'lb>app', 'app>nat', 'app>vpce', 'vpce>bucket'],
    egressScenario,
  )),
});

const fixScenario = scenario({ rps: 150, peakMultiplier: 3, readRatio: 0.8, payloadKB: 10 });

export const fixTheNetwork = challenge({
  id: 'fix-the-network',
  kind: 'canvas-fix',
  skills: ['aws.networking.security-groups', 'aws.networking.routing', 'aws.networking.vpc-endpoints'],
  title: tx('Nothing loads: fix the network', 'Không vào được: sửa mạng'),
  brief: tx(
    'A team rebuilt their 3-tier shop in a fresh VPC. Every service is running, yet the site only times out.\n\nFind every connection the network drops (red edges) and fix it with least privilege: each tier should trust only the tier in front of it. Keep the app servers in the private subnet.',
    'Một team dựng lại shop 3 tầng trong một VPC mới. Dịch vụ nào cũng đang chạy, vậy mà trang web chỉ toàn timeout.\n\nHãy tìm mọi kết nối bị mạng chặn (cạnh màu đỏ) và sửa theo nguyên tắc quyền tối thiểu: mỗi tầng chỉ tin đúng tầng đứng trước nó. Giữ app server ở private subnet.',
  ),
  scenario: fixScenario,
  starter: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1, { sg: '80<0.0.0.0/0' }],
      ['app', 'ec2', 2, 1, { count: 2, autoscaling: true, maxCount: 6, multiAz: true, sg: '80<sg:db' }, 'Shop'],
      ['db', 'rds', 3, 0, { multiAz: true, sg: '3306<sg:app' }],
      ['bucket', 's3', 3, 2, { storageGB: 200 }, 'Images'],
    ],
    ['users>lb', 'lb>app', 'app>db', 'app>bucket'],
    fixScenario,
  ),
  requirements: [
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    { type: 'no-finding', prefix: 'blocked-edge', label: tx('Every connection gets through the network', 'Mọi kết nối đều qua được mạng') },
    { type: 'no-finding', prefix: 'public-subnet-app', label: tx('App servers stay in the private subnet', 'App server vẫn ở private subnet') },
    { type: 'no-finding', prefix: 'sg-broad-data', label: tx('The database trusts only the app tier’s security group', 'Database chỉ tin security group của tầng app') },
    { type: 'no-finding', prefix: 'nat-to-aws', label: tx('S3 traffic does not pay NAT fees', 'Traffic tới S3 không tốn phí NAT') },
    R.errors(),
    R.cost(1400),
  ],
  hints: [
    tx('Hover each red 🚫 label, or click the target and read "Incoming connections" in its Network section. Check the route first, then the security group.', 'Rê chuột vào từng nhãn 🚫 màu đỏ, hoặc bấm vào node đích và đọc "Kết nối đi vào" trong mục Mạng. Kiểm tra route trước, security group sau.'),
    tx('Users reach the ALB on HTTPS (TCP 443). The ALB calls the app on HTTP (TCP 80). RDS PostgreSQL listens on TCP 5432. A private subnet has no route to S3 until you add one.', 'Users vào ALB bằng HTTPS (TCP 443). ALB gọi app bằng HTTP (TCP 80). RDS PostgreSQL nghe ở TCP 5432. Private subnet không có route tới S3 cho tới khi bạn thêm vào.'),
    tx('ALB: 443 ← 0.0.0.0/0. Shop: 80 ← sg-alb. RDS: 5432 ← sg-shop. Then add a VPC Endpoint (Gateway type) to the VPC: it puts an S3 route in the private route table.', 'ALB: 443 ← 0.0.0.0/0. Shop: 80 ← sg-alb. RDS: 5432 ← sg-shop. Rồi thêm VPC Endpoint (loại Gateway) vào VPC: nó thêm route tới S3 vào route table của private subnet.'),
  ],
  debrief: tx(
    'Four bugs, two layers. Routes decide whether a packet can travel at all (the private subnet had no path to S3 until the gateway endpoint added one, for free). Security groups decide who may connect on which TCP port: the ALB listened on 443 but allowed 80, the app trusted the database instead of the ALB, and the database opened MySQL’s 3306 while running PostgreSQL on 5432. The fixed chain internet → sg-alb → sg-shop → sg-rds is the standard least-privilege layout: scaling the app tier never requires touching a rule.',
    'Bốn lỗi, hai lớp. Route quyết định gói tin có đi được hay không (private subnet không có đường tới S3 cho tới khi gateway endpoint thêm route, miễn phí). Security group quyết định ai được kết nối vào port TCP nào: ALB nghe ở 443 nhưng lại mở 80, app tin database thay vì ALB, còn database mở 3306 của MySQL trong khi chạy PostgreSQL ở 5432. Chuỗi đã sửa internet → sg-alb → sg-shop → sg-rds là bố cục quyền tối thiểu chuẩn: scale tầng app không bao giờ phải sửa rule nào.',
  ),
  reference: buildDesign(
    [
      ['users', 'users', 0, 1],
      ['lb', 'alb', 1, 1, { sg: '443<0.0.0.0/0' }],
      ['app', 'ec2', 2, 1, { count: 2, autoscaling: true, maxCount: 6, multiAz: true, sg: '80<sg:lb' }, 'Shop'],
      ['db', 'rds', 3, 0, { multiAz: true, sg: '5432<sg:app' }],
      ['bucket', 's3', 3, 2, { storageGB: 200 }, 'Images'],
      ['vpce', 'vpce', 2, 2, { type: 'gateway' }],
    ],
    ['users>lb', 'lb>app', 'app>db', 'app>bucket'],
    fixScenario,
  ),
});

export const exercises: CourseExercises = {
  'vpc-design': {
    'cidr-subnets': [
      estimate(
        'usable-24',
        ['aws.networking.cidr'],
        tx('How many IP addresses can you actually use for resources in a /24 subnet on AWS?', 'Trong một subnet /24 trên AWS, bạn thực sự dùng được bao nhiêu địa chỉ IP cho tài nguyên?'),
        'IPs',
        251,
        0.001,
        tx('A /24 has 2^(32−24) = 256 addresses; AWS reserves 5 in every subnet (network, router, DNS, future use, broadcast) → 251.', 'Một /24 có 2^(32−24) = 256 địa chỉ; AWS giữ lại 5 địa chỉ trong mọi subnet (network, router, DNS, dự phòng, broadcast) → 251.'),
        [tx('2 to the power of (32 − prefix length), then subtract what AWS reserves.', '2 mũ (32 − độ dài prefix), rồi trừ phần AWS giữ lại.')],
      ),
      estimate(
        'subnets-in-16',
        ['aws.networking.cidr'],
        tx('How many /24 subnets fit into a /16 VPC?', 'Một VPC /16 chứa được bao nhiêu subnet /24?'),
        'subnets',
        256,
        0.001,
        tx('2^(24−16) = 256. Plenty of room: plan blocks per AZ and tier (public / app / data) and leave gaps for growth.', '2^(24−16) = 256. Dư dả: hãy chia khối theo AZ và theo tầng (public / app / data), chừa khoảng trống để mở rộng.'),
      ),
      estimate(
        'usable-20',
        ['aws.networking.cidr'],
        tx('An EKS cluster gives every pod a VPC IP. How many usable IPs does a /20 subnet give you?', 'Cluster EKS cấp cho mỗi pod một IP trong VPC. Một subnet /20 cho bạn bao nhiêu IP dùng được?'),
        'IPs',
        4091,
        0.001,
        tx('2^12 = 4,096 − 5 = 4,091. Pod networking eats IPs fast — size subnets generously.', '2^12 = 4.096 − 5 = 4.091. Mạng của pod tiêu IP rất nhanh — hãy chia subnet rộng rãi.'),
      ),
      quiz(
        'overlap',
        ['aws.networking.cidr'],
        tx('Two teams both used 10.0.0.0/16 for their VPCs. What breaks later?', 'Hai team đều dùng 10.0.0.0/16 cho VPC của mình. Sau này cái gì sẽ hỏng?'),
        [
          ['a', tx('They cannot be peered or routed through a Transit Gateway', 'Không peering hay định tuyến qua Transit Gateway được'), true, tx('Overlapping CIDRs cannot be routed between. Plan a company-wide IP scheme (e.g. with IPAM).', 'Không định tuyến được giữa các dải CIDR chồng nhau. Hãy lập kế hoạch IP cho cả công ty (vd dùng IPAM).')],
          ['b', tx('Nothing — VPCs are isolated', 'Không sao — VPC vốn cô lập với nhau'), false, tx('Fine until the day they need to talk to each other or to on-prem.', 'Ổn cho tới ngày chúng cần nói chuyện với nhau hoặc với on-prem.')],
        ],
      ),
    ],
    'routing-endpoints': [
      quiz(
        'longest-prefix',
        ['aws.networking.routing'],
        tx('A route table has 0.0.0.0/0 → NAT and 10.1.0.0/16 → peering. Where does traffic to 10.1.5.9 go?', 'Route table có 0.0.0.0/0 → NAT và 10.1.0.0/16 → peering. Traffic tới 10.1.5.9 đi đâu?'),
        [
          ['a', tx('To the peering connection — the most specific route wins', 'Tới kết nối peering — route cụ thể nhất thắng'), true, tx('Longest prefix match: /16 is more specific than /0.', 'Longest prefix match: /16 cụ thể hơn /0.')],
          ['b', tx('To the NAT Gateway', 'Tới NAT Gateway'), false, tx('The default route is only used when nothing more specific matches.', 'Route mặc định chỉ dùng khi không có route nào cụ thể hơn khớp.')],
        ],
      ),
      quiz(
        'ipv6-egress',
        ['aws.networking.routing'],
        tx('IPv6 instances must reach the internet outbound only. What do you use?', 'Instance IPv6 chỉ được đi ra internet một chiều. Bạn dùng gì?'),
        [
          ['a', tx('An egress-only internet gateway', 'Egress-only internet gateway'), true, tx('IPv6 addresses are globally unique, so no NAT is needed — just block inbound.', 'Địa chỉ IPv6 là duy nhất toàn cầu, nên không cần NAT — chỉ cần chặn chiều vào.')],
          ['b', tx('A NAT Gateway', 'NAT Gateway'), false, tx('NAT Gateway is for IPv4 (it supports NAT64 for special cases).', 'NAT Gateway dành cho IPv4 (có NAT64 cho trường hợp đặc biệt).')],
        ],
      ),
      estimate(
        'interface-endpoint',
        ['aws.networking.vpc-endpoints', 'aws.cost.estimation'],
        tx('An interface endpoint in 3 AZs ($0.01/hour per AZ, 730 h) processes 1,000 GB ($0.01/GB). Monthly cost (USD)?', 'Một interface endpoint ở 3 AZ ($0.01/giờ mỗi AZ, 730 giờ) xử lý 1.000 GB ($0.01/GB). Chi phí mỗi tháng (USD)?'),
        'USD',
        31.9,
        0.05,
        tx('3 × $0.01 × 730 = $21.90 + 1,000 × $0.01 = $10 → $31.90. Still far cheaper than NAT’s $0.045/GB at volume.', '3 × $0.01 × 730 = $21,90 + 1.000 × $0.01 = $10 → $31,90. Vẫn rẻ hơn nhiều so với $0.045/GB của NAT khi lưu lượng lớn.'),
      ),
    ],
    'security-groups': [
      fixTheNetwork,
      quiz(
        'http-is-tcp',
        ['aws.networking.security-groups'],
        tx('Your ALB serves a website over HTTPS. Which security group rule lets browsers in?', 'ALB của bạn phục vụ website qua HTTPS. Rule security group nào cho trình duyệt vào được?'),
        [
          ['a', tx('TCP 443 from 0.0.0.0/0', 'TCP 443 từ 0.0.0.0/0'), true, tx('HTTPS is an application protocol carried over a TCP connection to port 443. Security groups only see protocol, port and source.', 'HTTPS là giao thức ứng dụng chạy trên một kết nối TCP tới port 443. Security group chỉ thấy giao thức, port và nguồn.')],
          ['b', tx('A rule that allows the HTTPS protocol but blocks bad URLs', 'Một rule cho phép giao thức HTTPS nhưng chặn URL xấu'), false, tx('Security groups never read URLs or headers; filtering content is WAF’s job.', 'Security group không bao giờ đọc URL hay header; lọc nội dung là việc của WAF.')],
          ['c', tx('UDP 443 from 0.0.0.0/0', 'UDP 443 từ 0.0.0.0/0'), false, tx('Classic HTTPS runs on TCP. (HTTP/3 uses UDP/QUIC, but ALB listeners are TCP.)', 'HTTPS thông thường chạy trên TCP. (HTTP/3 dùng UDP/QUIC, nhưng listener của ALB là TCP.)')],
        ],
      ),
      quiz(
        'db-source',
        ['aws.networking.security-groups', 'aws.security.least-privilege'],
        tx('Your app tier auto-scales between 2 and 20 instances. What should the RDS security group allow on TCP 5432?', 'Tầng app tự scale từ 2 tới 20 instance. Security group của RDS nên cho phép gì ở TCP 5432?'),
        [
          ['a', tx('The app tier’s security group (sg-app) as the source', 'Security group của tầng app (sg-app) làm nguồn'), true, tx('It follows the instances as they come and go, and nothing else in the VPC can connect.', 'Nó tự đi theo các instance khi chúng được tạo hay xoá, và không thứ gì khác trong VPC kết nối được.')],
          ['b', tx('The IP addresses of today’s app instances', 'Địa chỉ IP của các instance app hiện tại'), false, tx('Auto Scaling replaces instances and their IPs change: the rule rots within days.', 'Auto Scaling thay instance liên tục và IP đổi theo: rule sẽ sai chỉ sau vài ngày.')],
          ['c', tx('The whole VPC CIDR, 10.0.0.0/16', 'Cả CIDR của VPC, 10.0.0.0/16'), false, tx('Works, but anything compromised anywhere in the VPC can then reach the database.', 'Chạy được, nhưng bất cứ thứ gì trong VPC bị chiếm quyền cũng kết nối được vào database.')],
        ],
      ),
      quiz(
        'stateful',
        ['aws.networking.security-groups'],
        tx('A security group allows inbound TCP 443 from anywhere and has no custom outbound rules. Do HTTPS responses reach the clients?', 'Một security group cho phép inbound TCP 443 từ mọi nơi và không có rule outbound riêng. Phản hồi HTTPS có về tới client không?'),
        [
          ['a', tx('Yes: security groups are stateful, replies to an allowed connection are always let out', 'Có: security group là stateful, phản hồi của kết nối đã được cho phép luôn được cho ra'), true, tx('Only Network ACLs are stateless and need the reply direction (ephemeral ports) opened too.', 'Chỉ Network ACL mới stateless và cần mở cả chiều phản hồi (ephemeral port).')],
          ['b', tx('No: you must also allow outbound to ports 1024–65535', 'Không: phải mở thêm outbound tới port 1024–65535'), false, tx('That is how Network ACLs work, not security groups.', 'Đó là cách Network ACL hoạt động, không phải security group.')],
        ],
      ),
      quiz(
        'private-open',
        ['aws.networking.security-groups', 'aws.networking.subnets'],
        tx('An EC2 instance in a private subnet has a security group allowing TCP 80 from 0.0.0.0/0. Can people on the internet open your site on it directly?', 'Một EC2 trong private subnet có security group cho phép TCP 80 từ 0.0.0.0/0. Người dùng trên internet có mở thẳng trang web trên nó được không?'),
        [
          ['a', tx('No: there is no route from the internet into a private subnet, whatever the security group says', 'Không: không có route nào từ internet vào private subnet, dù security group ghi gì'), true, tx('Both layers must allow it. The rule is still sloppy, though: if someone later moves the instance, it is wide open.', 'Cả hai lớp đều phải cho phép. Dù vậy rule này vẫn cẩu thả: lỡ ai đó chuyển instance đi chỗ khác là nó mở toang.')],
          ['b', tx('Yes: 0.0.0.0/0 means anyone', 'Có: 0.0.0.0/0 nghĩa là ai cũng vào được'), false, tx('The security group only allows; the packets still need a route, and a private subnet has none from the Internet Gateway.', 'Security group chỉ cho phép; gói tin vẫn cần route, mà private subnet không có route nào từ Internet Gateway.')],
        ],
      ),
      quiz(
        'wrong-port',
        ['aws.networking.security-groups'],
        tx('App → RDS PostgreSQL times out. The RDS security group allows TCP 3306 from sg-app. What is wrong?', 'App → RDS PostgreSQL bị timeout. Security group của RDS cho phép TCP 3306 từ sg-app. Sai ở đâu?'),
        [
          ['a', tx('Wrong port: PostgreSQL listens on 5432 (3306 is MySQL)', 'Sai port: PostgreSQL nghe ở 5432 (3306 là của MySQL)'), true, tx('Right source, wrong port. A timeout (not "connection refused") is the classic sign of a security group drop.', 'Đúng nguồn, sai port. Timeout (chứ không phải "connection refused") là dấu hiệu kinh điển của việc bị security group chặn.')],
          ['b', tx('The source should be 0.0.0.0/0', 'Nguồn phải là 0.0.0.0/0'), false, tx('That would expose the database and still not fix the port.', 'Như vậy sẽ phơi database ra ngoài mà vẫn không sửa được port.')],
        ],
      ),
    ],
  },
  connectivity: {
    'connecting-vpcs': [
      quiz(
        'transitive',
        ['aws.networking.connectivity'],
        tx('VPC A is peered with B, and B with C. Can A talk to C?', 'VPC A peering với B, và B peering với C. A nói chuyện được với C không?'),
        [
          ['a', tx('No — peering is not transitive', 'Không — peering không có tính bắc cầu'), true, tx('You would need A–C peering, or a Transit Gateway hub.', 'Bạn cần peering A–C, hoặc một hub Transit Gateway.')],
          ['b', tx('Yes, through B', 'Có, đi qua B'), false, tx('AWS does not route between peering connections.', 'AWS không định tuyến giữa các kết nối peering.')],
        ],
      ),
      quiz(
        'many-vpcs',
        ['aws.networking.connectivity'],
        tx('30 VPCs plus an on-prem VPN all need to reach each other. Best option?', '30 VPC cộng một VPN on-prem đều cần kết nối với nhau. Lựa chọn tốt nhất?'),
        [
          ['a', tx('Transit Gateway as a hub', 'Transit Gateway làm hub'), true, tx('30 attachments instead of 435 peering connections, with central route tables.', '30 attachment thay vì 435 kết nối peering, có route table tập trung.')],
          ['b', tx('Full-mesh VPC peering', 'Peering kiểu lưới đầy đủ'), false, tx('N×(N−1)/2 connections — unmanageable, and VPN cannot transit peering.', 'N×(N−1)/2 kết nối — không quản lý nổi, và VPN không đi qua peering được.')],
        ],
      ),
      quiz(
        'privatelink',
        ['aws.networking.connectivity'],
        tx('You run an internal API that 200 customer VPCs (with overlapping CIDRs) must consume privately. What fits?', 'Bạn chạy một API nội bộ mà 200 VPC của khách hàng (có CIDR chồng nhau) cần dùng một cách private. Cái gì phù hợp?'),
        [
          ['a', tx('PrivateLink: an endpoint service behind an NLB; consumers create interface endpoints', 'PrivateLink: endpoint service đứng sau NLB; phía dùng tạo interface endpoint'), true, tx('One-way, service-level access; overlapping CIDRs do not matter.', 'Truy cập một chiều, ở mức service; CIDR chồng nhau không thành vấn đề.')],
          ['b', tx('Peer with all 200 VPCs', 'Peering với cả 200 VPC'), false, tx('Overlapping CIDRs make peering impossible, and it exposes whole networks.', 'CIDR chồng nhau khiến không peering được, và còn phơi cả mạng ra.')],
        ],
      ),
    ],
    hybrid: [
      quiz(
        'vpn-vs-dx',
        ['aws.networking.hybrid'],
        tx('You need consistent latency and 10 Gbps between your data centre and AWS. Choose:', 'Bạn cần độ trễ ổn định và 10 Gbps giữa data center và AWS. Chọn:'),
        [
          ['a', tx('AWS Direct Connect', 'AWS Direct Connect'), true, tx('A private dedicated link: predictable latency, high bandwidth, lower transfer price.', 'Đường truyền riêng: độ trễ ổn định, băng thông cao, giá data transfer thấp hơn.')],
          ['b', tx('Site-to-Site VPN', 'Site-to-Site VPN'), false, tx('VPN runs over the internet: quick to set up, ~1.25 Gbps per tunnel, variable latency.', 'VPN chạy qua internet: dựng nhanh, ~1,25 Gbps mỗi tunnel, độ trễ thay đổi.')],
        ],
      ),
      quiz(
        'dx-redundancy',
        ['aws.networking.hybrid'],
        tx('You have one Direct Connect link. How do you avoid a single point of failure cheaply?', 'Bạn có một đường Direct Connect. Làm sao tránh điểm lỗi duy nhất với chi phí thấp?'),
        [
          ['a', tx('Add a Site-to-Site VPN as backup', 'Thêm Site-to-Site VPN làm dự phòng'), true, tx('A common pattern; for critical workloads use two DX links at different locations.', 'Mẫu phổ biến; với workload quan trọng thì dùng hai đường DX ở hai địa điểm khác nhau.')],
          ['b', tx('Nothing — DX never fails', 'Không cần — DX không bao giờ hỏng'), false, tx('Fibre cuts and maintenance happen.', 'Đứt cáp và bảo trì vẫn xảy ra.')],
        ],
      ),
      estimate(
        'vpn-cost',
        ['aws.networking.hybrid', 'aws.cost.estimation'],
        tx('Two Site-to-Site VPN connections cost $0.05/hour each. Monthly connection cost for 730 hours (USD)?', 'Hai kết nối Site-to-Site VPN, mỗi kết nối $0.05/giờ. Chi phí kết nối mỗi tháng với 730 giờ (USD)?'),
        'USD',
        73,
        0.05,
        tx('2 × $0.05 × 730 = $73, plus data transfer out at normal rates.', '2 × $0.05 × 730 = $73, cộng data transfer ra ngoài theo giá thường.'),
      ),
    ],
  },
  'dns-edge': {
    'route53-deep': [
      quiz(
        'private-zone',
        ['aws.networking.dns'],
        tx('Services inside your VPCs should resolve db.internal.example.com, but the internet must not. Use:', 'Các service trong VPC cần phân giải được db.internal.example.com, nhưng internet thì không. Dùng:'),
        [
          ['a', tx('A Route 53 private hosted zone associated with the VPCs', 'Một private hosted zone của Route 53 gắn với các VPC'), true, tx('Only associated VPCs can resolve it.', 'Chỉ các VPC được gắn mới phân giải được.')],
          ['b', tx('A public hosted zone with private IPs', 'Public hosted zone trỏ tới IP private'), false, tx('Leaks your internal topology to the world.', 'Làm lộ cấu trúc mạng nội bộ ra ngoài.')],
        ],
      ),
      quiz(
        'failover',
        ['aws.networking.dns'],
        tx('Send users to the standby Region only when the primary fails its health check. Routing policy?', 'Chỉ đưa người dùng sang region dự phòng khi region chính không qua health check. Dùng routing policy nào?'),
        [
          ['a', tx('Failover (primary/secondary) with health checks', 'Failover (primary/secondary) kèm health check'), true, tx('Keep TTLs low (e.g. 60 s) so clients switch quickly.', 'Giữ TTL thấp (vd 60 giây) để client chuyển nhanh.')],
          ['b', tx('Weighted 50/50', 'Weighted 50/50'), false, tx('That sends half the traffic to the standby all the time.', 'Như vậy lúc nào cũng có một nửa traffic đi sang bản dự phòng.')],
          ['c', tx('Geolocation', 'Geolocation'), false, tx('Routes by user location, not by health.', 'Định tuyến theo vị trí người dùng, không theo tình trạng sức khoẻ.')],
        ],
      ),
      quiz(
        'alias-apex',
        ['aws.networking.dns'],
        tx('You want example.com (the zone apex) to point at a CloudFront distribution. What record?', 'Bạn muốn example.com (đỉnh zone) trỏ tới một distribution CloudFront. Dùng bản ghi gì?'),
        [
          ['a', tx('A Route 53 alias record', 'Bản ghi alias của Route 53'), true, tx('Alias works at the apex and alias queries to AWS resources are free.', 'Alias dùng được ở đỉnh zone và truy vấn alias tới tài nguyên AWS miễn phí.')],
          ['b', tx('A CNAME record', 'Bản ghi CNAME'), false, tx('DNS forbids CNAME at the zone apex.', 'DNS không cho phép CNAME ở đỉnh zone.')],
        ],
      ),
    ],
    'global-edge': [
      quiz(
        'ga-vs-cf',
        ['aws.networking.edge'],
        tx('A multiplayer game uses UDP and needs low latency worldwide plus fast Region failover. Use:', 'Một game nhiều người chơi dùng UDP, cần độ trễ thấp toàn cầu và failover region nhanh. Dùng:'),
        [
          ['a', tx('Global Accelerator', 'Global Accelerator'), true, tx('Anycast static IPs, TCP/UDP, backbone routing, failover in seconds.', 'IP tĩnh anycast, TCP/UDP, đi qua mạng xương sống, failover trong vài giây.')],
          ['b', tx('CloudFront', 'CloudFront'), false, tx('CloudFront is for HTTP(S) and caching, not UDP game traffic.', 'CloudFront dành cho HTTP(S) và cache, không dành cho traffic game UDP.')],
        ],
      ),
      quiz(
        'dynamic-cf',
        ['aws.networking.edge'],
        tx('Does CloudFront help an API whose responses are never cacheable?', 'CloudFront có giúp gì cho một API mà response không bao giờ cache được không?'),
        [
          ['a', tx('Yes — TLS ends near the user and requests ride warm connections over the AWS backbone', 'Có — TLS được kết thúc gần người dùng và request đi qua kết nối sẵn có trên mạng xương sống AWS'), true, tx('Lower latency for far-away users, plus WAF/Shield at the edge.', 'Độ trễ thấp hơn cho người dùng ở xa, cộng thêm WAF/Shield ở biên.')],
          ['b', tx('No, CDNs only help static files', 'Không, CDN chỉ giúp file tĩnh'), false, tx('Caching is one benefit; connection optimisation and security are others.', 'Cache là một lợi ích; tối ưu kết nối và bảo mật là những lợi ích khác.')],
        ],
      ),
      quiz(
        'static-ip',
        ['aws.networking.edge'],
        tx('A partner must allow-list two fixed IP addresses for your global HTTP API. Which service gives you that?', 'Đối tác cần allow-list hai địa chỉ IP cố định cho HTTP API toàn cầu của bạn. Dịch vụ nào cho bạn điều đó?'),
        [
          ['a', tx('Global Accelerator (two static anycast IPs)', 'Global Accelerator (hai IP anycast tĩnh)'), true, tx('The IPs never change, even if you move Regions behind them.', 'IP không bao giờ đổi, kể cả khi bạn đổi region phía sau.')],
          ['b', tx('An Application Load Balancer', 'Application Load Balancer'), false, tx('ALB IP addresses change over time.', 'Địa chỉ IP của ALB thay đổi theo thời gian.')],
        ],
      ),
    ],
  },
  'network-cost': {
    'data-transfer-costs': [
      estimate(
        'cross-az',
        ['aws.cost.data-transfer'],
        tx('Services in two AZs exchange 5,000 GB per month. Cross-AZ costs $0.01/GB in EACH direction (billed on both sides). Monthly cost (USD)?', 'Các service ở hai AZ trao đổi 5.000 GB mỗi tháng. Cross-AZ tốn $0.01/GB cho MỖI chiều (tính ở cả hai phía). Chi phí mỗi tháng (USD)?'),
        'USD',
        100,
        0.05,
        tx('5,000 × ($0.01 + $0.01) = $100. Chatty microservices across AZs add up — keep high-volume pairs AZ-local where safe.', '5.000 × ($0.01 + $0.01) = $100. Microservice "nói nhiều" giữa các AZ cộng dồn rất nhanh — giữ các cặp lưu lượng lớn trong cùng AZ khi an toàn.'),
      ),
      estimate(
        'cross-region',
        ['aws.cost.data-transfer'],
        tx('Replicating 2,000 GB per month to another Region at $0.02/GB costs how much (USD)?', 'Nhân bản 2.000 GB mỗi tháng sang region khác với giá $0.02/GB tốn bao nhiêu (USD)?'),
        'USD',
        40,
        0.05,
        tx('2,000 × $0.02 = $40 — a recurring cost of multi-Region designs.', '2.000 × $0.02 = $40 — một khoản chi phí lặp lại của các thiết kế multi-region.'),
      ),
      privateEgress,
    ],
  },
};
