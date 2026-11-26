import { grade, type Estimation, type GradeResult } from '@learninglab/exercise-kit';
import { localize } from '@learninglab/shared';
import { RotateCcw } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useRecordAttempt } from '@/features/progress/api';
import { currentLocale } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ExerciseShell } from './ExerciseShell';

/** Accepts "1,234.5", "1.234,5", "1234.5" and "1234,5". */
function parseNumber(raw: string): number {
  const s = raw.trim().replace(/\s/g, '').replace(/[$%₫]/g, '');
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) return Number(s.replace(/\./g, '').replace(',', '.'));
  return Number(s.replace(/,/g, ''));
}

export function EstimationPlayer({ exercise, index }: { exercise: Estimation; index?: number }) {
  const { t } = useTranslation('practice');
  const locale = currentLocale();
  const id = useId();
  const record = useRecordAttempt();
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [hints, setHints] = useState(0);
  const value = parseNumber(raw);

  const submit = () => {
    if (!Number.isFinite(value)) return;
    const r = grade(exercise, { kind: 'estimation', value });
    setResult(r);
    record.mutate({ exerciseId: exercise.id, kind: exercise.kind, passed: r.passed, score: r.score, hintsUsed: hints, answer: value });
  };

  return (
    <ExerciseShell exercise={exercise} index={index} hintsShown={hints} onHint={() => setHints((h) => h + 1)}>
      <label htmlFor={id} className="block font-medium leading-relaxed">
        {localize(exercise.prompt, locale)}
      </label>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={raw}
          disabled={result !== null}
          onChange={(e) => setRaw(e.target.value)}
          className="h-10 w-40 rounded-md border border-input bg-background px-3 font-mono text-base tabular-nums"
          placeholder="0"
        />
        <span className="text-sm text-muted-foreground">{exercise.unit}</span>
        {!result && (
          <Button type="submit" disabled={!Number.isFinite(value)}>
            {t('check')}
          </Button>
        )}
      </form>
      {result && (
        <div className="mt-3">
          <p role="status" className={cn('font-semibold', result.passed ? 'text-success' : result.score > 0 ? 'text-warning' : 'text-danger')}>
            {result.passed ? t('estimate.passed') : result.score > 0 ? t('estimate.close') : t('estimate.failed')}
          </p>
          <p className="mt-1 text-sm">
            {t('estimate.answer')}:{' '}
            <span className="font-mono font-semibold tabular-nums">
              {formatNumber(exercise.answer, locale, { maximumFractionDigits: 4 })} {exercise.unit}
            </span>
          </p>
          <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{localize(exercise.explain, locale)}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setResult(null);
              setRaw('');
            }}
          >
            <RotateCcw />
            {t('retry')}
          </Button>
        </div>
      )}
    </ExerciseShell>
  );
}
