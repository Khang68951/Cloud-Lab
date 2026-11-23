import { z } from 'zod';

/**
 * Supported UI/content languages. Adding a language = add it here, add a
 * `locales/<code>/` folder in the web app, and `npm run i18n:check` will tell
 * you every missing key.
 */
export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'vi';
/** Language used when a translation is missing. Content is authored in English first. */
export const FALLBACK_LOCALE = 'en' satisfies Locale;

export const localeSchema = z.enum(LOCALES);

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Text that lives in data (content, exercise specs, catalog, grader messages).
 * English is required (it is the fallback); other languages are optional so a
 * missing translation degrades gracefully instead of crashing.
 */
export const localizedTextSchema = z.object({
  en: z.string().min(1),
  vi: z.string().min(1).optional(),
  // New language? add `<code>: z.string().min(1).optional()` here.
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

/** Pick the best string for `locale`, falling back to English. */
export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en;
}

/** True when `text` has a real translation for `locale` (not a fallback). */
export function hasTranslation(text: LocalizedText, locale: Locale): boolean {
  return Boolean(text[locale]);
}
