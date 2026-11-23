import { HOURS_PER_MONTH, SECONDS_PER_MONTH } from './pricing.ts';
import { tx, type CostKind, type CostLine, type Flow, type ModelContext } from './types.ts';

export const total = (f: Flow) => f.r + f.w;

/** Millions of requests per month at an average rate (req/s). */
export const millionsPerMonth = (rps: number) => (rps * SECONDS_PER_MONTH) / 1e6;

/** GB per month moved at `rps` requests/second of `kb` each. */
export const gbPerMonth = (rps: number, kb: number) => (rps * kb * SECONDS_PER_MONTH) / 1e6;

export const hours = HOURS_PER_MONTH;

export function line(en: string, vi: string, usd: number, kind: CostKind): CostLine {
  return { label: tx(en, vi), usd, kind };
}

/** Typed config readers (config values come from untyped JSON). */
export const num = (ctx: ModelContext, key: string, fallback = 0) => {
  const v = Number(ctx.cfg[key]);
  return Number.isFinite(v) ? v : fallback;
};
export const str = (ctx: ModelContext, key: string, fallback = '') => String(ctx.cfg[key] ?? fallback);
export const bool = (ctx: ModelContext, key: string) => ctx.cfg[key] === true;

/** Price × regional multiplier. */
export const p = (ctx: ModelContext, usd: number) => usd * ctx.region.priceFactor;

export const fmtInt = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));
