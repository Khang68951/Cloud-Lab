import { exercisesOf, tracksOf } from '@learninglab/content';
import { localize } from '@learninglab/shared';
import { ArrowRight, Award, BookOpen, Dumbbell, Sparkles } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { domainPath } from '@/app/paths';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DOMAINS, type DomainDefinition } from '@/domains';
import { useProgress } from '@/features/progress/api';
import { useCourseProgress, type CourseProgress } from '@/features/progress/course';
import { currentLocale } from '@/i18n';

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
    </div>
  );
}

function DomainCard({ domain, byCourse, passed }: { domain: DomainDefinition; byCourse: Record<string, CourseProgress>; passed: Set<string> }) {
  const { t } = useTranslation('hub');
  const locale = currentLocale();
  const courses = tracksOf(domain.id);
  const ps = courses.map((c) => byCourse[c.slug]).filter((p): p is CourseProgress => Boolean(p));
  const done = ps.reduce((a, p) => a + p.lessonsDone, 0);
  const total = ps.reduce((a, p) => a + p.lessonsAvailable, 0);
  const exercises = exercisesOf(domain.id);
  const name = localize(domain.name, locale);

  return (
    <Link
      to={domainPath(domain.id)}
      data-domain={domain.id}
      className="track-accent group flex flex-col rounded-2xl border bg-card p-6 transition-colors hover:border-(--tc) hover:shadow-sm"
      style={{ '--hue': domain.hue } as CSSProperties}
    >
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-(--tc-soft) text-(--tc)">
          <domain.icon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
          <p className="text-sm text-muted-foreground">{localize(domain.tagline, locale)}</p>
        </div>
      </div>
      <p className="mt-4 flex-1 text-sm text-pretty">{localize(domain.description, locale)}</p>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{t('domains.courses', { count: courses.length })}</span>
        <span>{t('domains.lessons', { done, total })}</span>
        <span>{t('domains.exercises', { passed: exercises.filter((e) => passed.has(e.exercise.id)).length, total: exercises.length })}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-(--tc)" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-(--tc)">
        {t('domains.open', { name })}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

/** Learning Lab hub: the landing page. Pick an area; continue where you left off. */
export default function HubPage() {
  const { t } = useTranslation('hub');
  const locale = currentLocale();
  const progress = useProgress();
  const { byCourse, recommended } = useCourseProgress();
  const all = Object.values(byCourse);
  const started = all.some((p) => p.started);
  const passed = new Set(progress.data.exercises.filter((e) => e.passed).map((e) => e.exerciseId));
  const next = recommended ? byCourse[recommended.slug]?.nextLessonUrl : null;
  const exercisesTotal = DOMAINS.reduce((a, d) => a + exercisesOf(d.id).length, 0);
  const first = DOMAINS[0];

  return (
    <div className="flex flex-col gap-12">
      <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-9 sm:px-10 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <Badge tone="primary" className="mb-4">
          {t('hero.eyebrow')}
        </Badge>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{started ? t('hero.welcomeBack') : t('hero.title')}</h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground sm:text-lg">{t('hero.subtitle')}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {started && next && recommended ? (
            <Button asChild size="lg">
              <Link to={next}>
                {t('hero.continue', { lesson: localize(recommended.title, locale) })}
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            first && (
              <Button asChild size="lg">
                <Link to={domainPath(first.id)}>
                  {t('hero.start', { domain: localize(first.name, locale) })}
                  <ArrowRight />
                </Link>
              </Button>
            )
          )}
        </div>
      </section>

      <section aria-labelledby="domains-title">
        <h2 id="domains-title" className="text-xl font-semibold tracking-tight">
          {t('domains.title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('domains.subtitle')}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {DOMAINS.map((d) => (
            <DomainCard key={d.id} domain={d} byCourse={byCourse} passed={passed} />
          ))}
          <div className="flex flex-col justify-center rounded-2xl border border-dashed p-6 text-muted-foreground">
            <Sparkles className="mb-3 size-6" aria-hidden />
            <h3 className="font-semibold text-foreground">{t('domains.more')}</h3>
            <p className="mt-1 text-sm text-pretty">{t('domains.moreBody')}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="progress-title">
        <h2 id="progress-title" className="text-xl font-semibold tracking-tight">
          {t('progress.title')}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat icon={<Award />} label={t('progress.courses')} value={all.filter((p) => p.completed).length} total={all.length} />
          <Stat
            icon={<BookOpen />}
            label={t('progress.lessons')}
            value={all.reduce((a, p) => a + p.lessonsDone, 0)}
            total={all.reduce((a, p) => a + p.lessonsAvailable, 0)}
          />
          <Stat icon={<Dumbbell />} label={t('progress.exercises')} value={passed.size} total={exercisesTotal} />
        </div>
      </section>
    </div>
  );
}
