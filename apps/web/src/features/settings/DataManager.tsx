import { useQueryClient } from '@tanstack/react-query';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-context';
import { api, unwrap } from '@/lib/api';

/** Export / import / reset all local learning data. */
export function DataManager() {
  const { t } = useTranslation('settings');
  const toast = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const refreshAll = () => qc.invalidateQueries();

  const exportData = async () => {
    try {
      const data = await unwrap<unknown>(await api.data.export.$get());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloudlab-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast(t('data.exportFailed'), 'error');
    }
  };

  const importData = async (file: File) => {
    if (!window.confirm(t('data.confirmImport'))) return;
    setBusy(true);
    try {
      const json = JSON.parse(await file.text()) as Parameters<typeof api.data.import.$post>[0]['json'];
      await unwrap(await api.data.import.$post({ json }));
      await refreshAll();
      toast(t('data.imported'), 'success');
    } catch {
      toast(t('data.importFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(t('data.confirmReset'))) return;
    setBusy(true);
    try {
      await unwrap(await api.progress.$delete());
      await refreshAll();
      toast(t('data.resetDone'), 'success');
    } catch {
      toast(t('data.resetFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t('data.body')}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportData} disabled={busy}>
          <Download />
          {t('data.export')}
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload />
          {t('data.import')}
        </Button>
        <Button variant="ghost" className="text-danger" onClick={reset} disabled={busy}>
          <RotateCcw />
          {t('data.reset')}
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        data-testid="import-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importData(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
