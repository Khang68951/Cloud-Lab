import { CATEGORIES, CATEGORY_LABELS, SERVICES, isAdvanced, type Category, type ServiceDef } from '@learninglab/cloud-catalog';
import { localize, type Locale } from '@learninglab/shared';
import { Ellipsis, Search } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { CATEGORY_HUE } from './hues';
import { ServiceIcon } from './visuals';

export const DND_TYPE = 'application/x-cloudlab-service';

const matches = (s: ServiceDef, q: string, locale: Locale) =>
  !q || `${s.name} ${s.short} ${s.id} ${localize(s.description, locale)}`.toLowerCase().includes(q);

/**
 * Left column of the Lab. Each category lists only its popular ('core')
 * services; "See all" opens a dialog with every service of the category, so
 * the column stays short however many services the catalog grows to.
 * Typing in the search box searches the whole catalog inline.
 */
export function Palette({ onAdd }: { onAdd: (serviceId: string) => void }) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const [query, setQuery] = useState('');
  const [browse, setBrowse] = useState<Category | null>(null);
  const q = query.trim().toLowerCase();

  const groups = useMemo(
    () =>
      CATEGORIES.map((c) => {
        const all = SERVICES.filter((s) => s.category === c);
        return { category: c, total: all.length, services: all.filter((s) => (q ? matches(s, q, locale) : !isAdvanced(s))) };
      }).filter((g) => g.services.length > 0),
    [q, locale],
  );

  const onDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData(DND_TYPE, id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <label className="relative block">
          <span className="sr-only">{t('palette.search', { count: SERVICES.length })}</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('palette.search', { count: SERVICES.length })}
            className="h-8 w-full rounded-md border border-input bg-background pr-2 pl-8 text-sm"
          />
        </label>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{t('palette.hint')}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {groups.map((g) => (
          <section key={g.category} className="mb-3">
            <h3 className="px-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {localize(CATEGORY_LABELS[g.category], locale)}
            </h3>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
              {g.services.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => onDragStart(e, s.id)}
                    onClick={() => onAdd(s.id)}
                    title={localize(s.description, locale)}
                    className="track-accent flex w-full cursor-grab items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-muted active:cursor-grabbing"
                    style={{ '--hue': CATEGORY_HUE[s.category] } as CSSProperties}
                    data-service={s.id}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-(--tc-soft) text-(--tc)">
                      <ServiceIcon name={s.icon} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{s.short}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">{s.name}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!q && g.total > g.services.length && (
              <button
                type="button"
                onClick={() => setBrowse(g.category)}
                className="mt-0.5 flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid={`palette-all-${g.category}`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md border border-dashed">
                  <Ellipsis className="size-4" aria-hidden />
                </span>
                {t('palette.seeAll', { count: g.total })}
              </button>
            )}
          </section>
        ))}
        {groups.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t('palette.empty')}</p>}
      </div>

      <CategoryBrowser
        category={browse}
        onCategory={setBrowse}
        onPick={(id) => {
          onAdd(id);
          setBrowse(null);
        }}
      />
    </div>
  );
}

/** Centered dialog listing every service of one category (with tabs to switch category). */
function CategoryBrowser({
  category,
  onCategory,
  onPick,
}: {
  category: Category | null;
  onCategory: (c: Category | null) => void;
  onPick: (id: string) => void;
}) {
  const { t } = useTranslation(['lab', 'common']);
  const locale = currentLocale();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const services = useMemo(() => (category ? SERVICES.filter((s) => s.category === category && matches(s, q, locale)) : []), [category, q, locale]);
  const popular = services.filter((s) => !isAdvanced(s));
  const others = services.filter(isAdvanced);
  const total = category ? SERVICES.filter((s) => s.category === category).length : 0;

  return (
    <Dialog
      open={category !== null}
      onOpenChange={(open) => {
        if (!open) {
          onCategory(null);
          setQuery('');
        }
      }}
    >
      {category && (
        <DialogContent
          className="h-[85vh] max-w-4xl"
          title={localize(CATEGORY_LABELS[category], locale)}
          description={t('lab:palette.dialogHint', { count: total })}
          closeLabel={t('common:a11y.closeMenu')}
          data-testid="palette-browser"
        >
          <div className="flex flex-col gap-4">
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t('lab:palette.categories')}>
              {CATEGORIES.filter((c) => c !== 'client').map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={c === category}
                  onClick={() => onCategory(c)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap',
                    c === category ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  {localize(CATEGORY_LABELS[c], locale)}
                </button>
              ))}
            </div>

            <label className="relative block">
              <span className="sr-only">{t('lab:palette.searchIn')}</span>
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('lab:palette.searchIn')}
                className="h-9 w-full rounded-md border border-input bg-background pr-2 pl-8 text-sm"
              />
            </label>

            <ServiceGrid title={t('lab:palette.popular')} services={popular} onPick={onPick} />
            <ServiceGrid title={t('lab:palette.others')} services={others} onPick={onPick} />
            {services.length === 0 && <p className="text-sm text-muted-foreground">{t('lab:palette.empty')}</p>}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

function ServiceGrid({ title, services, onPick }: { title: string; services: ServiceDef[]; onPick: (id: string) => void }) {
  const locale = currentLocale();
  if (services.length === 0) return null;
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title} <span className="font-normal">· {services.length}</span>
      </h4>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <li key={s.id} className="min-w-0">
            <button
              type="button"
              onClick={() => onPick(s.id)}
              className="track-accent flex h-full w-full items-start gap-2.5 rounded-lg border bg-card p-2.5 text-left hover:border-(--tc) hover:bg-muted"
              style={{ '--hue': CATEGORY_HUE[s.category] } as CSSProperties}
              data-pick={s.id}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-(--tc-soft) text-(--tc)">
                <ServiceIcon name={s.icon} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{s.short}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{s.name}</span>
                <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">{localize(s.description, locale)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
