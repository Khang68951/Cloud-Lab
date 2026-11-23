import { z } from 'zod';
import { DEFAULT_LOCALE, localeSchema } from './i18n.ts';

export const THEMES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEMES)[number];
export const themeSchema = z.enum(THEMES);

/** AI tutor backends (implemented in Phase 5). `off` keeps the app fully functional. */
export const AI_PROVIDERS = ['off', 'claude-code', 'ollama', 'openai-compatible'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/**
 * User settings. Every field has a default so new settings can be added later
 * without migrations: unknown/missing keys in the DB just fall back here.
 */
export const settingsSchema = z.object({
  locale: localeSchema.default(DEFAULT_LOCALE),
  theme: themeSchema.default('system'),
  aiProvider: z.enum(AI_PROVIDERS).default('off'),
  /** Show an approximate VND amount next to USD prices. */
  showVnd: z.boolean().default(false),
  /** VND per 1 USD, entered by the user (no paid FX API). */
  vndPerUsd: z.number().positive().default(26000),
  /** Name printed on course certificates. */
  displayName: z.string().trim().max(60).default(''),
});
export type Settings = z.infer<typeof settingsSchema>;

export const settingsPatchSchema = settingsSchema.partial();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});
