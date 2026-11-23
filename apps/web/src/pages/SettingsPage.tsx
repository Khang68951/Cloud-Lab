import { LOCALES, type Locale, type ThemePreference } from '@cloudlab/shared';
import { Check, Coins, Database, Loader2, Palette, UserRound, WifiOff } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { THEME_ICONS } from '@/theme/themeIcons';
import { DataManager } from '@/features/settings/DataManager';
import { usePreferences } from '@/features/settings/usePreferences';
import { useSettings, useSettingsSaveState, useUpdateSettings } from '@/features/settings/useSettings';
import { formatPrice } from '@/lib/format';

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <span className="grid size-8 place-items-center rounded-md bg-accent text-accent-foreground [&_svg]:size-4">
          {icon}
        </span>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">{children}</CardContent>
    </Card>
  );
}

function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="max-w-sm">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SaveStatus() {
  const { t } = useTranslation('settings');
  const state = useSettingsSaveState();
  if (state === 'error') {
    return (
      <Badge tone="warning">
        <WifiOff aria-hidden />
        {t('offline')}
      </Badge>
    );
  }
  if (state === 'saving') {
    return (
      <Badge tone="neutral">
        <Loader2 className="animate-spin" aria-hidden />
        {t('saving')}
      </Badge>
    );
  }
  return (
    <Badge tone="success">
      <Check aria-hidden />
      {t('saved')}
    </Badge>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation();
  const { theme, locale, setTheme, setLocale } = usePreferences();
  const settings = useSettings();
  const update = useUpdateSettings();
  const rateId = useId();
  const nameId = useId();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const vndId = useId();

  // While typing we keep a draft; otherwise the input shows the saved value.
  const [rateDraft, setRateDraft] = useState<string | null>(null);
  const rate = rateDraft ?? String(settings.vndPerUsd);

  const commitRate = () => {
    const n = Number(rate);
    if (Number.isFinite(n) && n > 0 && n !== settings.vndPerUsd) update.mutate({ vndPerUsd: n });
    setRateDraft(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('title')} subtitle={t('subtitle')} actions={<SaveStatus />} />

      <div className="flex flex-col gap-6">
        <Section icon={<UserRound />} title={t('profile.title')}>
          <Field label={t('profile.name')} hint={t('profile.nameHint')} htmlFor={nameId}>
            <input
              id={nameId}
              value={nameDraft ?? settings.displayName}
              maxLength={60}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                if (nameDraft !== null && nameDraft.trim() !== settings.displayName) update.mutate({ displayName: nameDraft.trim() });
                setNameDraft(null);
              }}
              className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
            />
          </Field>
        </Section>

        <Section icon={<Palette />} title={t('appearance.title')}>
          <Field label={tc('theme.label')} hint={t('appearance.themeHint')}>
            <Segmented<ThemePreference>
              ariaLabel={tc('theme.label')}
              value={theme}
              onChange={setTheme}
              options={(['light', 'dark', 'system'] as const).map((v) => {
                const Icon = THEME_ICONS[v];
                return { value: v, label: tc(`theme.${v}`), icon: <Icon aria-hidden /> };
              })}
            />
          </Field>
          <Field label={tc('language.label')} hint={t('appearance.languageHint')}>
            <Segmented<Locale>
              ariaLabel={tc('language.label')}
              value={locale}
              onChange={setLocale}
              options={LOCALES.map((l) => ({ value: l, label: <span lang={l}>{tc(`language.names.${l}`)}</span> }))}
            />
          </Field>
        </Section>

        <Section icon={<Coins />} title={t('currency.title')}>
          <Field label={t('currency.showVnd')} hint={t('currency.showVndHint')} htmlFor={vndId}>
            <Switch id={vndId} checked={settings.showVnd} onCheckedChange={(v) => update.mutate({ showVnd: v })} />
          </Field>
          <Field label={t('currency.rate')} hint={t('currency.rateHint')} htmlFor={rateId}>
            <input
              id={rateId}
              type="number"
              inputMode="numeric"
              min={1}
              step={100}
              value={rate}
              onChange={(e) => setRateDraft(e.target.value)}
              onBlur={commitRate}
              onKeyDown={(e) => e.key === 'Enter' && commitRate()}
              className="h-9 w-36 rounded-md border border-input bg-background px-3 text-right font-mono text-sm tabular-nums"
            />
          </Field>
          <div className="rounded-lg bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">{t('currency.preview')}: </span>
            <span className="font-mono tabular-nums">{formatPrice(1234.5, locale, settings)}</span>
          </div>
        </Section>

        <Section icon={<Database />} title={t('data.title')}>
          <DataManager />
        </Section>
      </div>
    </div>
  );
}
