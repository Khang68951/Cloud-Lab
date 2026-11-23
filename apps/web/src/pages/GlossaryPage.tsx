import { GLOSSARY } from '@cloudlab/content';
import { localize } from '@cloudlab/shared';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { termId } from '@/features/search/searchIndex';



export default function GlossaryPage() {
  const { t } = useTranslation('glossary');
  const locale = currentLocale();
  const { hash } = useLocation();
  const [query, setQuery] = useState('');

  const terms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...GLOSSARY]
      .sort((a, b) => a.term.localeCompare(b.term))
      .filter((g) => !q || `${g.term} ${g.def.en} ${g.def.vi ?? ''} ${(g.see ?? []).join(' ')}`.toLowerCase().includes(q));
  }, [query]);

  // Deep links (#term-…) from search scroll the term into view.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' });
  }, [hash]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('title')} subtitle={t('subtitle', { count: GLOSSARY.length })} />
      <label className="relative mb-6 block">
        <span className="sr-only">{t('search')}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search')}
          className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9"
        />
      </label>
      {terms.length === 0 && <p className="text-muted-foreground">{t('empty')}</p>}
      <dl className="flex flex-col divide-y rounded-xl border bg-card">
        {terms.map((g) => {
          const id = termId(g.term);
          return (
            <div key={g.term} id={id} className={cn('scroll-mt-24 px-4 py-3', hash === `#${id}` && 'bg-accent')}>
              <dt className="font-semibold">{g.term}</dt>
              <dd className="mt-0.5 text-sm text-muted-foreground">{localize(g.def, locale)}</dd>
              {g.see && (
                <dd className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  {g.see.map((s) => (
                    <span key={s} className="rounded bg-muted px-1.5 py-0.5">
                      {s}
                    </span>
                  ))}
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
