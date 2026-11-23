import { getTrack } from '@cloudlab/content';
import { localize } from '@cloudlab/shared';
import { Award, Check, Printer, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { useCourseProgress } from '@/features/progress/course';
import { useSettings } from '@/features/settings/useSettings';
import { currentLocale } from '@/i18n';
import NotFoundPage from './NotFoundPage';

/** Printable certificate of completion (local — it certifies to yourself). */
export default function CertificatePage() {
  const { trackSlug = '' } = useParams();
  const { t } = useTranslation('learn');
  const locale = currentLocale();
  const settings = useSettings();
  const { byCourse } = useCourseProgress();
  const track = getTrack(trackSlug);
  if (!track) return <NotFoundPage message={t('trackNotFound')} />;
  const p = byCourse[track.slug]!;

  if (!p.completed) {
    const rows: [string, boolean][] = [
      [t('certificate.reqLessons', { done: p.lessonsDone, total: p.lessonsTotal }), p.lessonsDone === p.lessonsTotal],
      [t('certificate.reqChallenges', { done: p.challengesPassed, total: p.challengesTotal }), p.challengesPassed === p.challengesTotal],
    ];
    return (
      <div className="mx-auto max-w-lg py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t('certificate.notYet')}</h1>
        <p className="mt-2 text-muted-foreground">{t('certificate.notYetBody', { course: localize(track.title, locale) })}</p>
        <ul className="mt-6 flex flex-col gap-2">
          {rows.map(([label, ok]) => (
            <li key={label} className="flex items-center gap-2 text-sm">
              {ok ? <Check className="size-4 text-success" aria-hidden /> : <X className="size-4 text-danger" aria-hidden />}
              {label}
            </li>
          ))}
        </ul>
        <Button asChild className="mt-6">
          <Link to={`/learn/${track.slug}`}>{localize(track.title, locale)}</Link>
        </Button>
      </div>
    );
  }

  // A completed course always has a completion time (its last lesson).
  const date = new Date(p.completedAt ?? 0).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap justify-between gap-2 print:hidden">
        <Button asChild variant="ghost">
          <Link to={`/learn/${track.slug}`}>{localize(track.title, locale)}</Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer />
          {t('certificate.print')}
        </Button>
      </div>
      {!settings.displayName && (
        <p className="mb-4 rounded-lg bg-info-soft p-3 text-sm text-info print:hidden">
          {t('certificate.setName')}{' '}
          <Link to="/settings" className="underline underline-offset-2">
            {t('certificate.settings')}
          </Link>
        </p>
      )}
      <article
        className="track-accent relative overflow-hidden rounded-2xl border-4 border-double border-(--tc) bg-card px-8 py-14 text-center print:border-black"
        style={{ '--hue': track.hue } as CSSProperties}
        data-testid="certificate"
      >
        <Award className="mx-auto size-14 text-(--tc)" aria-hidden />
        <p className="mt-4 text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t('certificate.heading')}</p>
        <p className="mt-6 text-muted-foreground">{t('certificate.awardedTo')}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{settings.displayName || t('certificate.learner')}</p>
        <p className="mt-6 text-muted-foreground">{t('certificate.forCompleting')}</p>
        <h1 className="mt-2 text-2xl font-semibold text-balance">{localize(track.title, locale)}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          {t('certificate.stats', { lessons: p.lessonsTotal, exercises: p.exercisesPassed, challenges: p.challengesPassed })}
        </p>
        <p className="mt-10 font-mono text-sm">{date}</p>
        <p className="mt-1 text-xs text-muted-foreground">CloudLab</p>
      </article>
    </div>
  );
}
