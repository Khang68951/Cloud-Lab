import { getService, placementOf } from '@cloudlab/catalog';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Inbox } from 'lucide-react';
import { ZoneChip } from './ZoneChip';
import { memo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '@/i18n';
import { formatNumber, formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLab } from './context';
import type { LabNode } from './model';
import { CATEGORY_HUE } from './hues';
import { ServiceIcon } from './visuals';

const HANDLES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
] as const;

function ServiceNodeImpl({ id, data, selected }: NodeProps<LabNode>) {
  const { t } = useTranslation('lab');
  const { result, highlighted } = useLab();
  const def = getService(data.service);
  const r = result?.nodes[id];
  const locale = currentLocale();
  if (!def) return <div className="rounded-md border border-danger p-2 text-xs">? {data.service}</div>;

  const isUsers = def.behavior === 'client';
  const status = r?.status ?? 'ok';
  const util = r?.utilization ?? 0;
  const finite = r ? Number.isFinite(r.model.capacityRps) : false;
  const totalRps = r ? r.avg.r + r.avg.w : 0;
  const queue = r?.queue;
  const zone = placementOf(def, data.config);
  const compact = (x: number) =>
    x >= 1000 ? `${formatNumber(x / 1000, locale, { maximumFractionDigits: 1 })}k` : formatNumber(x, locale, { maximumFractionDigits: 0 });

  return (
    <div
      className={cn(
        'track-accent group relative w-[176px] rounded-xl border-2 bg-card text-card-foreground shadow-sm transition-shadow',
        selected ? 'border-primary shadow-md' : 'border-border',
        status === 'saturated' && !selected && 'border-danger',
        status === 'busy' && !selected && 'border-warning',
        status === 'down' && 'opacity-60 grayscale',
        zone === 'managed' && !selected && status === 'ok' && 'border-dashed',
        highlighted.has(id) && 'ring-4 ring-warning/60',
      )}
      style={{ '--hue': CATEGORY_HUE[def.category] } as CSSProperties}
      data-status={status}
      data-zone={zone}
    >
      {HANDLES.map((h) => (
        <Handle
          key={h.id}
          id={h.id}
          type="source"
          position={h.position}
          className="size-3! border-2! border-card! bg-primary! opacity-0 transition-opacity group-hover:opacity-100 [.connecting_&]:opacity-100"
        />
      ))}

      {!isUsers && <ZoneChip zone={zone} az={r?.model.azLayout} ip={r?.net.ip} />}

      <div className="flex items-center gap-2.5 p-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--tc-soft) text-(--tc)">
          <ServiceIcon name={def.icon} className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] leading-tight font-semibold">{data.label || def.short}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {isUsers ? `${Math.round(totalRps).toLocaleString(locale)} req/s` : data.label ? def.short : r?.model.summary || def.short}
          </div>
        </div>
      </div>

      {queue && queue.backlogRps > 0 && (
        <div
          className="relative overflow-hidden border-t bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning"
          title={t('queuePilingHelp', { drain: formatNumber(queue.drainRps, locale, { maximumFractionDigits: 0 }) })}
          data-testid="queue-backlog"
        >
          <span className="queue-fill absolute inset-y-0 left-0 bg-warning/20" aria-hidden />
          <span className="relative flex items-center gap-1 tabular-nums">
            <Inbox className="size-3" aria-hidden />
            {t('queuePiling', { rps: compact(queue.backlogRps) })}
          </span>
        </div>
      )}

      {(!isUsers || (r?.monthlyUsd ?? 0) > 0) && (
        <div className="flex items-center justify-between gap-2 border-t px-2.5 py-1.5 text-[11px]">
          <span className="font-mono font-medium tabular-nums">
            {r ? formatUsd(r.monthlyUsd, locale) : '—'}
            <span className="text-muted-foreground">/{t('perMonthShort')}</span>
          </span>
          {isUsers ? (
            <span className="text-muted-foreground">{t('dataOut')}</span>
          ) : status === 'down' ? (
            <span className="rounded bg-danger-soft px-1.5 font-semibold text-danger">{t('status.down')}</span>
          ) : finite ? (
            <span
              className={cn(
                'rounded px-1.5 font-semibold tabular-nums',
                util >= 1 ? 'bg-danger-soft text-danger' : util >= 0.8 ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success',
              )}
              title={t('utilizationAtPeak')}
            >
              {Math.round(util * 100)}%
            </span>
          ) : (
            <span className="text-muted-foreground" title={t('autoScales')}>
              ∞
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const ServiceNode = memo(ServiceNodeImpl);
