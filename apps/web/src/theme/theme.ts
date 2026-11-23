import type { ThemePreference } from '@cloudlab/shared';

/** Must match the inline script in index.html. */
export const THEME_STORAGE_KEY = 'cloudlab.theme';

export type ResolvedTheme = 'light' | 'dark';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function systemTheme(): ResolvedTheme {
  return media().matches ? 'dark' : 'light';
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? systemTheme() : pref;
}

export function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

export function readStoredTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

export function storeTheme(pref: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* storage unavailable */
  }
}

export function onSystemThemeChange(cb: () => void): () => void {
  const m = media();
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
}
