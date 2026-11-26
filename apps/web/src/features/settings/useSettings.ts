import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from '@learninglab/shared';
import { useIsMutating, useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';

export const settingsQueryKey = ['settings'] as const;
export const settingsMutationKey = ['settings', 'update'] as const;

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: async () => unwrap<Settings>(await api.settings.$get()),
    staleTime: Infinity,
    retry: 1,
  });
}

/**
 * Optimistic update: the UI changes instantly. If the API is down, the cached
 * value is kept (theme/locale also live in localStorage), and `isError` lets
 * the UI show an "offline" note instead of silently reverting.
 */
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: settingsMutationKey,
    mutationFn: async (patch: SettingsPatch) => unwrap<Settings>(await api.settings.$put({ json: patch })),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: settingsQueryKey });
      qc.setQueryData<Settings>(settingsQueryKey, (old) => ({ ...(old ?? DEFAULT_SETTINGS), ...patch }));
    },
    onSuccess: (saved) => qc.setQueryData(settingsQueryKey, saved),
  });
}

/** Save state shared by every component that updates settings. */
export function useSettingsSaveState(): 'saving' | 'error' | 'idle' {
  const saving = useIsMutating({ mutationKey: settingsMutationKey }) > 0;
  const statuses = useMutationState({ filters: { mutationKey: settingsMutationKey }, select: (m) => m.state.status });
  const query = useSettingsQuery();
  if (saving) return 'saving';
  if (query.isError || statuses.at(-1) === 'error') return 'error';
  return 'idle';
}

/** Current settings, falling back to defaults while loading or offline. */
export function useSettings(): Settings {
  const { data } = useSettingsQuery();
  return data ?? DEFAULT_SETTINGS;
}
