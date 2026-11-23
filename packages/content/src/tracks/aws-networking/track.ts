import { defineCourse } from '../../define.ts';
import { L, lesson, mod } from '../../helpers.ts';

export const course = defineCourse({
  slug: 'aws-networking',
  icon: 'network',
  hue: 280,
  level: 'intermediate',
  stage: 2,
  prerequisites: ['aws'],
  estHours: 8,
  title: L(['Networking in depth', 'Mạng chuyên sâu']),
  tagline: L(['Design VPCs that scale, connect everything, and stop paying for bytes you don’t need to.', 'Thiết kế VPC mở rộng được, kết nối mọi thứ, và thôi trả tiền cho những byte không cần thiết.']),
  description: L([
    'CIDR planning, routing and endpoints, VPC peering vs Transit Gateway vs PrivateLink, hybrid connectivity, Route 53 in depth, global edge acceleration and the full data-transfer cost map.',
    'Quy hoạch CIDR, định tuyến và endpoint, VPC peering so với Transit Gateway và PrivateLink, kết nối hybrid, Route 53 chuyên sâu, tăng tốc biên toàn cầu và bản đồ đầy đủ chi phí data transfer.',
  ]),
  outcomes: [
    L(['Plan CIDR ranges and subnets that leave room to grow', 'Quy hoạch dải CIDR và subnet còn chỗ để mở rộng']),
    L(['Choose between peering, Transit Gateway and PrivateLink', 'Chọn giữa peering, Transit Gateway và PrivateLink']),
    L(['Connect on-premises networks reliably', 'Kết nối mạng on-premises một cách tin cậy']),
    L(['Predict and cut data-transfer costs', 'Dự đoán và cắt giảm chi phí data transfer']),
  ],
  modules: [
    mod('vpc-design', 'network', ['VPC design', 'Thiết kế VPC'], ['Address space, subnets and routing.', 'Không gian địa chỉ, subnet và định tuyến.'], ['estimation', 'scenario-quiz'], [
      lesson('cidr-subnets', ['CIDR and subnet sizing', 'CIDR và chia subnet'], ['IP math, reserved addresses and multi-AZ layouts.', 'Tính toán IP, địa chỉ bị giữ lại và bố cục nhiều AZ.'], 15, 'available'),
      lesson('routing-endpoints', ['Routing and VPC endpoints', 'Định tuyến và VPC endpoint'], ['Route tables, IGW, NAT, egress-only IGW, gateway vs interface endpoints.', 'Route table, IGW, NAT, egress-only IGW, endpoint gateway và interface.'], 12, 'available'),
    ]),
    mod('connectivity', 'route', ['Connectivity', 'Kết nối'], ['Between VPCs and to your data centre.', 'Giữa các VPC và tới data center của bạn.'], ['scenario-quiz', 'estimation'], [
      lesson('connecting-vpcs', ['Peering, Transit Gateway or PrivateLink', 'Peering, Transit Gateway hay PrivateLink'], ['Connecting many VPCs and sharing services.', 'Kết nối nhiều VPC và chia sẻ service.'], 12, 'available'),
      lesson('hybrid', ['Hybrid: VPN and Direct Connect', 'Hybrid: VPN và Direct Connect'], ['Reaching on-premises networks, with redundancy.', 'Kết nối tới mạng on-premises, có dự phòng.'], 12, 'available'),
    ]),
    mod('dns-edge', 'globe', ['DNS & global edge', 'DNS & biên toàn cầu'], ['Steering users to the right place, fast.', 'Đưa người dùng tới đúng chỗ, thật nhanh.'], ['scenario-quiz'], [
      lesson('route53-deep', ['Route 53 in depth', 'Route 53 chuyên sâu'], ['Private zones, routing policies, health checks, Resolver.', 'Private zone, routing policy, health check, Resolver.'], 12, 'available'),
      lesson('global-edge', ['CloudFront and Global Accelerator', 'CloudFront và Global Accelerator'], ['Edge caching vs anycast acceleration.', 'Cache ở biên so với tăng tốc bằng anycast.'], 10, 'available'),
    ]),
    mod('network-cost', 'piggy-bank', ['Network costs', 'Chi phí mạng'], ['Where every byte gets billed.', 'Mỗi byte bị tính tiền ở đâu.'], ['estimation', 'canvas-fix'], [
      lesson('data-transfer-costs', ['The data-transfer cost map', 'Bản đồ chi phí data transfer'], ['Internet, cross-AZ, cross-Region, NAT, endpoints and CDN.', 'Internet, cross-AZ, cross-Region, NAT, endpoint và CDN.'], 12, 'available'),
    ]),
  ],
});
