import { roadmapStages, tracksOf } from '@learninglab/content';
import { localize } from '@learninglab/shared';
import { Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/features/learn/CourseCard';
import { domainPath } from '@/app/paths';
import { useDomain } from '@/domains/useDomain';
import { useCourseProgress } from '@/features/progress/course';
import { currentLocale } from '@/i18n';

/** Course catalog of the current domain, grouped by roadmap stage. */
export default function TracksPage() {
  const { t } = useTranslation('learn');
  const locale = currentLocale();
  const domain = useDomain();
  const { byCourse, recommended } = useCourseProgress(domain.id);

  return (
    <>
      <PageHeader
        title={t('tracksTitle')}
        subtitle={t('tracksSubtitle', { count: tracksOf(domain.id).length })}
        actions={
          <Button asChild variant="outline">
            <Link to={domainPath(domain.id, 'roadmap')}>
              <Map />
              {t('viewRoadmap')}
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-10">
        {roadmapStages(domain.id).map(({ stage, title, body, courses }) => (
          <section key={stage} aria-labelledby={`stage-${stage}`}>
            <h2 id={`stage-${stage}`} className="mb-1 text-lg font-semibold tracking-tight">
              {t('stageLabel', { n: stage })} · {localize(title, locale)}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">{localize(body, locale)}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <CourseCard key={c.slug} track={c} progress={byCourse[c.slug]} recommended={recommended?.slug === c.slug} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
