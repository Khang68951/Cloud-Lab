import { getExercise } from '@learninglab/content';
import { Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { lessonPath } from '@/app/paths';
import { exerciseAnchor, fromParam } from '@/lib/returnTo';
import { challengePath, labPath } from '../paths';

/** Button that opens the Lab with a template or a challenge. */
export function TryLab({ template, challenge, label }: { template?: string; challenge?: string; label?: string }) {
  const { t } = useTranslation('lesson');
  const { pathname } = useLocation();
  // Return to the challenge's result card when it is on this page, else to this button.
  const anchor = `trylab-${challenge ?? template ?? 'free'}`;
  const ref = challenge ? getExercise(challenge)?.ref : undefined;
  const ownCard = ref && pathname === lessonPath(ref);
  const back = fromParam(pathname, ownCard ? exerciseAnchor(challenge!) : anchor);
  const to = challenge ? challengePath(challenge, back) : labPath(`${template ? `template=${template}&` : ''}${back}`);
  return (
    <div className="not-prose my-5 scroll-mt-20" id={anchor}>
      <Button asChild variant="outline">
        <Link to={to}>
          <Workflow />
          {label ?? t('openLab')}
        </Link>
      </Button>
    </div>
  );
}
