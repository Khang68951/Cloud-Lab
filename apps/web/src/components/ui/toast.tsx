import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ToastContext, type ToastTone } from './toast-context';

interface ToastItem {
  id: number;
  message: ReactNode;
  tone: ToastTone;
}

const ICON = { success: CircleCheck, error: CircleAlert, info: Info } as const;

/** Minimal toast system: `const toast = useToast(); toast('Saved', 'success')`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const push = useCallback((message: ReactNode, tone: ToastTone = 'info') => {
    const id = next.current++;
    setItems((xs) => [...xs.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3500);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2">
        {items.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg border bg-popover px-4 py-3 text-sm shadow-lg"
            >
              <Icon
                aria-hidden
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  t.tone === 'success' && 'text-success',
                  t.tone === 'error' && 'text-danger',
                  t.tone === 'info' && 'text-info',
                )}
              />
              <div>{t.message}</div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
