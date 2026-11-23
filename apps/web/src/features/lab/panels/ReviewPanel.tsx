import { localize } from '@cloudlab/shared';
import type { Finding, SimResult } from '@cloudlab/sim-engine';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';

const SEVERITY = {
  error: { Icon: CircleAlert, cls: 'text-danger', border: 'border-l-danger' },
  warning: { Icon: TriangleAlert, cls: 'text-warning', border: 'border-l-warning' },
  info: { Icon: Info, cls: 'text-info', border: 'border-l-info' },
} as const;

export function ReviewPanel({ result, onFocus }: { result: SimResult | null; onFocus: (f: Finding) => void }) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  if (!result) return null;

  if (result.findings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center">
        <CircleCheck className="size-8 text-success" aria-hidden />
        <p className="font-medium">{t('review.clean')}</p>
        <p className="text-sm text-muted-foreground">{t('review.cleanHint')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-[11px] text-muted-foreground">{t('review.hint')}</p>
      {result.findings.map((f) => {
        const s = SEVERITY[f.severity];
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onFocus(f)}
            className={cn('rounded-lg border border-l-4 bg-card p-2.5 text-left hover:bg-muted/60', s.border)}
          >
            <div className="flex items-start gap-2">
              <s.Icon className={cn('mt-0.5 size-4 shrink-0', s.cls)} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] leading-snug font-medium">{localize(f.title, locale)}</span>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{localize(f.detail, locale)}</p>
                <div className="mt-1.5 flex gap-1.5">
                  <Badge tone="outline">{t(`severity.${f.severity}`)}</Badge>
                  <Badge tone="outline">{t(`pillar.${f.pillar}`)}</Badge>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
