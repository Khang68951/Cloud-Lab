import { CATEGORIES, CATEGORY_LABELS, SERVICES, type ServiceDef } from '@learninglab/catalog';
import { localize, type LocalizedText } from '@learninglab/shared';
import { Columns3, Search, X } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ServiceCompare } from '@/features/learn/mdx/ServiceCompare';
import { CATEGORY_HUE } from '@/features/lab/hues';
import { ServiceIcon } from '@/features/lab/visuals';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';

function Section({ title, items, tone }: { title: string; items: LocalizedText[]; tone: string }) {
  const locale = currentLocale();
  if (!items.length) return null;
  return (
    <div>
      <h4 className={cn('mb-1 text-sm font-semibold', tone)}>{title}</h4>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-snug">
        {items.map((it, i) => (
          <li key={i}>{localize(it, locale)}</li>
        ))}
      </ul>
    </div>
  );
}

const MAX_COMPARE = 3;

export default function ExplorePage() {
  const { t } = useTranslation(['explore', 'lab', 'common']);
  const locale = currentLocale();
  const [query, setQuery] = useState('');
  const [compare, setCompare] = useState<string[]>([]);
  const [params] = useSearchParams();
  const [open, setOpen] = useState<ServiceDef | null>(() => SERVICES.find((s) => s.id === params.get('service')) ?? null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.map((c) => ({
      category: c,
      services: SERVICES.filter(
        (s) =>
          s.category === c &&
          s.behavior !== 'client' &&
          (!q || `${s.name} ${s.short} ${localize(s.description, locale)}`.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.services.length);
  }, [query, locale]);

  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= MAX_COMPARE ? c : [...c, id]));

  return (
    <div>
      <PageHeader title={t('explore:title')} subtitle={t('explore:subtitle')} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="relative w-full max-w-sm">
          <span className="sr-only">{t('explore:search')}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('explore:search')}
            className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9"
          />
        </label>
        <p className="text-sm text-muted-foreground">{t('explore:compareHint', { max: MAX_COMPARE })}</p>
      </div>

      {compare.length > 0 && (
        <section aria-labelledby="compare-title" className="mb-10 rounded-xl border bg-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="compare-title" className="flex items-center gap-2 font-semibold">
              <Columns3 className="size-4" aria-hidden />
              {t('explore:comparing', { count: compare.length })}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setCompare([])}>
              <X />
              {t('explore:clear')}
            </Button>
          </div>
          <ServiceCompare ids={compare.join(',')} />
        </section>
      )}

      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.category}>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {localize(CATEGORY_LABELS[g.category], locale)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.services.map((s) => {
                const selected = compare.includes(s.id);
                return (
                  <article
                    key={s.id}
                    className={cn('track-accent flex flex-col rounded-xl border bg-card p-4', selected && 'border-primary')}
                    style={{ '--hue': CATEGORY_HUE[s.category] } as CSSProperties}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-(--tc-soft) text-(--tc)">
                        <ServiceIcon name={s.icon} className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{s.short}</h3>
                        <p className="truncate text-xs text-muted-foreground">{s.name}</p>
                      </div>
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-snug text-muted-foreground">{localize(s.description, locale)}</p>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setOpen(s)}>
                        {t('explore:details')}
                      </Button>
                      <Button
                        size="sm"
                        variant={selected ? 'default' : 'ghost'}
                        aria-pressed={selected}
                        onClick={() => toggleCompare(s.id)}
                        disabled={!selected && compare.length >= MAX_COMPARE}
                      >
                        <Columns3 />
                        {t('explore:compare')}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <DialogContent
            title={open.name}
            description={localize(open.description, locale)}
            closeLabel={t('common:a11y.closeMenu')}
            className="max-w-2xl"
          >
            <div className="flex flex-col gap-4">
              {open.equivalents && (
                <p className="text-sm text-muted-foreground">
                  {t('explore:equivalents')}: Azure — {open.equivalents.azure} · GCP — {open.equivalents.gcp}
                </p>
              )}
              <Section title={t('lab:docs.whenToUse')} items={open.docs.whenToUse} tone="text-success" />
              <Section title={t('lab:docs.whenNotTo')} items={open.docs.whenNotTo} tone="text-danger" />
              <Section title={t('lab:docs.pros')} items={open.docs.pros} tone="" />
              <Section title={t('lab:docs.cons')} items={open.docs.cons} tone="" />
              <Section title={t('lab:docs.pitfalls')} items={open.docs.pitfalls} tone="text-warning" />
              <div>
                <h4 className="mb-1 text-sm font-semibold">{t('lab:docs.pricing')}</h4>
                <p className="text-sm">{localize(open.docs.pricing, locale)}</p>
              </div>
              <Button asChild className="self-start">
                <Link to="/lab">{t('explore:tryInLab')}</Link>
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
