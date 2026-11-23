import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';

export interface ExerciseSummary {
  exerciseId: string;
  attempts: number;
  bestScore: number;
  passed: boolean;
  lastAt: number;
}
export interface Progress {
  lessons: { key: string; completedAt: number }[];
  exercises: ExerciseSummary[];
}

const KEY = ['progress'] as const;
const EMPTY: Progress = { lessons: [], exercises: [] };

export function useProgress() {
  const q = useQuery({
    queryKey: KEY,
    queryFn: async () => unwrap<Progress>(await api.progress.$get()),
    retry: 1,
  });
  const data = q.data ?? EMPTY;
  return {
    ...q,
    data,
    lessonDone: (key: string) => data.lessons.some((l) => l.key === key),
    exercise: (id: string) => data.exercises.find((e) => e.exerciseId === id),
  };
}

export function useRecordAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { exerciseId: string; kind: string; passed: boolean; score: number; hintsUsed?: number; answer?: unknown }) =>
      unwrap(await api.progress.attempts.$post({ json: { hintsUsed: 0, ...a } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetLessonDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, done }: { key: string; done: boolean }) => {
      const [track, module, lesson] = key.split('/') as [string, string, string];
      const param = { track, module, lesson };
      return unwrap(
        done
          ? await api.progress.lessons[':track'][':module'][':lesson'].$put({ param })
          : await api.progress.lessons[':track'][':module'][':lesson'].$delete({ param }),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
