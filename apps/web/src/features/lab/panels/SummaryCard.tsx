import type { SimResult } from '@cloudlab/sim-engine';
import { Activity, Gauge, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import { currentLocale } from '@/i18n';
import { formatNumber, formatUsd, formatVnd } from '@/lib/format';
import { cn } from '@/lib/utils';

function Tile({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'bad' }) {
  return (
    <div className="rounded-lg border bg-background/60 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-sm font-semibold tabular-nums',
          tone === 'warn' && 'text-warning',
          tone === 'bad' && 'text-danger',
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function SummaryCard({ result, chaosActive }: { result: SimResult | null; chaosActive: boolean }) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const settings = useSettings();
  if (!result) return null;
  const tt = result.totals;
  const availTone = tt.availability >= 0.999 ? 'ok' : tt.availability >= 0.99 ? 'warn' : 'bad';

  return (
    <div className="border-b p-3">
      {chaosActive && (
        <div
          role="status"
          className={cn(
            'mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            tt.survives ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
          )}
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {tt.survives ? t('chaos.survives', { errors: (tt.errorRate * 100).toFixed(1) }) : t('chaos.fails')}
        </div>
      )}
      <div className="text-xs text-muted-foreground">{t('summary.monthly')}</div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums" data-testid="lab-total">
          {formatUsd(tt.monthlyUsd, locale)}
        </span>
        <span className="text-sm text-muted-foreground">/{t('perMonth')}</span>
      </div>
      {settings.showVnd && (
        <div className="font-mono text-xs text-muted-foreground tabular-nums">≈ {formatVnd(tt.monthlyUsd * settings.vndPerUsd, locale)}</div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile
          icon={<Activity />}
          label={t('summary.latency')}
          value={`${formatNumber(tt.p95Ms, locale, { maximumFractionDigits: 0 })} ms`}
          sub={t('summary.latencySub', { avg: formatNumber(tt.latencyMs, locale, { maximumFractionDigits: 0 }) })}
          tone={tt.p95Ms > 500 ? 'bad' : tt.p95Ms > 200 ? 'warn' : 'ok'}
        />
        <Tile
          icon={<ShieldCheck />}
          label={t('summary.availability')}
          value={`${(tt.availability * 100).toFixed(tt.availability >= 0.999 ? 3 : 2)}%`}
          sub={t('summary.downtime', { min: formatNumber(tt.downtimeMinPerMonth, locale, { maximumFractionDigits: 0 }) })}
          tone={availTone}
        />
        <Tile
          icon={<Gauge />}
          label={t('summary.maxPeak')}
          value={tt.maxPeakRps === null ? '∞' : `${formatNumber(tt.maxPeakRps, locale, { maximumFractionDigits: 0 })}/s`}
          sub={t('summary.maxPeakSub')}
        />
        <Tile
          icon={<TriangleAlert />}
          label={t('summary.errors')}
          value={`${(tt.errorRate * 100).toFixed(1)}%`}
          sub={t('summary.errorsSub')}
          tone={tt.errorRate > 0.05 ? 'bad' : tt.errorRate > 0 ? 'warn' : 'ok'}
        />
      </div>
    </div>
  );
}
