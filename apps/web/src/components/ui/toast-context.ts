import { createContext, useContext, type ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'info';
type Toast = (message: ReactNode, tone?: ToastTone) => void;

export const ToastContext = createContext<Toast>(() => {});

export function useToast(): Toast {
  return useContext(ToastContext);
}
