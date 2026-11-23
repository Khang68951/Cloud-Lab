import { CircleAlert, Info, KeyRound, Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const STYLES = {
  tip: { Icon: Lightbulb, cls: 'border-success/40 bg-success-soft', icon: 'text-success' },
  warning: { Icon: CircleAlert, cls: 'border-warning/40 bg-warning-soft', icon: 'text-warning' },
  info: { Icon: Info, cls: 'border-info/40 bg-info-soft', icon: 'text-info' },
  key: { Icon: KeyRound, cls: 'border-primary/40 bg-accent', icon: 'text-primary' },
} as const;

export function Callout({ type = 'info', children }: { type?: keyof typeof STYLES; children: ReactNode }) {
  const { t } = useTranslation('lesson');
  const s = STYLES[type] ?? STYLES.info;
  return (
    <aside className={cn('not-prose my-5 flex gap-3 rounded-xl border p-4 text-[15px] leading-relaxed', s.cls)}>
      <s.Icon className={cn('mt-0.5 size-5 shrink-0', s.icon)} aria-hidden />
      <div className="min-w-0 [&>p]:m-0 [&>p+p]:mt-2">
        <span className="sr-only">{t(`callout.${type}`)}: </span>
        {children}
      </div>
    </aside>
  );
}
