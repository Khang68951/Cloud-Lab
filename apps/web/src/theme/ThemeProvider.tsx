import type { ThemePreference } from '@cloudlab/shared';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ThemeContext } from './context.ts';
import { applyTheme, onSystemThemeChange, readStoredTheme, storeTheme, systemTheme } from './theme.ts';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredTheme);
  // Live OS preference (re-renders when Windows switches light/dark).
  const system = useSyncExternalStore(onSystemThemeChange, systemTheme);
  const resolved = preference === 'system' ? system : preference;

  useEffect(() => applyTheme(resolved), [resolved]);

  const setPreference = useCallback((pref: ThemePreference) => {
    storeTheme(pref);
    setPreferenceState(pref);
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
