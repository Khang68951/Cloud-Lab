import {
  assignIps,
  canConnect,
  checkReach,
  DEFAULT_NETWORK,
  defaultConfig,
  ipToString,
  listenPort,
  placementOf,
  sgRulesOf,
  validateNetwork,
  privateRoutes,
  type NetEndpoint,
  type NetworkConfig,
  type Placement,
  type SgRule,
  getService,
  isAsyncEdge,
  REGIONS,
  type CostKind,
  type CostLine,
  type Design,
  type Flow,
  type ModelContext,
  type NodeModel,
  type ServiceConfig,
  type ServiceDef,
} from '@cloudlab/catalog';
import { tx } from '@cloudlab/catalog';
import { lint } from './lint.ts';
import {
  ENGINE_VERSION,
  type ChaosOptions,
  type EdgeResult,
  type Finding,
  type NodeResult,
  type NodeStatus,
  type SimResult,
} from './types.ts';

const ZERO: Flow = { r: 0, w: 0 };
const add = (a: Flow, b: Flow): Flow => ({ r: a.r + b.r, w: a.w + b.w });
const scale = (a: Flow, k: number): Flow => ({ r: a.r * k, w: a.w * k });
const sum = (f: Flow) => f.r + f.w;

/** Probability that one AZ is down at a given moment (~4 h/year). */
const AZ_OUTAGE_P = 0.0005;
/** Utilisation thresholds. */
const BUSY = 0.8;

export interface GraphNode {
  id: string;
  def: ServiceDef;
  cfg: ServiceConfig;
  out: GraphEdge[];
  in: GraphEdge[];
  /** Display name (label or short service name). */
  name: string;
  /** Where it runs: public/private subnet, edge, AWS-managed... */
  placement: Placement;
  /** Private IP inside the VPC (numeric), null outside it or when the subnet is full. */
  ip: number | null;
  /** Inbound security group rules (empty when the node has no security group). */
  sg: SgRule[];
}
export interface GraphEdge {
  id: string;
  source: GraphNode;
  target: GraphNode;
  async: boolean;
  /** Set when the network stops this connection (no route, or the security group drops it). */
  blocked?: { kind: 'route' | 'sg'; reason: Finding['detail'] };
  /** Leaves the VPC through this NAT Gateway / VPC endpoint (picked from the private route table). */
  via?: { id: string; kind: 'nat' | 'endpoint' };
}
export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  invalidEdges: { id: string; source: string; target: string; reason: Finding['detail'] }[];
  unknownNodes: string[];
  network: NetworkConfig;
}

export function buildGraph(design: Design): Graph {
  const network = design.network ?? DEFAULT_NETWORK;
  const nodes = new Map<string, GraphNode>();
  const unknownNodes: string[] = [];
  for (const n of design.nodes) {
    const def = getService(n.service);
    if (!def) {
      unknownNodes.push(n.id);
      continue;
    }
    const cfg = { ...defaultConfig(def), ...n.config };
    const placement = placementOf(def, cfg);
    nodes.set(n.id, {
      id: n.id,
      def,
      cfg,
      out: [],
      in: [],
      name: n.label || def.short,
      placement,
      ip: null,
      sg: sgRulesOf(def, cfg, placement, network),
    });
  }
  const ips = assignIps([...nodes.values()], network);
  for (const n of nodes.values()) n.ip = ips.get(n.id) ?? null;
  const edges: GraphEdge[] = [];
  const invalidEdges: Graph['invalidEdges'] = [];
  const seen = new Set<string>();
  for (const e of design.edges) {
    const s = nodes.get(e.source);
    const t = nodes.get(e.target);
    if (!s || !t || s === t) continue;
    const key = `${s.id}>${t.id}`;
    if (seen.has(key)) continue; // duplicate connection between the same pair
    seen.add(key);
    const check = canConnect(s.def, t.def);
    if (!check.ok) {
      invalidEdges.push({ id: e.id, source: s.id, target: t.id, reason: check.reason });
      continue;
    }
    const ge: GraphEdge = { id: e.id, source: s, target: t, async: isAsyncEdge(s.def) };
    s.out.push(ge);
    t.in.push(ge);
    edges.push(ge);
  }

  // Network: can each connection actually be opened? (route table + security group)
  const endpoints = new Map<string, NetEndpoint>();
  for (const n of nodes.values())
    endpoints.set(n.id, { id: n.id, name: n.name, def: n.def, cfg: n.cfg, placement: n.placement, ip: n.ip, sg: n.sg });
  const routes = privateRoutes([...endpoints.values()]);
  for (const e of edges) {
    const r = checkReach(endpoints.get(e.source.id)!, endpoints.get(e.target.id)!, { async: e.async, routes });
    if (!r.ok) e.blocked = { kind: r.kind, reason: r.reason };
    else if (r.via) e.via = r.via;
  }
  return { nodes, edges, invalidEdges, unknownNodes, network };
}

/** Kahn topological order; nodes stuck in cycles are appended at the end. */
function topoOrder(g: Graph): { order: GraphNode[]; cyclic: string[] } {
  const indeg = new Map<string, number>();
  for (const n of g.nodes.values()) indeg.set(n.id, n.in.length);
  const queue = [...g.nodes.values()].filter((n) => n.in.length === 0);
  const order: GraphNode[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    for (const e of n.out) {
      const d = indeg.get(e.target.id)! - 1;
      indeg.set(e.target.id, d);
      if (d === 0) queue.push(e.target);
    }
  }
  const done = new Set(order.map((n) => n.id));
  const cyclic = [...g.nodes.values()].filter((n) => !done.has(n.id));
  return { order: [...order, ...cyclic], cyclic: cyclic.map((n) => n.id) };
}

/**
 * How a node passes its inbound traffic to each outgoing edge.
 * See `Behavior` in @cloudlab/catalog for the meaning of each behaviour.
 */
function distribute(n: GraphNode, inflow: Flow, nodes: Map<string, GraphNode>, payloadKB: number): Map<GraphEdge, Flow> {
  const out = new Map<GraphEdge, Flow>();
  const edges = n.out;
  if (edges.length === 0) return out;
  const b = n.def.behavior;

  if (b === 'client' || b === 'router' || b === 'nat' || b === 'endpoint') {
    for (const e of edges) out.set(e, scale(inflow, 1 / edges.length));
    return out;
  }
  if (b === 'cdn') {
    const hit = Number(n.cfg.hitRatio ?? 0.8);
    const fwd = { r: inflow.r * (1 - hit), w: inflow.w };
    for (const e of edges) out.set(e, scale(fwd, 1 / edges.length));
    return out;
  }
  if (b === 'queue') {
    if (n.def.id === 'firehose') {
      // Firehose buffers records and writes one object (or bulk request) per ~5 MB buffer.
      const perBatch = Math.max(1, (5 * 1024) / Math.max(payloadKB, 0.1));
      for (const e of edges) out.set(e, { r: 0, w: sum(inflow) / perBatch / edges.length });
      return out;
    }
    const msgs = { r: 0, w: sum(inflow) };
    for (const e of edges) out.set(e, scale(msgs, 1 / edges.length));
    return out;
  }
  if (b === 'pubsub') {
    for (const e of edges) out.set(e, { r: 0, w: sum(inflow) });
    return out;
  }
  if (b === 'service') {
    // A managed API that calls on (Athena → S3, Glue → Redshift, alarms → SNS).
    for (const e of edges) out.set(e, inflow);
    return out;
  }
  if (b === 'db' || b === 'object') {
    // Change events (S3 notifications, DynamoDB Streams) for every write.
    for (const e of edges) out.set(e, { r: 0, w: inflow.w });
    return out;
  }
  if (b === 'app') {
    const caches = edges.filter((e) => e.target.def.behavior === 'cache');
    const hit =
      caches.length === 0
        ? 0
        : caches.reduce((acc, e) => acc + Number(nodes.get(e.target.id)!.cfg.hitRatio ?? 0.85), 0) / caches.length;
    const misses = inflow.r * (1 - hit);
    for (const e of edges) {
      const tb = e.target.def.behavior;
      if (tb === 'cache') out.set(e, { r: inflow.r / caches.length, w: 0 });
      else if (tb === 'db' || tb === 'object') out.set(e, { r: misses, w: inflow.w });
      else if (tb === 'queue' || tb === 'pubsub') out.set(e, { r: 0, w: inflow.w });
      // Only the share of requests that actually leaves for the internet crosses a NAT.
      else if (tb === 'nat') out.set(e, scale(inflow, Math.min(1, Math.max(0, Number(e.target.cfg.internetShare ?? 1)))));
      else out.set(e, inflow); // service-to-service call, NAT, endpoint...
    }
    return out;
  }
  return out; // cache: terminal
}

export function simulate(design: Design, chaos: ChaosOptions = {}): SimResult {
  const g = buildGraph(design);
  const scenario = design.scenario;
  const region = REGIONS[scenario.region] ?? REGIONS['us-east-1'];
  const mult = chaos.trafficMultiplier ?? 1;
  const killed = new Set(chaos.killed ?? []);
  const { order, cyclic } = topoOrder(g);

  // 1) Traffic propagation (average rate). `drain` caps what each queue hands
  // to its consumers (share of its inflow, 1 = everything).
  const clients = order.filter((n) => n.def.behavior === 'client');
  const perClient = (scenario.rps * mult) / Math.max(clients.length, 1);
  const propagate = (drain: Map<string, number>) => {
    const inflow = new Map<string, Flow>();
    const edgeFlow = new Map<GraphEdge, Flow>();
    /** Traffic sent into connections the network blocks: those requests fail. */
    const lost = new Map<GraphEdge, Flow>();
    /** Traffic a NAT Gateway / endpoint carries for routed (not drawn) connections. */
    const routed = new Map<string, Flow>();
    for (const c of clients) inflow.set(c.id, { r: perClient * scenario.readRatio, w: perClient * (1 - scenario.readRatio) });
    for (const n of order) {
      const f = inflow.get(n.id) ?? ZERO;
      const k = drain.get(n.id) ?? 1;
      for (const [e, raw] of distribute(n, f, g.nodes, scenario.payloadKB)) {
        const ef = k === 1 ? raw : scale(raw, k);
        if (e.blocked) {
          lost.set(e, ef);
          edgeFlow.set(e, ZERO);
          continue;
        }
        edgeFlow.set(e, ef);
        inflow.set(e.target.id, add(inflow.get(e.target.id) ?? ZERO, ef));
        if (e.via) routed.set(e.via.id, add(routed.get(e.via.id) ?? ZERO, ef));
      }
    }
    // Added after the walk so it is billed on the NAT/endpoint without being forwarded again.
    for (const [id, f] of routed) inflow.set(id, add(inflow.get(id) ?? ZERO, f));
    return { inflow, edgeFlow, lost };
  };

  // Load levelling: a node fed only through queues (directly or via other
  // levelled nodes) works at its own pace, so it only needs the AVERAGE rate.
  const levelled = new Set<string>();
  for (const n of order) {
    if (n.in.length > 0 && n.in.every((e) => e.source.def.behavior === 'queue' || levelled.has(e.source.id))) levelled.add(n.id);
  }

  // 2) Per-node model, capacity, status.
  const ctxFor = (n: GraphNode, avg: Flow, k = 1): ModelContext => ({
    cfg: n.cfg,
    avg,
    peak: scale(avg, (levelled.has(n.id) ? 1 : scenario.peakMultiplier) * k),
    scenario,
    region,
  });
  const evaluate = (inflow: Map<string, Flow>) => {
    const results: Record<string, NodeResult> = {};
    for (const n of order) {
      const avg = inflow.get(n.id) ?? ZERO;
      const ctx = ctxFor(n, avg);
      const model: NodeModel = n.def.model(ctx);
      let capacity = model.capacityRps;
      let down = killed.has(n.id);
      if (chaos.azDown) {
        if (model.azLayout === 'single-az') down = true;
        if (model.azLayout === 'multi-az' && n.def.behavior === 'app' && Number.isFinite(capacity)) {
          // A fixed fleet loses the instances in the failed AZ. With Auto Scaling,
          // replacements launch in the healthy AZ (after a few minutes) up to the maximum.
          capacity = n.cfg.autoscaling === true ? n.def.model(ctxFor(n, avg, 1000)).capacityRps : capacity / 2;
        }
      }
      const peakLoad = sum(ctx.peak);
      const utilization = Number.isFinite(capacity) && capacity > 0 ? peakLoad / capacity : 0;
      let status: NodeStatus = 'ok';
      if (down) status = 'down';
      else if (sum(avg) === 0 && n.def.behavior !== 'client') status = 'idle';
      else if (utilization >= 1) status = 'saturated';
      else if (utilization >= BUSY) status = 'busy';
      // Queueing delay, approximating a multi-server queue: negligible at low load,
      // explodes near saturation (1 + ρ⁴/(1−ρ): ×1.1 at 50%, ×1.6 at 67%, ×7.6 at 90%).
      const rho = Math.min(utilization, 0.95);
      const latencyMs = model.baseLatencyMs * (1 + rho ** 4 / (1 - rho)) * (utilization >= 1 ? 3 : 1);
      const errorRate = down ? 1 : utilization > 1 ? 1 - 1 / utilization : 0;
      results[n.id] = {
        id: n.id,
        service: n.def.id,
        avg,
        peak: ctx.peak,
        model: { ...model, capacityRps: capacity },
        utilization,
        status,
        costs: [...model.costs],
        monthlyUsd: 0,
        latencyMs,
        errorRate,
        net: {
          placement: n.placement,
          ip: n.ip === null ? null : ipToString(n.ip),
          port: n.placement === 'public' || n.placement === 'private' ? listenPort(n.def, n.cfg) : null,
          sg: n.sg,
        },
      };
    }
    return results;
  };

  // Queues buffer what their consumers cannot take. Consumers pull only as fast
  // as the slowest levelled node behind the queue allows (Lambda maximum
  // concurrency / worker count tuned to protect the database); the rest waits
  // in the queue as a backlog instead of overloading anything.
  const consumersOf = (q: GraphNode): GraphNode[] => {
    const seen = new Set<string>();
    const stack = q.out.map((e) => e.target);
    const found: GraphNode[] = [];
    while (stack.length) {
      const n = stack.pop()!;
      if (seen.has(n.id) || !levelled.has(n.id)) continue;
      seen.add(n.id);
      found.push(n);
      for (const e of n.out) stack.push(e.target);
    }
    return found;
  };
  const queues = order.filter((n) => n.def.behavior === 'queue' && n.def.id !== 'firehose' && n.out.length > 0);
  const drain = new Map<string, number>();
  let { inflow, edgeFlow, lost } = propagate(drain);
  let results = evaluate(inflow);
  for (let round = 0; round < 4 && queues.length; round++) {
    let changed = false;
    for (const q of queues) {
      if (sum(inflow.get(q.id) ?? ZERO) <= 0) continue;
      let worst = 1;
      for (const c of consumersOf(q)) {
        const r = results[c.id]!;
        if (r.status === 'down') worst = Infinity;
        else if (r.utilization > worst) worst = r.utilization;
      }
      if (worst <= 1) continue;
      const k = worst === Infinity ? 0 : (drain.get(q.id) ?? 1) * (0.95 / worst);
      drain.set(q.id, k);
      changed = true;
    }
    if (!changed) break;
    ({ inflow, edgeFlow, lost } = propagate(drain));
    results = evaluate(inflow);
  }
  for (const q of queues) {
    const k = drain.get(q.id);
    if (k === undefined) continue;
    const r = results[q.id]!;
    const inRps = sum(r.avg);
    r.queue = { drainRps: inRps * k, backlogRps: inRps * (1 - k), normalInRps: mult > 0 ? inRps / mult : inRps };
  }

  // 3) Engine-level data transfer: internet egress and cross-AZ traffic.
  addTransferCosts(g, results, edgeFlow, scenario.payloadKB, region.egressPerGB, region.crossAzPerGB);

  // 4) Totals.
  const byKind: Record<CostKind, number> = { compute: 0, storage: 0, requests: 0, transfer: 0, other: 0 };
  let monthlyUsd = 0;
  for (const r of Object.values(results)) {
    r.monthlyUsd = r.costs.reduce((a, c) => a + c.usd, 0);
    for (const c of r.costs) byKind[c.kind] += c.usd;
    monthlyUsd += r.monthlyUsd;
  }

  // 5) Latency along the synchronous request path.
  const latencyMemo = new Map<string, number>();
  const pathLatency = (n: GraphNode, stack: Set<string>): number => {
    if (latencyMemo.has(n.id)) return latencyMemo.get(n.id)!;
    if (stack.has(n.id)) return 0;
    stack.add(n.id);
    const own = results[n.id]!.latencyMs;
    const total = sum(inflow.get(n.id) ?? ZERO);
    let downstream = 0;
    for (const e of n.out) {
      if (e.async || total === 0) continue;
      downstream += (sum(edgeFlow.get(e) ?? ZERO) / total) * pathLatency(e.target, stack);
    }
    stack.delete(n.id);
    const l = own + downstream;
    latencyMemo.set(n.id, l);
    return l;
  };
  const latencyMs = clients.length ? clients.reduce((a, c) => a + pathLatency(c, new Set()), 0) / clients.length : 0;

  // 6) Availability: enumerate AZ states, nodes independent within a state.
  const availability = clients.length
    ? (1 - 2 * AZ_OUTAGE_P) * systemOk(clients, results, 'none') + 2 * AZ_OUTAGE_P * systemOk(clients, results, 'one-az-down')
    : 0;

  // Chaos survival is deterministic: a node is either up or down.
  const chaosActive = Boolean(chaos.azDown || killed.size || mult > 1);
  const survives = chaosActive ? systemOk(clients, results, 'chaos') > 0.5 : undefined;

  // 7) Error rate at peak: requests rejected by overloaded nodes on the user path.
  let success = 1;
  const userRps = scenario.rps * mult;
  for (const n of g.nodes.values()) {
    const r = results[n.id]!;
    if (r.status === 'down' || r.errorRate === 0 || n.def.behavior === 'client') continue;
    const onUserPath = n.in.some((e) => !e.async);
    if (!onUserPath) continue;
    const share = userRps > 0 ? Math.min(1, sum(r.avg) / userRps) : 0;
    success *= 1 - r.errorRate * share;
  }
  // Requests sent into a blocked connection time out. A blocked call from an app
  // fails every request that app handles (except a cache: misses go to the DB).
  for (const [e, f] of lost) {
    if (e.async || userRps <= 0) continue;
    const src = e.source;
    if (src.def.behavior === 'app' && e.target.def.behavior === 'cache') continue;
    const failed = src.def.behavior === 'app' ? sum(inflow.get(src.id) ?? ZERO) : sum(f);
    success *= 1 - Math.min(1, failed / userRps);
  }
  if (survives === false) success = 0;

  // 8) Max peak RPS before the first bottleneck (capacity at max scale-out).
  let maxPeakRps: number | null = null;
  const userPeak = userRps * scenario.peakMultiplier;
  const buffered = new Set(queues.filter((q) => drain.has(q.id)).flatMap((q) => consumersOf(q).map((c) => c.id)));
  if (userPeak > 0) {
    for (const n of order) {
      if (buffered.has(n.id)) continue;
      const r = results[n.id]!;
      const load = sum(r.peak);
      if (load <= 0 || r.status === 'down') continue;
      const big = n.def.model(ctxFor(n, r.avg, 1000));
      let cap = big.capacityRps;
      if (chaos.azDown && big.azLayout === 'multi-az' && n.def.behavior === 'app' && n.cfg.autoscaling !== true) cap /= 2;
      if (!Number.isFinite(cap)) continue;
      const limit = (cap / load) * userPeak;
      maxPeakRps = maxPeakRps === null ? limit : Math.min(maxPeakRps, limit);
    }
  }

  const edges: Record<string, EdgeResult> = {};
  for (const e of g.edges)
    edges[e.id] = {
      id: e.id,
      avg: edgeFlow.get(e) ?? ZERO,
      async: e.async,
      valid: true,
      ...(e.blocked ? { blocked: e.blocked } : {}),
      ...(e.via ? { via: e.via } : {}),
    };
  for (const e of g.invalidEdges) edges[e.id] = { id: e.id, avg: ZERO, async: false, valid: false };

  const totals = {
    monthlyUsd,
    byKind,
    latencyMs,
    p95Ms: latencyMs * 2.2,
    availability,
    downtimeMinPerMonth: (1 - availability) * 730 * 60,
    maxPeakRps,
    errorRate: 1 - success,
    ...(survives === undefined ? {} : { survives }),
  };

  const findings: Finding[] = [
    ...g.unknownNodes.map((id) => ({
      id: `unknown-${id}`,
      severity: 'error' as const,
      pillar: 'operational' as const,
      nodeIds: [id],
      title: tx('Unknown service', 'Dịch vụ không xác định'),
      detail: tx('This node uses a service CloudLab does not know.', 'Node này dùng một dịch vụ mà CloudLab không biết.'),
    })),
    ...g.invalidEdges.map((e) => ({
      id: `invalid-edge-${e.id}`,
      severity: 'error' as const,
      pillar: 'operational' as const,
      nodeIds: [e.source, e.target],
      title: tx('Invalid connection', 'Kết nối không hợp lệ'),
      detail: e.reason,
    })),
    ...g.edges
      .filter((e) => e.blocked)
      .map((e) => ({
        id: `blocked-edge-${e.id}`,
        severity: 'error' as const,
        pillar: 'reliability' as const,
        nodeIds: [e.source.id, e.target.id],
        title:
          e.blocked!.kind === 'sg'
            ? tx('Connection dropped by a security group', 'Kết nối bị security group chặn')
            : tx('No network route for this connection', 'Không có route mạng cho kết nối này'),
        detail: e.blocked!.reason,
      })),
    ...networkFindings(g),
    ...(cyclic.length
      ? [
          {
            id: 'cycle',
            severity: 'warning' as const,
            pillar: 'operational' as const,
            nodeIds: cyclic,
            title: tx('Request loop', 'Vòng lặp request'),
            detail: tx(
              'These services call each other in a loop; traffic through the loop is not modelled.',
              'Các dịch vụ này gọi nhau thành vòng lặp; traffic đi qua vòng lặp không được mô phỏng.',
            ),
          },
        ]
      : []),
    ...lint({ graph: g, results, scenario, totals, edgeFlow }),
  ];

  return { engineVersion: ENGINE_VERSION, nodes: results, edges, totals, findings };
}

type AzMode = 'none' | 'one-az-down' | 'chaos';

/** Invalid CIDR layout, and subnets too small for what runs in them. */
function networkFindings(g: Graph): Finding[] {
  const out: Finding[] = validateNetwork(g.network).map((detail, i) => ({
    id: `network-invalid-${i}`,
    severity: 'error' as const,
    pillar: 'operational' as const,
    nodeIds: [],
    title: tx('Invalid VPC layout', 'Cấu hình VPC không hợp lệ'),
    detail,
  }));
  const full = [...g.nodes.values()].filter((n) => (n.placement === 'public' || n.placement === 'private') && n.ip === null);
  if (full.length && !out.length)
    out.push({
      id: 'subnet-full',
      severity: 'error',
      pillar: 'operational',
      nodeIds: full.map((n) => n.id),
      title: tx('Subnet out of IP addresses', 'Subnet hết địa chỉ IP'),
      detail: tx(
        'These resources got no private IP: their subnet is too small. Use a bigger CIDR block (a smaller number after the /).',
        'Các tài nguyên này không được cấp IP private vì subnet quá nhỏ. Hãy dùng CIDR lớn hơn (số sau dấu / nhỏ hơn).',
      ),
    });
  return out;
}

/** Probability that the user path works, evaluated recursively from the clients. */
function systemOk(clients: GraphNode[], results: Record<string, NodeResult>, mode: AzMode): number {
  const memo = new Map<string, number>();
  const up = (n: GraphNode): number => {
    const r = results[n.id]!;
    if (mode === 'chaos') return r.status === 'down' ? 0 : 1;
    if (mode === 'one-az-down' && r.model.azLayout === 'single-az') return 0;
    return r.model.availability;
  };
  const upId = (id: string): number => {
    const r = results[id];
    if (!r) return 1;
    if (mode === 'chaos') return r.status === 'down' ? 0 : 1;
    if (mode === 'one-az-down' && r.model.azLayout === 'single-az') return 0;
    return r.model.availability;
  };
  const ok = (n: GraphNode, stack: Set<string>): number => {
    if (memo.has(n.id)) return memo.get(n.id)!;
    if (stack.has(n.id)) return 1;
    stack.add(n.id);
    const sync = n.out.filter((e) => !e.async);
    const b = n.def.behavior;
    // A routed connection also needs its NAT Gateway / endpoint to be up.
    const okVia = (e: GraphEdge) => (e.blocked ? 0 : ok(e.target, stack) * (e.via ? upId(e.via.id) : 1));
    let v: number;
    if (b === 'client' || b === 'router' || b === 'cdn' || b === 'nat' || b === 'endpoint') {
      // Any healthy target is enough (load balancing / routing).
      // Users connected to nothing are not being served at all.
      const anyOk = sync.length ? 1 - sync.reduce((a, e) => a * (1 - okVia(e)), 1) : b === 'client' ? 0 : 1;
      v = (b === 'client' ? 1 : up(n)) * anyOk;
    } else if (b === 'app') {
      // Every dependency is needed — except caches (we can fall back to the DB).
      v = up(n) * sync.filter((e) => e.target.def.behavior !== 'cache').reduce((a, e) => a * okVia(e), 1);
    } else {
      v = up(n);
    }
    stack.delete(n.id);
    memo.set(n.id, v);
    return v;
  };
  return clients.reduce((a, c) => a + ok(c, new Set()), 0) / Math.max(clients.length, 1);
}

const NON_DATA_HOPS = new Set(['route53', 'waf']);

function addTransferCosts(
  g: Graph,
  results: Record<string, NodeResult>,
  edgeFlow: Map<GraphEdge, Flow>,
  payloadKB: number,
  egressPerGB: number,
  crossAzPerGB: number,
) {
  const gb = (rps: number) => (rps * payloadKB * 730 * 3600) / 1e6;

  // Responses leave AWS from the first node that actually serves data to users.
  // The charge is shown on the Users node ("data you send to your users"),
  // labelled with the service it leaves through. CloudFront prices its own.
  const egress = new Map<string, { client: string; via: string; rps: number }>();
  const walk = (client: GraphNode, e: GraphEdge, depth: number) => {
    const t = e.target;
    if (NON_DATA_HOPS.has(t.def.id) && depth < 5) {
      for (const next of t.out) walk(client, next, depth + 1);
      return;
    }
    if (t.def.id === 'cloudfront') return;
    const key = `${client.id}>${t.id}`;
    const prev = egress.get(key);
    egress.set(key, { client: client.id, via: t.def.short, rps: (prev?.rps ?? 0) + sum(edgeFlow.get(e) ?? ZERO) });
  };
  for (const n of g.nodes.values()) if (n.def.behavior === 'client') for (const e of n.out) walk(n, e, 0);
  for (const { client, via, rps } of egress.values()) {
    const usd = gb(rps) * egressPerGB;
    if (usd > 0)
      results[client]!.costs.push({
        label: tx(
          `Data transfer out to internet via ${via} (${gb(rps).toFixed(0)} GB)`,
          `Data transfer ra internet qua ${via} (${gb(rps).toFixed(0)} GB)`,
        ),
        usd,
        kind: 'transfer',
      });
  }

  // Multi-AZ app fleets talking to zonal resources: ~half the traffic crosses AZs, billed both ways.
  for (const e of g.edges) {
    const s = results[e.source.id]!;
    const t = results[e.target.id]!;
    if (e.async || e.source.def.behavior !== 'app' || s.model.azLayout !== 'multi-az') continue;
    if (t.model.azLayout === 'regional') continue;
    const usd = gb(sum(edgeFlow.get(e) ?? ZERO)) * 0.5 * crossAzPerGB * 2;
    if (usd < 0.01) continue;
    const line: CostLine = {
      label: tx(`Cross-AZ traffic → ${e.target.def.short}`, `Traffic cross-AZ → ${e.target.def.short}`),
      usd,
      kind: 'transfer',
    };
    s.costs.push(line);
  }
}
