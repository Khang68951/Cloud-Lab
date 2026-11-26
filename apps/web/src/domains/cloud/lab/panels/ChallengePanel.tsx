import type { Design } from '@learninglab/cloud-catalog';
import { challengeDesign, checkRequirement, revealedOptimizations, splitRequirements, type CanvasChallenge, type GradeResult } from '@learninglab/cloud-challenges';
import { localize } from '@learninglab/shared';
import type { SimResult } from '@learninglab/cloud-sim';
import { ArrowLeft, CircleCheck, CircleX, Eye, Lightbulb, Lock, Send, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';

export function ChallengePanel({
  challenge,
  design,
  result,
  hintsShown,
  onHint,
  onSubmit,
  submitting,
  submission,
  onShowReference,
  backTo,
}: {
  challenge: CanvasChallenge;
  design: Design;
  result: SimResult | null;
  hintsShown: number;
  onHint: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submission: GradeResult | null;
  onShowReference: () => void;
  backTo?: { to: string; label: string | null };
}) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const hints = challenge.hints ?? [];

  // Core requirements are shown from the start; optimisations (cache, queue,
  // topic…) stay hidden until hints reveal them, but are still graded.
  const split = useMemo(() => splitRequirements(challenge.requirements), [challenge]);
  const passed = submission?.passed === true;
  const revealed = passed ? split.optimizations.length : revealedOptimizations(split.optimizations.length, hintsShown, hints.length);
  const hiddenLeft = split.optimizations.length - revealed;

  // Live check of every requirement as the learner edits.
  const checks = useMemo(() => {
    if (!result) return { core: [], opt: [] };
    const d = challengeDesign(challenge, design);
    return {
      core: split.core.map((r) => checkRequirement(r, d, result)),
      opt: split.optimizations.map((r) => checkRequirement(r, d, result)),
    };
  }, [challenge, design, result, split]);
  const live = [...checks.core.map((c) => ({ ...c, opt: false })), ...checks.opt.slice(0, revealed).map((c) => ({ ...c, opt: true }))];
  const passedCount = live.filter((c) => c.passed).length;
  const coreDone = checks.core.length > 0 && checks.core.every((c) => c.passed);
  const hiddenFailing = checks.opt.slice(revealed).filter((c) => !c.passed).length;

  return (
    <div className="flex flex-col gap-4 p-3">
      <div>
        <Badge tone="primary">{t(`challengeKind.${challenge.kind}`)}</Badge>
        <h3 className="mt-2 font-semibold leading-snug">{localize(challenge.title, locale)}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-muted-foreground">{localize(challenge.brief, locale)}</p>
        {challenge.manualSg && (
          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-warning-soft px-2 py-1.5 text-[12px] leading-snug text-warning" data-testid="manual-sg">
            <ShieldAlert className="mt-px size-3.5 shrink-0" aria-hidden />
            {t('challenge.manualSg')}
          </p>
        )}
      </div>

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <h4 className="text-xs font-semibold">{t('challenge.requirements')}</h4>
          <span className="text-xs text-muted-foreground tabular-nums">
            {passedCount}/{live.length}
          </span>
        </div>
        <ul className="flex flex-col gap-1.5" data-testid="requirements">
          {live.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px]" data-passed={c.passed}>
              {c.passed ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-label={t('challenge.met')} />
              ) : (
                <CircleX className="mt-0.5 size-4 shrink-0 text-danger" aria-label={t('challenge.notMet')} />
              )}
              <span className="flex-1">
                {c.opt && (
                  <span className="mr-1 rounded bg-warning-soft px-1 text-[10px] font-semibold text-warning">{t('challenge.optimization')}</span>
                )}
                {localize(c.label, locale)}
                {c.actual && <span className="ml-1 font-mono text-[11px] text-muted-foreground">({c.actual})</span>}
              </span>
            </li>
          ))}
        </ul>
        {hiddenLeft > 0 && (
          <p className="mt-2 flex items-start gap-2 text-[12px] text-muted-foreground" data-testid="hidden-requirements">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t('challenge.hiddenOptimizations', { count: hiddenLeft })}
          </p>
        )}
      </section>

      {hints.length > 0 && (
        <section>
          <h4 className="mb-1.5 text-xs font-semibold">{t('challenge.hints')}</h4>
          <ol className="flex flex-col gap-1.5">
            {hints.slice(0, hintsShown).map((h, i) => (
              <li key={i} className="flex gap-2 rounded-md bg-warning-soft p-2 text-[12px] leading-snug">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                {localize(h, locale)}
              </li>
            ))}
          </ol>
          {hintsShown < hints.length && (
            <Button size="sm" variant="outline" className="mt-2" onClick={onHint}>
              <Lightbulb />
              {t('challenge.showHint', { n: hintsShown + 1, total: hints.length })}
            </Button>
          )}
        </section>
      )}

      <Button onClick={onSubmit} disabled={submitting} data-testid="submit-challenge">
        <Send />
        {t('challenge.submit')}
      </Button>

      {submission && (
        <section
          role="status"
          className={cn('rounded-lg border p-3', submission.passed ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft')}
        >
          <p className={cn('font-semibold', submission.passed ? 'text-success' : 'text-danger')}>
            {submission.passed ? t('challenge.passed') : t('challenge.failed', { score: submission.score })}
          </p>
          {!submission.passed && coreDone && hiddenFailing > 0 && (
            <p className="mt-1.5 text-[13px] leading-relaxed" data-testid="needs-optimization">
              {t('challenge.needsOptimization', { count: hiddenFailing })}
            </p>
          )}
          {submission.passed && (
            <>
              <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-line">{localize(challenge.debrief, locale)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {backTo && (
                  <Button asChild size="sm" data-testid="back-to-lesson">
                    <Link to={backTo.to} title={backTo.label ? t('back.title', { title: backTo.label }) : undefined}>
                      <ArrowLeft />
                      {t('back.afterPass')}
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={onShowReference}>
                  <Eye />
                  {t('challenge.reference')}
                </Button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
