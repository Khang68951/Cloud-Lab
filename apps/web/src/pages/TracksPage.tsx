import { roadmapStages } from '@cloudlab/content';
import { Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/features/learn/CourseCard';
import { useCourseProgress } from '@/features/progress/course';

/** Course catalog, grouped by roadmap stage. */
export default function TracksPage() {
  const { t } = useTranslation('learn');
  const { byCourse, recommended } = useCourseProgress();

  return (
    <>
      <PageHeader
        title={t('tracksTitle')}
        subtitle={t('tracksSubtitle')}
        actions={
          <Button asChild variant="outline">
            <Link to="/roadmap">
              <Map />
              {t('viewRoadmap')}
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-10">
        {roadmapStages().map(({ stage, courses }) => (
          <section key={stage} aria-labelledby={`stage-${stage}`}>
            <h2 id={`stage-${stage}`} className="mb-1 text-lg font-semibold tracking-tight">
              {t('stageLabel', { n: stage })} · {t(`stages.${stage}.title` as 'stages.1.title')}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">{t(`stages.${stage}.body` as 'stages.1.body')}</p>
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
