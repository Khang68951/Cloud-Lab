import type { LocalizedText } from '@cloudlab/shared';
import { IN_VPC, type Placement } from './placement.ts';
import { tx, type ServiceConfig, type ServiceDef } from './types.ts';

/**
 * A small but real VPC model for the Lab: CIDR blocks, private IPs, security
 * groups (TCP port + source) and the route each connection needs. The engine
 * uses it to decide whether a connection on the canvas can actually happen.
 */
export interface NetworkConfig {
  vpcCidr: string;
  publicCidr: string;
  privateCidr: string;
  /**
   * Security groups start with no inbound rules, like a freshly created one
   * in AWS: the learner writes every rule. Off (default) = each resource's
   * port is pre-opened to the VPC so beginners can focus on the design.
   */
  manualSg?: boolean;
}

export const DEFAULT_NETWORK: NetworkConfig = {
  vpcCidr: '10.0.0.0/16',
  publicCidr: '10.0.1.0/24',
  privateCidr: '10.0.2.0/24',
};

export const ANYWHERE = '0.0.0.0/0';
/** Node config key holding the security group's inbound rules (see `parseSg`). */
export const SG_KEY = 'sg';

// ---------------------------------------------------------------------------
// CIDR helpers (IPv4 only)

export interface Cidr {
  base: number;
  prefix: number;
}

function parseIp(s: string): number | null {
  const parts = s.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

export function ipToString(n: number): string {
  return [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.');
}

/** Parses "10.0.1.0/24". Returns null when malformed or the address is not the network address. */
export function parseCidr(s: string): Cidr | null {
  const [ip, len] = s.trim().split('/');
  if (ip === undefined || len === undefined || !/^\d{1,2}$/.test(len)) return null;
  const prefix = Number(len);
  const base = parseIp(ip);
  if (base === null || prefix > 32) return null;
  if (base % 2 ** (32 - prefix) !== 0) return null;
  return { base, prefix };
}

export const cidrSize = (c: Cidr) => 2 ** (32 - c.prefix);
/** AWS reserves 5 addresses in every subnet (network, router, DNS, future, broadcast). */
export const usableIps = (c: Cidr) => Math.max(0, cidrSize(c) - 5);
export const ipInCidr = (ip: number, c: Cidr) => ip >= c.base && ip < c.base + cidrSize(c);
export const cidrWithin = (inner: Cidr, outer: Cidr) => inner.prefix >= outer.prefix && ipInCidr(inner.base, outer);
export const cidrOverlap = (a: Cidr, b: Cidr) => ipInCidr(a.base, b) || ipInCidr(b.base, a);

/** Problems with the VPC layout, in the words the AWS console would use. */
export function validateNetwork(net: NetworkConfig): LocalizedText[] {
  const out: LocalizedText[] = [];
  const vpc = parseCidr(net.vpcCidr);
  const pub = parseCidr(net.publicCidr);
  const priv = parseCidr(net.privateCidr);
  const bad = (what: string, whatVi: string, v: string) =>
    out.push(tx(`${what} "${v}" is not a valid CIDR block (e.g. 10.0.1.0/24).`, `${whatVi} "${v}" không phải CIDR hợp lệ (vd 10.0.1.0/24).`));
  if (!vpc) bad('VPC CIDR', 'CIDR của VPC', net.vpcCidr);
  if (!pub) bad('Public subnet CIDR', 'CIDR của public subnet', net.publicCidr);
  if (!priv) bad('Private subnet CIDR', 'CIDR của private subnet', net.privateCidr);
  if (vpc && (vpc.prefix < 16 || vpc.prefix > 28))
    out.push(tx('A VPC CIDR must be between /16 and /28.', 'CIDR của VPC phải nằm trong khoảng /16 đến /28.'));
  for (const [c, en, vi] of [
    [pub, 'public', 'public'],
    [priv, 'private', 'private'],
  ] as const) {
    if (!c) continue;
    if (c.prefix > 28) out.push(tx(`The ${en} subnet is smaller than /28.`, `Subnet ${vi} nhỏ hơn /28.`));
    if (vpc && !cidrWithin(c, vpc))
      out.push(tx(`The ${en} subnet is not inside the VPC CIDR ${net.vpcCidr}.`, `Subnet ${vi} không nằm trong CIDR của VPC ${net.vpcCidr}.`));
  }
  if (pub && priv && cidrOverlap(pub, priv))
    out.push(tx('The public and private subnets overlap.', 'Public subnet và private subnet bị chồng lên nhau.'));
  return out;
}

// ---------------------------------------------------------------------------
// Ports and security groups

/** Well-known TCP ports, used for labels and the rule presets in the Inspector. */
export const PORT_NAMES: Record<number, string> = {
  22: 'SSH',
  53: 'DNS',
  80: 'HTTP',
  389: 'LDAP',
  443: 'HTTPS',
  445: 'SMB',
  2049: 'NFS',
  2223: 'CloudHSM',
  3306: 'MySQL',
  5432: 'PostgreSQL',
  5439: 'Redshift',
  5671: 'AMQPS',
  6379: 'Redis',
  8111: 'DAX',
  8182: 'Neptune',
  9092: 'Kafka',
  27017: 'MongoDB',
};

export const portLabel = (port: number) => (PORT_NAMES[port] ? `${PORT_NAMES[port]} (TCP ${port})` : `TCP ${port}`);

/** In-VPC resources that have no security group of their own. */
const NO_SG = new Set(['nat', 'vpce', 'privatelink', 'igw', 'elastic-ip', 'network-firewall', 'gwlb', 'cloud-map']);

const FIXED_PORT: Record<string, number> = {
  alb: 443,
  nlb: 443,
  aurora: 5432,
  'aurora-serverless': 5432,
  'rds-proxy': 5432,
  documentdb: 27017,
  neptune: 8182,
  redshift: 5439,
  elasticache: 6379,
  'elasticache-serverless': 6379,
  memorydb: 6379,
  dax: 8111,
  opensearch: 443,
  efs: 2049,
  fsx: 2049,
  'fsx-ontap': 2049,
  'fsx-openzfs': 2049,
  'fsx-windows': 445,
  msk: 9092,
  'msk-serverless': 9092,
  mq: 5671,
  'route53-resolver': 53,
  'directory-service': 389,
  cloudhsm: 2223,
};

/**
 * The TCP port a resource listens on, or null when it has no security group
 * (NAT Gateway, gateway endpoint...) or lives outside the VPC.
 */
export function listenPort(def: Pick<ServiceDef, 'id' | 'behavior'>, cfg: ServiceConfig): number | null {
  if (NO_SG.has(def.id)) return null;
  if (def.id === 'rds') return cfg.engine === 'mysql' ? 3306 : 5432;
  if (FIXED_PORT[def.id]) return FIXED_PORT[def.id]!;
  if (def.behavior === 'app') return 80;
  return 443;
}

export interface SgRule {
  port: number;
  /** A CIDR ("0.0.0.0/0", "10.0.0.0/16") or another node's security group: "sg:<nodeId>". */
  source: string;
}

/** Rules are stored in the node config as "5432<sg:app,443<0.0.0.0/0". */
export function parseSg(s: string): SgRule[] {
  return s
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [port, source] = r.split('<');
      return { port: Number(port), source: (source ?? '').trim() };
    })
    .filter((r) => Number.isInteger(r.port) && r.port > 0 && r.port < 65536 && r.source !== '');
}

export const formatSg = (rules: SgRule[]) => rules.map((r) => `${r.port}<${r.source}`).join(',');

/**
 * Default inbound rules when the learner has not edited the security group:
 * an internet-facing load balancer accepts its port from anywhere, everything
 * else accepts its port from inside the VPC. With `manualSg` there are none.
 */
export function defaultSgRules(def: Pick<ServiceDef, 'id' | 'behavior'>, cfg: ServiceConfig, placement: Placement, net: NetworkConfig): SgRule[] {
  const port = listenPort(def, cfg);
  if (port === null || net.manualSg) return [];
  const lbFacingInternet = (def.id === 'alb' || def.id === 'nlb') && placement === 'public';
  return [{ port, source: lbFacingInternet ? ANYWHERE : net.vpcCidr }];
}

export function sgRulesOf(def: Pick<ServiceDef, 'id' | 'behavior'>, cfg: ServiceConfig, placement: Placement, net: NetworkConfig): SgRule[] {
  const raw = cfg[SG_KEY];
  return typeof raw === 'string' ? parseSg(raw) : defaultSgRules(def, cfg, placement, net);
}

// ---------------------------------------------------------------------------
// Reachability

/** What the engine needs to know about one end of a connection. */
export interface NetEndpoint {
  id: string;
  /** Short display name. */
  name: string;
  def: Pick<ServiceDef, 'id' | 'behavior' | 'category'>;
  cfg: ServiceConfig;
  placement: Placement;
  /** Private IP (numeric) when inside the VPC. */
  ip: number | null;
  sg: SgRule[];
}

/**
 * The private subnet's route table beyond "local": which NAT Gateway and VPC
 * endpoints exist in the VPC. They do not need to be wired on the canvas —
 * in AWS they are route-table entries, not hops you call.
 */
export interface PrivateRoutes {
  /** A NAT Gateway in the public subnet: 0.0.0.0/0 → nat. */
  nat: NetEndpoint | null;
  /** A gateway endpoint: S3 / DynamoDB prefix lists → vpce (free). */
  gatewayEndpoint: NetEndpoint | null;
  /** An interface endpoint (PrivateLink): other AWS services resolve to it privately. */
  interfaceEndpoint: NetEndpoint | null;
}

export function privateRoutes(nodes: NetEndpoint[]): PrivateRoutes {
  return {
    nat: nodes.find((n) => n.def.id === 'nat' && n.placement === 'public') ?? null,
    gatewayEndpoint: nodes.find((n) => n.def.id === 'vpce' && n.cfg.type !== 'interface') ?? null,
    interfaceEndpoint: nodes.find((n) => n.def.id === 'vpce' && n.cfg.type === 'interface') ?? null,
  };
}

export type Reach =
  | { ok: true; via?: { id: string; kind: 'nat' | 'endpoint' } }
  | { ok: false; kind: 'route' | 'sg'; reason: LocalizedText };

const OK: Reach = { ok: true };
const inVpc = (p: Placement) => IN_VPC.has(p);
/** Services reached by an AWS API call (invoking a Lambda), wherever the function runs. */
const API_TARGETS = new Set(['lambda']);
/** Gateway VPC endpoints only exist for these. */
export const GATEWAY_ENDPOINT_TARGETS: ReadonlySet<string> = new Set(['s3', 'dynamodb', 's3-express', 's3-tables']);
/** Sources whose consumers PULL (poll) rather than receive a push. */
const PULL_SOURCES = new Set(['sqs', 'kinesis', 'msk', 'msk-serverless', 'mq']);

const where = (p: Placement): LocalizedText =>
  ({
    internet: tx('the internet', 'internet'),
    edge: tx('the AWS edge (outside your VPC)', 'edge AWS (ngoài VPC)'),
    public: tx('the public subnet', 'public subnet'),
    private: tx('the private subnet', 'private subnet'),
    managed: tx('outside your VPC', 'ngoài VPC'),
  })[p];

function sgAllows(target: NetEndpoint, source: NetEndpoint, port: number, cidrOf: (s: string) => Cidr | null): boolean {
  return target.sg.some((r) => {
    if (r.port !== port) return false;
    if (r.source === ANYWHERE) return true;
    if (r.source.startsWith('sg:')) return inVpc(source.placement) && r.source.slice(3) === source.id;
    const c = cidrOf(r.source);
    return c !== null && source.ip !== null && ipInCidr(source.ip, c);
  });
}

/**
 * Route out of the VPC for `from` (in a subnet) to `to` (outside the VPC), the
 * way AWS picks it: the most specific route wins, so a gateway endpoint beats
 * 0.0.0.0/0 for S3/DynamoDB, and an interface endpoint's private DNS beats NAT
 * for AWS services. The internet itself is only reachable through NAT.
 */
function routeOut(from: NetEndpoint, to: NetEndpoint, toPlacement: Placement, routes: PrivateRoutes): Reach {
  if (from.placement === 'public') {
    if (from.def.id === 'lambda')
      return {
        ok: false,
        kind: 'route',
        reason: tx(
          'A Lambda function attached to a VPC never gets a public IP, so a public subnet does not give it internet access. Put it in a private subnet and add a NAT Gateway or VPC Endpoint.',
          'Lambda gắn vào VPC không bao giờ có IP public, nên đặt ở public subnet cũng không ra được internet. Hãy đặt nó vào private subnet và thêm NAT Gateway hoặc VPC Endpoint.',
        ),
      };
    return OK; // public subnet: 0.0.0.0/0 → Internet Gateway
  }
  if (routes.gatewayEndpoint && GATEWAY_ENDPOINT_TARGETS.has(to.def.id)) return { ok: true, via: { id: routes.gatewayEndpoint.id, kind: 'endpoint' } };
  if (routes.interfaceEndpoint && toPlacement === 'managed') return { ok: true, via: { id: routes.interfaceEndpoint.id, kind: 'endpoint' } };
  if (routes.nat) return { ok: true, via: { id: routes.nat.id, kind: 'nat' } };
  const awsService = toPlacement === 'managed';
  return {
    ok: false,
    kind: 'route',
    reason: awsService
      ? tx(
          `${from.name} is in a private subnet and its route table has no route to ${to.name}. Add a VPC Endpoint (Gateway type is free for S3/DynamoDB, Interface for other services) or a NAT Gateway to the VPC.`,
          `${from.name} nằm trong private subnet và route table của nó không có đường tới ${to.name}. Hãy thêm VPC Endpoint (loại Gateway miễn phí cho S3/DynamoDB, loại Interface cho dịch vụ khác) hoặc NAT Gateway vào VPC.`,
        )
      : tx(
          `${from.name} is in a private subnet and its route table has no 0.0.0.0/0 route. Add a NAT Gateway in the public subnet.`,
          `${from.name} nằm trong private subnet và route table của nó không có route 0.0.0.0/0. Hãy thêm NAT Gateway ở public subnet.`,
        ),
  };
}

/**
 * Can `s` open a connection to `t`? Mirrors what AWS checks: first a route
 * (internet ↔ public subnet via the Internet Gateway, private subnets only
 * outward through NAT or a VPC endpoint), then the target's security group.
 */
export function checkReach(s: NetEndpoint, t: NetEndpoint, opts: { async: boolean; routes: PrivateRoutes }): Reach {
  const sIn = inVpc(s.placement);
  // Invoking a Lambda is an AWS API call: the target's network does not matter.
  const tPlacement: Placement = API_TARGETS.has(t.def.id) ? 'managed' : t.placement;
  const tIn = inVpc(tPlacement);

  // A consumer in the VPC polling a queue/stream outside it: the consumer opens the connection.
  if (opts.async && tIn && !sIn && PULL_SOURCES.has(s.def.id)) {
    const r = routeOut(t, s, s.placement, opts.routes);
    if (!r.ok)
      return {
        ok: false,
        kind: 'route',
        reason: tx(
          `${t.name} has to poll ${s.name} itself, but cannot get out of its subnet: ${r.reason.en}`,
          `${t.name} phải tự kéo message từ ${s.name}, nhưng không ra khỏi subnet được: ${r.reason.vi}`,
        ),
      };
    return r;
  }

  if (!sIn && !tIn) return OK; // internet / AWS network on both ends

  if (!sIn && tIn) {
    if (tPlacement === 'private')
      return {
        ok: false,
        kind: 'route',
        reason: tx(
          `${t.name} is in a private subnet: nothing from ${where(s.placement).en} has a route to it. Put a load balancer in the public subnet in front of it.`,
          `${t.name} nằm trong private subnet: từ ${where(s.placement).vi} không có route nào vào được. Hãy đặt một load balancer ở public subnet phía trước nó.`,
        ),
      };
    return sgCheck(s, t);
  }

  if (sIn && !tIn) {
    if (s.def.id === 'nat') {
      if (s.placement !== 'public')
        return {
          ok: false,
          kind: 'route',
          reason: tx(
            'This NAT Gateway is in a private subnet, so it has no route to the Internet Gateway.',
            'NAT Gateway này nằm trong private subnet nên không có route tới Internet Gateway.',
          ),
        };
      return OK;
    }
    if (s.def.id === 'vpce') {
      if (s.cfg.type !== 'interface' && !GATEWAY_ENDPOINT_TARGETS.has(t.def.id))
        return {
          ok: false,
          kind: 'route',
          reason: tx(
            `Gateway endpoints only exist for S3 and DynamoDB. Reach ${t.name} with an Interface endpoint (PrivateLink) or a NAT Gateway.`,
            `Gateway endpoint chỉ có cho S3 và DynamoDB. Muốn tới ${t.name} hãy dùng Interface endpoint (PrivateLink) hoặc NAT Gateway.`,
          ),
        };
      return OK;
    }
    return routeOut(s, t, tPlacement, opts.routes);
  }

  return sgCheck(s, t); // both inside the VPC: the "local" route always exists
}

let cidrCache = new Map<string, Cidr | null>();
const cachedCidr = (s: string) => {
  if (!cidrCache.has(s)) {
    if (cidrCache.size > 500) cidrCache = new Map();
    cidrCache.set(s, parseCidr(s));
  }
  return cidrCache.get(s)!;
};

function sgCheck(s: NetEndpoint, t: NetEndpoint): Reach {
  const port = listenPort(t.def, t.cfg);
  if (port === null) return OK;
  if (sgAllows(t, s, port, cachedCidr)) return OK;
  const from = inVpc(s.placement) && s.ip !== null ? `${s.name} (${ipToString(s.ip)})` : `${s.name} (${where(s.placement).en})`;
  const fromVi = inVpc(s.placement) && s.ip !== null ? `${s.name} (${ipToString(s.ip)})` : `${s.name} (${where(s.placement).vi})`;
  return {
    ok: false,
    kind: 'sg',
    reason: tx(
      `The security group of ${t.name} has no inbound rule for ${portLabel(port)} from ${from}.`,
      `Security group của ${t.name} không có rule inbound cho ${portLabel(port)} từ ${fromVi}.`,
    ),
  };
}

/**
 * Hands out private IPs in each subnet (first 4 addresses are reserved by AWS),
 * in node order. Nodes outside the VPC get null.
 */
export function assignIps(nodes: { id: string; placement: Placement }[], net: NetworkConfig): Map<string, number | null> {
  const cidr = { public: parseCidr(net.publicCidr), private: parseCidr(net.privateCidr) };
  const next = { public: 0, private: 0 };
  const out = new Map<string, number | null>();
  for (const n of nodes) {
    if (n.placement !== 'public' && n.placement !== 'private') {
      out.set(n.id, null);
      continue;
    }
    const c = cidr[n.placement];
    const i = next[n.placement]++;
    out.set(n.id, c && i < usableIps(c) ? c.base + 4 + i : null);
  }
  return out;
}
