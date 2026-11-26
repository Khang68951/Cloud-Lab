import { getTemplate, type Design } from '@learninglab/cloud-catalog';
import { localize } from '@learninglab/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { fetchDesign } from '@/domains/cloud/lab/api';
import { resolveBackTo } from '@/domains/cloud/lab/backTo';
import { readDraft } from '@/domains/cloud/lab/draft';
import { LabWorkspace } from '@/domains/cloud/lab/LabWorkspace';
import { currentLocale } from '@/i18n';

interface Initial {
  design: Design;
  title: string;
  id: number | null;
  key: string;
}

/**
 * Free-form architecture lab.
 *  /lab                 → last draft (or the 3-tier template on first visit)
 *  /lab?template=<id>   → start from a template
 *  /lab?design=<id>     → open a saved design
 *  &from=<path#anchor>  → show a "back to lesson" button (set by TryLab)
 */
export default function LabPage() {
  const [params] = useSearchParams();
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const templateId = params.get('template');
  const designId = params.get('design');
  const [initial, setInitial] = useState<Initial | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fromTemplate = (id: string): Initial | null => {
      const tpl = getTemplate(id);
      return tpl ? { design: tpl.design, title: localize(tpl.name, locale), id: null, key: `tpl:${id}:${Date.now()}` } : null;
    };
    void (async () => {
      let next: Initial | null = null;
      if (designId) {
        try {
          const d = await fetchDesign(Number(designId));
          next = { design: d.graph, title: d.title, id: d.id, key: `design:${d.id}` };
        } catch {
          setError(true);
        }
      }
      if (!next && templateId) next = fromTemplate(templateId);
      if (!next) {
        const draft = readDraft();
        if (draft) next = { design: draft.design, title: draft.title, id: draft.designId, key: 'draft' };
      }
      next ??= fromTemplate('three-tier');
      if (!cancelled) setInitial(next);
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when the URL asks for a different starting point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, designId]);

  if (!initial) {
    return <div className="grid h-[calc(100dvh-3.5rem)] place-items-center text-muted-foreground">{error ? t('toast.openFailed') : '…'}</div>;
  }
  const backTo = resolveBackTo({ from: params.get('from'), locale });
  return (
    <LabWorkspace key={initial.key} initial={initial.design} initialTitle={initial.title} initialDesignId={initial.id} backTo={backTo} />
  );
}
