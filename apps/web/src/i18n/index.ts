import { DEFAULT_LOCALE, FALLBACK_LOCALE, isLocale, LOCALES, type Locale } from '@cloudlab/shared';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources.ts';

/** Must match the inline script in index.html. */
export const LOCALE_STORAGE_KEY = 'cloudlab.locale';

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  const nav = navigator.language?.slice(0, 2);
  return isLocale(nav) ? nav : DEFAULT_LOCALE;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale(),
  fallbackLng: FALLBACK_LOCALE,
  supportedLngs: [...LOCALES],
  defaultNS: 'common',
  ns: Object.keys(resources.en),
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.language;

/** Remember an explicit language choice in this browser (read before first paint). */
export function storeLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* storage unavailable */
  }
}

export function currentLocale(): Locale {
  return isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
}

export default i18n;
