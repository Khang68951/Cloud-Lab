import type { ThemePreference } from '@learninglab/shared';
import { createContext, useContext } from 'react';
import type { ResolvedTheme } from './theme.ts';

export interface ThemeContextValue {
  /** What the user picked: light / dark / system. */
  preference: ThemePreference;
  /** What is actually shown. Use this for 3rd-party widgets (React Flow, Monaco, xterm...). */
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
