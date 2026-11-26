import { getService, PRICING_AS_OF, REGIONS, type CostKind } from '@learninglab/catalog';
import { localize } from '@learninglab/shared';
import type { SimResult } from '@learninglab/sim-engine';
import { ChevronRight } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '@/i18n';
import { formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { LabNode } from '../model';
import { CATEGORY_HUE } from '../hues';
import { ServiceIcon } from '../visuals';

const KIND_COLOR: Record<CostKind, string> = {
  compute: 'oklch(0.65 0.15 45)',
  storage: 'oklch(0.62 0.13 145)',
  requests: 'oklch(0.6 0.15 255)',
  transfer: 'oklch(0.62 0.17 330)',
  other: 'oklch(0.6 0.02 260)',
};

export function CostPanel({
  result,
  nodes,
  region,
  onSelect,
}: {
  result: SimResult | null;
  nodes: LabNode[];
  region: keyof typeof REGIONS;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const [open, setOpen] = useState<Set<string>>(new Set());
  if (!result) return null;

  const total = result.totals.monthlyUsd;
  const rows = nodes
    .map((n) => ({ node: n, r: result.nodes[n.id], def: getService(n.data.service) }))
    .filter((x) => x.r && x.def && (x.def.behavior !== 'client' || x.r.monthlyUsd > 0))
    .sort((a, b) => b.r!.monthlyUsd - a.r!.monthlyUsd);
  const kinds = (Object.entries(result.totals.byKind) as [CostKind, number][]).filter(([, v]) => v > 0.005);

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="flex flex-col gap-4 p-3">
      {total > 0 && (
        <section aria-label={t('cost.byKind')}>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            {kinds.map(([k, v]) => (
              <div key={k} style={{ width: `${(v / total) * 100}%`, background: KIND_COLOR[k] }} title={t(`cost.kinds.${k}`)} />
            ))}
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            {kinds.map(([k, v]) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[k] }} aria-hidden />
                <span className="flex-1 truncate text-muted-foreground">{t(`cost.kinds.${k}`)}</span>
                <span className="font-mono tabular-nums">{Math.round((v / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('cost.byService')}</h3>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{t('cost.empty')}</p>}
        <ul className="flex flex-col">
          {rows.map(({ node, r, def }) => {
            const isOpen = open.has(node.id);
            const share = total > 0 ? r!.monthlyUsd / total : 0;
            return (
              <li key={node.id} className="border-b last:border-b-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggle(node.id)}
                    aria-expanded={isOpen}
                    aria-label={t('cost.details')}
                    className="grid size-6 shrink-0 place-items-center rounded hover:bg-muted"
                  >
                    <ChevronRight className={cn('size-3.5 transition-transform', isOpen && 'rotate-90')} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect(node.id)}
                    className="track-accent flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
                    style={{ '--hue': CATEGORY_HUE[def!.category] } as CSSProperties}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded bg-(--tc-soft) text-(--tc)">
                      <ServiceIcon name={def!.icon} className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {def!.behavior === 'client' ? t('cost.egressRow') : node.data.label || def!.short}
                      </span>
                      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-(--tc)" style={{ width: `${Math.max(share * 100, 1)}%` }} />
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[13px] tabular-nums">{formatUsd(r!.monthlyUsd, locale)}</span>
                  </button>
                </div>
                {isOpen && (
                  <ul className="mb-2 ml-7 flex flex-col gap-1 rounded-md bg-muted/60 p-2 text-[11px]">
                    {r!.costs.length === 0 && <li className="text-muted-foreground">{t('cost.free')}</li>}
                    {r!.costs.map((c, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-1.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[c.kind] }} aria-hidden />
                          {localize(c.label, locale)}
                        </span>
                        <span className="shrink-0 font-mono tabular-nums">{formatUsd(c.usd, locale)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-[11px] leading-snug text-muted-foreground">
        {t('cost.disclaimer', { region: localize(REGIONS[region].name, locale), date: PRICING_AS_OF })}
      </p>
    </div>
  );
}
