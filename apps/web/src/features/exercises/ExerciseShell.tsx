import type { Exercise } from '@learninglab/content';
import { localize, type LocalizedText } from '@learninglab/shared';
import { CircleCheck, Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { exerciseAnchor } from '@/features/lab/backTo';
import { useProgress } from '@/features/progress/api';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';

/** Common frame for every exercise: kind badge, status, hints, body. */
export function ExerciseShell({
  exercise,
  index,
  hintsShown,
  onHint,
  children,
}: {
  exercise: Exercise;
  index?: number;
  hintsShown: number;
  onHint: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation(['practice', 'common']);
  const locale = currentLocale();
  const progress = useProgress();
  const summary = progress.exercise(exercise.id);
  const hints: LocalizedText[] = exercise.hints ?? [];

  return (
    <section
      id={exerciseAnchor(exercise.id)}
      className={cn('scroll-mt-20 rounded-xl border bg-card p-4 sm:p-5', summary?.passed && 'border-success/40')}
      aria-label={t(`common:practiceKinds.${exercise.kind}`)}
      data-exercise={exercise.id}
    >
      <header className="mb-3 flex flex-wrap items-center gap-2">
        {index !== undefined && <span className="font-mono text-xs text-muted-foreground tabular-nums">#{index + 1}</span>}
        <Badge tone="primary">{t(`common:practiceKinds.${exercise.kind}`)}</Badge>
        {summary?.passed ? (
          <Badge tone="success">
            <CircleCheck aria-hidden />
            {t('practice:status.passed')}
          </Badge>
        ) : summary ? (
          <Badge tone="warning">{t('practice:status.tried', { count: summary.attempts })}</Badge>
        ) : null}
      </header>
      {children}
      {hints.length > 0 && (
        <div className="mt-4">
          {hints.slice(0, hintsShown).map((h, i) => (
            <p key={i} className="mb-2 flex gap-2 rounded-md bg-warning-soft p-2.5 text-[13px] leading-snug">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              {localize(h, locale)}
            </p>
          ))}
          {hintsShown < hints.length && (
            <Button size="sm" variant="ghost" onClick={onHint}>
              <Lightbulb />
              {t('practice:hint', { n: hintsShown + 1, total: hints.length })}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
