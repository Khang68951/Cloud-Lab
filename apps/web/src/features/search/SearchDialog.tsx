import { BookOpen, Cloud, GraduationCap, Search, Target, Text } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { search, type SearchKind } from './searchIndex';

const ICON: Record<SearchKind, typeof BookOpen> = {
  course: GraduationCap,
  lesson: BookOpen,
  challenge: Target,
  service: Cloud,
  term: Text,
};

/** Command-palette style search, opened with Ctrl/⌘+K or the header button. */
export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation('search');
  const locale = currentLocale();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(() => search(locale, query), [locale, query]);

  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    onOpenChange(false);
    setQuery('');
    void navigate(r.url);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQuery('');
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className="fixed top-[12vh] left-1/2 z-50 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{t('title')}</Dialog.Title>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  go(active);
                }
              }}
              placeholder={t('placeholder')}
              aria-label={t('title')}
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={results[active] ? `search-result-${active}` : undefined}
              className="h-12 flex-1 bg-transparent text-[15px] outline-none"
            />
            <kbd className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
          </div>
          <ul id="search-results" role="listbox" className="overflow-y-auto p-1.5">
            {query.trim() === '' && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t('hint')}</li>}
            {query.trim() !== '' && results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t('empty')}</li>
            )}
            {results.map((r, i) => {
              const Icon = ICON[r.kind];
              const showHeader = i === 0 || results[i - 1]!.kind !== r.kind;
              return (
                <li key={`${r.kind}-${r.url}`} role="presentation">
                  {showHeader && <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t(`kinds.${r.kind}`)}</div>}
                  <button
                    id={`search-result-${i}`}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(i)}
                    className={cn('flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left', i === active && 'bg-accent text-accent-foreground')}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{r.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
