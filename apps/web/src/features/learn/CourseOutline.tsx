import { lessonKey } from '@cloudlab/content';
import { localize, type TrackMeta } from '@cloudlab/shared';
import { CircleCheck, Circle, CircleDashed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useProgress } from '@/features/progress/api';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';

/** Sticky table of contents of a course, shown beside lessons on wide screens. */
export function CourseOutline({ track, currentKey }: { track: TrackMeta; currentKey: string }) {
  const { t } = useTranslation('lesson');
  const locale = currentLocale();
  const progress = useProgress();

  return (
    <nav aria-label={t('outline')} className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] w-64 shrink-0 overflow-y-auto xl:block">
      <Link to={`/learn/${track.slug}`} className="mb-3 block text-sm font-semibold hover:underline">
        {localize(track.title, locale)}
      </Link>
      <ol className="flex flex-col gap-3">
        {track.modules.map((m, i) => (
          <li key={m.slug}>
            <div className="mb-1 text-xs font-semibold text-muted-foreground">
              {i + 1}. {localize(m.title, locale)}
            </div>
            <ul className="flex flex-col border-l">
              {m.lessons.map((l) => {
                const key = lessonKey(track.slug, m.slug, l.slug);
                const current = key === currentKey;
                const Icon = l.status !== 'available' ? CircleDashed : progress.lessonDone(key) ? CircleCheck : Circle;
                const body = (
                  <>
                    <Icon
                      className={cn('mt-0.5 size-3.5 shrink-0', progress.lessonDone(key) ? 'text-success' : 'text-muted-foreground')}
                      aria-hidden
                    />
                    <span className="min-w-0">{localize(l.title, locale)}</span>
                  </>
                );
                const cls = cn(
                  '-ml-px flex gap-2 border-l-2 py-1 pr-1 pl-2.5 text-[13px] leading-snug',
                  current ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground',
                );
                return (
                  <li key={l.slug}>
                    {l.status === 'available' ? (
                      <Link to={`/learn/${track.slug}/${m.slug}/${l.slug}`} className={cn(cls, 'hover:text-foreground')} aria-current={current ? 'page' : undefined}>
                        {body}
                      </Link>
                    ) : (
                      <span className={cn(cls, 'opacity-60')}>{body}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </nav>
  );
}
