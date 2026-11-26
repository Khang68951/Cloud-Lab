import { findLesson, lessonExercises } from '@learninglab/content';
import { localize, type Locale } from '@learninglab/shared';
import { MDXProvider } from '@mdx-js/react';
import type { MDXComponents, MDXContent } from 'mdx/types';
import { ArrowLeft, ArrowRight, CircleCheck, Clock, Languages } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ContentIcon } from '@/components/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExercisePlayer } from '@/features/exercises/ExercisePlayer';
import { CourseOutline } from '@/features/learn/CourseOutline';
import { loadLessonContent } from '@/features/learn/lessonContent';
import { mdxComponents } from '@/features/learn/mdx/components';
import { useProgress, useSetLessonDone } from '@/features/progress/api';
import { currentLocale } from '@/i18n';
import { useScrollToHash } from '@/lib/useScrollToHash';
import { coursePath, lessonPath } from '@/app/paths';
import { useDomain } from '@/domains/useDomain';
import NotFoundPage from './NotFoundPage';

/** Shared lesson components plus the domain's own (loaded once, with its first lesson). */
function useLessonComponents(load: (() => Promise<MDXComponents>) | undefined): MDXComponents | null {
  const [extra, setExtra] = useState<{ load: typeof load; components: MDXComponents } | null>(null);
  useEffect(() => {
    if (!load) return;
    let cancelled = false;
    void load().then((components) => {
      if (!cancelled) setExtra({ load, components });
    });
    return () => {
      cancelled = true;
    };
  }, [load]);
  // null until the domain's components are in: MDX that uses them cannot render without them.
  return useMemo(() => (!load ? mdxComponents : extra?.load === load ? { ...mdxComponents, ...extra.components } : null), [extra, load]);
}

export default function LessonPage() {
  const { trackSlug = '', moduleSlug = '', lessonSlug = '' } = useParams();
  const { t } = useTranslation(['lesson', 'learn']);
  const locale = currentLocale();
  const domain = useDomain();
  const found = findLesson(trackSlug, moduleSlug, lessonSlug);
  const components = useLessonComponents(domain.mdx);
  const progress = useProgress();
  const setDone = useSetLessonDone();
  const [content, setContent] = useState<{ Content: MDXContent; locale: Locale; key: string } | null>(null);
  const key = found?.key;
  useScrollToHash(Boolean(key) && content?.key === `${key}:${locale}` && components !== null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void loadLessonContent(key, locale).then((c) => {
      if (!cancelled && c) setContent({ ...c, key: `${key}:${locale}` });
    });
    return () => {
      cancelled = true;
    };
  }, [key, locale]);

  if (!found || found.track.domain !== domain.id) return <NotFoundPage message={t('lesson:notFound')} />;
  if (found.lesson.status !== 'available') {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{localize(found.lesson.title, locale)}</h1>
        <p className="mt-3 text-muted-foreground">{t('lesson:writing')}</p>
        <Button asChild className="mt-6">
          <Link to={coursePath(found.track)}>{localize(found.track.title, locale)}</Link>
        </Button>
      </div>
    );
  }
  const { track, module, moduleIndex, lesson, prev, next } = found;
  const exercises = lessonExercises(track.slug, module.slug, lesson.slug);
  const done = progress.lessonDone(found.key);
  const passed = exercises.filter((e) => progress.exercise(e.id)?.passed).length;
  const ready = content?.key === `${found.key}:${locale}` && components !== null;
  const lessonUrl = (r: NonNullable<typeof prev>) => lessonPath(r);

  return (
    <div className="mx-auto flex max-w-6xl justify-center gap-10">
    <article className="min-w-0 max-w-3xl flex-1">
      <nav aria-label={t('lesson:breadcrumb')} className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to={coursePath(track)} className="hover:text-foreground">
          {localize(track.title, locale)}
        </Link>
        <span aria-hidden>/</span>
        <span className="inline-flex items-center gap-1">
          <ContentIcon name={module.icon} className="size-3.5" />
          {t('learn:moduleNumber', { n: moduleIndex + 1 })} · {localize(module.title, locale)}
        </span>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{localize(lesson.title, locale)}</h1>
        {lesson.summary && <p className="mt-2 text-lg text-muted-foreground">{localize(lesson.summary, locale)}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {lesson.estMinutes && (
            <Badge tone="neutral">
              <Clock aria-hidden />
              {t('lesson:minutes', { count: lesson.estMinutes })}
            </Badge>
          )}
          {exercises.length > 0 && (
            <Badge tone={passed === exercises.length ? 'success' : 'primary'}>
              {t('lesson:exercisesPassed', { passed, total: exercises.length })}
            </Badge>
          )}
          {done && (
            <Badge tone="success">
              <CircleCheck aria-hidden />
              {t('lesson:completed')}
            </Badge>
          )}
        </div>
      </header>

      {ready && content.locale !== locale && (
        <p className="mb-6 flex items-center gap-2 rounded-lg bg-info-soft p-3 text-sm text-info">
          <Languages className="size-4 shrink-0" aria-hidden />
          {t('lesson:fallback')}
        </p>
      )}

      <div className="lesson-prose" lang={ready ? content.locale : undefined}>
        {ready ? (
          <MDXProvider components={components!}>
            <content.Content components={components!} />
          </MDXProvider>
        ) : (
          <div className="flex flex-col gap-3" aria-busy="true">
            {[80, 95, 70, 90].map((w) => (
              <div key={w} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
      </div>

      {exercises.length > 0 && (
        <section aria-labelledby="practice-title" className="mt-12">
          <h2 id="practice-title" className="mb-1 text-xl font-semibold tracking-tight">
            {t('lesson:practiceTitle')}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{t('lesson:practiceHint')}</p>
          <div className="flex flex-col gap-4">
            {exercises.map((ex, i) => (
              <ExercisePlayer key={ex.id} exercise={ex} index={i} />
            ))}
          </div>
        </section>
      )}

      <footer className="mt-12 flex flex-col gap-6 border-t pt-6">
        <Button
          variant={done ? 'outline' : 'default'}
          className="self-start"
          onClick={() => setDone.mutate({ key: found.key, done: !done })}
          disabled={setDone.isPending}
        >
          <CircleCheck />
          {done ? t('lesson:markUndone') : t('lesson:markDone')}
        </Button>
        <nav className="grid gap-3 sm:grid-cols-2" aria-label={t('lesson:navigation')}>
          {prev ? (
            <Link to={lessonUrl(prev)} className="rounded-lg border p-3 hover:bg-muted">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowLeft className="size-3.5" aria-hidden />
                {t('lesson:prev')}
              </span>
              <span className="mt-0.5 block font-medium">{localize(prev.lesson.title, locale)}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={lessonUrl(next)} className="rounded-lg border p-3 text-right hover:bg-muted">
              <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                {t('lesson:next')}
                <ArrowRight className="size-3.5" aria-hidden />
              </span>
              <span className="mt-0.5 block font-medium">{localize(next.lesson.title, locale)}</span>
            </Link>
          )}
        </nav>
      </footer>
    </article>
    <CourseOutline track={track} currentKey={found.key} />
    </div>
  );
}
