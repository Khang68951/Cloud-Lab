import type { AzLayout, Placement } from '@learninglab/catalog';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ZONE_ICON } from './hues';

/** Strip on top of a Lab node telling where it lives: public/private subnet, edge or AWS-managed. */
export function ZoneChip({ zone, az, ip, full, className }: { zone: Placement; az?: AzLayout; ip?: string | null; full?: boolean; className?: string }) {
  const { t } = useTranslation('lab');
  const Icon = ZONE_ICON[zone];
  const azText = az === 'single-az' ? t('zone.az1') : az === 'multi-az' && (zone === 'public' || zone === 'private') ? t('zone.azMulti') : null;
  return (
    <div
      className={cn('zone flex items-center gap-1 rounded-t-[10px] bg-(--zc-soft) px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-(--zc) uppercase', className)}
      data-zone={zone}
      data-testid="zone-chip"
      title={t(`zone.help.${zone}`)}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{full ? t(`zone.${zone}`) : t(`zone.short.${zone}`)}</span>
      {ip && <span className="shrink-0 font-mono font-medium tracking-normal normal-case opacity-80">{ip}</span>}
      {azText && <span className={cn('ml-auto shrink-0 normal-case', az === 'single-az' && 'text-warning')}>{azText}</span>}
    </div>
  );
}
