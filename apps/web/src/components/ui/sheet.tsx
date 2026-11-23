import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

/** Slide-in panel from the left (mobile navigation). */
export function SheetContent({
  className,
  children,
  title,
  closeLabel,
  ...props
}: ComponentProps<typeof Dialog.Content> & { title: string; closeLabel: string; children: ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <Dialog.Content
        aria-describedby={undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r bg-sidebar shadow-xl outline-none',
          className,
        )}
        {...props}
      >
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        <Dialog.Close
          className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label={closeLabel}
        >
          <X className="size-4" />
        </Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
