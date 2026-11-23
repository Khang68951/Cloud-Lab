import {
  canConnect,
  defaultConfig,
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
}
export interface GraphEdge {
  id: string;
  source: GraphNode;
  target: GraphNode;
  async: boolean;
}
export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  invalidEdges: { id: string; source: string; target: string; reason: Finding['detail'] }[];
  unknownNodes: string[];
}

export function buildGraph(design: Design): Graph {
  const nodes = new Map<string, GraphNode>();
  const unknownNodes: string[] = [];
  for (const n of design.nodes) {
    const def = getService(n.service);
    if (!def) {
      unknownNodes.push(n.id);
      continue;
    }
    nodes.set(n.id, { id: n.id, def, cfg: { ...defaultConfig(def), ...n.config }, out: [], in: [] });
  }
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
  return { nodes, edges, invalidEdges, unknownNodes };
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

  // 1) Traffic propagation (average rate).
  const inflow = new Map<string, Flow>();
  const edgeFlow = new Map<GraphEdge, Flow>();
  const clients = order.filter((n) => n.def.behavior === 'client');
  const perClient = (scenario.rps * mult) / Math.max(clients.length, 1);
  for (const c of clients) inflow.set(c.id, { r: perClient * scenario.readRatio, w: perClient * (1 - scenario.readRatio) });
  for (const n of order) {
    const f = inflow.get(n.id) ?? ZERO;
    for (const [e, ef] of distribute(n, f, g.nodes, scenario.payloadKB)) {
      edgeFlow.set(e, ef);
      inflow.set(e.target.id, add(inflow.get(e.target.id) ?? ZERO, ef));
    }
  }

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
    };
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
  if (survives === false) success = 0;

  // 8) Max peak RPS before the first bottleneck (capacity at max scale-out).
  let maxPeakRps: number | null = null;
  const userPeak = userRps * scenario.peakMultiplier;
  if (userPeak > 0) {
    for (const n of order) {
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
  for (const e of g.edges) edges[e.id] = { id: e.id, avg: edgeFlow.get(e) ?? ZERO, async: e.async, valid: true };
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

/** Probability that the user path works, evaluated recursively from the clients. */
function systemOk(clients: GraphNode[], results: Record<string, NodeResult>, mode: AzMode): number {
  const memo = new Map<string, number>();
  const up = (n: GraphNode): number => {
    const r = results[n.id]!;
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
    let v: number;
    if (b === 'client' || b === 'router' || b === 'cdn' || b === 'nat' || b === 'endpoint') {
      // Any healthy target is enough (load balancing / routing).
      // Users connected to nothing are not being served at all.
      const anyOk = sync.length ? 1 - sync.reduce((a, e) => a * (1 - ok(e.target, stack)), 1) : b === 'client' ? 0 : 1;
      v = (b === 'client' ? 1 : up(n)) * anyOk;
    } else if (b === 'app') {
      // Every dependency is needed — except caches (we can fall back to the DB).
      v = up(n) * sync.filter((e) => e.target.def.behavior !== 'cache').reduce((a, e) => a * ok(e.target, stack), 1);
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
