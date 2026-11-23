import { Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { currentLocale } from '@/i18n';
import { formatNumber } from '@/lib/format';

interface Row {
  id: number;
  name: string;
  pct: number;
  copies: number;
}

const START: Row[] = [
  { id: 1, name: 'ALB', pct: 99.99, copies: 1 },
  { id: 2, name: 'EC2', pct: 99.5, copies: 2 },
  { id: 3, name: 'RDS Multi-AZ', pct: 99.95, copies: 1 },
];

/** Series of tiers; each tier can have N redundant copies (parallel). */
export function AvailabilityCalculator() {
  const { t } = useTranslation('lesson');
  const locale = currentLocale();
  const [rows, setRows] = useState<Row[]>(START);
  const [next, setNext] = useState(4);

  const tierAvail = (r: Row) => 1 - Math.pow(1 - r.pct / 100, r.copies);
  const total = rows.reduce((a, r) => a * tierAvail(r), 1);
  const downtime = (1 - total) * 30 * 24 * 60;
  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <figure className="not-prose my-6 rounded-xl border bg-card p-4 sm:p-5">
      <figcaption className="mb-3 font-semibold">{t('avail.title')}</figcaption>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">{t('avail.component')}</th>
              <th className="pb-2 font-medium">{t('avail.availability')}</th>
              <th className="pb-2 font-medium">{t('avail.copies')}</th>
              <th className="pb-2 text-right font-medium">{t('avail.tier')}</th>
              <th className="sr-only">{t('avail.remove')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1.5 pr-2">
                  <input
                    aria-label={t('avail.component')}
                    value={r.name}
                    onChange={(e) => update(r.id, { name: e.target.value })}
                    className="h-8 w-full rounded-md border border-input bg-background px-2"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    aria-label={t('avail.availability')}
                    type="number"
                    min={90}
                    max={100}
                    step={0.01}
                    value={r.pct}
                    onChange={(e) => update(r.id, { pct: Math.min(100, Math.max(0, Number(e.target.value))) })}
                    className="h-8 w-24 rounded-md border border-input bg-background px-2 font-mono tabular-nums"
                  />
                  <span className="ml-1 text-muted-foreground">%</span>
                </td>
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="size-7" aria-label="−" onClick={() => update(r.id, { copies: Math.max(1, r.copies - 1) })}>
                      <Minus />
                    </Button>
                    <span className="w-5 text-center font-mono tabular-nums">{r.copies}</span>
                    <Button size="icon" variant="ghost" className="size-7" aria-label="+" onClick={() => update(r.id, { copies: Math.min(5, r.copies + 1) })}>
                      <Plus />
                    </Button>
                  </div>
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">{formatNumber(tierAvail(r) * 100, locale, { maximumFractionDigits: 4 })}%</td>
                <td className="py-1.5 pl-1 text-right">
                  <Button size="icon" variant="ghost" className="size-7" aria-label={t('avail.remove')} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={() => {
          setRows((rs) => [...rs, { id: next, name: `Service ${next}`, pct: 99.9, copies: 1 }]);
          setNext((n) => n + 1);
        }}
      >
        <Plus />
        {t('avail.add')}
      </Button>
      <div className="mt-4 grid gap-2 rounded-lg bg-muted p-3 sm:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">{t('avail.total')}</div>
          <div className="font-mono text-xl font-semibold tabular-nums">{formatNumber(total * 100, locale, { maximumFractionDigits: 4 })}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('avail.downtime')}</div>
          <div className="font-mono text-xl font-semibold tabular-nums">
            {formatNumber(downtime, locale, { maximumFractionDigits: 1 })} {t('avail.minutes')}
          </div>
        </div>
      </div>
    </figure>
  );
}
