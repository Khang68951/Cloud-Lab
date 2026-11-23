import { buildDesign, DEFAULT_SCENARIO } from '@cloudlab/catalog';
import { simulate } from '@cloudlab/sim-engine';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '@/i18n';
import { formatNumber, formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';

const OPTIONS = [
  {
    id: 'serverless',
    color: 'oklch(0.65 0.16 45)',
    build: () =>
      buildDesign(
        [
          ['u', 'users', 0, 0],
          ['api', 'apigw', 1, 0],
          ['fn', 'lambda', 2, 0, { memoryMB: '512', durationMs: 100 }],
        ],
        ['u>api', 'api>fn'],
      ),
  },
  {
    id: 'fargate',
    color: 'oklch(0.6 0.15 255)',
    build: () =>
      buildDesign(
        [
          ['u', 'users', 0, 0],
          ['lb', 'alb', 1, 0],
          ['app', 'fargate', 2, 0, { taskSize: '0.5-1', count: 2, autoscaling: true, maxCount: 500, multiAz: true }],
        ],
        ['u>lb', 'lb>app'],
      ),
  },
  {
    id: 'ec2',
    color: 'oklch(0.62 0.14 150)',
    build: () =>
      buildDesign(
        [
          ['u', 'users', 0, 0],
          ['lb', 'alb', 1, 0],
          ['app', 'ec2', 2, 0, { instanceType: 't3.medium', count: 2, autoscaling: true, maxCount: 500, multiAz: true, purchase: 'savings-plan-1y' }],
        ],
        ['u>lb', 'lb>app'],
      ),
  },
] as const;

/** Slider position (0–100) → requests/second on a log scale from 0.1 to 5,000. */
const toRps = (pos: number) => 0.1 * Math.pow(50000, pos / 100);

function costAt(id: (typeof OPTIONS)[number]['id'], rps: number) {
  const opt = OPTIONS.find((o) => o.id === id)!;
  const d = opt.build();
  // Tiny payload: we compare compute + front door, not bandwidth (same for all).
  return simulate({ ...d, scenario: { ...DEFAULT_SCENARIO, rps, peakMultiplier: 2, readRatio: 1, payloadKB: 0.1 } }).totals.monthlyUsd;
}

export function CostCrossover() {
  const { t } = useTranslation('lesson');
  const locale = currentLocale();
  const id = useId();
  const [pos, setPos] = useState(45);
  const rps = toRps(pos);

  const costs = useMemo(() => OPTIONS.map((o) => ({ ...o, usd: costAt(o.id, rps) })), [rps]);
  const max = Math.max(...costs.map((c) => c.usd));
  const cheapest = costs.reduce((a, b) => (b.usd < a.usd ? b : a));

  // Where does serverless stop being the cheapest? Scan the log scale once.
  const crossover = useMemo(() => {
    for (let p = 0; p <= 100; p += 0.5) {
      const r = toRps(p);
      const s = costAt('serverless', r);
      if (s > Math.min(costAt('fargate', r), costAt('ec2', r))) return r;
    }
    return null;
  }, []);

  return (
    <figure className="not-prose my-6 rounded-xl border bg-card p-4 sm:p-5">
      <figcaption className="mb-4 font-semibold">{t('crossover.title')}</figcaption>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm">
        <span>{t('crossover.traffic')}</span>
        <span className="font-mono font-semibold tabular-nums">
          {formatNumber(rps, locale, { maximumFractionDigits: rps < 10 ? 1 : 0 })} req/s
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ≈ {formatNumber((rps * 730 * 3600) / 1e6, locale, { maximumFractionDigits: 1 })} {t('crossover.millionPerMonth')}
          </span>
        </span>
      </label>
      <input id={id} type="range" min={0} max={100} step={0.5} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="mt-2 w-full accent-(--primary)" />
      <ul className="mt-4 flex flex-col gap-2.5">
        {costs.map((c) => (
          <li key={c.id}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className={cn(c.id === cheapest.id && 'font-semibold')}>
                {t(`crossover.options.${c.id}`)}
                {c.id === cheapest.id && <span className="ml-2 text-xs text-success">{t('crossover.cheapest')}</span>}
              </span>
              <span className="font-mono tabular-nums">{formatUsd(c.usd, locale)}/{t('perMonth')}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.max((c.usd / max) * 100, 1)}%`, background: c.color }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] leading-snug text-muted-foreground">
        {crossover !== null
          ? t('crossover.note', { rps: formatNumber(crossover, locale, { maximumFractionDigits: crossover < 10 ? 1 : 0 }) })
          : t('crossover.noCross')}
      </p>
    </figure>
  );
}
