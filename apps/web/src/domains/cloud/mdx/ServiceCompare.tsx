import { getService } from '@learninglab/cloud-catalog';
import { localize, type LocalizedText } from '@learninglab/shared';
import { Check, Coins, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_HUE } from '@/domains/cloud/lab/hues';
import { ServiceIcon } from '@/domains/cloud/lab/visuals';
import { currentLocale } from '@/i18n';

function Bullets({ items, icon }: { items: LocalizedText[]; icon: 'yes' | 'no' }) {
  const locale = currentLocale();
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-snug">
          {icon === 'yes' ? (
            <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
          ) : (
            <X className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden />
          )}
          <span>{localize(it, locale)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Side-by-side cards built from the service catalog (single source of truth with the Lab). */
export function ServiceCompare({ ids }: { ids: string }) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const defs = ids
    .split(',')
    .map((s) => getService(s.trim()))
    .filter((d) => d !== undefined);

  return (
    <div className="not-prose my-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {defs.map((d) => (
        <article
          key={d.id}
          className="track-accent flex flex-col gap-3 rounded-xl border bg-card p-4"
          style={{ '--hue': CATEGORY_HUE[d.category] } as CSSProperties}
        >
          <header className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--tc-soft) text-(--tc)">
              <ServiceIcon name={d.icon} className="size-5" />
            </span>
            <div>
              <h4 className="font-semibold leading-tight">{d.short}</h4>
              <p className="text-[11px] text-muted-foreground">{d.name}</p>
            </div>
          </header>
          <p className="text-[13px] leading-snug text-muted-foreground">{localize(d.description, locale)}</p>
          <div>
            <h5 className="mb-1 text-xs font-semibold text-success">{t('docs.whenToUse')}</h5>
            <Bullets items={d.docs.whenToUse} icon="yes" />
          </div>
          {d.docs.whenNotTo.length > 0 && (
            <div>
              <h5 className="mb-1 text-xs font-semibold text-danger">{t('docs.whenNotTo')}</h5>
              <Bullets items={d.docs.whenNotTo} icon="no" />
            </div>
          )}
          <p className="mt-auto flex gap-2 rounded-lg bg-muted p-2 text-[12px] leading-snug">
            <Coins className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {localize(d.docs.pricing, locale)}
          </p>
        </article>
      ))}
    </div>
  );
}
