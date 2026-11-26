import { getTrack, roadmapStages } from '@learninglab/content';
import { localize } from '@learninglab/shared';
import { ArrowRight, CircleCheck, Circle } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/features/learn/CourseCard';
import { useDomain } from '@/domains/useDomain';
import { useCourseProgress } from '@/features/progress/course';
import { currentLocale } from '@/i18n';

/** A domain's learning roadmap: stages left → right, prerequisites under each course. */
export default function RoadmapPage() {
  const { t } = useTranslation('learn');
  const locale = currentLocale();
  const domain = useDomain();
  const { byCourse, recommended } = useCourseProgress(domain.id);
  const stages = roadmapStages(domain.id);
  const totalHours = stages.flatMap((s) => s.courses).reduce((a, c) => a + (c.estHours ?? 0), 0);
  const completed = Object.values(byCourse).filter((p) => p.completed).length;
  const rec = recommended ? byCourse[recommended.slug] : undefined;

  return (
    <div>
      <PageHeader
        title={t('roadmap.title')}
        subtitle={t('roadmap.subtitle', { courses: Object.keys(byCourse).length, hours: totalHours, completed })}
        actions={
          recommended &&
          rec?.nextLessonUrl && (
            <Button asChild>
              <Link to={rec.nextLessonUrl}>
                {t('roadmap.continueWith', { course: localize(recommended.title, locale) })}
                <ArrowRight />
              </Link>
            </Button>
          )
        }
      />

      <ol
        className="grid gap-6 lg:grid-cols-[repeat(var(--stages),minmax(0,1fr))] lg:gap-4"
        style={{ '--stages': stages.length } as CSSProperties}
        aria-label={t('roadmap.title')}
      >
        {stages.map(({ stage, title, courses }) => (
          <li key={stage} className="flex flex-col gap-3" data-stage={stage}>
            <div className="rounded-lg bg-muted px-3 py-2">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('stageLabel', { n: stage })}</div>
              <div className="text-sm font-medium">{localize(title, locale)}</div>
            </div>
            {courses.map((c) => (
              <div key={c.slug} className="flex flex-col gap-1.5">
                <CourseCard track={c} progress={byCourse[c.slug]} recommended={recommended?.slug === c.slug} compact />
                {c.prerequisites.length > 0 && (
                  <ul className="flex flex-wrap gap-x-2 gap-y-0.5 px-1 text-[11px] text-muted-foreground">
                    <li className="font-medium">{t('requires')}:</li>
                    {c.prerequisites.map((p) => {
                      const pre = getTrack(p);
                      const done = byCourse[p]?.completed;
                      return (
                        <li key={p} className="inline-flex items-center gap-0.5">
                          {done ? <CircleCheck className="size-3 text-success" aria-label={t('completed')} /> : <Circle className="size-3" aria-hidden />}
                          {pre ? localize(pre.title, locale) : p}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </li>
        ))}
      </ol>

      <p className="mt-8 text-sm text-muted-foreground">{t('roadmap.note')}</p>
    </div>
  );
}
