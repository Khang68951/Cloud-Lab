import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function NotFoundPage({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <p className="font-mono text-5xl font-semibold text-muted-foreground">404</p>
      <h1 className="mt-4 text-xl font-semibold">{t('notFound.title')}</h1>
      <p className="mt-2 text-muted-foreground">{message ?? t('notFound.body')}</p>
      <Button asChild className="mt-6">
        <Link to="/">{t('actions.backHome')}</Link>
      </Button>
    </div>
  );
}
