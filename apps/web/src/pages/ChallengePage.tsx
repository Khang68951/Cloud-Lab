import { getExercise } from '@learninglab/content';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';
import { resolveBackTo } from '@/features/lab/backTo';
import { LabWorkspace } from '@/features/lab/LabWorkspace';
import { currentLocale } from '@/i18n';
import NotFoundPage from './NotFoundPage';

/** A canvas challenge: the Lab with a brief, live requirement checks and grading. */
export default function ChallengePage() {
  const { exerciseId = '' } = useParams();
  const { t } = useTranslation('lab');
  const [params] = useSearchParams();
  const entry = getExercise(exerciseId);
  const ex = entry?.exercise;
  if (!ex || (ex.kind !== 'canvas-design' && ex.kind !== 'canvas-fix')) {
    return (
      <div className="p-8">
        <NotFoundPage message={t('challenge.notFound')} />
      </div>
    );
  }
  const backTo = resolveBackTo({ from: params.get('from'), exerciseId: ex.id, locale: currentLocale() });
  return <LabWorkspace key={ex.id} initial={ex.starter} challenge={ex} backTo={backTo} />;
}
