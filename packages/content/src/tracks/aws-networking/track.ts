import { tx } from '@learninglab/catalog';
import { defineCourse } from '../../define.ts';
import { lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-networking',
  icon: 'network',
  hue: 280,
  level: 'intermediate',
  stage: 2,
  prerequisites: ['aws'],
  estHours: 8,
  title: tx('Networking in depth', 'Mạng chuyên sâu'),
  tagline: tx('Design VPCs that scale, connect everything, and stop paying for bytes you don’t need to.', 'Thiết kế VPC mở rộng được, kết nối mọi thứ, và thôi trả tiền cho những byte không cần thiết.'),
  description: tx('CIDR planning, routing and endpoints, VPC peering vs Transit Gateway vs PrivateLink, hybrid connectivity, Route 53 in depth, global edge acceleration and the full data-transfer cost map.', 'Quy hoạch CIDR, định tuyến và endpoint, VPC peering so với Transit Gateway và PrivateLink, kết nối hybrid, Route 53 chuyên sâu, tăng tốc biên toàn cầu và bản đồ đầy đủ chi phí data transfer.'),
  outcomes: [
    tx('Plan CIDR ranges and subnets that leave room to grow', 'Quy hoạch dải CIDR và subnet còn chỗ để mở rộng'),
    tx('Debug a connection: route first, then security group', 'Debug một kết nối: kiểm tra route trước, security group sau'),
    tx('Choose between peering, Transit Gateway and PrivateLink', 'Chọn giữa peering, Transit Gateway và PrivateLink'),
    tx('Connect on-premises networks reliably', 'Kết nối mạng on-premises một cách tin cậy'),
    tx('Predict and cut data-transfer costs', 'Dự đoán và cắt giảm chi phí data transfer'),
  ],
  modules: [
    mod('vpc-design', 'network', tx('VPC design', 'Thiết kế VPC'), tx('Address space, subnets and routing.', 'Không gian địa chỉ, subnet và định tuyến.'), [
      lesson('cidr-subnets', tx('CIDR and subnet sizing', 'CIDR và chia subnet'), tx('IP math, reserved addresses and multi-AZ layouts.', 'Tính toán IP, địa chỉ bị giữ lại và bố cục nhiều AZ.'), 15),
      lesson('routing-endpoints', tx('Routing and VPC endpoints', 'Định tuyến và VPC endpoint'), tx('Route tables, IGW, NAT, egress-only IGW, gateway vs interface endpoints.', 'Route table, IGW, NAT, egress-only IGW, endpoint gateway và interface.'), 12),
      lesson('security-groups', tx('Security groups, ports and protocols', 'Security group, port và giao thức'), tx('Private vs public IPs, TCP vs HTTP, ports, security group rules and SG-to-SG chains.', 'IP private và public, TCP với HTTP, port, rule của security group và chuỗi SG nối SG.'), 15),
    ]),
    mod('connectivity', 'route', tx('Connectivity', 'Kết nối'), tx('Between VPCs and to your data centre.', 'Giữa các VPC và tới data center của bạn.'), [
      lesson('connecting-vpcs', tx('Peering, Transit Gateway or PrivateLink', 'Peering, Transit Gateway hay PrivateLink'), tx('Connecting many VPCs and sharing services.', 'Kết nối nhiều VPC và chia sẻ service.'), 12),
      lesson('hybrid', tx('Hybrid: VPN and Direct Connect', 'Hybrid: VPN và Direct Connect'), tx('Reaching on-premises networks, with redundancy.', 'Kết nối tới mạng on-premises, có dự phòng.'), 12),
    ]),
    mod('dns-edge', 'globe', tx('DNS & global edge', 'DNS & biên toàn cầu'), tx('Steering users to the right place, fast.', 'Đưa người dùng tới đúng chỗ, thật nhanh.'), [
      lesson('route53-deep', tx('Route 53 in depth', 'Route 53 chuyên sâu'), tx('Private zones, routing policies, health checks, Resolver.', 'Private zone, routing policy, health check, Resolver.'), 12),
      lesson('global-edge', tx('CloudFront and Global Accelerator', 'CloudFront và Global Accelerator'), tx('Edge caching vs anycast acceleration.', 'Cache ở biên so với tăng tốc bằng anycast.'), 10),
    ]),
    mod('network-cost', 'piggy-bank', tx('Network costs', 'Chi phí mạng'), tx('Where every byte gets billed.', 'Mỗi byte bị tính tiền ở đâu.'), [
      lesson('data-transfer-costs', tx('The data-transfer cost map', 'Bản đồ chi phí data transfer'), tx('Internet, cross-AZ, cross-Region, NAT, endpoints and CDN.', 'Internet, cross-AZ, cross-Region, NAT, endpoint và CDN.'), 12),
    ]),
  ],
});
