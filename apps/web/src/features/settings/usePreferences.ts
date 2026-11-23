import type { Locale, ThemePreference } from '@cloudlab/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLocale, storeLocale } from '@/i18n';
import { useTheme } from '@/theme/context';
import { useUpdateSettings } from './useSettings';

/**
 * Theme & language: applied locally first (instant, works offline), then
 * persisted to the API. Use this instead of touching i18n/theme directly.
 */
export function usePreferences() {
  const { i18n } = useTranslation();
  const { preference: theme, resolved, setPreference } = useTheme();
  const update = useUpdateSettings();

  const setTheme = useCallback(
    (next: ThemePreference) => {
      setPreference(next);
      update.mutate({ theme: next });
    },
    [setPreference, update],
  );

  const setLocale = useCallback(
    (next: Locale) => {
      storeLocale(next);
      void i18n.changeLanguage(next);
      update.mutate({ locale: next });
    },
    [i18n, update],
  );

  return {
    theme,
    resolvedTheme: resolved,
    locale: currentLocale(),
    setTheme,
    setLocale,
    saveError: update.isError,
  };
}
