import type { Design } from '@learninglab/cloud-catalog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';

export interface DesignListItem {
  id: number;
  title: string;
  monthlyUsd: number | null;
  updatedAt: number;
}
export interface SavedDesign extends DesignListItem {
  graph: Design;
}

const KEY = ['designs'] as const;

export function useDesignList(enabled: boolean) {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => unwrap<DesignListItem[]>(await api.designs.$get()),
    enabled,
  });
}

export async function fetchDesign(id: number) {
  return unwrap<SavedDesign>(await api.designs[':id'].$get({ param: { id: String(id) } }));
}

export function useSaveDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: number | null; title: string; graph: Design; monthlyUsd: number }) => {
      const json = { title: v.title, graph: v.graph, monthlyUsd: v.monthlyUsd, engineVersion: 1 };
      return v.id
        ? unwrap<SavedDesign>(await api.designs[':id'].$put({ param: { id: String(v.id) }, json }))
        : unwrap<SavedDesign>(await api.designs.$post({ json }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => unwrap(await api.designs[':id'].$delete({ param: { id: String(id) } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
