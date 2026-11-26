import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** Learning Lab mark: always leads back to the hub. */
export function Logo({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  return (
    <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <FlaskConical className="size-4.5" aria-hidden />
      </span>
      <span className="text-base">{t('appName')}</span>
    </Link>
  );
}
