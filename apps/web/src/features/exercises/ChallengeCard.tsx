import { requirementLabel, splitRequirements, type CanvasChallenge } from '@learninglab/exercise-kit';
import { localize } from '@learninglab/shared';
import { ArrowRight, Lock, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { exerciseAnchor, fromParam } from '@/features/lab/backTo';
import { currentLocale } from '@/i18n';
import { ExerciseShell } from './ExerciseShell';

/** Canvas challenges are solved in the Lab; this card shows the brief and links there. */
export function ChallengeCard({ exercise, index }: { exercise: CanvasChallenge; index?: number }) {
  const { t } = useTranslation('practice');
  const locale = currentLocale();
  const { pathname } = useLocation();
  const { core, optimizations } = splitRequirements(exercise.requirements);
  return (
    <ExerciseShell exercise={{ ...exercise, hints: [] }} index={index} hintsShown={0} onHint={() => {}}>
      <h3 className="font-semibold">{localize(exercise.title, locale)}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">{localize(exercise.brief, locale)}</p>
      <div className="mt-3 rounded-lg bg-muted p-3">
        <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
          <Target className="size-3.5" aria-hidden />
          {t('challenge.requirements')}
        </h4>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px]">
          {core.map((r, i) => (
            <li key={i}>{localize(requirementLabel(r), locale)}</li>
          ))}
        </ul>
        {optimizations.length > 0 && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Lock className="size-3.5 shrink-0" aria-hidden />
            {t('challenge.hiddenOptimizations', { count: optimizations.length })}
          </p>
        )}
      </div>
      <Button asChild className="mt-4">
        <Link to={`/lab/challenge/${exercise.id}?${fromParam(pathname, exerciseAnchor(exercise.id))}`}>
          {t('challenge.open')}
          <ArrowRight />
        </Link>
      </Button>
    </ExerciseShell>
  );
}
