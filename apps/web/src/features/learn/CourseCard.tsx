import { localize, type TrackMeta } from '@learninglab/shared';
import { BookOpen, CircleCheck, Clock, Sparkles, Target } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ContentIcon } from '@/components/icon';
import { Badge } from '@/components/ui/badge';
import type { CourseProgress } from '@/features/progress/course';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';

export function LevelBadge({ level }: { level: TrackMeta['level'] }) {
  const { t } = useTranslation('learn');
  return <Badge tone={level === 'foundation' ? 'success' : level === 'intermediate' ? 'info' : 'warning'}>{t(`levels.${level}`)}</Badge>;
}

/** Course card used by the catalog, the roadmap and the home page. */
export function CourseCard({
  track,
  progress,
  recommended,
  compact,
}: {
  track: TrackMeta;
  progress?: CourseProgress;
  recommended?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation('learn');
  const locale = currentLocale();
  const p = progress;

  return (
    <Link
      to={`/learn/${track.slug}`}
      className={cn(
        'track-accent group flex h-full flex-col rounded-xl border bg-card p-4 transition-colors hover:border-(--tc) hover:shadow-sm',
        recommended && 'border-(--tc) ring-2 ring-(--tc)/25',
      )}
      style={{ '--hue': track.hue } as CSSProperties}
      data-course={track.slug}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('grid shrink-0 place-items-center rounded-lg bg-(--tc-soft) text-(--tc)', compact ? 'size-9' : 'size-11')}>
          <ContentIcon name={track.icon} className={compact ? 'size-4.5' : 'size-5.5'} />
        </span>
        <div className="flex flex-wrap justify-end gap-1">
          {p?.completed ? (
            <Badge tone="success">
              <CircleCheck aria-hidden />
              {t('completed')}
            </Badge>
          ) : (
            track.status !== 'available' && <StatusBadge status={track.status} />
          )}
          <LevelBadge level={track.level} />
        </div>
      </div>
      <h3 className={cn('font-semibold tracking-tight', compact ? 'mt-3 text-[15px]' : 'mt-4')}>{localize(track.title, locale)}</h3>
      {!compact && <p className="mt-1 flex-1 text-sm text-muted-foreground">{localize(track.tagline, locale)}</p>}
      <div className={cn('flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground', compact ? 'mt-2' : 'mt-4')}>
        {track.estHours && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {t('hours', { count: track.estHours })}
          </span>
        )}
        {p && (
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" aria-hidden />
            {p.lessonsAvailable < p.lessonsTotal
              ? t('lessonsReady', { ready: p.lessonsAvailable, total: p.lessonsTotal })
              : t('lessons', { count: p.lessonsTotal })}
          </span>
        )}
        {p && p.challengesTotal > 0 && (
          <span className="inline-flex items-center gap-1">
            <Target className="size-3.5" aria-hidden />
            {t('challenges', { count: p.challengesTotal })}
          </span>
        )}
      </div>
      {p?.started && !p.completed && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-(--tc)" style={{ width: `${Math.round(p.ratio * 100)}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">{t('percentDone', { percent: Math.round(p.ratio * 100) })}</p>
        </div>
      )}
      {recommended && (
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-(--tc)">
          <Sparkles className="size-3.5" aria-hidden />
          {t('recommended')}
        </p>
      )}
    </Link>
  );
}
