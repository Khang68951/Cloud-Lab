import { exercisesOf, tracksOf } from '@learninglab/content';
import { localize } from '@learninglab/shared';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/ui/segmented';
import { ExercisePlayer } from '@/features/exercises/ExercisePlayer';
import { useScrollToHash } from '@/lib/useScrollToHash';
import { useProgress } from '@/features/progress/api';
import { currentLocale } from '@/i18n';
import { lessonPath } from '@/app/paths';
import { useDomain } from '@/domains/useDomain';

/** 'all' or an exercise kind of the domain. */
type KindFilter = string;
type StatusFilter = 'todo' | 'all' | 'passed';

/** "Practice only" mode: every exercise of the domain, no theory, filterable. */
export default function PracticePage() {
  useScrollToHash(true);
  const { t } = useTranslation(['practice', 'common']);
  const locale = currentLocale();
  const progress = useProgress();
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('todo');
  const [course, setCourse] = useState<string>('all');
  const courseId = useId();
  const domain = useDomain();
  const allExercises = exercisesOf(domain.id);
  /** Kinds the domain really uses, in first-seen order (quiz, estimation, then the domain's own). */
  const kinds = [...new Set(allExercises.map((e) => e.exercise.kind))];

  const groups = useMemo(() => {
    const items = allExercises.filter(({ exercise, ref }) => {
      if (course !== 'all' && ref.track.slug !== course) return false;
      if (kind !== 'all' && exercise.kind !== kind) return false;
      const passed = progress.exercise(exercise.id)?.passed ?? false;
      return status === 'all' || (status === 'passed' ? passed : !passed);
    });
    const byModule = new Map<string, typeof items>();
    for (const it of items) {
      const k = `${it.ref.track.slug}/${it.ref.module.slug}`;
      byModule.set(k, [...(byModule.get(k) ?? []), it]);
    }
    return [...byModule.values()];
    // progress.data changes when attempts are recorded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, status, course, progress.data, domain.id]);

  const total = allExercises.length;
  const passed = allExercises.filter((e) => progress.exercise(e.exercise.id)?.passed).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('title')} subtitle={t('subtitle', { passed, total })} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label htmlFor={courseId} className="sr-only">
          {t('filters.course')}
        </label>
        <select
          id={courseId}
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">{t('filters.allCourses')}</option>
          {tracksOf(domain.id)
            .filter((tr) => allExercises.some((x) => x.ref.track.slug === tr.slug))
            .map((tr) => (
              <option key={tr.slug} value={tr.slug}>
                {localize(tr.title, locale)}
              </option>
            ))}
        </select>
        <Segmented<KindFilter>
          ariaLabel={t('filters.kind')}
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: t('filters.kinds.all') },
            ...kinds.map((k) => ({ value: k, label: t(`common:practiceKinds.${k}`) })),
          ]}
        />
        <Segmented<StatusFilter>
          ariaLabel={t('filters.status')}
          value={status}
          onChange={setStatus}
          options={(['todo', 'all', 'passed'] as const).map((v) => ({ value: v, label: t(`filters.statuses.${v}`) }))}
        />
      </div>

      {groups.length === 0 && <p className="rounded-xl border p-8 text-center text-muted-foreground">{t('empty')}</p>}

      <div className="flex flex-col gap-10">
        {groups.map((items) => {
          const ref = items[0]!.ref;
          return (
            <section key={`${ref.track.slug}/${ref.module.slug}`}>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">{localize(ref.module.title, locale)}</h2>
              <div className="flex flex-col gap-4">
                {items.map(({ exercise, ref: r }) => (
                  <div key={exercise.id}>
                    <Link
                      to={lessonPath(r)}
                      className="mb-1.5 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {t('fromLesson', { lesson: localize(r.lesson.title, locale) })}
                    </Link>
                    <ExercisePlayer exercise={exercise} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
