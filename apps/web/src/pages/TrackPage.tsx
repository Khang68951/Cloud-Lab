import { getTrack, lessonExercises, lessonKey } from '@cloudlab/content';
import { localize } from '@cloudlab/shared';
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, CircleCheck, Circle, CircleDashed, Clock, Target, TriangleAlert } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ContentIcon } from '@/components/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LevelBadge } from '@/features/learn/CourseCard';
import { StatusBadge } from '@/features/learn/StatusBadge';
import { useProgress } from '@/features/progress/api';
import { missingPrerequisites, useCourseProgress } from '@/features/progress/course';
import { currentLocale } from '@/i18n';
import NotFoundPage from './NotFoundPage';

export default function TrackPage() {
  const { trackSlug = '' } = useParams();
  const { t } = useTranslation(['learn', 'common']);
  const locale = currentLocale();
  const progress = useProgress();
  const { byCourse } = useCourseProgress();
  const track = getTrack(trackSlug);

  if (!track) return <NotFoundPage message={t('learn:trackNotFound')} />;
  const p = byCourse[track.slug]!;
  const missing = missingPrerequisites(track, byCourse);

  return (
    <div className="track-accent" style={{ '--hue': track.hue } as CSSProperties}>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4 text-muted-foreground">
        <Link to="/learn">
          <ArrowLeft />
          {t('learn:tracksTitle')}
        </Link>
      </Button>

      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-(--tc-soft) text-(--tc)">
          <ContentIcon name={track.icon} className="size-7" />
        </span>
        <div className="max-w-3xl flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{localize(track.title, locale)}</h1>
            <LevelBadge level={track.level} />
            {track.status !== 'available' && <StatusBadge status={track.status} />}
          </div>
          <p className="mt-2 text-lg text-muted-foreground">{localize(track.tagline, locale)}</p>
          <p className="mt-3 text-sm text-pretty text-muted-foreground">{localize(track.description, locale)}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              {t('learn:stageLabel', { n: track.stage })} · {t(`learn:stages.${track.stage}.title` as 'learn:stages.1.title')}
            </span>
            {track.estHours && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-4" aria-hidden />
                {t('learn:hours', { count: track.estHours })}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <BookOpen className="size-4" aria-hidden />
              {p.lessonsAvailable < p.lessonsTotal
                ? t('learn:lessonsReady', { ready: p.lessonsAvailable, total: p.lessonsTotal })
                : t('learn:lessons', { count: p.lessonsTotal })}
            </span>
            {p.challengesTotal > 0 && (
              <span className="inline-flex items-center gap-1">
                <Target className="size-4" aria-hidden />
                {t('learn:challenges', { count: p.challengesTotal })}
              </span>
            )}
          </div>

          {p.lessonsAvailable > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-4" data-testid="course-progress">
              {p.nextLessonUrl && (
                <Button asChild>
                  <Link to={p.nextLessonUrl}>
                    {p.started ? t('common:actions.continue') : t('common:actions.start')}
                    <ArrowRight />
                  </Link>
                </Button>
              )}
              <div className="min-w-48 flex-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('learn:progress')}</span>
                  <span className="tabular-nums">
                    {p.lessonsDone}/{p.lessonsAvailable}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-(--tc) transition-[width]" style={{ width: `${(p.lessonsDone / p.lessonsAvailable) * 100}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {p.completed && (
        <div role="status" className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-success/40 bg-success-soft p-4">
          <Award className="size-6 text-success" aria-hidden />
          <p className="flex-1 font-medium">{t('learn:completedBanner')}</p>
          <Button asChild variant="outline">
            <Link to={`/learn/${track.slug}/certificate`}>{t('learn:viewCertificate')}</Link>
          </Button>
        </div>
      )}

      {missing.length > 0 && !p.completed && (
        <div className="mb-8 flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm" role="note">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="font-medium">{t('learn:prereqWarning')}</p>
            <ul className="mt-1 flex flex-wrap gap-x-3">
              {missing.map((m) => (
                <li key={m.slug}>
                  <Link to={`/learn/${m.slug}`} className="underline underline-offset-2">
                    {localize(m.title, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {track.outcomes.length > 0 && (
        <section aria-labelledby="outcomes-title" className="mb-10 rounded-xl border bg-card p-5">
          <h2 id="outcomes-title" className="mb-3 font-semibold">
            {t('learn:outcomesTitle')}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {track.outcomes.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-(--tc)" aria-hidden />
                {localize(o, locale)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="modules-title">
        <h2 id="modules-title" className="mb-4 text-lg font-semibold tracking-tight">
          {t('learn:modulesTitle')}
        </h2>
        <ol className="grid gap-3">
          {track.modules.map((m, i) => (
            <li key={m.slug} className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                  <span className="grid size-10 place-items-center rounded-lg bg-(--tc-soft) text-(--tc)">
                    <ContentIcon name={m.icon} className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{localize(m.title, locale)}</h3>
                    {m.status !== 'available' && <StatusBadge status={m.status} />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{localize(m.summary, locale)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs font-medium text-muted-foreground">{t('learn:practiceLabel')}:</span>
                    {m.practice.map((kind) => (
                      <Badge key={kind} tone="outline">
                        {t(`common:practiceKinds.${kind}`)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <ul className="mt-4 flex flex-col divide-y rounded-lg border sm:ml-14">
                {m.lessons.map((l) => {
                  const key = lessonKey(track.slug, m.slug, l.slug);
                  if (l.status !== 'available') {
                    return (
                      <li key={l.slug} className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground" aria-disabled="true">
                        <CircleDashed className="size-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm">{localize(l.title, locale)}</span>
                        <Badge tone="neutral">{t('learn:writing')}</Badge>
                      </li>
                    );
                  }
                  const done = progress.lessonDone(key);
                  const exs = lessonExercises(track.slug, m.slug, l.slug);
                  const passed = exs.filter((e) => progress.exercise(e.id)?.passed).length;
                  return (
                    <li key={l.slug}>
                      <Link to={`/learn/${track.slug}/${m.slug}/${l.slug}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted">
                        {done ? (
                          <CircleCheck className="size-4 shrink-0 text-success" aria-label={t('learn:done')} />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{localize(l.title, locale)}</span>
                        {exs.length > 0 && (
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {t('learn:exercises', { passed, total: exs.length })}
                          </span>
                        )}
                        {l.estMinutes && (
                          <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                            <Clock className="size-3" aria-hidden />
                            {l.estMinutes}′
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
