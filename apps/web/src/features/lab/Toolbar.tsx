import { TEMPLATES, type Design } from '@cloudlab/catalog';
import { localize } from '@cloudlab/shared';
import { DropdownMenu as DM } from 'radix-ui';
import {
  ArrowLeft,
  Download,
  FileJson,
  FolderOpen,
  Image,
  LayoutTemplate,
  Redo2,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
  Upload,
  Zap,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast-context';
import { currentLocale } from '@/i18n';
import { formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { fetchDesign, useDeleteDesign, useDesignList, useSaveDesign } from './api';

function Menu({ trigger, children, label }: { trigger: ReactNode; children: ReactNode; label: string }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label={label} title={label}>
          {trigger}
        </Button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          sideOffset={6}
          align="start"
          className="z-50 min-w-56 max-w-80 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {children}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

const itemCls =
  'flex cursor-default select-none items-start gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0';

export function LabToolbar(props: {
  mode: 'free' | 'challenge';
  backTo?: { to: string; label: string | null };
  title: string;
  onTitle: (t: string) => void;
  designId: number | null;
  onSaved: (id: number) => void;
  getDesign: () => Design;
  monthlyUsd: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTemplate: (id: string) => void;
  onOpen: (d: Design, meta: { title: string; id: number }) => void;
  onResetChallenge: () => void;
  chaos: { azDown: boolean; spike: boolean; killedCount: number };
  onChaos: { azDown: () => void; spike: () => void; reset: () => void };
  onExportPng: () => void;
  onExportJson: () => void;
  onImportJson: (f: File) => void;
}) {
  const { t } = useTranslation('lab');
  const { t: tc } = useTranslation();
  const locale = currentLocale();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const save = useSaveDesign();
  const list = useDesignList(openDialog);
  const del = useDeleteDesign();
  const chaosOn = props.chaos.azDown || props.chaos.spike || props.chaos.killedCount > 0;

  const doSave = async () => {
    const title = props.title.trim() || t('untitled');
    try {
      const saved = await save.mutateAsync({ id: props.designId, title, graph: props.getDesign(), monthlyUsd: props.monthlyUsd });
      props.onTitle(title);
      props.onSaved(saved.id);
      toast(t('toast.saved', { title }), 'success');
    } catch {
      toast(t('toast.saveFailed'), 'error');
    }
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b bg-card px-2">
      {props.backTo && (
        <>
          <Button asChild size="sm" variant="ghost" className="shrink-0">
            <Link to={props.backTo.to} title={props.backTo.label ? t('back.title', { title: props.backTo.label }) : t('back.short')} data-testid="lab-back">
              <ArrowLeft />
              <span className="max-sm:hidden">{t('back.short')}</span>
            </Link>
          </Button>
          <div className="mx-1 h-6 w-px shrink-0 bg-border" />
        </>
      )}
      {props.mode === 'free' ? (
        <input
          aria-label={t('toolbar.title')}
          value={props.title}
          onChange={(e) => props.onTitle(e.target.value)}
          placeholder={t('untitled')}
          maxLength={100}
          className="h-8 w-44 shrink-0 rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold hover:border-input focus:border-input lg:w-56"
        />
      ) : (
        <span className="max-w-64 shrink-0 truncate px-2 text-sm font-semibold">{props.title}</span>
      )}

      <div className="mx-1 h-6 w-px shrink-0 bg-border" />

      {props.mode === 'free' ? (
        <Menu label={t('toolbar.templates')} trigger={<><LayoutTemplate /><span className="max-lg:hidden">{t('toolbar.templates')}</span></>}>
          <DM.Label className="px-2 py-1.5 text-xs text-muted-foreground">{t('toolbar.templatesHint')}</DM.Label>
          {TEMPLATES.map((tpl) => (
            <DM.Item key={tpl.id} className={itemCls} onSelect={() => props.onTemplate(tpl.id)}>
              <LayoutTemplate />
              <span>
                <span className="block font-medium">{localize(tpl.name, locale)}</span>
                <span className="block text-xs text-muted-foreground">{localize(tpl.description, locale)}</span>
              </span>
            </DM.Item>
          ))}
        </Menu>
      ) : (
        <Button variant="ghost" size="sm" onClick={props.onResetChallenge} title={t('toolbar.resetChallenge')}>
          <RotateCcw />
          <span className="max-lg:hidden">{t('toolbar.resetChallenge')}</span>
        </Button>
      )}

      <Button variant="ghost" size="icon" onClick={props.onUndo} disabled={!props.canUndo} aria-label={t('toolbar.undo')} title={`${t('toolbar.undo')} (Ctrl+Z)`}>
        <Undo2 />
      </Button>
      <Button variant="ghost" size="icon" onClick={props.onRedo} disabled={!props.canRedo} aria-label={t('toolbar.redo')} title={`${t('toolbar.redo')} (Ctrl+Y)`}>
        <Redo2 />
      </Button>

      <Menu
        label={t('toolbar.chaos')}
        trigger={
          <>
            <Zap className={cn(chaosOn && 'text-danger')} />
            <span className={cn('max-lg:hidden', chaosOn && 'text-danger')}>{t('toolbar.chaos')}</span>
          </>
        }
      >
        <DM.Label className="px-2 py-1.5 text-xs text-muted-foreground">{t('chaos.hint')}</DM.Label>
        <DM.CheckboxItem className={itemCls} checked={props.chaos.azDown} onCheckedChange={props.onChaos.azDown} onSelect={(e) => e.preventDefault()}>
          <span className={cn('mt-1 size-3 shrink-0 rounded-sm border', props.chaos.azDown && 'border-danger bg-danger')} />
          <span>
            <span className="block font-medium">{t('chaos.azDown')}</span>
            <span className="block text-xs text-muted-foreground">{t('chaos.azDownHelp')}</span>
          </span>
        </DM.CheckboxItem>
        <DM.CheckboxItem className={itemCls} checked={props.chaos.spike} onCheckedChange={props.onChaos.spike} onSelect={(e) => e.preventDefault()}>
          <span className={cn('mt-1 size-3 shrink-0 rounded-sm border', props.chaos.spike && 'border-danger bg-danger')} />
          <span>
            <span className="block font-medium">{t('chaos.spike')}</span>
            <span className="block text-xs text-muted-foreground">{t('chaos.spikeHelp')}</span>
          </span>
        </DM.CheckboxItem>
        <DM.Label className="px-2 py-1.5 text-xs text-muted-foreground">{t('chaos.killHint', { count: props.chaos.killedCount })}</DM.Label>
        <DM.Separator className="my-1 h-px bg-border" />
        <DM.Item className={itemCls} onSelect={props.onChaos.reset} disabled={!chaosOn}>
          <RotateCcw />
          {t('chaos.reset')}
        </DM.Item>
      </Menu>

      <div className="flex-1" />

      <Menu label={t('toolbar.export')} trigger={<><Download /><span className="max-lg:hidden">{t('toolbar.export')}</span></>}>
        <DM.Item className={itemCls} onSelect={props.onExportPng}>
          <Image />
          {t('toolbar.exportPng')}
        </DM.Item>
        <DM.Item className={itemCls} onSelect={props.onExportJson}>
          <FileJson />
          {t('toolbar.exportJson')}
        </DM.Item>
        {props.mode === 'free' && (
          <DM.Item className={itemCls} onSelect={() => fileRef.current?.click()}>
            <Upload />
            {t('toolbar.importJson')}
          </DM.Item>
        )}
      </Menu>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) props.onImportJson(f);
          e.target.value = '';
        }}
      />

      {props.mode === 'free' && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setOpenDialog(true)}>
            <FolderOpen />
            <span className="max-lg:hidden">{t('toolbar.open')}</span>
          </Button>
          <Button size="sm" onClick={doSave} disabled={save.isPending} data-testid="lab-save">
            <Save />
            {t('toolbar.save')}
          </Button>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent title={t('open.title')} description={t('open.description')} closeLabel={tc('a11y.closeMenu')}>
              {list.isLoading && <p className="text-sm text-muted-foreground">…</p>}
              {list.isError && <p className="text-sm text-danger">{tc('api.offlineTitle')}</p>}
              {list.data?.length === 0 && <p className="text-sm text-muted-foreground">{t('open.empty')}</p>}
              <ul className="flex flex-col divide-y">
                {list.data?.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 py-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded-md px-2 py-1 text-left hover:bg-muted"
                      onClick={async () => {
                        try {
                          const full = await fetchDesign(d.id);
                          props.onOpen(full.graph, { title: full.title, id: full.id });
                          setOpenDialog(false);
                        } catch {
                          toast(t('toast.openFailed'), 'error');
                        }
                      }}
                    >
                      <span className="block truncate font-medium">{d.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {d.monthlyUsd !== null && `${formatUsd(d.monthlyUsd, locale)}/${t('perMonthShort')} · `}
                        {new Date(d.updatedAt).toLocaleString(locale)}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('open.delete', { title: d.title })}
                      onClick={() => {
                        if (window.confirm(t('open.confirmDelete', { title: d.title }))) del.mutate(d.id);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
