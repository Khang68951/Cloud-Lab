import type { CostKind, CostLine, Flow, NodeModel } from '@cloudlab/catalog';
import type { LocalizedText } from '@cloudlab/shared';

export const ENGINE_VERSION = 1;

export interface ChaosOptions {
  /** Take Availability Zone "a" offline (single-AZ resources live there). */
  azDown?: boolean;
  /** Node ids forced down. */
  killed?: string[];
  /** Multiply all traffic (e.g. 10 = a 10× spike). */
  trafficMultiplier?: number;
}

export type NodeStatus = 'ok' | 'busy' | 'saturated' | 'down' | 'idle';

export interface NodeResult {
  id: string;
  service: string;
  avg: Flow;
  peak: Flow;
  model: NodeModel;
  /** Peak load / capacity (0 when capacity is unlimited). */
  utilization: number;
  status: NodeStatus;
  costs: CostLine[];
  monthlyUsd: number;
  /** Latency added by this node at current load, ms. */
  latencyMs: number;
  /** Share of requests this node rejects because it is overloaded. */
  errorRate: number;
}

export interface EdgeResult {
  id: string;
  avg: Flow;
  async: boolean;
  valid: boolean;
}

export type Severity = 'error' | 'warning' | 'info';
export type Pillar = 'reliability' | 'performance' | 'cost' | 'security' | 'operational';

export interface Finding {
  id: string;
  severity: Severity;
  pillar: Pillar;
  nodeIds: string[];
  title: LocalizedText;
  detail: LocalizedText;
}

export interface SimTotals {
  monthlyUsd: number;
  byKind: Record<CostKind, number>;
  /** Mean latency of a user request, ms. */
  latencyMs: number;
  /** Rough p95 estimate, ms. */
  p95Ms: number;
  /** Probability the system serves requests (0–1), from component availability incl. AZ outages. */
  availability: number;
  downtimeMinPerMonth: number;
  /** Highest peak RPS the design can take before something saturates (null = no limit found). */
  maxPeakRps: number | null;
  /** Share of requests failing at peak due to overload or chaos. */
  errorRate: number;
  /** Only set when chaos is active: does the system still serve users? */
  survives?: boolean;
}

export interface SimResult {
  engineVersion: number;
  nodes: Record<string, NodeResult>;
  edges: Record<string, EdgeResult>;
  totals: SimTotals;
  findings: Finding[];
}
