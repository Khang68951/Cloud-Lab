import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';
import NotFoundPage from './NotFoundPage';

export default function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  const detail = error instanceof Error ? error.message : String(error);
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <TriangleAlert className="size-10 text-danger" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold">{t('error.title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('error.body')}</p>
      {import.meta.env.DEV && (
        <pre className="mt-4 max-w-full overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs">{detail}</pre>
      )}
      <Button className="mt-6" onClick={() => window.location.reload()}>
        {t('actions.retry')}
      </Button>
    </div>
  );
}
