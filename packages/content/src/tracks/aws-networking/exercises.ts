import { buildDesign, tx, type Scenario } from '@cloudlab/catalog';
import type { CanvasChallenge, Exercise } from '@cloudlab/exercise-kit';
import { exerciseBuilders } from '../../helpers.ts';

const { quiz, estimate } = exerciseBuilders('aws-networking');

const egressScenario: Scenario = { rps: 200, peakMultiplier: 2, readRatio: 0.5, payloadKB: 20, region: 'us-east-1' };

export const privateEgress: CanvasChallenge = {
  id: 'aws-networking.private-egress',
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
    { type: 'flow', steps: ['entry', 'compute', 'data'] },
    { type: 'uses', services: ['nat'], label: tx('Servers can still reach the internet (NAT Gateway)', 'Server vẫn ra được internet (NAT Gateway)') },
    { type: 'no-finding', prefix: 'nat-to-aws', label: tx('S3 traffic does not go through NAT', 'Traffic tới S3 không đi qua NAT') },
    { type: 'no-finding', prefix: 'single-nat', label: tx('Egress survives the loss of one AZ', 'Egress chịu được việc mất một AZ') },
    { type: 'metric', metric: 'errorRate', op: '<=', value: 0.01 },
    { type: 'metric', metric: 'monthlyUsd', op: '<=', value: 3000 },
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
  reference: buildDesign(
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
  ),
};

export const exercises: Record<string, Record<string, Exercise[]>> = {
  'vpc-design': {
    'cidr-subnets': [
      estimate(
        'usable-24',
        ['aws.networking.cidr'],
        ['How many IP addresses can you actually use for resources in a /24 subnet on AWS?', 'Trong một subnet /24 trên AWS, bạn thực sự dùng được bao nhiêu địa chỉ IP cho tài nguyên?'],
        'IPs',
        251,
        0.001,
        ['A /24 has 2^(32−24) = 256 addresses; AWS reserves 5 in every subnet (network, router, DNS, future use, broadcast) → 251.', 'Một /24 có 2^(32−24) = 256 địa chỉ; AWS giữ lại 5 địa chỉ trong mọi subnet (network, router, DNS, dự phòng, broadcast) → 251.'],
        [['2 to the power of (32 − prefix length), then subtract what AWS reserves.', '2 mũ (32 − độ dài prefix), rồi trừ phần AWS giữ lại.']],
      ),
      estimate(
        'subnets-in-16',
        ['aws.networking.cidr'],
        ['How many /24 subnets fit into a /16 VPC?', 'Một VPC /16 chứa được bao nhiêu subnet /24?'],
        'subnets',
        256,
        0.001,
        ['2^(24−16) = 256. Plenty of room: plan blocks per AZ and tier (public / app / data) and leave gaps for growth.', '2^(24−16) = 256. Dư dả: hãy chia khối theo AZ và theo tầng (public / app / data), chừa khoảng trống để mở rộng.'],
      ),
      estimate(
        'usable-20',
        ['aws.networking.cidr'],
        ['An EKS cluster gives every pod a VPC IP. How many usable IPs does a /20 subnet give you?', 'Cluster EKS cấp cho mỗi pod một IP trong VPC. Một subnet /20 cho bạn bao nhiêu IP dùng được?'],
        'IPs',
        4091,
        0.001,
        ['2^12 = 4,096 − 5 = 4,091. Pod networking eats IPs fast — size subnets generously.', '2^12 = 4.096 − 5 = 4.091. Mạng của pod tiêu IP rất nhanh — hãy chia subnet rộng rãi.'],
      ),
      quiz(
        'overlap',
        ['aws.networking.cidr'],
        ['Two teams both used 10.0.0.0/16 for their VPCs. What breaks later?', 'Hai team đều dùng 10.0.0.0/16 cho VPC của mình. Sau này cái gì sẽ hỏng?'],
        [
          ['a', ['They cannot be peered or routed through a Transit Gateway', 'Không peering hay định tuyến qua Transit Gateway được'], true, ['Overlapping CIDRs cannot be routed between. Plan a company-wide IP scheme (e.g. with IPAM).', 'Không định tuyến được giữa các dải CIDR chồng nhau. Hãy lập kế hoạch IP cho cả công ty (vd dùng IPAM).']],
          ['b', ['Nothing — VPCs are isolated', 'Không sao — VPC vốn cô lập với nhau'], false, ['Fine until the day they need to talk to each other or to on-prem.', 'Ổn cho tới ngày chúng cần nói chuyện với nhau hoặc với on-prem.']],
        ],
      ),
    ],
    'routing-endpoints': [
      quiz(
        'longest-prefix',
        ['aws.networking.routing'],
        ['A route table has 0.0.0.0/0 → NAT and 10.1.0.0/16 → peering. Where does traffic to 10.1.5.9 go?', 'Route table có 0.0.0.0/0 → NAT và 10.1.0.0/16 → peering. Traffic tới 10.1.5.9 đi đâu?'],
        [
          ['a', ['To the peering connection — the most specific route wins', 'Tới kết nối peering — route cụ thể nhất thắng'], true, ['Longest prefix match: /16 is more specific than /0.', 'Longest prefix match: /16 cụ thể hơn /0.']],
          ['b', ['To the NAT Gateway', 'Tới NAT Gateway'], false, ['The default route is only used when nothing more specific matches.', 'Route mặc định chỉ dùng khi không có route nào cụ thể hơn khớp.']],
        ],
      ),
      quiz(
        'ipv6-egress',
        ['aws.networking.routing'],
        ['IPv6 instances must reach the internet outbound only. What do you use?', 'Instance IPv6 chỉ được đi ra internet một chiều. Bạn dùng gì?'],
        [
          ['a', ['An egress-only internet gateway', 'Egress-only internet gateway'], true, ['IPv6 addresses are globally unique, so no NAT is needed — just block inbound.', 'Địa chỉ IPv6 là duy nhất toàn cầu, nên không cần NAT — chỉ cần chặn chiều vào.']],
          ['b', ['A NAT Gateway', 'NAT Gateway'], false, ['NAT Gateway is for IPv4 (it supports NAT64 for special cases).', 'NAT Gateway dành cho IPv4 (có NAT64 cho trường hợp đặc biệt).']],
        ],
      ),
      estimate(
        'interface-endpoint',
        ['aws.networking.vpc-endpoints', 'aws.cost.estimation'],
        ['An interface endpoint in 3 AZs ($0.01/hour per AZ, 730 h) processes 1,000 GB ($0.01/GB). Monthly cost (USD)?', 'Một interface endpoint ở 3 AZ ($0.01/giờ mỗi AZ, 730 giờ) xử lý 1.000 GB ($0.01/GB). Chi phí mỗi tháng (USD)?'],
        'USD',
        31.9,
        0.05,
        ['3 × $0.01 × 730 = $21.90 + 1,000 × $0.01 = $10 → $31.90. Still far cheaper than NAT’s $0.045/GB at volume.', '3 × $0.01 × 730 = $21,90 + 1.000 × $0.01 = $10 → $31,90. Vẫn rẻ hơn nhiều so với $0.045/GB của NAT khi lưu lượng lớn.'],
      ),
    ],
  },
  connectivity: {
    'connecting-vpcs': [
      quiz(
        'transitive',
        ['aws.networking.connectivity'],
        ['VPC A is peered with B, and B with C. Can A talk to C?', 'VPC A peering với B, và B peering với C. A nói chuyện được với C không?'],
        [
          ['a', ['No — peering is not transitive', 'Không — peering không có tính bắc cầu'], true, ['You would need A–C peering, or a Transit Gateway hub.', 'Bạn cần peering A–C, hoặc một hub Transit Gateway.']],
          ['b', ['Yes, through B', 'Có, đi qua B'], false, ['AWS does not route between peering connections.', 'AWS không định tuyến giữa các kết nối peering.']],
        ],
      ),
      quiz(
        'many-vpcs',
        ['aws.networking.connectivity'],
        ['30 VPCs plus an on-prem VPN all need to reach each other. Best option?', '30 VPC cộng một VPN on-prem đều cần kết nối với nhau. Lựa chọn tốt nhất?'],
        [
          ['a', ['Transit Gateway as a hub', 'Transit Gateway làm hub'], true, ['30 attachments instead of 435 peering connections, with central route tables.', '30 attachment thay vì 435 kết nối peering, có route table tập trung.']],
          ['b', ['Full-mesh VPC peering', 'Peering kiểu lưới đầy đủ'], false, ['N×(N−1)/2 connections — unmanageable, and VPN cannot transit peering.', 'N×(N−1)/2 kết nối — không quản lý nổi, và VPN không đi qua peering được.']],
        ],
      ),
      quiz(
        'privatelink',
        ['aws.networking.connectivity'],
        ['You run an internal API that 200 customer VPCs (with overlapping CIDRs) must consume privately. What fits?', 'Bạn chạy một API nội bộ mà 200 VPC của khách hàng (có CIDR chồng nhau) cần dùng một cách private. Cái gì phù hợp?'],
        [
          ['a', ['PrivateLink: an endpoint service behind an NLB; consumers create interface endpoints', 'PrivateLink: endpoint service đứng sau NLB; phía dùng tạo interface endpoint'], true, ['One-way, service-level access; overlapping CIDRs do not matter.', 'Truy cập một chiều, ở mức service; CIDR chồng nhau không thành vấn đề.']],
          ['b', ['Peer with all 200 VPCs', 'Peering với cả 200 VPC'], false, ['Overlapping CIDRs make peering impossible, and it exposes whole networks.', 'CIDR chồng nhau khiến không peering được, và còn phơi cả mạng ra.']],
        ],
      ),
    ],
    hybrid: [
      quiz(
        'vpn-vs-dx',
        ['aws.networking.hybrid'],
        ['You need consistent latency and 10 Gbps between your data centre and AWS. Choose:', 'Bạn cần độ trễ ổn định và 10 Gbps giữa data center và AWS. Chọn:'],
        [
          ['a', ['AWS Direct Connect', 'AWS Direct Connect'], true, ['A private dedicated link: predictable latency, high bandwidth, lower transfer price.', 'Đường truyền riêng: độ trễ ổn định, băng thông cao, giá data transfer thấp hơn.']],
          ['b', ['Site-to-Site VPN', 'Site-to-Site VPN'], false, ['VPN runs over the internet: quick to set up, ~1.25 Gbps per tunnel, variable latency.', 'VPN chạy qua internet: dựng nhanh, ~1,25 Gbps mỗi tunnel, độ trễ thay đổi.']],
        ],
      ),
      quiz(
        'dx-redundancy',
        ['aws.networking.hybrid'],
        ['You have one Direct Connect link. How do you avoid a single point of failure cheaply?', 'Bạn có một đường Direct Connect. Làm sao tránh điểm lỗi duy nhất với chi phí thấp?'],
        [
          ['a', ['Add a Site-to-Site VPN as backup', 'Thêm Site-to-Site VPN làm dự phòng'], true, ['A common pattern; for critical workloads use two DX links at different locations.', 'Mẫu phổ biến; với workload quan trọng thì dùng hai đường DX ở hai địa điểm khác nhau.']],
          ['b', ['Nothing — DX never fails', 'Không cần — DX không bao giờ hỏng'], false, ['Fibre cuts and maintenance happen.', 'Đứt cáp và bảo trì vẫn xảy ra.']],
        ],
      ),
      estimate(
        'vpn-cost',
        ['aws.networking.hybrid', 'aws.cost.estimation'],
        ['Two Site-to-Site VPN connections cost $0.05/hour each. Monthly connection cost for 730 hours (USD)?', 'Hai kết nối Site-to-Site VPN, mỗi kết nối $0.05/giờ. Chi phí kết nối mỗi tháng với 730 giờ (USD)?'],
        'USD',
        73,
        0.05,
        ['2 × $0.05 × 730 = $73, plus data transfer out at normal rates.', '2 × $0.05 × 730 = $73, cộng data transfer ra ngoài theo giá thường.'],
      ),
    ],
  },
  'dns-edge': {
    'route53-deep': [
      quiz(
        'private-zone',
        ['aws.networking.dns'],
        ['Services inside your VPCs should resolve db.internal.example.com, but the internet must not. Use:', 'Các service trong VPC cần phân giải được db.internal.example.com, nhưng internet thì không. Dùng:'],
        [
          ['a', ['A Route 53 private hosted zone associated with the VPCs', 'Một private hosted zone của Route 53 gắn với các VPC'], true, ['Only associated VPCs can resolve it.', 'Chỉ các VPC được gắn mới phân giải được.']],
          ['b', ['A public hosted zone with private IPs', 'Public hosted zone trỏ tới IP private'], false, ['Leaks your internal topology to the world.', 'Làm lộ cấu trúc mạng nội bộ ra ngoài.']],
        ],
      ),
      quiz(
        'failover',
        ['aws.networking.dns'],
        ['Send users to the standby Region only when the primary fails its health check. Routing policy?', 'Chỉ đưa người dùng sang region dự phòng khi region chính không qua health check. Dùng routing policy nào?'],
        [
          ['a', ['Failover (primary/secondary) with health checks', 'Failover (primary/secondary) kèm health check'], true, ['Keep TTLs low (e.g. 60 s) so clients switch quickly.', 'Giữ TTL thấp (vd 60 giây) để client chuyển nhanh.']],
          ['b', ['Weighted 50/50', 'Weighted 50/50'], false, ['That sends half the traffic to the standby all the time.', 'Như vậy lúc nào cũng có một nửa traffic đi sang bản dự phòng.']],
          ['c', ['Geolocation', 'Geolocation'], false, ['Routes by user location, not by health.', 'Định tuyến theo vị trí người dùng, không theo tình trạng sức khoẻ.']],
        ],
      ),
      quiz(
        'alias-apex',
        ['aws.networking.dns'],
        ['You want example.com (the zone apex) to point at a CloudFront distribution. What record?', 'Bạn muốn example.com (đỉnh zone) trỏ tới một distribution CloudFront. Dùng bản ghi gì?'],
        [
          ['a', ['A Route 53 alias record', 'Bản ghi alias của Route 53'], true, ['Alias works at the apex and alias queries to AWS resources are free.', 'Alias dùng được ở đỉnh zone và truy vấn alias tới tài nguyên AWS miễn phí.']],
          ['b', ['A CNAME record', 'Bản ghi CNAME'], false, ['DNS forbids CNAME at the zone apex.', 'DNS không cho phép CNAME ở đỉnh zone.']],
        ],
      ),
    ],
    'global-edge': [
      quiz(
        'ga-vs-cf',
        ['aws.networking.edge'],
        ['A multiplayer game uses UDP and needs low latency worldwide plus fast Region failover. Use:', 'Một game nhiều người chơi dùng UDP, cần độ trễ thấp toàn cầu và failover region nhanh. Dùng:'],
        [
          ['a', ['Global Accelerator', 'Global Accelerator'], true, ['Anycast static IPs, TCP/UDP, backbone routing, failover in seconds.', 'IP tĩnh anycast, TCP/UDP, đi qua mạng xương sống, failover trong vài giây.']],
          ['b', ['CloudFront', 'CloudFront'], false, ['CloudFront is for HTTP(S) and caching, not UDP game traffic.', 'CloudFront dành cho HTTP(S) và cache, không dành cho traffic game UDP.']],
        ],
      ),
      quiz(
        'dynamic-cf',
        ['aws.networking.edge'],
        ['Does CloudFront help an API whose responses are never cacheable?', 'CloudFront có giúp gì cho một API mà response không bao giờ cache được không?'],
        [
          ['a', ['Yes — TLS ends near the user and requests ride warm connections over the AWS backbone', 'Có — TLS được kết thúc gần người dùng và request đi qua kết nối sẵn có trên mạng xương sống AWS'], true, ['Lower latency for far-away users, plus WAF/Shield at the edge.', 'Độ trễ thấp hơn cho người dùng ở xa, cộng thêm WAF/Shield ở biên.']],
          ['b', ['No, CDNs only help static files', 'Không, CDN chỉ giúp file tĩnh'], false, ['Caching is one benefit; connection optimisation and security are others.', 'Cache là một lợi ích; tối ưu kết nối và bảo mật là những lợi ích khác.']],
        ],
      ),
      quiz(
        'static-ip',
        ['aws.networking.edge'],
        ['A partner must allow-list two fixed IP addresses for your global HTTP API. Which service gives you that?', 'Đối tác cần allow-list hai địa chỉ IP cố định cho HTTP API toàn cầu của bạn. Dịch vụ nào cho bạn điều đó?'],
        [
          ['a', ['Global Accelerator (two static anycast IPs)', 'Global Accelerator (hai IP anycast tĩnh)'], true, ['The IPs never change, even if you move Regions behind them.', 'IP không bao giờ đổi, kể cả khi bạn đổi region phía sau.']],
          ['b', ['An Application Load Balancer', 'Application Load Balancer'], false, ['ALB IP addresses change over time.', 'Địa chỉ IP của ALB thay đổi theo thời gian.']],
        ],
      ),
    ],
  },
  'network-cost': {
    'data-transfer-costs': [
      estimate(
        'cross-az',
        ['aws.cost.data-transfer'],
        ['Services in two AZs exchange 5,000 GB per month. Cross-AZ costs $0.01/GB in EACH direction (billed on both sides). Monthly cost (USD)?', 'Các service ở hai AZ trao đổi 5.000 GB mỗi tháng. Cross-AZ tốn $0.01/GB cho MỖI chiều (tính ở cả hai phía). Chi phí mỗi tháng (USD)?'],
        'USD',
        100,
        0.05,
        ['5,000 × ($0.01 + $0.01) = $100. Chatty microservices across AZs add up — keep high-volume pairs AZ-local where safe.', '5.000 × ($0.01 + $0.01) = $100. Microservice "nói nhiều" giữa các AZ cộng dồn rất nhanh — giữ các cặp lưu lượng lớn trong cùng AZ khi an toàn.'],
      ),
      estimate(
        'cross-region',
        ['aws.cost.data-transfer'],
        ['Replicating 2,000 GB per month to another Region at $0.02/GB costs how much (USD)?', 'Nhân bản 2.000 GB mỗi tháng sang region khác với giá $0.02/GB tốn bao nhiêu (USD)?'],
        'USD',
        40,
        0.05,
        ['2,000 × $0.02 = $40 — a recurring cost of multi-Region designs.', '2.000 × $0.02 = $40 — một khoản chi phí lặp lại của các thiết kế multi-region.'],
      ),
      privateEgress,
    ],
  },
};
