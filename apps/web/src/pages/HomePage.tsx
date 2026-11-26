import { allExercises, getTrack, roadmapStages, tracks } from '@learninglab/content';
import { localize } from '@learninglab/shared';
import { ArrowRight, Award, BookA, BookOpen, Compass, Dumbbell, Map, Target, Workflow } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ContentIcon } from '@/components/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/features/learn/CourseCard';
import { useProgress } from '@/features/progress/api';
import { useCourseProgress } from '@/features/progress/course';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';

function Stat({ icon, label, value, total }: { icon: ReactNode; label: string; value: number; total: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
        {value}
        <span className="text-sm text-muted-foreground">/{total}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

const TOOLS = [
  { key: 'lab', icon: Workflow, to: '/lab' },
  { key: 'practice', icon: Dumbbell, to: '/practice' },
  { key: 'explore', icon: Compass, to: '/explore' },
  { key: 'glossary', icon: BookA, to: '/glossary' },
] as const;

/** Personal dashboard. */
export default function HomePage() {
  const { t } = useTranslation('home');
  const locale = currentLocale();
  const progress = useProgress();
  const { byCourse, recommended } = useCourseProgress();

  const all = Object.values(byCourse);
  const lessonsDone = all.reduce((a, p) => a + p.lessonsDone, 0);
  const lessonsAvailable = all.reduce((a, p) => a + p.lessonsAvailable, 0);
  const passed = new Set(progress.data.exercises.filter((e) => e.passed).map((e) => e.exerciseId));
  const challenges = allExercises.filter((e) => e.exercise.kind.startsWith('canvas'));
  const started = all.some((p) => p.started);
  const inProgress = tracks.filter((tr) => byCourse[tr.slug]?.started && !byCourse[tr.slug]?.completed);
  const focus = recommended ? byCourse[recommended.slug] : undefined;
  const core = getTrack('aws')!;

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-9 sm:px-10 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <Badge tone="primary" className="mb-4">
          {t('hero.eyebrow')}
        </Badge>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{started ? t('hero.welcomeBack') : t('hero.title')}</h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground sm:text-lg">{t('hero.subtitle')}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {focus?.nextLessonUrl && recommended && (
            <Button asChild size="lg">
              <Link to={focus.nextLessonUrl}>
                {started ? t('hero.continue') : t('hero.primary')}
                <ArrowRight />
              </Link>
            </Button>
          )}
          <Button asChild size="lg" variant="outline">
            <Link to="/roadmap">
              <Map />
              {t('hero.roadmap')}
            </Link>
          </Button>
        </div>
        {recommended && (
          <p className="mt-4 text-sm text-muted-foreground">
            {t('hero.focus')}: <span className="font-medium text-foreground">{localize(recommended.title, locale)}</span>
          </p>
        )}
      </section>

      {/* Stats */}
      <section aria-labelledby="progress-title">
        <h2 id="progress-title" className="text-xl font-semibold tracking-tight">
          {t('progress.title')}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Award />} label={t('progress.courses')} value={all.filter((p) => p.completed).length} total={tracks.length} />
          <Stat icon={<BookOpen />} label={t('progress.lessons')} value={lessonsDone} total={lessonsAvailable} />
          <Stat icon={<Dumbbell />} label={t('progress.exercises')} value={passed.size} total={allExercises.length} />
          <Stat icon={<Target />} label={t('progress.challenges')} value={challenges.filter((c) => passed.has(c.exercise.id)).length} total={challenges.length} />
        </div>
      </section>

      {/* Courses in focus */}
      <section aria-labelledby="focus-title">
        <h2 id="focus-title" className="text-xl font-semibold tracking-tight">
          {inProgress.length ? t('focus.inProgress') : t('focus.startHere')}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(inProgress.length ? inProgress : [core]).map((c) => (
            <CourseCard key={c.slug} track={c} progress={byCourse[c.slug]} recommended={recommended?.slug === c.slug} />
          ))}
          {recommended && !inProgress.some((c) => c.slug === recommended.slug) && recommended.slug !== core.slug && (
            <CourseCard track={recommended} progress={byCourse[recommended.slug]} recommended />
          )}
        </div>
      </section>

      {/* Roadmap preview */}
      <section aria-labelledby="roadmap-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="roadmap-title" className="text-xl font-semibold tracking-tight">
              {t('roadmap.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('roadmap.subtitle')}</p>
          </div>
          <Button asChild variant="link" className="px-0">
            <Link to="/roadmap">{t('roadmap.open')}</Link>
          </Button>
        </div>
        <ol className="mt-4 grid gap-3 sm:grid-cols-5">
          {roadmapStages('cloud').map(({ stage, courses }) => (
            <li key={stage} className="rounded-xl border bg-card p-3">
              <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t('roadmap.stage', { n: stage })}</div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {courses.map((c) => {
                  const p = byCourse[c.slug]!;
                  return (
                    <li key={c.slug}>
                      <Link
                        to={`/learn/${c.slug}`}
                        className="track-accent flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] hover:bg-muted"
                        style={{ '--hue': c.hue } as CSSProperties}
                      >
                        <ContentIcon name={c.icon} className="size-3.5 shrink-0 text-(--tc)" />
                        <span className={cn('min-w-0 flex-1 truncate', p.completed && 'text-success')}>{localize(c.title, locale)}</span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">{Math.round(p.ratio * 100)}%</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {/* Tools */}
      <section aria-labelledby="tools-title">
        <h2 id="tools-title" className="text-xl font-semibold tracking-tight">
          {t('tools.title')}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((m) => (
            <Link key={m.key} to={m.to} className="flex items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <m.icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{t(`tools.${m.key}.title`)}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t(`tools.${m.key}.body`)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
