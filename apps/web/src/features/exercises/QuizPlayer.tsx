import { grade, type GradeResult, type ScenarioQuiz } from '@cloudlab/exercise-kit';
import { localize } from '@cloudlab/shared';
import { CircleCheck, CircleX, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useRecordAttempt } from '@/features/progress/api';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { ExerciseShell } from './ExerciseShell';

export function QuizPlayer({ exercise, index }: { exercise: ScenarioQuiz; index?: number }) {
  const { t } = useTranslation('practice');
  const locale = currentLocale();
  const record = useRecordAttempt();
  const multi = exercise.choices.filter((c) => c.correct).length > 1;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<GradeResult | null>(null);
  const [hints, setHints] = useState(0);

  const toggle = (id: string) => {
    if (result) return;
    setSelected((s) => {
      if (!multi) return new Set([id]);
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const submit = () => {
    const r = grade(exercise, { kind: 'scenario-quiz', selected: [...selected] });
    setResult(r);
    record.mutate({ exerciseId: exercise.id, kind: exercise.kind, passed: r.passed, score: r.score, hintsUsed: hints, answer: [...selected] });
  };

  return (
    <ExerciseShell exercise={exercise} index={index} hintsShown={hints} onHint={() => setHints((h) => h + 1)}>
      <p className="font-medium leading-relaxed">{localize(exercise.prompt, locale)}</p>
      {multi && <p className="mt-1 text-xs text-muted-foreground">{t('quiz.multi')}</p>}
      <div role={multi ? 'group' : 'radiogroup'} className="mt-3 flex flex-col gap-2">
        {exercise.choices.map((c) => {
          const isSel = selected.has(c.id);
          const show = result !== null;
          return (
            <div key={c.id}>
              <button
                type="button"
                role={multi ? 'checkbox' : 'radio'}
                aria-checked={isSel}
                disabled={show}
                onClick={() => toggle(c.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-[15px] transition-colors',
                  !show && 'hover:bg-muted',
                  !show && isSel && 'border-primary bg-accent',
                  show && c.correct && 'border-success/60 bg-success-soft',
                  show && isSel && !c.correct && 'border-danger/60 bg-danger-soft',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-5 shrink-0 place-items-center border text-[11px] font-semibold uppercase',
                    multi ? 'rounded' : 'rounded-full',
                    isSel ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                  )}
                  aria-hidden
                >
                  {c.id}
                </span>
                <span className="flex-1">{localize(c.text, locale)}</span>
                {show && c.correct && <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-label={t('quiz.correct')} />}
                {show && isSel && !c.correct && <CircleX className="mt-0.5 size-4 shrink-0 text-danger" aria-label={t('quiz.wrong')} />}
              </button>
              {show && (isSel || c.correct) && (
                <p className="mt-1 ml-8 text-[13px] leading-snug text-muted-foreground">{localize(c.explain, locale)}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!result ? (
          <Button onClick={submit} disabled={selected.size === 0}>
            {t('check')}
          </Button>
        ) : (
          <>
            <span role="status" className={cn('font-semibold', result.passed ? 'text-success' : 'text-danger')}>
              {result.passed ? t('quiz.passed') : t('quiz.failed')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResult(null);
                setSelected(new Set());
              }}
            >
              <RotateCcw />
              {t('retry')}
            </Button>
          </>
        )}
      </div>
    </ExerciseShell>
  );
}
