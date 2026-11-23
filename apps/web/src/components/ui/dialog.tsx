import { X } from 'lucide-react';
import { Dialog as Primitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  closeLabel,
  ...props
}: ComponentProps<typeof Primitive.Content> & {
  title: ReactNode;
  description?: ReactNode;
  closeLabel: string;
}) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <Primitive.Content
        aria-describedby={description ? undefined : undefined}
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <Primitive.Title className="font-semibold tracking-tight">{title}</Primitive.Title>
            {description ? (
              <Primitive.Description className="mt-1 text-sm text-muted-foreground">{description}</Primitive.Description>
            ) : (
              <Primitive.Description className="sr-only">{title}</Primitive.Description>
            )}
          </div>
          <Primitive.Close
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted"
            aria-label={closeLabel}
          >
            <X className="size-4" />
          </Primitive.Close>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
