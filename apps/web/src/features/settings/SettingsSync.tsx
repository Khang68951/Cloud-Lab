import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LOCALE_STORAGE_KEY } from '@/i18n';
import { THEME_STORAGE_KEY } from '@/theme/theme';
import { useTheme } from '@/theme/context';
import { useSettingsQuery, useUpdateSettings } from './useSettings';

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Reconcile browser-local preferences with the database once, at startup.
 * Rule: a choice explicitly saved in this browser wins (it is what the user
 * sees right now, no flicker) and is pushed to the API; otherwise adopt the
 * value from the API.
 */
export function SettingsSync() {
  const { data } = useSettingsQuery();
  const { i18n } = useTranslation();
  const { preference, setPreference } = useTheme();
  const update = useUpdateSettings();
  const done = useRef(false);

  useEffect(() => {
    if (!data || done.current) return;
    done.current = true;

    const push: Parameters<typeof update.mutate>[0] = {};

    if (stored(THEME_STORAGE_KEY)) {
      if (preference !== data.theme) push.theme = preference;
    } else if (data.theme !== preference) {
      setPreference(data.theme);
    }

    const lang = i18n.language;
    if (stored(LOCALE_STORAGE_KEY)) {
      if (lang !== data.locale && (lang === 'vi' || lang === 'en')) push.locale = lang;
    } else if (data.locale !== lang) {
      void i18n.changeLanguage(data.locale);
    }

    if (Object.keys(push).length > 0) update.mutate(push);
  }, [data, i18n, preference, setPreference, update]);

  return null;
}
