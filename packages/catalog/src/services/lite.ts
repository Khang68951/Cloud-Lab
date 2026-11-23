import { tx, type Behavior, type Category, type CostLine, type FieldSpec, type ServiceDef } from '../types.ts';
import { gbPerMonth, hours, line, millionsPerMonth, num, p, total } from '../util.ts';

/**
 * Compact definitions for the long tail of AWS services. Each one gets a
 * bilingual description, a simple usage-based price model and auto-generated
 * pricing docs, so it can be dropped on the canvas, connected and costed.
 * Deeper docs (when to use, pitfalls...) arrive with the lessons over time.
 *
 * Prices are rounded us-east-1 list prices for learning, not quotes.
 */
export type Price =
  /** USD per million requests reaching the node. */
  | { req: number; what?: [en: string, vi: string] }
  /** USD per hour per unit (units = the `count` field). */
  | { hour: number }
  /** USD per month per unit (or flat when the service has no `unit`). */
  | { month: number }
  /** USD per GB flowing through the node (payload × requests). */
  | { gb: number; what?: [en: string, vi: string] }
  /** USD per GB-month stored (the `storageGB` field). */
  | { store: number; defaultGB?: number }
  | { free: true };

export interface LiteSpec {
  id: string;
  name: string;
  short: string;
  cat: Category;
  icon: string;
  /** Defaults to 'service' (a managed API called by your code). */
  b?: Behavior;
  /** Shown directly in the palette instead of only in "See all". */
  core?: boolean;
  en: string;
  vi: string;
  price: Price[];
  /** What one `count` unit is, e.g. ['instance', 'instance']. Adds the count field. */
  unit?: [en: string, vi: string];
  units?: number;
  /** Capacity per unit (req/s) — omitted = scales automatically. */
  capPerUnit?: number;
  latency?: number;
  availability?: number;
  /** Extra pricing note appended to the generated text. */
  note?: [en: string, vi: string];
  use?: [en: string, vi: string];
  eq?: [azure: string, gcp: string];
}

const LATENCY: Partial<Record<Behavior, number>> = {
  router: 3,
  endpoint: 1,
  cdn: 5,
  app: 30,
  db: 8,
  cache: 1,
  object: 15,
  queue: 10,
  pubsub: 10,
  service: 20,
};

const usd = (n: number) => `$${n < 0.01 ? n.toPrecision(2) : n.toLocaleString('en-US', { maximumFractionDigits: 3 })}`;

function priceText(spec: LiteSpec): [string, string] {
  const [ue, uv] = spec.unit ?? ['', ''];
  const parts = spec.price.map((pr): [string, string] => {
    if ('free' in pr) return ['No extra charge (you pay for the resources it uses)', 'Không thu thêm (chỉ trả cho tài nguyên nó dùng)'];
    if ('req' in pr) {
      const [we, wv] = pr.what ?? ['requests', 'request'];
      return [`${usd(pr.req)} per million ${we}`, `${usd(pr.req)} mỗi triệu ${wv}`];
    }
    if ('hour' in pr) return spec.unit ? [`${usd(pr.hour)}/hour per ${ue}`, `${usd(pr.hour)}/giờ mỗi ${uv}`] : [`${usd(pr.hour)}/hour`, `${usd(pr.hour)}/giờ`];
    if ('month' in pr)
      return spec.unit ? [`${usd(pr.month)}/month per ${ue}`, `${usd(pr.month)}/tháng mỗi ${uv}`] : [`${usd(pr.month)}/month`, `${usd(pr.month)}/tháng`];
    if ('gb' in pr) {
      const [we, wv] = pr.what ?? ['processed', 'xử lý'];
      return [`${usd(pr.gb)} per GB ${we}`, `${usd(pr.gb)} mỗi GB ${wv}`];
    }
    return [`${usd(pr.store)} per GB-month stored`, `${usd(pr.store)} mỗi GB-tháng lưu trữ`];
  });
  let en = parts.map((x) => x[0]).join(' + ');
  let vi = parts.map((x) => x[1]).join(' + ');
  if (spec.note) {
    en += `. ${spec.note[0]}`;
    vi += `. ${spec.note[1]}`;
  }
  return [`${en}.`, `${vi}.`];
}

export function lite(spec: LiteSpec): ServiceDef {
  const b = spec.b ?? 'service';
  const fields: FieldSpec[] = [];
  if (spec.unit) {
    fields.push({
      key: 'count',
      kind: 'number',
      label: tx(`Number of ${spec.unit[0]}s`, `Số ${spec.unit[1]}`),
      min: 1,
      max: 10_000,
      step: 1,
      default: spec.units ?? 1,
    });
  }
  const store = spec.price.find((x): x is Extract<Price, { store: number }> => 'store' in x);
  if (store) {
    fields.push({
      key: 'storageGB',
      kind: 'number',
      label: tx('Data stored', 'Dung lượng lưu trữ'),
      min: 1,
      max: 10_000_000,
      step: 10,
      unit: 'GB',
      default: store.defaultGB ?? 100,
    });
  }
  const [pricingEn, pricingVi] = priceText(spec);

  return {
    id: spec.id,
    name: spec.name,
    short: spec.short,
    category: spec.cat,
    tier: spec.core ? 'core' : 'advanced',
    behavior: b,
    icon: spec.icon,
    ...(spec.eq ? { equivalents: { azure: spec.eq[0], gcp: spec.eq[1] } } : {}),
    description: tx(spec.en, spec.vi),
    docs: {
      whenToUse: spec.use ? [tx(spec.use[0], spec.use[1])] : [],
      whenNotTo: [],
      pros: [],
      cons: [],
      pitfalls: [],
      pricing: tx(pricingEn, pricingVi),
    },
    fields,
    model: (ctx) => {
      const n = spec.unit ? Math.max(1, num(ctx, 'count', spec.units ?? 1)) : 1;
      const [ue, uv] = spec.unit ?? ['', ''];
      const costs: CostLine[] = [];
      for (const pr of spec.price) {
        if ('req' in pr) {
          const [we, wv] = pr.what ?? ['Requests', 'Request'];
          costs.push(line(cap(we), cap(wv), p(ctx, millionsPerMonth(total(ctx.avg)) * pr.req), 'requests'));
        } else if ('hour' in pr) {
          costs.push(line(spec.unit ? `${n}× ${ue}` : 'Running hours', spec.unit ? `${n}× ${uv}` : 'Giờ chạy', p(ctx, n * pr.hour * hours), 'compute'));
        } else if ('month' in pr) {
          costs.push(line(spec.unit ? `${n}× ${ue}` : 'Monthly fee', spec.unit ? `${n}× ${uv}` : 'Phí hằng tháng', p(ctx, n * pr.month), 'other'));
        } else if ('gb' in pr) {
          const [we, wv] = pr.what ?? ['processed', 'xử lý'];
          costs.push(line(`Data ${we}`, `Dữ liệu ${wv}`, p(ctx, gbPerMonth(total(ctx.avg), ctx.scenario.payloadKB) * pr.gb), 'transfer'));
        } else if ('store' in pr) {
          costs.push(line('Storage', 'Lưu trữ', p(ctx, num(ctx, 'storageGB', pr.defaultGB ?? 100) * pr.store), 'storage'));
        }
      }
      return {
        capacityRps: spec.capPerUnit ? n * spec.capPerUnit : Infinity,
        baseLatencyMs: spec.latency ?? LATENCY[b] ?? 10,
        availability: spec.availability ?? 0.9995,
        azLayout: 'regional',
        costs,
        summary: spec.unit ? `${n}× ${ue}` : spec.short,
        ...(spec.unit ? { instances: n } : {}),
      };
    },
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
