import { tx, type LocalizedText } from '@learninglab/shared';

/** Shorthand for bilingual text in catalog data (re-exported from shared for existing imports). */
export { tx };

export const CATEGORIES = [
  'client',
  'edge',
  'network',
  'compute',
  'database',
  'storage',
  'messaging',
  'security',
  'analytics',
  'ml',
  'management',
  'devtools',
  'iot',
  'media',
  'migration',
  'business',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, LocalizedText> = {
  client: tx('Users', 'Người dùng'),
  edge: tx('Edge & DNS', 'Edge & DNS'),
  network: tx('Networking', 'Mạng'),
  compute: tx('Compute', 'Compute'),
  database: tx('Databases & cache', 'Database & cache'),
  storage: tx('Storage', 'Lưu trữ'),
  messaging: tx('Messaging & integration', 'Messaging & tích hợp'),
  security: tx('Security & identity', 'Bảo mật & định danh'),
  analytics: tx('Analytics', 'Analytics'),
  ml: tx('AI & machine learning', 'AI & machine learning'),
  management: tx('Management & monitoring', 'Quản trị & giám sát'),
  devtools: tx('Developer tools', 'Công cụ lập trình'),
  iot: tx('Internet of Things', 'Internet of Things'),
  media: tx('Media services', 'Dịch vụ media'),
  migration: tx('Migration & transfer', 'Migration & chuyển dữ liệu'),
  business: tx('Front-end, business & end-user', 'Front-end, doanh nghiệp & người dùng cuối'),
};

/**
 * How a service moves traffic. The engine uses this to decide what flows
 * downstream (see sim-engine/src/traffic.ts).
 *  - router:  forwards everything, split evenly across targets (DNS, LB, WAF, API GW)
 *  - cdn:     serves cached reads, forwards misses + writes
 *  - app:     runs code; reads → cache (misses → DB), writes → DB, events → queues
 *  - cache / db / object: terminal data stores
 *  - queue:   async buffer; consumers share (split) the messages
 *  - pubsub:  async fan-out; every subscriber receives every message
 *  - nat / endpoint: network hops that forward everything
 *  - service: a managed API your code calls (KMS, Bedrock, CloudWatch...):
 *             terminal on the request path; may emit events to compute/queues
 */
export type Behavior =
  | 'client'
  | 'router'
  | 'cdn'
  | 'app'
  | 'cache'
  | 'db'
  | 'object'
  | 'queue'
  | 'pubsub'
  | 'nat'
  | 'endpoint'
  | 'service';

/** Where a service lives, for AZ-failure modelling. */
export type AzLayout = 'regional' | 'single-az' | 'multi-az';

export type FieldSpec =
  | {
      key: string;
      kind: 'select';
      label: LocalizedText;
      help?: LocalizedText;
      options: { value: string; label: string | LocalizedText }[];
      default: string;
    }
  | {
      key: string;
      kind: 'number';
      label: LocalizedText;
      help?: LocalizedText;
      min: number;
      max: number;
      step: number;
      unit?: string;
      default: number;
    }
  | { key: string; kind: 'toggle'; label: LocalizedText; help?: LocalizedText; default: boolean };

export type ServiceConfig = Record<string, string | number | boolean>;

/** Requests per second, split into reads and writes. */
export interface Flow {
  r: number;
  w: number;
}

export type CostKind = 'compute' | 'storage' | 'requests' | 'transfer' | 'other';

export interface CostLine {
  label: LocalizedText;
  usd: number;
  kind: CostKind;
}

export interface Scenario {
  /** Average requests per second from all users. */
  rps: number;
  /** Peak = rps × peakMultiplier (capacity is checked at peak). */
  peakMultiplier: number;
  /** Fraction of requests that are reads (0–1). */
  readRatio: number;
  /** Average response size in KB. */
  payloadKB: number;
  region: RegionId;
}

export type RegionId = 'us-east-1' | 'ap-southeast-1';

export interface ModelContext {
  cfg: ServiceConfig;
  /** Average inbound traffic (used for monthly cost). */
  avg: Flow;
  /** Peak inbound traffic (used for capacity / autoscaling). */
  peak: Flow;
  scenario: Scenario;
  /** Regional price multiplier etc. */
  region: RegionInfo;
}

export interface NodeModel {
  /** Max requests/second this node can serve. Infinity = scales automatically. */
  capacityRps: number;
  /** Latency added by this node at low load, ms. */
  baseLatencyMs: number;
  /** Probability the node is up, assuming its AZ(s) are up. */
  availability: number;
  azLayout: AzLayout;
  costs: CostLine[];
  /** Short human summary shown on the canvas, e.g. "2× t3.medium". */
  summary: string;
  /** Number of running instances/nodes/tasks, when meaningful. */
  instances?: number;
}

export interface ServiceDocs {
  whenToUse: LocalizedText[];
  whenNotTo: LocalizedText[];
  pros: LocalizedText[];
  cons: LocalizedText[];
  pitfalls: LocalizedText[];
  pricing: LocalizedText;
}

export interface ServiceDef {
  id: string;
  /** Official name — brand names are never translated. */
  name: string;
  short: string;
  category: Category;
  /**
   * 'core' services are listed in the Lab palette; every other service is
   * reached through the category's "See all" dialog (still fully simulated).
   */
  tier?: 'core' | 'advanced';
  behavior: Behavior;
  /** Icon name in the web icon registry. */
  icon: string;
  equivalents?: { azure: string; gcp: string };
  description: LocalizedText;
  docs: ServiceDocs;
  fields: FieldSpec[];
  model: (ctx: ModelContext) => NodeModel;
}

export interface RegionInfo {
  id: RegionId;
  name: LocalizedText;
  /** Multiplier applied to most prices vs us-east-1. */
  priceFactor: number;
  /** Data transfer out to the internet, USD/GB (first 10 TB tier). */
  egressPerGB: number;
  /** Cross-AZ transfer, USD/GB (charged in each direction). */
  crossAzPerGB: number;
}

export function defaultConfig(def: Pick<ServiceDef, 'fields'>): ServiceConfig {
  return Object.fromEntries(def.fields.map((f) => [f.key, f.default]));
}
